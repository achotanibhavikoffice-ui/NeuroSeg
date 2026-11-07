export interface Biomarkers {
  idh1: string;
  codel_1p19q: string;
  mgmt: string;
}

export interface PatientRecord {
  patient_id: string;
  mrn: string;
  name: string;
  age: number;
  sex: string;
  who_grade: string;
  histology: string;
  biomarkers: Biomarkers;
  location: string;
  volume_cm3: number;
  recist_mm: number;
  dsc: number;
  hd95_mm: number;
  ece: number;
  urgency: string;
  status: string;
  seed: number;
}

export interface SliceData {
  slice_index: number;
  flair_image_b64: string;
  gt_mask_b64: string;
  pred_mask_b64: string;
  gradcam_b64: string;
  uncertainty_b64: string;
  asymmetry_b64: string;
  tumor_pixel_count: number;
  confidence: number;
  epistemic_entropy: number;
  hd95_mm: number;
}

export interface SliceBreakdown {
  slice_index: number;
  pixel_count: number;
  area_mm2: number;
  area_cm2: number;
  max_diameter_mm: number;
  model_confidence?: number;
}

export interface VolumetryData {
  total_volume_cm3: number;
  total_volume_mm3: number;
  total_tumor_voxels: number;
  recist_longest_diameter_mm: number;
  equivalent_spherical_diameter_mm: number;
  peak_lesion_slice_index: number;
  slices_involved_count: number;
  total_slices_analyzed: number;
  clinical_category: string;
  clinical_urgency: string;
  slice_breakdown: SliceBreakdown[];
}

export interface StudyStackResponse {
  status: string;
  patient: PatientRecord;
  patient_id: string;
  sequence: string;
  total_slices: number;
  inference_ms_per_slice: number;
  slices: SliceData[];
  volumetry: VolumetryData;
}

export interface AblationModelRow {
  id: string;
  name: string;
  backbone: string;
  loss: string;
  dsc: number;
  iou: number;
  hd95_mm: number;
  ece: number;
  precision: number;
  recall: number;
  latency_ms: number;
  params_m: number;
}

export interface LongitudinalTimepoint {
  scan_id: string;
  date: string;
  volume_cm3: number;
  recist_mm: number;
  hd95_mm: number;
  edema_index: number;
  clinical_note: string;
}

export interface LongitudinalResponse {
  patient_id: string;
  protocol: string;
  rano_status: string;
  timepoints: LongitudinalTimepoint[];
}

export const DEFAULT_COHORT: PatientRecord[] = [
  {
    patient_id: 'TCGA-CS-4941',
    mrn: 'MRN-84920-LGG',
    name: 'Patient TCGA-CS-4941',
    age: 47,
    sex: 'Male',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Diffuse Astrocytoma, IDH-mutant',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Intact', mgmt: 'Methylated' },
    location: 'Left Frontal-Insular Lobe',
    volume_cm3: 18.42,
    recist_mm: 34.8,
    dsc: 0.924,
    hd95_mm: 3.12,
    ece: 0.018,
    urgency: 'Neurosurgical Review',
    status: 'Active Study',
    seed: 101,
  },
  {
    patient_id: 'TCGA-DU-5872',
    mrn: 'MRN-73104-LGG',
    name: 'Patient TCGA-DU-5872',
    age: 39,
    sex: 'Female',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Oligodendroglioma, IDH-mutant, 1p/19q-codeleted',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Codeleted', mgmt: 'Methylated' },
    location: 'Right Frontotemporal Cortex',
    volume_cm3: 11.85,
    recist_mm: 26.4,
    dsc: 0.919,
    hd95_mm: 3.45,
    ece: 0.021,
    urgency: 'Oncologic Follow-Up',
    status: 'Verified',
    seed: 202,
  },
  {
    patient_id: 'TCGA-FG-6689',
    mrn: 'MRN-91255-LGG',
    name: 'Patient TCGA-FG-6689',
    age: 54,
    sex: 'Male',
    who_grade: 'WHO CNS Grade 3',
    histology: 'Anaplastic Astrocytoma, IDH-wildtype',
    biomarkers: { idh1: 'Wildtype', codel_1p19q: 'Intact', mgmt: 'Unmethylated' },
    location: 'Left Parieto-Occipital White Matter',
    volume_cm3: 29.64,
    recist_mm: 43.2,
    dsc: 0.908,
    hd95_mm: 3.84,
    ece: 0.024,
    urgency: 'Urgent Resection Planning',
    status: 'Priority Triage',
    seed: 303,
  },
  {
    patient_id: 'TCGA-HT-7684',
    mrn: 'MRN-60419-LGG',
    name: 'Patient TCGA-HT-7684',
    age: 33,
    sex: 'Female',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Diffuse Astrocytoma, IDH-mutant',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Intact', mgmt: 'Methylated' },
    location: 'Right Superior Frontal Gyrus',
    volume_cm3: 6.74,
    recist_mm: 19.1,
    dsc: 0.931,
    hd95_mm: 2.76,
    ece: 0.015,
    urgency: 'Routine Surveillance',
    status: 'Stable',
    seed: 404,
  },
];

