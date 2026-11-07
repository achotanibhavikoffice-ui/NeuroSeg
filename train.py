"""
NeuroSeg Training & Architectural Ablation Pipeline.
Supports mixed-precision training (AMP), Cosine Annealing LR, model checkpointing,
and automated 3-way ablation studies (Vanilla U-Net vs. Attention U-Net; BCE vs. Dice-Focal).
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
from src.losses import DiceFocalLoss, SoftDiceLoss, compute_segmentation_metrics
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
    n_batches = 0

    use_amp = device.type == "cuda"

    for images, masks in loader:
        images = images.to(device, non_blocking=True)
        masks = masks.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)
        with torch.cuda.amp.autocast(enabled=use_amp):
            logits = model(images)
            loss = criterion(logits, masks)

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        metrics = compute_segmentation_metrics(logits.detach(), masks)
        running_loss += loss.item()
        running_dice += metrics["dice"]
        running_iou += metrics["iou"]
        n_batches += 1

    return {
        "loss": running_loss / max(1, n_batches),
        "dice": running_dice / max(1, n_batches),
        "iou": running_iou / max(1, n_batches),
    }


@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader,
    criterion: nn.Module,
    device: torch.device,
) -> Dict[str, float]:
    model.eval()
    totals = {"loss": 0.0, "dice": 0.0, "iou": 0.0, "precision": 0.0, "recall": 0.0, "specificity": 0.0}
    n_batches = 0

    for images, masks in loader:
        images = images.to(device, non_blocking=True)
        masks = masks.to(device, non_blocking=True)

        logits = model(images)
        loss = criterion(logits, masks)
        metrics = compute_segmentation_metrics(logits, masks)

        totals["loss"] += loss.item()
        for k in ["dice", "iou", "precision", "recall", "specificity"]:
            totals[k] += metrics[k]
        n_batches += 1

    return {k: v / max(1, n_batches) for k, v in totals.items()}


def run_experiment(
    name: str,
    use_attention: bool,
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
    model = AttentionUNet(in_channels=3, out_channels=1, use_attention=use_attention).to(device)
    params = count_parameters(model)
    print(f"\n=== [{name}] Trainable Parameters: {params:,} | Device: {device} ===")

    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == "cuda"))

    best_val_dice = -1.0
    best_ckpt_path = os.path.join(output_dir, f"{name.lower().replace(' ', '_')}_best.pt")

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_stats = train_one_epoch(model, train_loader, criterion, optimizer, scaler, device)
        val_stats = evaluate(model, val_loader, criterion, device)
        scheduler.step()
        dt = time.time() - t0

        if val_stats["dice"] > best_val_dice:
            best_val_dice = val_stats["dice"]
            torch.save(model.state_dict(), best_ckpt_path)

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] ({dt:.1f}s) | "
            f"Train Loss: {train_stats['loss']:.4f}, Dice: {train_stats['dice']:.4f} | "
            f"Val Dice: {val_stats['dice']:.4f}, IoU: {val_stats['iou']:.4f}, "
            f"Prec: {val_stats['precision']:.4f}, Rec: {val_stats['recall']:.4f}"
        )

    # Load best checkpoint and evaluate on held-out Test set
    model.load_state_dict(torch.load(best_ckpt_path, map_location=device))
    test_stats = evaluate(model, test_loader, criterion, device)

    # Generate Grad-CAM++ & Attention Gate Explainability visualization on a test sample
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
    print(f"[Explainability] Saved Grad-CAM++ & Attention panel -> {fig_path}")

    return test_stats


def main():
    parser = argparse.ArgumentParser(description="NeuroSeg: Attention U-Net Brain Tumor MRI Segmentation")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to TCGA-LGG dataset folder")
    parser.add_argument("--image-size", type=int, default=256, help="Input MRI slice resolution")
    parser.add_argument("--batch-size", type=int, default=16, help="Mini-batch size")
    parser.add_argument("--epochs", type=int, default=25, help="Number of training epochs")
    parser.add_argument("--lr", type=float, default=3e-4, help="Peak learning rate")
    parser.add_argument("--ablation", action="store_true", help="Run full 3-way architectural & loss ablation study")
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
            ("Vanilla_UNet_BCE", False, nn.BCEWithLogitsLoss()),
            ("Vanilla_UNet_DiceFocal", False, DiceFocalLoss(dice_weight=0.6, focal_weight=0.4)),
            ("NeuroSeg_Attention_UNet_DiceFocal", True, DiceFocalLoss(dice_weight=0.6, focal_weight=0.4)),
        ]
    else:
        configs = [
            ("NeuroSeg_Attention_UNet_DiceFocal", True, DiceFocalLoss(dice_weight=0.6, focal_weight=0.4)),
        ]

    results = {}
    for name, use_att, criterion in configs:
        results[name] = run_experiment(
            name=name,
            use_attention=use_att,
            criterion=criterion,
            train_loader=train_loader,
            val_loader=val_loader,
            test_loader=test_loader,
            device=device,
            epochs=args.epochs,
            lr=args.lr,
            output_dir=args.output_dir,
        )

    print("\n================ FINAL HELD-OUT TEST BENCHMARK ================")
    print(f"{'Configuration':<36} | {'Dice (DSC)':<10} | {'IoU':<10} | {'Precision':<10} | {'Recall':<10}")
    print("-" * 88)
    for name, m in results.items():
        print(
            f"{name:<36} | {m['dice']:<10.4f} | {m['iou']:<10.4f} | "
            f"{m['precision']:<10.4f} | {m['recall']:<10.4f}"
        )

    with open(os.path.join(args.output_dir, "benchmark_results.json"), "w") as f:
        json.dump(results, f, indent=2)


if __name__ == "__main__":
    main()
