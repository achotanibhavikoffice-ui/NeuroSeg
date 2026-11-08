"""
NeuroSeg: Hybrid Spectral-Transformer Attention U-Net with:
  - Upgrade 3: Multi-Scale Deep Supervision (nnU-Net paradigm, Isensee et al., Nature Methods)
  - Upgrade 4: Contralateral Bi-Hemispheric Symmetry Cross-Attention & Transformer Bottleneck (TransUNet/Swin-UNETR)
  - Upgrade 5: Frequency-Domain 2D Fast Fourier (FFT) High-Pass Spectral Attention Gates
"""

from typing import Dict, List, Optional, Tuple, Union
import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    """Double 3x3 Convolution -> BatchNorm -> GELU/ReLU block with spatial Monte Carlo dropout."""

    def __init__(self, in_channels: int, out_channels: int, dropout_p: float = 0.0):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.act1 = nn.ReLU(inplace=True)
        self.dropout = nn.Dropout2d(p=dropout_p) if dropout_p > 0.0 else nn.Identity()
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.act2 = nn.ReLU(inplace=True)

        # Residual shortcut when channel dimensions differ
        self.residual = (
            nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=False),
                nn.BatchNorm2d(out_channels),
            )
            if in_channels != out_channels
            else nn.Identity()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = self.residual(x)
        out = self.act1(self.bn1(self.conv1(x)))
        out = self.dropout(out)
        out = self.bn2(self.conv2(out))
        return self.act2(out + identity)


