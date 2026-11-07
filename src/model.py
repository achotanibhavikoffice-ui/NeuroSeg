"""
NeuroSeg: Multi-Scale Attention U-Net for Brain Tumor MRI Segmentation
Implements soft additive Attention Gates (Oktay et al., MIDL) and a baseline
Vanilla U-Net for architectural ablation studies.
"""

from typing import List, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    """Double 3x3 Convolution -> BatchNorm -> ReLU block with optional spatial dropout."""

    def __init__(self, in_channels: int, out_channels: int, dropout_p: float = 0.0):
        super().__init__()
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        ]
        if dropout_p > 0.0:
            layers.insert(3, nn.Dropout2d(p=dropout_p))
        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class AttentionGate(nn.Module):
    """
    Additive Soft Attention Gate (AG) for medical image segmentation.
    Suppresses irrelevant background tissue activation in skip connections
    while highlighting salient pathological regions (e.g., FLAIR hyperintense tumors).

    Formulation:
        alpha = sigmoid(psi(ReLU(W_g(g) + W_x(x) + b_g)) + b_psi)
        x_hat = x * alpha
    """

    def __init__(self, f_g: int, f_l: int, f_int: int):
        super().__init__()
        self.W_g = nn.Sequential(
            nn.Conv2d(f_g, f_int, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(f_int),
        )
        self.W_x = nn.Sequential(
            nn.Conv2d(f_l, f_int, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(f_int),
        )
        self.psi = nn.Sequential(
            nn.Conv2d(f_int, 1, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(1),
            nn.Sigmoid(),
        )
        self.relu = nn.ReLU(inplace=True)
        self.last_attention_map: Optional[torch.Tensor] = None

    def forward(self, g: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
        g1 = self.W_g(g)
        x1 = self.W_x(x)
        if g1.shape[2:] != x1.shape[2:]:
            g1 = F.interpolate(g1, size=x1.shape[2:], mode="bilinear", align_corners=False)
        psi = self.relu(g1 + x1)
        alpha = self.psi(psi)
        self.last_attention_map = alpha.detach()
        return x * alpha


class UpBlock(nn.Module):
    """Bilinear upsampling + 3x3 Convolution to avoid checkerboard artifacts."""

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
    4-Stage Attention U-Net for 2D Multi-Channel Brain MRI Segmentation (e.g., FLAIR / T1ce / T2).
    Stores intermediate activations and soft attention maps for Grad-CAM++ and clinical explainability.
    """

    def __init__(
        self,
        in_channels: int = 3,
        out_channels: int = 1,
        features: Tuple[int, ...] = (64, 128, 256, 512),
        dropout_p: float = 0.1,
        use_attention: bool = True,
    ):
        super().__init__()
        self.use_attention = use_attention
        f1, f2, f3, f4 = features
        bottleneck_dim = f4 * 2

        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)

        # Encoder pathway
        self.enc1 = ConvBlock(in_channels, f1)
        self.enc2 = ConvBlock(f1, f2)
        self.enc3 = ConvBlock(f2, f3, dropout_p=dropout_p)
        self.enc4 = ConvBlock(f3, f4, dropout_p=dropout_p)

        # Bottleneck
        self.bottleneck = ConvBlock(f4, bottleneck_dim, dropout_p=dropout_p)

        # Decoder pathway + Attention Gates
        self.up4 = UpBlock(bottleneck_dim, f4)
        self.att4 = AttentionGate(f_g=f4, f_l=f4, f_int=f4 // 2) if use_attention else nn.Identity()
        self.dec4 = ConvBlock(f4 * 2, f4)

        self.up3 = UpBlock(f4, f3)
        self.att3 = AttentionGate(f_g=f3, f_l=f3, f_int=f3 // 2) if use_attention else nn.Identity()
        self.dec3 = ConvBlock(f3 * 2, f3)

        self.up2 = UpBlock(f3, f2)
        self.att2 = AttentionGate(f_g=f2, f_l=f2, f_int=f2 // 2) if use_attention else nn.Identity()
        self.dec2 = ConvBlock(f2 * 2, f2)

        self.up1 = UpBlock(f2, f1)
        self.att1 = AttentionGate(f_g=f1, f_l=f1, f_int=f1 // 2) if use_attention else nn.Identity()
        self.dec1 = ConvBlock(f1 * 2, f1)

        # 1x1 segmentation head
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

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))

        # Bottleneck
        b = self.bottleneck(self.pool(e4))

        # Decoder with Attention-Gated Skip Connections
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

        logits = self.head(d1)
        return logits

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


def count_parameters(model: nn.Module) -> int:
    """Returns total number of trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
