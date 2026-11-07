"""
Grad-CAM++ & Soft Attention Gate Explainability for Medical Image Segmentation.
Computes higher-order pixel-wise gradient weights from the bottleneck/decoder layers
to provide visual clinical explanations of tumor boundary predictions.
"""

from typing import Optional, Tuple
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class SegmentationGradCAMPlusPlus:
    """
    Grad-CAM++ (Chattopadhay et al.) adapted for Dense Semantic Segmentation.
    Uses 1st, 2nd, and 3rd order gradients of aggregated foreground tumor logits
    with respect to a target convolutional feature map.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None

        self._fwd_hook = self.target_layer.register_forward_hook(self._save_activation)
        self._bwd_hook = self.target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, inp, out):
        self.activations = out

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate(self, input_tensor: torch.Tensor) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes the normalized Grad-CAM++ heatmap and binary prediction mask
        for a single input scan tensor of shape (1, C, H, W).
        """
        self.model.eval()
        self.model.zero_grad()

        logits = self.model(input_tensor)
        probs = torch.sigmoid(logits)

        # Aggregate foreground tumor logits weighted by predicted tumor probability
        fg_mask = (probs >= 0.5).float()
        if fg_mask.sum() == 0:
            fg_mask = torch.ones_like(probs)
        score = (logits * fg_mask).sum()
        score.backward(retain_graph=True)

        grads = self.gradients  # (1, K, u, v)
        acts = self.activations  # (1, K, u, v)

        grads_power_2 = grads ** 2
        grads_power_3 = grads_power_2 * grads
        sum_acts = acts.sum(dim=(2, 3), keepdim=True)
        eps = 1e-7

        alpha_num = grads_power_2
        alpha_denom = 2.0 * grads_power_2 + sum_acts * grads_power_3 + eps
        alpha = alpha_num / alpha_denom

        weights = (alpha * F.relu(grads)).sum(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1, keepdim=True)
        cam = F.relu(cam)

        cam = F.interpolate(
            cam,
            size=input_tensor.shape[2:],
            mode="bilinear",
            align_corners=False,
        )
        cam_np = cam.squeeze().detach().cpu().numpy()
        cam_min, cam_max = cam_np.min(), cam_np.max()
        if cam_max - cam_min > 1e-6:
            cam_np = (cam_np - cam_min) / (cam_max - cam_min)
        else:
            cam_np = np.zeros_like(cam_np)

        pred_np = probs.squeeze().detach().cpu().numpy()
        return cam_np, pred_np

    def close(self):
        self._fwd_hook.remove()
        self._bwd_hook.remove()


def save_explainability_panel(
    image_tensor: torch.Tensor,
    target_mask: torch.Tensor,
    pred_prob: np.ndarray,
    gradcam_map: np.ndarray,
    attention_map: Optional[torch.Tensor],
    save_path: str,
) -> None:
    """
    Saves a 5-column clinical diagnostic visualization figure:
      [1] Input FLAIR MRI | [2] Ground Truth Mask | [3] Predicted Mask | [4] Soft Attention Gate | [5] Grad-CAM++ Overlay
    """
    img_np = image_tensor.squeeze(0).detach().cpu().numpy()
    # Use FLAIR channel (channel 1) for crisp grayscale visualization
    flair = img_np[1]
    flair = (flair - flair.min()) / (flair.max() - flair.min() + 1e-6)
    gt_np = target_mask.squeeze().detach().cpu().numpy()
    pred_bin = (pred_prob >= 0.5).astype(np.float32)

    fig, axes = plt.subplots(1, 5, figsize=(18, 3.8), dpi=160)

    axes[0].imshow(flair, cmap="bone")
    axes[0].set_title("Input FLAIR MRI", fontsize=11, fontweight="bold")

    axes[1].imshow(flair, cmap="bone")
    axes[1].imshow(np.ma.masked_where(gt_np < 0.5, gt_np), cmap="Greens", alpha=0.65)
    axes[1].set_title("Ground Truth Tumor", fontsize=11, fontweight="bold")

    axes[2].imshow(flair, cmap="bone")
    axes[2].imshow(np.ma.masked_where(pred_bin < 0.5, pred_bin), cmap="Reds", alpha=0.65)
    axes[2].set_title("NeuroSeg Prediction", fontsize=11, fontweight="bold")

    if attention_map is not None:
        att_up = F.interpolate(
            attention_map, size=flair.shape, mode="bilinear", align_corners=False
        )
        att_np = att_up.squeeze().detach().cpu().numpy()
        att_np = (att_np - att_np.min()) / (att_np.max() - att_np.min() + 1e-6)
    else:
        att_np = gradcam_map
    axes[3].imshow(flair, cmap="bone")
    axes[3].imshow(att_np, cmap="magma", alpha=0.55)
    axes[3].set_title("Attention Gate (α)", fontsize=11, fontweight="bold")

    axes[4].imshow(flair, cmap="bone")
    axes[4].imshow(gradcam_map, cmap="jet", alpha=0.50)
    axes[4].set_title("Grad-CAM++ Saliency", fontsize=11, fontweight="bold")

    for ax in axes:
        ax.axis("off")

    plt.tight_layout()
    plt.savefig(save_path, bbox_inches="tight")
    plt.close(fig)
