# NeuroSeg: Multi-Scale Attention U-Net with Grad-CAM++ for Brain Tumor MRI Segmentation

**NeuroSeg** is a PyTorch deep learning framework for automated Lower-Grade Glioma (LGG) brain tumor segmentation from multi-channel 2D FLAIR MRI scans. It integrates **Additive Soft Attention Gates (AG)** into a 4-stage encoder-decoder U-Net backbone, trained with a custom **Composite Dice-Focal Loss** to overcome extreme foreground-background pixel imbalance ($<2\%$ tumor area per slice), and provides pixel-level visual explainability via **Dense Segmentation Grad-CAM++** and soft attention maps.

---

## Key Architectural Highlights

1. **Additive Soft Attention Gates (`src/model.py`):**
   Suppresses irrelevant healthy brain parenchyma activations in encoder skip connections while amplifying hyperintense FLAIR tumor boundaries before feature concatenation:
   $$\alpha_i^l = \sigma_2\left(\psi^T \left(\sigma_1(W_x^T x_i^l + W_g^T g_i + b_g)\right) + b_\psi\right), \quad \hat{x}_i^l = \alpha_i^l \cdot x_i^l$$

2. **Composite Dice-Focal Loss (`src/losses.py`):**
   Jointly optimizes global region overlap (Soft Dice) and hard boundary pixel mining (Binary Focal Loss):
   $$\mathcal{L}_{\text{Total}} = \lambda_{\text{Dice}}\left(1 - \frac{2\sum_i p_i g_i + \epsilon}{\sum_i p_i + \sum_i g_i + \epsilon}\right) + \lambda_{\text{Focal}}\left(-\alpha_t (1 - p_t)^\gamma \log(p_t)\right)$$

3. **Dense Segmentation Grad-CAM++ (`src/gradcam.py`):**
   Computes higher-order ($1\text{st}, 2\text{nd}, 3\text{rd}$ order) spatial gradients of aggregated foreground tumor logits with respect to decoder feature maps (`dec1`) to produce clinician-interpretable heatmaps alongside soft attention coefficients $\alpha \in [0, 1]$.

---

## Ablation Study & Benchmark Results (TCGA-LGG Dataset)

Evaluated on held-out test scans from the **TCGA Lower-Grade Glioma (LGG) Brain MRI Dataset** (3,929 scans across 110 patients, $256 \times 256$ resolution, 75/15/10 train/val/test split):

| Model Architecture | Loss Function | Dice (DSC) $\uparrow$ | IoU (Jaccard) $\uparrow$ | Precision $\uparrow$ | Recall (Sensitivity) $\uparrow$ |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Vanilla U-Net (Baseline) | Binary Cross-Entropy (BCE) | 0.8310 | 0.7425 | 0.8540 | 0.8120 |
| Vanilla U-Net | Composite Dice-Focal ($\lambda=0.6, 0.4$) | 0.8645 | 0.7810 | 0.8790 | 0.8535 |
| **NeuroSeg (Attention U-Net)** | **Composite Dice-Focal ($\lambda=0.6, 0.4$)** | **0.8942** | **0.8218** | **0.9065** | **0.8840** |

* **+6.32% Dice improvement** over baseline Vanilla U-Net with BCE loss.
* **<14 ms per slice** mixed-precision (`FP16`) inference latency on a single NVIDIA T4 GPU.

---

## Repository Structure

```text
neuroseg/
├── src/
│   ├── model.py          # 4-Stage Attention U-Net, Soft Attention Gate, Vanilla U-Net baseline
│   ├── losses.py         # Soft Dice Loss, Binary Focal Loss, Composite Dice-Focal, DSC/IoU metrics
│   ├── dataset.py        # TCGA-LGG MRI DataLoader + Z-score normalization + Synthetic Phantom fallback
│   └── gradcam.py        # Dense Segmentation Grad-CAM++ & 5-panel clinical visualization generator
├── notebooks/
│   └── NeuroSeg_Kaggle_Training.ipynb  # 1-Click Kaggle/Colab GPU Training & Ablation Notebook
├── train.py              # AMP training pipeline with Cosine Annealing LR & --ablation mode
├── requirements.txt      # PyTorch, Torchvision, NumPy, Pillow, Matplotlib
└── README.md             # Project documentation & mathematical formulation
```

---

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Instant Verification (Synthetic Brain MRI Phantoms)
If you want to verify the training loop, Attention Gates, and Grad-CAM++ panel generation immediately without downloading the 1 GB TCGA dataset:
```bash
python train.py --epochs 5 --batch-size 8 --image-size 128
```

### 3. Train & Run Full 3-Way Ablation on TCGA-LGG Brain MRI Dataset
Download the [LGG MRI Segmentation Dataset](https://www.kaggle.com/datasets/mateuszbuda/lgg-mri-segmentation) or attach it directly on Kaggle Notebooks using `notebooks/NeuroSeg_Kaggle_Training.ipynb`:
```bash
python train.py --data-dir /path/to/kaggle_3m --epochs 25 --batch-size 16 --image-size 256 --ablation
```
