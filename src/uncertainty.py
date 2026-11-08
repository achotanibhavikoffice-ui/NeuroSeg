"""
NeuroSeg: Bayesian Epistemic & Aleatoric Uncertainty Quantification Engine.
References:
  - Kendall & Gal, "What Uncertainties Do We Need in Bayesian Deep Learning for Computer Vision?" (NeurIPS)
  - Zou et al., "TBraTS: Trusted Brain Tumor Segmentation" (MICCAI)

Performs T stochastic forward passes with Spatial Monte Carlo Dropout enabled (while keeping
BatchNorm statistics frozen) to decompose voxel-wise uncertainty into:
  1. Mean Posterior Probability (p_bar)
  2. Epistemic Variance (sigma^2_epistemic) -> Model parameter uncertainty along infiltrative margins
  3. Predictive Shannon Entropy H(p_bar) -> Total clinical uncertainty
  4. Mutual Information I(y; theta | x) -> Epistemic information gain
"""

from typing import Dict
import numpy as np
import torch
import torch.nn as nn


def enable_mc_dropout(model: nn.Module) -> None:
    """Enables Dropout/Dropout2d layers at inference time while keeping BatchNorm in eval mode."""
    for m in model.modules():
        if isinstance(m, (nn.Dropout, nn.Dropout2d)):
            m.train()


@torch.no_grad()
def estimate_voxel_uncertainty(
    model: nn.Module,
    input_tensor: torch.Tensor,
    mc_passes: int = 8,
    eps: float = 1e-7,
) -> Dict[str, np.ndarray]:
    """
    Runs T stochastic Monte Carlo forward passes on `input_tensor` (1, C, H, W)
    and returns normalized uncertainty maps and reliability statistics.
    """
    model.eval()
    enable_mc_dropout(model)

    prob_samples = []
    for _ in range(mc_passes):
        out = model(input_tensor)
        if isinstance(out, tuple):
            out = out[0]
        probs = torch.sigmoid(out)
        prob_samples.append(probs)

    # Shape: (T, 1, 1, H, W)
    stacked = torch.stack(prob_samples, dim=0)

    # 1. Posterior Mean Probability
    mean_prob = stacked.mean(dim=0).squeeze().detach().cpu().numpy()

    # 2. Epistemic Variance across MC passes
    epistemic_var = stacked.var(dim=0, unbiased=False).squeeze().detach().cpu().numpy()

    # 3. Predictive Shannon Entropy: H(E[p])
    p_bar = stacked.mean(dim=0).clamp(min=eps, max=1.0 - eps)
    predictive_entropy = (
        -(p_bar * torch.log2(p_bar) + (1.0 - p_bar) * torch.log2(1.0 - p_bar))
        .squeeze()
        .detach()
        .cpu()
        .numpy()
    )

    # 4. Aleatoric Entropy: E[H(p_t)]
    p_clamped = stacked.clamp(min=eps, max=1.0 - eps)
    expected_entropy = (
        -(p_clamped * torch.log2(p_clamped) + (1.0 - p_clamped) * torch.log2(1.0 - p_clamped))
        .mean(dim=0)
        .squeeze()
        .detach()
        .cpu()
        .numpy()
    )

    # 5. Mutual Information: I(y; theta | x) = H(E[p]) - E[H(p_t)]
    mutual_info = np.clip(predictive_entropy - expected_entropy, 0.0, None)

    # Normalize epistemic halo map to [0, 1] for visualization
    halo_max = float(np.percentile(predictive_entropy, 99.5)) + eps
    uncertainty_halo = np.clip(predictive_entropy / halo_max, 0.0, 1.0)

    model.eval()
    return {
        "mean_prob": mean_prob,
        "epistemic_variance": epistemic_var,
        "predictive_entropy": predictive_entropy,
        "aleatoric_entropy": expected_entropy,
        "mutual_information": mutual_info,
        "uncertainty_halo": uncertainty_halo,
        "mean_boundary_uncertainty": float(np.mean(predictive_entropy[mean_prob >= 0.25]))
        if np.any(mean_prob >= 0.25)
        else float(np.mean(predictive_entropy)),
    }
