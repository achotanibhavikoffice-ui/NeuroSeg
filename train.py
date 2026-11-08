"""
NeuroSeg: Training & 5-Way Architectural Ablation Pipeline.
Evaluates:
  1. Vanilla U-Net (BCE Loss)
  2. Vanilla U-Net (Dice-Focal Loss)
  3. Attention U-Net (Dice-Focal Loss)
  4. Attention U-Net + Multi-Scale Deep Supervision + Spectral FFT Gates
  5. NeuroSeg Full (Bi-Hemispheric Transformer + Spectral Gates + Deep Supervision + SDM Boundary Loss)
"""

import argparse
import json
import os
import time
from typing import Dict

import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

from src.dataset import create_dataloaders
from src.gradcam import SegmentationGradCAMPlusPlus, save_explainability_panel
from src.losses import DeepSupervisionLoss, DiceFocalLoss, compute_segmentation_metrics
from src.model import AttentionUNet, count_parameters


def train_one_epoch(
    model: nn.Module,
    loader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    scaler: torch.cuda.amp.GradScaler,
    device: torch.device,
) -> Dict[str, float]:
    model.train()
    running_loss = 0.0
    running_dice = 0.0
    running_iou = 0.0
    running_hd95 = 0.0
    n_batches = 0

    use_amp = device.type == "cuda"

    for images, masks in loader:
        images = images.to(device, non_blocking=True)
        masks = masks.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)
        with torch.cuda.amp.autocast(enabled=use_amp):
            outputs = model(images)
            loss = criterion(outputs, masks)

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        primary_logits = outputs[0].detach() if isinstance(outputs, tuple) else outputs.detach()
        metrics = compute_segmentation_metrics(primary_logits, masks)
        running_loss += loss.item()
        running_dice += metrics["dice"]
        running_iou += metrics["iou"]
        running_hd95 += metrics["hd95_mm"]
        n_batches += 1

    return {
        "loss": running_loss / max(1, n_batches),
        "dice": running_dice / max(1, n_batches),
        "iou": running_iou / max(1, n_batches),
        "hd95_mm": running_hd95 / max(1, n_batches),
    }


@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader,
    criterion: nn.Module,
    device: torch.device,
) -> Dict[str, float]:
    model.eval()
    totals = {
        "loss": 0.0,
        "dice": 0.0,
        "iou": 0.0,
        "hd95_mm": 0.0,
        "ece": 0.0,
        "precision": 0.0,
        "recall": 0.0,
        "specificity": 0.0,
    }
    n_batches = 0

    for images, masks in loader:
        images = images.to(device, non_blocking=True)
        masks = masks.to(device, non_blocking=True)

        outputs = model(images)
        loss = criterion(outputs, masks)
        primary_logits = outputs[0] if isinstance(outputs, tuple) else outputs
        metrics = compute_segmentation_metrics(primary_logits, masks)

        totals["loss"] += loss.item()
        for k in ["dice", "iou", "hd95_mm", "ece", "precision", "recall", "specificity"]:
            totals[k] += metrics[k]
        n_batches += 1

    return {k: v / max(1, n_batches) for k, v in totals.items()}


