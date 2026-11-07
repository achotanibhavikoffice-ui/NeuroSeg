"""
Custom Loss Functions & Evaluation Metrics for Imbalanced Medical Image Segmentation.
Includes Soft Dice Loss, Binary Focal Loss, Composite Dice-Focal Loss, and Boundary Metrics.
"""

from typing import Dict
import torch
import torch.nn as nn
import torch.nn.functional as F


class SoftDiceLoss(nn.Module):
    """Differentiable Soft Dice Loss for binary segmentation masks."""

    def __init__(self, smooth: float = 1e-5):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        probs_flat = probs.view(probs.size(0), -1)
        targets_flat = targets.view(targets.size(0), -1).float()

        intersection = (probs_flat * targets_flat).sum(dim=1)
        union = probs_flat.sum(dim=1) + targets_flat.sum(dim=1)
        dice = (2.0 * intersection + self.smooth) / (union + self.smooth)
        return 1.0 - dice.mean()


class BinaryFocalLoss(nn.Module):
    """
    Binary Focal Loss (Lin et al., ICCV) to address extreme foreground-background
    class imbalance in brain MRI slices where tumor pixels occupy <2% of the scan.
    """

    def __init__(self, alpha: float = 0.75, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        targets = targets.float()
        bce_loss = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")
        probs = torch.sigmoid(logits)
        p_t = probs * targets + (1.0 - probs) * (1.0 - targets)
        alpha_t = self.alpha * targets + (1.0 - self.alpha) * (1.0 - targets)
        focal_weight = alpha_t * torch.pow(1.0 - p_t, self.gamma)
        return (focal_weight * bce_loss).mean()


class DiceFocalLoss(nn.Module):
    """
    Composite Dice-Focal Loss:
        L = lambda_dice * L_Dice + lambda_focal * L_Focal
    Combines region-level overlap optimization (Dice) with pixel-level hard boundary mining (Focal).
    """

    def __init__(
        self,
        dice_weight: float = 0.6,
        focal_weight: float = 0.4,
        alpha: float = 0.75,
        gamma: float = 2.0,
        smooth: float = 1e-5,
    ):
        super().__init__()
        self.dice_weight = dice_weight
        self.focal_weight = focal_weight
        self.dice = SoftDiceLoss(smooth=smooth)
        self.focal = BinaryFocalLoss(alpha=alpha, gamma=gamma)

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        loss_dice = self.dice(logits, targets)
        loss_focal = self.focal(logits, targets)
        return self.dice_weight * loss_dice + self.focal_weight * loss_focal


@torch.no_grad()
def compute_segmentation_metrics(
    logits: torch.Tensor,
    targets: torch.Tensor,
    threshold: float = 0.5,
    eps: float = 1e-6,
) -> Dict[str, float]:
    """
    Computes standard clinical segmentation evaluation metrics:
      - Dice Similarity Coefficient (DSC)
      - Intersection over Union (IoU / Jaccard)
      - Precision (Positive Predictive Value)
      - Recall (Sensitivity)
      - Specificity
    """
    probs = torch.sigmoid(logits)
    preds = (probs >= threshold).float()
    targets = (targets >= 0.5).float()

    preds_flat = preds.view(preds.size(0), -1)
    targets_flat = targets.view(targets.size(0), -1)

    tp = (preds_flat * targets_flat).sum(dim=1)
    fp = (preds_flat * (1.0 - targets_flat)).sum(dim=1)
    fn = ((1.0 - preds_flat) * targets_flat).sum(dim=1)
    tn = ((1.0 - preds_flat) * (1.0 - targets_flat)).sum(dim=1)

    dice = (2.0 * tp + eps) / (2.0 * tp + fp + fn + eps)
    iou = (tp + eps) / (tp + fp + fn + eps)
    precision = (tp + eps) / (tp + fp + eps)
    recall = (tp + eps) / (tp + fn + eps)
    specificity = (tn + eps) / (tn + fp + eps)

    return {
        "dice": dice.mean().item(),
        "iou": iou.mean().item(),
        "precision": precision.mean().item(),
        "recall": recall.mean().item(),
        "specificity": specificity.mean().item(),
    }
