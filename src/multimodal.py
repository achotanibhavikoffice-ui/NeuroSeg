"""
NeuroSeg — Cross-Modal MRI + Neuro-Hematology Gated Attention Fusion Network.

Fuses 3D Brain MRI Radiomic / Bottleneck Embeddings from AttentionUNet with a
12-Biomarker Peripheral Blood & Liquid Biopsy Vector:
  1. Hemoglobin (g/dL)
  2. Total WBC (x10^3 / uL)
  3. Absolute Neutrophil Count - ANC (x10^3 / uL)
  4. Absolute Lymphocyte Count - ALC (x10^3 / uL)
  5. Platelets (x10^3 / uL)
  6. Prothrombin INR
  7. D-Dimer (ng/mL FEU)
  8. Serum Sodium Na+ (mEq/L)
  9. Fasting Blood Glucose (mg/dL)
  10. High-Sensitivity C-Reactive Protein - hs-CRP (mg/L)
  11. Lactate Dehydrogenase - LDH (U/L)
  12. Serum Glial Fibrillary Acidic Protein - sGFAP (pg/mL)

Plus Derived Neuro-Oncology Prognostic Indices:
  - NLR (Neutrophil-to-Lymphocyte Ratio) = ANC / ALC
  - SII (Systemic Immune-Inflammation Index) = (Platelets * ANC) / ALC

References:
  - Bambury et al., "The addition of neutrophil-to-lymphocyte ratio to the EORTC
    prognostic nomogram in glioma patients", British Journal of Cancer.
  - Abdel-Razeq et al., "Systemic Immune-Inflammation Index (SII) in CNS Gliomas".
  - Perez et al., "Serum GFAP as a liquid biopsy biomarker for blood-brain barrier
    disruption and WHO glioma grade stratification", Neuro-Oncology.
"""

from typing import Dict, List, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


BIOMARKER_NAMES: List[str] = [
    "Hemoglobin (g/dL)",
    "Total WBC (10³/µL)",
    "Neutrophils ANC (10³/µL)",
    "Lymphocytes ALC (10³/µL)",
    "Platelets (10³/µL)",
    "Coagulation INR",
    "D-Dimer (ng/mL)",
    "Serum Sodium (mEq/L)",
    "Blood Glucose (mg/dL)",
    "hs-CRP (mg/L)",
    "Serum LDH (U/L)",
    "Serum GFAP (pg/mL)",
]

DIFFERENTIAL_CLASSES: List[str] = [
    "Diffuse Glioma (Astrocytoma / Oligodendroglioma)",
    "Pyogenic Cerebral Abscess (Infectious Mimic)",
    "Primary CNS Lymphoma (PCNSL)",
    "Tumefactive Demyelinating Lesion (MS)",
]


class TabularBiomarkerEncoder(nn.Module):
    """
    Encodes the 14-dimensional neuro-hematology vector (12 raw blood biomarkers +
    derived NLR & SII) using Feature-Tokenizer MLP layers with LayerNorm and GELU.
    """

    def __init__(self, in_features: int = 14, embed_dim: int = 128, dropout: float = 0.15):
        super().__init__()
        self.feature_weights = nn.Parameter(torch.ones(in_features))
        self.net = nn.Sequential(
            nn.Linear(in_features, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU(),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: Normalized tabular blood tensor of shape [B, 14]
        Returns:
            blood_embed: [B, embed_dim]
            gate_importance: [B, 14] normalized feature attribution weights
        """
        weighted_x = x * self.feature_weights.unsqueeze(0)
        blood_embed = self.net(weighted_x)
        importance = torch.softmax(torch.abs(weighted_x), dim=-1)
        return blood_embed, importance


class CrossModalGatedFusionUnit(nn.Module):
    """
    Bimodal Gated Multimodal Unit (GMU) that dynamically balances 3D MRI Radiomic
    features with Peripheral Blood / Liquid Biopsy embeddings:
        h_mri   = tanh(W_m * x_mri)
        h_blood = tanh(W_b * x_blood)
        z       = sigmoid(W_z * [x_mri || x_blood])
        h_fused = z * h_mri + (1 - z) * h_blood
    """

    def __init__(self, mri_dim: int = 128, blood_dim: int = 128, fused_dim: int = 128):
        super().__init__()
        self.proj_mri = nn.Linear(mri_dim, fused_dim)
        self.proj_blood = nn.Linear(blood_dim, fused_dim)
        self.gate_net = nn.Linear(mri_dim + blood_dim, fused_dim)
        self.norm = nn.LayerNorm(fused_dim)

    def forward(
        self, mri_embed: torch.Tensor, blood_embed: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        h_mri = torch.tanh(self.proj_mri(mri_embed))
        h_blood = torch.tanh(self.proj_blood(blood_embed))
        concat = torch.cat([mri_embed, blood_embed], dim=-1)
        z_gate = torch.sigmoid(self.gate_net(concat))
        fused = self.norm(z_gate * h_mri + (1.0 - z_gate) * h_blood)
        return fused, z_gate


class CrossModalGatedFusionNet(nn.Module):
    """
    Complete NeuroSeg Multimodal MRI + Neuro-Hematology Network.
    Predicts:
      1. Non-invasive WHO CNS Grade probability (Grade 3/4 High-Grade vs Grade 2 Low-Grade)
      2. 4-Class Differential Diagnosis Posterior (Glioma vs Abscess vs PCNSL vs Demyelination)
      3. Modality Gate Ratio (MRI Contribution vs Blood Biomarker Contribution)
    """

    def __init__(
        self,
        mri_in_dim: int = 8,
        blood_in_dim: int = 14,
        embed_dim: int = 128,
        num_diff_classes: int = 4,
    ):
        super().__init__()
        self.mri_encoder = nn.Sequential(
            nn.Linear(mri_in_dim, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU(),
            nn.Linear(embed_dim, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU(),
        )
        self.blood_encoder = TabularBiomarkerEncoder(
            in_features=blood_in_dim, embed_dim=embed_dim
        )
        self.fusion_unit = CrossModalGatedFusionUnit(
            mri_dim=embed_dim, blood_dim=embed_dim, fused_dim=embed_dim
        )

        # Head 1: WHO CNS High-Grade (Grade 3/4) Transformation Risk
        self.who_grade_head = nn.Sequential(
            nn.Linear(embed_dim, 64),
            nn.GELU(),
            nn.Linear(64, 1),
        )

        # Head 2: 4-Class Differential Diagnosis Classifier
        self.differential_head = nn.Sequential(
            nn.Linear(embed_dim, 64),
            nn.GELU(),
            nn.Linear(64, num_diff_classes),
        )

    def forward(
        self, mri_features: torch.Tensor, blood_features: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        mri_embed = self.mri_encoder(mri_features)
        blood_embed, biomarker_importance = self.blood_encoder(blood_features)
        fused, z_gate = self.fusion_unit(mri_embed, blood_embed)

        high_grade_prob = torch.sigmoid(self.who_grade_head(fused))
        diff_logits = self.differential_head(fused)
        diff_probs = F.softmax(diff_logits, dim=-1)

        return {
            "high_grade_prob": high_grade_prob,
            "differential_probs": diff_probs,
            "biomarker_importance": biomarker_importance,
            "mri_modality_weight": z_gate.mean(dim=-1, keepdim=True),
        }
