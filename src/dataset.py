"""
Brain MRI Segmentation Dataset Pipeline.
Supports:
  1. TCGA LGG Brain MRI Dataset (3,929 paired FLAIR MRI slices & masks across 110 patients)
  2. Synthetic Brain MRI Phantom Generator (for rapid local verification & unit testing)
"""

import glob
import os
import random
from typing import Callable, List, Optional, Tuple

import numpy as np
from PIL import Image
import torch
from torch.utils.data import DataLoader, Dataset


class BrainMRIDataset(Dataset):
    """
    PyTorch Dataset for paired 2D Brain MRI scans and binary segmentation masks.
    Automatically discovers paired (*_mask.tif) files in the TCGA-LGG dataset structure.
    """

    def __init__(
        self,
        image_paths: List[str],
        mask_paths: List[str],
        image_size: int = 256,
        augment: bool = False,
    ):
        super().__init__()
        assert len(image_paths) == len(mask_paths), "Mismatch between image and mask counts"
        self.image_paths = image_paths
        self.mask_paths = mask_paths
        self.image_size = image_size
        self.augment = augment

    def __len__(self) -> int:
        return len(self.image_paths)

    def _apply_augmentations(
        self, img: np.ndarray, mask: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        # Random horizontal flip
        if random.random() > 0.5:
            img = np.fliplr(img).copy()
            mask = np.fliplr(mask).copy()
        # Random vertical flip
        if random.random() > 0.5:
            img = np.flipud(img).copy()
            mask = np.flipud(mask).copy()
        # Random 90-degree rotations
        k = random.randint(0, 3)
        if k > 0:
            img = np.rot90(img, k, axes=(0, 1)).copy()
            mask = np.rot90(mask, k, axes=(0, 1)).copy()
        # Subtle intensity contrast jitter on MRI channels
        if random.random() > 0.5:
            scale = random.uniform(0.9, 1.1)
            img = np.clip(img * scale, 0.0, 1.0)
        return img, mask

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        img_pil = Image.open(self.image_paths[idx]).convert("RGB")
        mask_pil = Image.open(self.mask_paths[idx]).convert("L")

        if img_pil.size != (self.image_size, self.image_size):
            img_pil = img_pil.resize((self.image_size, self.image_size), Image.BILINEAR)
            mask_pil = mask_pil.resize((self.image_size, self.image_size), Image.NEAREST)

        img = np.asarray(img_pil, dtype=np.float32) / 255.0
        mask = (np.asarray(mask_pil, dtype=np.float32) > 127.0).astype(np.float32)

        if self.augment:
            img, mask = self._apply_augmentations(img, mask)

        # Channel-wise Z-score standardization per scan
        mean = img.mean(axis=(0, 1), keepdims=True)
        std = img.std(axis=(0, 1), keepdims=True) + 1e-6
        img_norm = (img - mean) / std

        img_tensor = torch.from_numpy(img_norm).permute(2, 0, 1).float()
        mask_tensor = torch.from_numpy(mask).unsqueeze(0).float()
        return img_tensor, mask_tensor


class SyntheticBrainMRIDataset(Dataset):
    """
    Generates realistic 2D Brain MRI Phantoms with hyperintense FLAIR tumor lesions
    for instant architecture verification, unit testing, and CI/CD smoke tests.
    """

    def __init__(self, num_samples: int = 120, image_size: int = 128, seed: int = 42):
        super().__init__()
        self.num_samples = num_samples
        self.image_size = image_size
        self.seed = seed

    def __len__(self) -> int:
        return self.num_samples

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        rng = np.random.RandomState(self.seed + idx)
        H = W = self.image_size
        y, x = np.ogrid[:H, :W]

        # Brain cranial ellipse
        cy, cx = H // 2 + rng.randint(-4, 5), W // 2 + rng.randint(-4, 5)
        ry, rx = int(H * 0.38), int(W * 0.32)
        brain_mask = (((y - cy) / ry) ** 2 + ((x - cx) / rx) ** 2) <= 1.0

        # Base T1 / FLAIR / T2 synthetic tissue intensities
        img = np.zeros((3, H, W), dtype=np.float32)
        for c in range(3):
            tissue = brain_mask.astype(np.float32) * (0.35 + 0.08 * c)
            noise = rng.normal(0, 0.04, size=(H, W)).astype(np.float32)
            img[c] = np.clip(tissue + noise * brain_mask, 0.0, 1.0)

        # Focal hyperintense glioma lesion inside the parenchyma
        ty = cy + rng.randint(-ry // 2, ry // 2)
        tx = cx + rng.randint(-rx // 2, rx // 2)
        tr_y = rng.randint(max(5, H // 18), max(8, H // 9))
        tr_x = rng.randint(max(5, W // 18), max(8, W // 9))
        tumor_mask = ((((y - ty) / tr_y) ** 2 + ((x - tx) / tr_x) ** 2) <= 1.0) & brain_mask

        # Hyperintense tumor signal on FLAIR (channel 1) and T2 (channel 2)
        img[0][tumor_mask] += 0.35
        img[1][tumor_mask] += 0.55
        img[2][tumor_mask] += 0.45
        img = np.clip(img, 0.0, 1.0)

        return torch.from_numpy(img).float(), torch.from_numpy(tumor_mask.astype(np.float32)).unsqueeze(0)


def create_dataloaders(
    data_dir: Optional[str] = None,
    image_size: int = 256,
    batch_size: int = 16,
    num_workers: int = 2,
    seed: int = 42,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Creates Train (75%), Validation (15%), and Test (10%) DataLoaders.
    Falls back to SyntheticBrainMRIDataset if data_dir is not provided or empty.
    """
    mask_paths = []
    if data_dir and os.path.exists(data_dir):
        mask_paths = sorted(glob.glob(os.path.join(data_dir, "**", "*_mask.tif"), recursive=True))

    if not mask_paths:
        print("[Dataset] Using Synthetic Brain MRI Phantom Dataset for verification.")
        train_ds = SyntheticBrainMRIDataset(num_samples=96, image_size=image_size, seed=seed)
        val_ds = SyntheticBrainMRIDataset(num_samples=24, image_size=image_size, seed=seed + 1000)
        test_ds = SyntheticBrainMRIDataset(num_samples=24, image_size=image_size, seed=seed + 2000)
    else:
        image_paths = [p.replace("_mask.tif", ".tif") for p in mask_paths]
        indices = list(range(len(image_paths)))
        random.Random(seed).shuffle(indices)

        n_total = len(indices)
        n_train = int(0.75 * n_total)
        n_val = int(0.15 * n_total)

        train_idx = indices[:n_train]
        val_idx = indices[n_train : n_train + n_val]
        test_idx = indices[n_train + n_val :]

        train_ds = BrainMRIDataset(
            [image_paths[i] for i in train_idx],
            [mask_paths[i] for i in train_idx],
            image_size=image_size,
            augment=True,
        )
        val_ds = BrainMRIDataset(
            [image_paths[i] for i in val_idx],
            [mask_paths[i] for i in val_idx],
            image_size=image_size,
            augment=False,
        )
        test_ds = BrainMRIDataset(
            [image_paths[i] for i in test_idx],
            [mask_paths[i] for i in test_idx],
            image_size=image_size,
            augment=False,
        )
        print(
            f"[Dataset] Loaded TCGA-LGG Brain MRI Dataset: "
            f"Train={len(train_ds)}, Val={len(val_ds)}, Test={len(test_ds)}"
        )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True)
    return train_loader, val_loader, test_loader