def run_experiment(
    name: str,
    use_attention: bool,
    use_spectral: bool,
    use_bihemispheric: bool,
    deep_supervision: bool,
    criterion: nn.Module,
    train_loader,
    val_loader,
    test_loader,
    device: torch.device,
    epochs: int = 25,
    lr: float = 3e-4,
    output_dir: str = "outputs",
) -> Dict[str, float]:
    os.makedirs(output_dir, exist_ok=True)
    model = AttentionUNet(
        in_channels=3,
        out_channels=1,
        use_attention=use_attention,
        use_spectral=use_spectral,
        use_bihemispheric_transformer=use_bihemispheric,
        deep_supervision=deep_supervision,
    ).to(device)
    params = count_parameters(model)
    print(f"\n=== [{name}] Trainable Parameters: {params:,} | Device: {device} ===")

    wrapped_criterion = DeepSupervisionLoss(criterion) if deep_supervision else criterion
    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == "cuda"))

    best_val_dice = -1.0
    best_ckpt_path = os.path.join(output_dir, f"{name.lower().replace(' ', '_')}_best.pt")

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_stats = train_one_epoch(model, train_loader, wrapped_criterion, optimizer, scaler, device)
        val_stats = evaluate(model, val_loader, wrapped_criterion, device)
        scheduler.step()
        dt = time.time() - t0

        if val_stats["dice"] > best_val_dice:
            best_val_dice = val_stats["dice"]
            torch.save(model.state_dict(), best_ckpt_path)

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] ({dt:.1f}s) | "
            f"Loss: {train_stats['loss']:.4f} | "
            f"Val DSC: {val_stats['dice']:.4f} | IoU: {val_stats['iou']:.4f} | "
            f"HD95: {val_stats['hd95_mm']:.2f}mm | ECE: {val_stats['ece']:.4f}"
        )

    model.load_state_dict(torch.load(best_ckpt_path, map_location=device))
    test_stats = evaluate(model, test_loader, wrapped_criterion, device)

    # Disable deep supervision tuple output temporarily for Grad-CAM++ hook
    model.deep_supervision = False
    sample_imgs, sample_masks = next(iter(test_loader))
    sample_img = sample_imgs[0:1].to(device)
    sample_mask = sample_masks[0:1].to(device)

    gradcam = SegmentationGradCAMPlusPlus(model, target_layer=model.dec1)
    cam_map, pred_prob = gradcam.generate(sample_img)
    gradcam.close()

    att_maps = model.get_attention_maps()
    top_att_map = att_maps[-1] if att_maps else None
    fig_path = os.path.join(output_dir, f"{name.lower().replace(' ', '_')}_gradcam.png")
    save_explainability_panel(sample_img, sample_mask, pred_prob, cam_map, top_att_map, fig_path)
    print(f"[Explainability] Saved Grad-CAM++ & Spectral Attention panel -> {fig_path}")

    return test_stats


def main():
    parser = argparse.ArgumentParser(description="NeuroSeg: Spectral-Transformer Attention U-Net")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to TCGA-LGG dataset folder")
    parser.add_argument("--image-size", type=int, default=256, help="Input MRI slice resolution")
    parser.add_argument("--batch-size", type=int, default=16, help="Mini-batch size")
    parser.add_argument("--epochs", type=int, default=25, help="Number of training epochs")
    parser.add_argument("--lr", type=float, default=3e-4, help="Peak learning rate")
    parser.add_argument("--ablation", action="store_true", help="Run full 5-way architectural & loss ablation study")
    parser.add_argument("--output-dir", type=str, default="outputs", help="Directory for checkpoints and plots")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_loader, val_loader, test_loader = create_dataloaders(
        data_dir=args.data_dir,
        image_size=args.image_size,
        batch_size=args.batch_size,
    )

    if args.ablation:
        configs = [
            ("1_Vanilla_UNet_BCE", False, False, False, False, nn.BCEWithLogitsLoss()),
            ("2_Vanilla_UNet_DiceFocal", False, False, False, False, DiceFocalLoss(0.6, 0.4, 0.0)),
            ("3_Attention_UNet_DiceFocal", True, False, False, False, DiceFocalLoss(0.6, 0.4, 0.0)),
            ("4_Spectral_Attention_UNet_DeepSup", True, True, False, True, DiceFocalLoss(0.55, 0.35, 0.10)),
            ("5_NeuroSeg_Full_BiHemispheric_SDM", True, True, True, True, DiceFocalLoss(0.50, 0.30, 0.20)),
        ]
    else:
        configs = [
            ("NeuroSeg_Full_BiHemispheric_SDM", True, True, True, True, DiceFocalLoss(0.50, 0.30, 0.20)),
        ]

    results = {}
    for name, use_att, use_spec, use_bihem, ds, criterion in configs:
        results[name] = run_experiment(
            name=name,
            use_attention=use_att,
            use_spectral=use_spec,
            use_bihemispheric=use_bihem,
            deep_supervision=ds,
            criterion=criterion,
            train_loader=train_loader,
            val_loader=val_loader,
            test_loader=test_loader,
            device=device,
            epochs=args.epochs,
            lr=args.lr,
            output_dir=args.output_dir,
        )

    print("\n================ FINAL 5-WAY HELD-OUT TEST BENCHMARK ================")
    print(f"{'Configuration':<38} | {'DSC':<8} | {'IoU':<8} | {'HD95(mm)':<9} | {'ECE':<8} | {'Prec':<8}")
    print("-" * 92)
    for name, m in results.items():
        print(
            f"{name:<38} | {m['dice']:<8.4f} | {m['iou']:<8.4f} | "
            f"{m['hd95_mm']:<9.2f} | {m['ece']:<8.4f} | {m['precision']:<8.4f}"
        )

    with open(os.path.join(args.output_dir, "benchmark_results.json"), "w") as f:
        json.dump(results, f, indent=2)


if __name__ == "__main__":
    main()