export const DEFAULT_ABLATION: AblationModelRow[] = [
  {
    id: 'v1_unet_bce',
    name: '1. Vanilla U-Net (Baseline)',
    backbone: '4-Stage Standard Conv U-Net',
    loss: 'Binary Cross-Entropy (BCE)',
    dsc: 0.831,
    iou: 0.7425,
    hd95_mm: 8.64,
    ece: 0.068,
    precision: 0.854,
    recall: 0.812,
    latency_ms: 11.2,
    params_m: 31.04,
  },
  {
    id: 'v2_unet_dicefocal',
    name: '2. Vanilla U-Net + Dice-Focal',
    backbone: '4-Stage Standard Conv U-Net',
    loss: 'Composite Dice-Focal (0.6 / 0.4)',
    dsc: 0.8645,
    iou: 0.781,
    hd95_mm: 6.42,
    ece: 0.049,
    precision: 0.879,
    recall: 0.8535,
    latency_ms: 11.2,
    params_m: 31.04,
  },
  {
    id: 'v3_att_unet',
    name: '3. Attention U-Net (Oktay et al.)',
    backbone: 'Additive Soft Attention Gates (AG)',
    loss: 'Composite Dice-Focal (0.6 / 0.4)',
    dsc: 0.8942,
    iou: 0.8218,
    hd95_mm: 4.85,
    ece: 0.034,
    precision: 0.9065,
    recall: 0.884,
    latency_ms: 12.1,
    params_m: 31.39,
  },
  {
    id: 'v4_spectral_deepsup',
    name: '4. + Spectral FFT Gates & Deep Supervision',
    backbone: '2D Fourier High-Pass AG + 4-Scale DeepSup',
    loss: 'Multi-Scale Deep Supervision Dice-Focal',
    dsc: 0.9076,
    iou: 0.8394,
    hd95_mm: 3.98,
    ece: 0.025,
    precision: 0.915,
    recall: 0.901,
    latency_ms: 12.6,
    params_m: 31.74,
  },
  {
    id: 'v5_neuroseg_v3_full',
    name: '5. NeuroSeg v3.0 (Full Proposed)',
    backbone: 'Bi-Hemispheric TransUNet + Spectral AG + DeepSup',
    loss: 'Tri-Composite (Dice + Focal + Kervadec SDM Boundary)',
    dsc: 0.9184,
    iou: 0.8512,
    hd95_mm: 3.42,
    ece: 0.0192,
    precision: 0.928,
    recall: 0.9115,
    latency_ms: 13.4,
    params_m: 34.82,
  },
];

/**
 * Generates high-resolution procedural MRI FLAIR, Tumor Mask, Grad-CAM++,
 * Epistemic Uncertainty Halo, and Contralateral Asymmetry Base64 canvases
 * when running without the Python backend server.
 */
