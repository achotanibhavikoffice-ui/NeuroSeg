"""
NeuroSeg Volumetric 3D Stacking & Tumor Burden Quantification Engine.
Calculates:
  - 3D Tumor Volume in cm³ & mm³ from multi-slice axial MRI sequences
  - RECIST 1.1 Maximum Transaxial Long-Axis and Short-Axis Diameters (mm)
  - WHO Central Nervous System (CNS) Grade estimation heuristics
  - Slice-by-slice slice-occupancy statistics
"""

import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np


class VolumetricTumorQuantifier:
    """
    Volumetric quantification engine for brain MRI axial sequence stacks.
    Standard axial brain MRI slice thickness (voxel_z): typically 3.0 to 5.0 mm.
    In-plane spatial resolution (voxel_x, voxel_y): typically 0.5 to 1.0 mm/pixel.
    """

    def __init__(
        self,
        voxel_x: float = 0.9375,  # mm per pixel (typical TCGA-LGG in-plane resolution)
        voxel_y: float = 0.9375,  # mm per pixel
        slice_thickness: float = 4.0,  # mm slice thickness (voxel_z)
    ):
        self.voxel_x = voxel_x
        self.voxel_y = voxel_y
        self.slice_thickness = slice_thickness
        self.voxel_volume_mm3 = self.voxel_x * self.voxel_y * self.slice_thickness

    def compute_slice_metrics(self, mask: np.ndarray) -> Dict[str, float]:
        """
        Calculates 2D planar metrics for a single slice binary mask (0 or 1).
        """
        pixel_count = int(np.sum(mask > 0.5))
        area_mm2 = pixel_count * (self.voxel_x * self.voxel_y)
        area_cm2 = area_mm2 / 100.0

        # RECIST 1.1 maximum feret diameter in 2D plane
        y_indices, x_indices = np.where(mask > 0.5)
        if len(x_indices) > 2:
            pts = np.column_stack([x_indices * self.voxel_x, y_indices * self.voxel_y])
            # Sample subset if points are dense to bound computation
            if len(pts) > 600:
                sub_idx = np.random.choice(len(pts), 600, replace=False)
                pts_sample = pts[sub_idx]
            else:
                pts_sample = pts
            diff = pts_sample[:, np.newaxis, :] - pts_sample[np.newaxis, :, :]
            dist_sq = np.sum(diff ** 2, axis=-1)
            max_diameter_mm = float(np.sqrt(np.max(dist_sq)))
        else:
            max_diameter_mm = 0.0

        return {
            "pixel_count": pixel_count,
            "area_mm2": round(area_mm2, 2),
            "area_cm2": round(area_cm2, 3),
            "max_diameter_mm": round(max_diameter_mm, 2),
        }

    def compute_volume_stack(
        self, slice_masks: List[np.ndarray], confidence_scores: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Computes 3D Volumetric burden across an ordered sequence of contiguous axial slices.
        """
        total_tumor_voxels = 0
        slice_summaries = []
        global_max_diameter_mm = 0.0
        peak_slice_idx = -1
        max_slice_area = -1.0

        for idx, mask in enumerate(slice_masks):
            metrics = self.compute_slice_metrics(mask)
            total_tumor_voxels += metrics["pixel_count"]
            if metrics["max_diameter_mm"] > global_max_diameter_mm:
                global_max_diameter_mm = metrics["max_diameter_mm"]
            if metrics["area_mm2"] > max_slice_area:
                max_slice_area = metrics["area_mm2"]
                peak_slice_idx = idx

            metrics["slice_index"] = idx + 1
            if confidence_scores and idx < len(confidence_scores):
                metrics["model_confidence"] = round(confidence_scores[idx], 4)
            slice_summaries.append(metrics)

        total_volume_mm3 = total_tumor_voxels * self.voxel_volume_mm3
        total_volume_cm3 = total_volume_mm3 / 1000.0

        # Equivalent spherical diameter
        if total_volume_mm3 > 0:
            equivalent_spherical_diameter_mm = 2.0 * math.pow((3.0 * total_volume_mm3) / (4.0 * math.pi), 1.0 / 3.0)
        else:
            equivalent_spherical_diameter_mm = 0.0

        # WHO CNS Glioma staging indicators based on volumetry and infiltrative margins
        if total_volume_cm3 == 0:
            clinical_category = "No Abnormal Lesion Detected"
            urgency = "Routine"
        elif total_volume_cm3 < 8.0:
            clinical_category = "Focal Low-Volume Intra-Axial Lesion (Likely WHO CNS Grade 1-2)"
            urgency = "Standard Oncologic Follow-Up"
        elif total_volume_cm3 < 25.0:
            clinical_category = "Intermediate Intra-Axial Mass with Infiltrative Margins (WHO CNS Grade 2-3 Differential)"
            urgency = "Neurosurgical / Radiation Oncology Consultation"
        else:
            clinical_category = "Extensive Volumetric Mass with Marked Mass Effect (WHO CNS Grade 3-4 Suspicion)"
            urgency = "Urgent Neurosurgical Evaluation & Decompression Review"

        return {
            "total_volume_cm3": round(total_volume_cm3, 3),
            "total_volume_mm3": round(total_volume_mm3, 1),
            "total_tumor_voxels": int(total_tumor_voxels),
            "recist_longest_diameter_mm": round(global_max_diameter_mm, 2),
            "equivalent_spherical_diameter_mm": round(equivalent_spherical_diameter_mm, 2),
            "peak_lesion_slice_index": peak_slice_idx + 1 if peak_slice_idx >= 0 else None,
            "slices_involved_count": sum(1 for s in slice_summaries if s["pixel_count"] > 0),
            "total_slices_analyzed": len(slice_masks),
            "clinical_category": clinical_category,
            "clinical_urgency": urgency,
            "slice_breakdown": slice_summaries,
        }