class SpectralAttentionGate(nn.Module):
    """
    Upgrade 5: Frequency-Domain Spectral + Additive Soft Attention Gate.
    Applies a 2D Real Fast Fourier Transform (rfft2) high-pass filter to isolate
    high-frequency infiltrative glioma boundary edges from low-frequency MRI bias fields,
    fusing spectral edge energy with coarse decoder gating signals.
    """

    def __init__(self, f_g: int, f_l: int, f_int: int, use_spectral: bool = True):
        super().__init__()
        self.use_spectral = use_spectral
        self.W_g = nn.Sequential(
            nn.Conv2d(f_g, f_int, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(f_int),
        )
        self.W_x = nn.Sequential(
            nn.Conv2d(f_l, f_int, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(f_int),
        )
        # Learnable spectral high-pass modulation weight
        self.spectral_proj = (
            nn.Sequential(
                nn.Conv2d(f_l, f_int, kernel_size=1, bias=False),
                nn.BatchNorm2d(f_int),
            )
            if use_spectral
            else None
        )
        self.psi = nn.Sequential(
            nn.Conv2d(f_int, 1, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(1),
            nn.Sigmoid(),
        )
        self.relu = nn.ReLU(inplace=True)
        self.last_attention_map: Optional[torch.Tensor] = None

    def _extract_high_freq_edges(self, x: torch.Tensor) -> torch.Tensor:
        """Applies a differentiable radial high-pass mask in the 2D Fourier domain."""
        orig_dtype = x.dtype
        x_fp32 = x.float()
        B, C, H, W = x_fp32.shape
        freq = torch.fft.rfft2(x_fp32, norm="ortho")
        fy = torch.fft.fftfreq(H, device=x.device).view(1, 1, H, 1)
        fx = torch.fft.rfftfreq(W, device=x.device).view(1, 1, 1, freq.shape[-1])
        radius = torch.sqrt(fy ** 2 + fx ** 2)
        # Smooth Gaussian high-pass filter emphasizing structural edges
        hp_mask = 1.0 - torch.exp(-(radius ** 2) / (2.0 * (0.08 ** 2)))
        filtered_freq = freq * hp_mask
        spatial_edges = torch.fft.irfft2(filtered_freq, s=(H, W), norm="ortho")
        return spatial_edges.to(orig_dtype)

    def forward(self, g: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
        g1 = self.W_g(g)
        x1 = self.W_x(x)
        if g1.shape[2:] != x1.shape[2:]:
            g1 = F.interpolate(g1, size=x1.shape[2:], mode="bilinear", align_corners=False)

        combined = g1 + x1
        if self.use_spectral and self.spectral_proj is not None:
            edges = self._extract_high_freq_edges(x)
            combined = combined + 0.25 * self.spectral_proj(edges)

        psi = self.relu(combined)
        alpha = self.psi(psi)
        self.last_attention_map = alpha.detach()
        return x * alpha


class BiHemisphericCrossAttention(nn.Module):
    """
    Upgrade 4: Contralateral Bi-Hemispheric Symmetry Cross-Attention + Transformer Bottleneck.
    Mirrors encoder feature maps across the sagittal brain midline (horizontal flip) and computes
    multi-head cross-attention between the original hemisphere features (Query) and the
    contralateral hemisphere features (Key/Value) to detect asymmetric glioma lesions.
    """

    def __init__(self, dim: int, num_heads: int = 8, dropout_p: float = 0.1):
        super().__init__()
        self.dim = dim
        self.norm_q = nn.LayerNorm(dim)
        self.norm_kv = nn.LayerNorm(dim)
        self.cross_attn = nn.MultiheadAttention(
            embed_dim=dim, num_heads=num_heads, dropout=dropout_p, batch_first=True
        )
        self.norm_ffn = nn.LayerNorm(dim)
        self.ffn = nn.Sequential(
            nn.Linear(dim, dim * 2),
            nn.GELU(),
            nn.Dropout(dropout_p),
            nn.Linear(dim * 2, dim),
            nn.Dropout(dropout_p),
        )
        # Learnable gate encoding the difference between ipsi- and contra-lateral hemispheres
        self.asymmetry_gate = nn.Sequential(
            nn.Conv2d(dim * 2, dim, kernel_size=1, bias=False),
            nn.BatchNorm2d(dim),
            nn.SiLU(inplace=True),
        )
        self.last_asymmetry_map: Optional[torch.Tensor] = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, H, W = x.shape
        # Flip horizontally across sagittal midline
        x_contra = torch.flip(x, dims=[-1])

        # Compute explicit voxel-wise hemispheric asymmetry map for clinical visualization
        asym_diff = torch.abs(x - x_contra).mean(dim=1, keepdim=True)
        self.last_asymmetry_map = asym_diff.detach()

        # Flatten spatial tokens: (B, H*W, C)
        q_tokens = self.norm_q(x.flatten(2).transpose(1, 2))
        kv_tokens = self.norm_kv(x_contra.flatten(2).transpose(1, 2))

        attn_out, _ = self.cross_attn(query=q_tokens, key=kv_tokens, value=kv_tokens)
        tokens = q_tokens + attn_out
        tokens = tokens + self.ffn(self.norm_ffn(tokens))

        attn_spatial = tokens.transpose(1, 2).view(B, C, H, W)
        # Fuse original features with contralateral asymmetry-aware representation
        fused = self.asymmetry_gate(torch.cat([x, attn_spatial], dim=1))
        return x + fused


class UpBlock(nn.Module):
    """Bilinear upsampling + 3x3 Convolution to avoid transposed-convolution checkerboard artifacts."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.Sequential(
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.up(x)


class AttentionUNet(nn.Module):
    """
    NeuroSeg: 4-Stage Spectral-Transformer Attention U-Net with:
      - Residual ConvBlocks with Spatial Monte Carlo Dropout (for Bayesian Uncertainty)
      - Spectral FFT High-Pass Attention Gates at all 4 skip connections
      - Bi-Hemispheric Contralateral Cross-Attention Bottleneck
      - Multi-Scale Deep Supervision Heads (D4, D3, D2, D1)
    """

    def __init__(
        self,
        in_channels: int = 3,
        out_channels: int = 1,
        features: Tuple[int, ...] = (64, 128, 256, 512),
        dropout_p: float = 0.15,
        use_attention: bool = True,
        use_spectral: bool = True,
        use_bihemispheric_transformer: bool = True,
        deep_supervision: bool = False,
    ):
        super().__init__()
        self.use_attention = use_attention
        self.use_spectral = use_spectral
        self.use_bihemispheric_transformer = use_bihemispheric_transformer
        self.deep_supervision = deep_supervision

        f1, f2, f3, f4 = features
        bottleneck_dim = f4 * 2

        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)

        # Encoder pathway
        self.enc1 = ConvBlock(in_channels, f1, dropout_p=0.0)
        self.enc2 = ConvBlock(f1, f2, dropout_p=dropout_p * 0.5)
        self.enc3 = ConvBlock(f2, f3, dropout_p=dropout_p)
        self.enc4 = ConvBlock(f3, f4, dropout_p=dropout_p)

        # Bottleneck + Contralateral Bi-Hemispheric Transformer (Upgrade 4)
        self.bottleneck = ConvBlock(f4, bottleneck_dim, dropout_p=dropout_p)
        self.bihemispheric_attn = (
            BiHemisphericCrossAttention(dim=bottleneck_dim, num_heads=8, dropout_p=dropout_p)
            if use_bihemispheric_transformer
            else nn.Identity()
        )

        # Decoder pathway + Spectral Attention Gates (Upgrade 5)
        self.up4 = UpBlock(bottleneck_dim, f4)
        self.att4 = (
            SpectralAttentionGate(f_g=f4, f_l=f4, f_int=f4 // 2, use_spectral=use_spectral)
            if use_attention
            else nn.Identity()
        )
        self.dec4 = ConvBlock(f4 * 2, f4, dropout_p=dropout_p)

        self.up3 = UpBlock(f4, f3)
        self.att3 = (
            SpectralAttentionGate(f_g=f3, f_l=f3, f_int=f3 // 2, use_spectral=use_spectral)
            if use_attention
            else nn.Identity()
        )
        self.dec3 = ConvBlock(f3 * 2, f3, dropout_p=dropout_p * 0.5)

        self.up2 = UpBlock(f3, f2)
        self.att2 = (
            SpectralAttentionGate(f_g=f2, f_l=f2, f_int=f2 // 2, use_spectral=use_spectral)
            if use_attention
            else nn.Identity()
        )
        self.dec2 = ConvBlock(f2 * 2, f2, dropout_p=dropout_p * 0.5)

        self.up1 = UpBlock(f2, f1)
        self.att1 = (
            SpectralAttentionGate(f_g=f1, f_l=f1, f_int=f1 // 2, use_spectral=use_spectral)
            if use_attention
            else nn.Identity()
        )
        self.dec1 = ConvBlock(f1 * 2, f1, dropout_p=0.0)

        # Multi-Scale Deep Supervision Auxiliary Heads (Upgrade 3 - nnU-Net style)
        self.ds_head4 = nn.Conv2d(f4, out_channels, kernel_size=1)
        self.ds_head3 = nn.Conv2d(f3, out_channels, kernel_size=1)
        self.ds_head2 = nn.Conv2d(f2, out_channels, kernel_size=1)

        # Primary Full-Resolution Segmentation Head (D1)
        self.head = nn.Conv2d(f1, out_channels, kernel_size=1)

        self._init_weights()

    def _init_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

    def forward(
        self, x: torch.Tensor, return_deep_supervision: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, List[torch.Tensor]]]:
        # Encoder
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))

        # Bottleneck + Bi-Hemispheric Contralateral Cross-Attention
        b = self.bottleneck(self.pool(e4))
        b = self.bihemispheric_attn(b)

        # Decoder with Spectral Attention-Gated Skip Connections
        d4 = self.up4(b)
        s4 = self.att4(g=d4, x=e4) if self.use_attention else e4
        d4 = self.dec4(torch.cat([s4, d4], dim=1))

        d3 = self.up3(d4)
        s3 = self.att3(g=d3, x=e3) if self.use_attention else e3
        d3 = self.dec3(torch.cat([s3, d3], dim=1))

        d2 = self.up2(d3)
        s2 = self.att2(g=d2, x=e2) if self.use_attention else e2
        d2 = self.dec2(torch.cat([s2, d2], dim=1))

        d1 = self.up1(d2)
        s1 = self.att1(g=d1, x=e1) if self.use_attention else e1
        d1 = self.dec1(torch.cat([s1, d1], dim=1))

        logits_d1 = self.head(d1)

        if self.deep_supervision or return_deep_supervision:
            logits_d2 = self.ds_head2(d2)
            logits_d3 = self.ds_head3(d3)
            logits_d4 = self.ds_head4(d4)
            return logits_d1, [logits_d1, logits_d2, logits_d3, logits_d4]

        return logits_d1

    def get_attention_maps(self) -> List[Optional[torch.Tensor]]:
        """Returns the latest spatial attention maps [level4, level3, level2, level1]."""
        if not self.use_attention:
            return []
        return [
            self.att4.last_attention_map,
            self.att3.last_attention_map,
            self.att2.last_attention_map,
            self.att1.last_attention_map,
        ]

    def get_asymmetry_map(self) -> Optional[torch.Tensor]:
        """Returns the latest Bi-Hemispheric Contralateral Asymmetry Map from the bottleneck."""
        if hasattr(self.bihemispheric_attn, "last_asymmetry_map"):
            return self.bihemispheric_attn.last_asymmetry_map
        return None


def count_parameters(model: nn.Module) -> int:
    """Returns total number of trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