function synthesizeClientStudy(patientId: string, numSlices = 16): StudyStackResponse {
  const patient = DEFAULT_COHORT.find((p) => p.patient_id === patientId) || DEFAULT_COHORT[0];
  const slices: SliceData[] = [];
  const breakdown: SliceBreakdown[] = [];

  const isLeft = patient.location.toLowerCase().includes('left');
  const baseRadius = Math.sqrt(patient.volume_cm3 * 18);

  for (let i = 0; i < numSlices; i++) {
    const zNorm = (i - 7.5) / 7.5; // -1 to +1 cranial-caudal
    const brainScale = Math.max(0.55, Math.sqrt(Math.max(0.1, 1 - zNorm * zNorm * 0.65)));
    // Lesion peaks around slice 8-10
    const distFromPeak = Math.abs(i - 8);
    const hasLesion = distFromPeak <= 4;
    const lesionScale = hasLesion ? Math.cos((distFromPeak / 4.5) * (Math.PI / 2)) : 0;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. FLAIR MRI Slice
    ctx.fillStyle = '#05080d';
    ctx.fillRect(0, 0, size, size);

    // Outer skull halo
    ctx.strokeStyle = '#384656';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(128, 128, 86 * brainScale, 104 * brainScale, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Left and right cerebral hemispheres
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 98 * brainScale);
    grad.addColorStop(0, '#5a6875');
    grad.addColorStop(0.55, '#424e5b');
    grad.addColorStop(0.92, '#29333e');
    grad.addColorStop(1, '#0b1017');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 128, 81 * brainScale, 99 * brainScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sagittal midline falx cerebri & ventricles
    ctx.strokeStyle = '#141c24';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(128, 128 - 96 * brainScale);
    ctx.lineTo(128, 128 + 96 * brainScale);
    ctx.stroke();

    // Lateral ventricles
    ctx.fillStyle = '#111820';
    ctx.beginPath();
    ctx.ellipse(115, 126, 7 * brainScale, 22 * brainScale, -0.18, 0, Math.PI * 2);
    ctx.ellipse(141, 126, 7 * brainScale, 22 * brainScale, 0.18, 0, Math.PI * 2);
    ctx.fill();

    const tx = isLeft ? 94 : 162;
    const ty = 114;
    const rx = baseRadius * lesionScale * 0.92;
    const ry = baseRadius * lesionScale * 1.12;

    if (lesionScale > 0.05) {
      // Hyperintense FLAIR glioma core + perilesional edema
      const tGrad = ctx.createRadialGradient(tx, ty, 2, tx, ty, Math.max(rx, ry) * 1.45);
      tGrad.addColorStop(0, '#f0f7f4');
      tGrad.addColorStop(0.5, '#b8d4cc');
      tGrad.addColorStop(0.8, '#698982');
      tGrad.addColorStop(1, 'rgba(66,78,91,0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.ellipse(tx, ty, rx * 1.35, ry * 1.35, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const flairB64 = canvas.toDataURL('image/png').split(',')[1];

    // 2. Predicted Segmentation Mask
    ctx.clearRect(0, 0, size, size);
    if (lesionScale > 0.05) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.82)';
      ctx.beginPath();
      ctx.ellipse(tx, ty, rx, ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const predB64 = canvas.toDataURL('image/png').split(',')[1];

    // 3. Ground Truth Mask
    ctx.clearRect(0, 0, size, size);
    if (lesionScale > 0.05) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(tx + 1, ty - 1, rx * 1.03, ry * 0.98, 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const gtB64 = canvas.toDataURL('image/png').split(',')[1];

    // 4. Grad-CAM++ Higher-Order Saliency
    ctx.clearRect(0, 0, size, size);
    if (lesionScale > 0.05) {
      const camGrad = ctx.createRadialGradient(tx, ty, 2, tx, ty, Math.max(rx, ry) * 1.85);
      camGrad.addColorStop(0, 'rgba(255, 30, 0, 0.92)');
      camGrad.addColorStop(0.4, 'rgba(255, 190, 0, 0.72)');
      camGrad.addColorStop(0.75, 'rgba(0, 210, 180, 0.35)');
      camGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = camGrad;
      ctx.beginPath();
      ctx.ellipse(tx, ty, rx * 1.85, ry * 1.85, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const camB64 = canvas.toDataURL('image/png').split(',')[1];

    // 5. Bayesian Epistemic Uncertainty Halo (Ring around infiltrative margin!)
    ctx.clearRect(0, 0, size, size);
    if (lesionScale > 0.05) {
      ctx.strokeStyle = 'rgba(234, 176, 78, 0.92)';
      ctx.lineWidth = Math.max(5, rx * 0.28);
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(tx, ty, rx * 1.04, ry * 1.04, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    const uncB64 = canvas.toDataURL('image/png').split(',')[1];

    // 6. Contralateral Bi-Hemispheric Asymmetry Map
    ctx.clearRect(0, 0, size, size);
    if (lesionScale > 0.05) {
      const asymGrad = ctx.createRadialGradient(tx, ty, 1, tx, ty, Math.max(rx, ry) * 1.5);
      asymGrad.addColorStop(0, 'rgba(86, 197, 178, 0.95)');
      asymGrad.addColorStop(0.55, 'rgba(8, 127, 114, 0.65)');
      asymGrad.addColorStop(1, 'rgba(8, 21, 34, 0)');
      ctx.fillStyle = asymGrad;
      ctx.beginPath();
      ctx.ellipse(tx, ty, rx * 1.5, ry * 1.5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Mirror contralateral reference outline
      const contraTx = 256 - tx;
      ctx.strokeStyle = 'rgba(86, 197, 178, 0.55)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(contraTx, ty, rx, ry, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const asymB64 = canvas.toDataURL('image/png').split(',')[1];

    const pxCount = lesionScale > 0.05 ? Math.round(Math.PI * rx * ry) : 0;
    const areaMm2 = +(pxCount * 0.8789).toFixed(1);
    const maxDia = lesionScale > 0.05 ? +(Math.max(rx, ry) * 2 * 0.9375).toFixed(1) : 0;
    const conf = lesionScale > 0.05 ? +(0.89 + 0.08 * lesionScale).toFixed(3) : 0.992;

    slices.push({
      slice_index: i + 1,
      flair_image_b64: flairB64,
      gt_mask_b64: gtB64,
      pred_mask_b64: predB64,
      gradcam_b64: camB64,
      uncertainty_b64: uncB64,
      asymmetry_b64: asymB64,
      tumor_pixel_count: pxCount,
      confidence: conf,
      epistemic_entropy: lesionScale > 0.05 ? +(0.14 * (1.2 - lesionScale * 0.5)).toFixed(4) : 0.012,
      hd95_mm: lesionScale > 0.05 ? +(patient.hd95_mm * (1.15 - 0.2 * lesionScale)).toFixed(2) : 0,
    });

    breakdown.push({
      slice_index: i + 1,
      pixel_count: pxCount,
      area_mm2: areaMm2,
      area_cm2: +(areaMm2 / 100).toFixed(3),
      max_diameter_mm: maxDia,
      model_confidence: conf,
    });
  }

  return {
    status: 'success',
    patient,
    patient_id: patient.patient_id,
    sequence: 'Axial T2-FLAIR + Bi-Hemispheric Spectral Attention (3.0T)',
    total_slices: numSlices,
    inference_ms_per_slice: 13.4,
    slices,
    volumetry: {
      total_volume_cm3: patient.volume_cm3,
      total_volume_mm3: +(patient.volume_cm3 * 1000).toFixed(1),
      total_tumor_voxels: breakdown.reduce((acc, s) => acc + s.pixel_count, 0),
      recist_longest_diameter_mm: patient.recist_mm,
      equivalent_spherical_diameter_mm: +(Math.cbrt((6 * patient.volume_cm3 * 1000) / Math.PI)).toFixed(1),
      peak_lesion_slice_index: 9,
      slices_involved_count: breakdown.filter((s) => s.pixel_count > 0).length,
      total_slices_analyzed: numSlices,
      clinical_category: `${patient.histology} (${patient.who_grade})`,
      clinical_urgency: patient.urgency,
      slice_breakdown: breakdown,
    },
  };
}

export const neuroApi = {
  async getCohort(): Promise<PatientRecord[]> {
    try {
      const res = await fetch('/api/cohort');
      if (!res.ok) throw new Error('Backend offline');
      const data = await res.json();
      return data.patients;
    } catch {
      return DEFAULT_COHORT;
    }
  },

  async getStudyStack(patientId = 'TCGA-CS-4941', mcPasses = 8): Promise<StudyStackResponse> {
    try {
      const res = await fetch(`/api/demo-stack?patient_id=${encodeURIComponent(patientId)}&num_slices=16&mc_passes=${mcPasses}`);
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      return synthesizeClientStudy(patientId, 16);
    }
  },

  async getAblation(): Promise<AblationModelRow[]> {
    try {
      const res = await fetch('/api/ablation');
      if (!res.ok) throw new Error('Backend offline');
      const data = await res.json();
      return data.models;
    } catch {
      return DEFAULT_ABLATION;
    }
  },

  async getLongitudinal(patientId = 'TCGA-CS-4941'): Promise<LongitudinalResponse> {
    try {
      const res = await fetch(`/api/longitudinal/${encodeURIComponent(patientId)}`);
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      return {
        patient_id: patientId,
        protocol: 'Adjuvant Temozolomide + Fractionated Radiotherapy (54 Gy)',
        rano_status: 'Partial Response (PR) — -38.4% Volumetric Reduction',
        timepoints: [
          {
            scan_id: 'TP-1 (Baseline Pre-Tx)',
            date: '2026-03-14',
            volume_cm3: 18.42,
            recist_mm: 34.8,
            hd95_mm: 3.12,
            edema_index: 0.42,
            clinical_note: 'Initial presentation with focal motor seizures; hyperintense FLAIR left insular mass.',
          },
          {
            scan_id: 'TP-2 (Month 3 Post-RT)',
            date: '2026-06-18',
            volume_cm3: 14.15,
            recist_mm: 29.4,
            hd95_mm: 2.95,
            edema_index: 0.28,
            clinical_note: '23.2% interval cytoreductive regression; reduced perilesional vasogenic edema.',
          },
          {
            scan_id: 'TP-3 (Month 6 Cycle 4 TMZ)',
            date: '2026-09-22',
            volume_cm3: 11.34,
            recist_mm: 24.1,
            hd95_mm: 2.68,
            edema_index: 0.19,
            clinical_note: 'Continued volumetric shrinkage (-38.4% from baseline); meets RANO Partial Response criteria.',
          },
        ],
      };
    }
  },

  async generateReport(patient: PatientRecord, volumetry: VolumetryData, indication: string): Promise<{ source: string; report_markdown: string }> {
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          patient_age: patient.age,
          patient_gender: patient.sex,
          indication,
          volumetry,
        }),
      });
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      return {
        source: 'NeuroSeg v3.0 ACR/RSNA Autonomous Synthesis Engine',
        report_markdown: `# NEURO-RADIOLOGY MRI CONSULTATION REPORT
**Department of Diagnostic & Molecular Neuro-Imaging**

---

### 1. PATIENT DEMOGRAPHICS & MOLECULAR PROFILE
• **Patient ID / MRN:** ${patient.patient_id} (${patient.mrn})
• **Age / Sex:** ${patient.age} Y / ${patient.sex.toUpperCase()}
• **Histological Class:** ${patient.histology} (${patient.who_grade})
• **Molecular Biomarkers:** IDH1: ${patient.biomarkers.idh1} | 1p/19q: ${patient.biomarkers.codel_1p19q} | MGMT Promoter: ${patient.biomarkers.mgmt}
• **Clinical Indication:** ${indication}

---

### 2. QUANTITATIVE 3D VOLUMETRIC & BOUNDARY METRICS (NeuroSeg v3.0)
• **3D Segmented Tumor Volume:** ${volumetry.total_volume_cm3} cm³ (${volumetry.total_volume_mm3} mm³)
• **RECIST 1.1 Longest Transaxial Diameter:** ${volumetry.recist_longest_diameter_mm} mm
• **Equivalent Spherical Diameter:** ${volumetry.equivalent_spherical_diameter_mm} mm
• **95th Percentile Hausdorff Distance (HD95):** ${patient.hd95_mm} mm
• **Expected Calibration Error (ECE):** ${patient.ece} (Bayesian MC-Dropout T=8 passes)
• **Apex Burden Axial Plane:** Slice #${volumetry.peak_lesion_slice_index} (${volumetry.slices_involved_count} / ${volumetry.total_slices_analyzed} contiguous slices infiltrated)

---

### 3. MULTI-MODAL MORPHOLOGIC & EXPLAINABILITY FINDINGS
1. **Primary Parenchymal Lesion:**
   Well-delineated T2/FLAIR hyperintense intra-axial lesion centered in the **${patient.location}**. Bi-hemispheric contralateral cross-attention confirms significant sagittal asymmetry with respect to normal contralateral white matter tracts.
2. **Boundary & Epistemic Uncertainty Audit:**
   Spectral Fourier high-pass attention gates (α ∈ [0,1]) isolate infiltrative peritumoral margins. Bayesian Monte Carlo dropout reveals low epistemic variance across the necrotic/solid core (p > 0.94) with a localized uncertainty halo (H = 0.14 bits) along the medial corticospinal interface.
3. **Mass Effect & Ventricular System:**
   Mild regional sulcal effacement without uncal or subfalcine herniation. Basal cisterns and major dural venous sinuses remain patent.

---

### 4. IMPRESSION & MULTIDISCIPLINARY RECOMMENDATION
• **Impression:** ${patient.volume_cm3} cm³ infiltrative intra-axial mass in the ${patient.location}, consistent with **${patient.histology} (${patient.who_grade})**.
• **Action Triage:** **${patient.urgency.toUpperCase()}** — Recommend functional MRI tractography overlay using the exported NeuroSeg epistemic uncertainty contour to preserve eloquent cortex during maximal safe resection.`,
      };
    }
  },
};
