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

export interface BloodPanelValues {
  hemoglobin_g_dl: number;
  wbc_10e3_ul: number;
  neutrophils_anc_10e3_ul: number;
  lymphocytes_alc_10e3_ul: number;
  platelets_10e3_ul: number;
  inr: number;
  d_dimer_ng_ml: number;
  sodium_meq_l: number;
  glucose_mg_dl: number;
  crp_mg_l: number;
  ldh_u_l: number;
  serum_gfap_pg_ml: number;
}

export interface BiomarkerMeta {
  key: keyof BloodPanelValues;
  label: string;
  unit: string;
  ref_min: number;
  ref_max: number;
  min: number;
  max: number;
  step: number;
  category: string;
  clinical_role: string;
}

export interface DifferentialItem {
  condition: string;
  probability: number;
  key_drivers: string;
  color: string;
}

export interface AttributionItem {
  feature: string;
  modality: string;
  weight: number;
  value_display: string;
}

export interface HematologyAnalysis {
  patient_id: string;
  panel: BloodPanelValues;
  indices: {
    nlr: number;
    sii: number;
    nlr_tier: string;
    nlr_status: 'optimal' | 'warning' | 'critical';
    bbb_disruption_index: number;
  };
  chemo_safety: {
    ctcae_grade: string;
    tmz_action: string;
    tmz_dose_pct: number;
    status: 'optimal' | 'warning' | 'critical';
  };
  surgical_clearance: {
    status: string;
    tier: 'optimal' | 'warning' | 'critical';
    summary: string;
    flags: string[];
  };
  multimodal_fusion: {
    high_grade_probability: number;
    low_grade_probability: number;
    predicted_grade: string;
    mri_modality_gate: number;
    blood_modality_gate: number;
    differential_diagnosis: DifferentialItem[];
    attributions: AttributionItem[];
  };
}

export interface ClinicalPresetScenario {
  id: string;
  name: string;
  description: string;
  values: BloodPanelValues;
}

export const BIOMARKER_METADATA_LIST: BiomarkerMeta[] = [
  {
    key: 'hemoglobin_g_dl',
    label: 'Hemoglobin (Hb)',
    unit: 'g/dL',
    ref_min: 12.5,
    ref_max: 17.0,
    min: 6.0,
    max: 19.0,
    step: 0.1,
    category: 'Complete Blood Count',
    clinical_role: 'Cerebral oxygen delivery & tumour hypoxia index',
  },
  {
    key: 'wbc_10e3_ul',
    label: 'Total WBC Count',
    unit: '×10³/µL',
    ref_min: 4.0,
    ref_max: 10.5,
    min: 1.0,
    max: 28.0,
    step: 0.1,
    category: 'Complete Blood Count',
    clinical_role: 'Elevated in cerebral abscess or dexamethasone therapy',
  },
  {
    key: 'neutrophils_anc_10e3_ul',
    label: 'Neutrophils (ANC)',
    unit: '×10³/µL',
    ref_min: 1.8,
    ref_max: 7.0,
    min: 0.3,
    max: 22.0,
    step: 0.1,
    category: 'Leukocyte Differential',
    clinical_role: 'Myeloid pro-tumoral inflammation & TMZ neutropenia gate',
  },
  {
    key: 'lymphocytes_alc_10e3_ul',
    label: 'Lymphocytes (ALC)',
    unit: '×10³/µL',
    ref_min: 1.0,
    ref_max: 3.5,
    min: 0.2,
    max: 5.0,
    step: 0.05,
    category: 'Leukocyte Differential',
    clinical_role: 'Anti-glioma T-cell immunity & radiation lymphopenia marker',
  },
  {
    key: 'platelets_10e3_ul',
    label: 'Platelet Count',
    unit: '×10³/µL',
    ref_min: 150.0,
    ref_max: 400.0,
    min: 25.0,
    max: 600.0,
    step: 5.0,
    category: 'Hemostasis & Coagulation',
    clinical_role: 'Craniotomy threshold ≥100k; primary TMZ dose-limiting toxicity',
  },
  {
    key: 'inr',
    label: 'Prothrombin INR',
    unit: 'ratio',
    ref_min: 0.85,
    ref_max: 1.15,
    min: 0.8,
    max: 3.5,
    step: 0.05,
    category: 'Hemostasis & Coagulation',
    clinical_role: 'Must be ≤1.25 prior to stereotactic biopsy or craniotomy',
  },
  {
    key: 'd_dimer_ng_ml',
    label: 'D-Dimer (FEU)',
    unit: 'ng/mL',
    ref_min: 50.0,
    ref_max: 500.0,
    min: 50.0,
    max: 3500.0,
    step: 25.0,
    category: 'Hemostasis & Coagulation',
    clinical_role: 'Tissue-factor glioma hypercoagulability & DVT/PE screening',
  },
  {
    key: 'sodium_meq_l',
    label: 'Serum Sodium (Na⁺)',
    unit: 'mEq/L',
    ref_min: 135.0,
    ref_max: 145.0,
    min: 120.0,
    max: 155.0,
    step: 1.0,
    category: 'Neuro-Metabolic Panel',
    clinical_role: 'Detects SIADH & cerebral salt wasting; hyponatremia worsens edema',
  },
  {
    key: 'glucose_mg_dl',
    label: 'Fasting Glucose',
    unit: 'mg/dL',
    ref_min: 70.0,
    ref_max: 110.0,
    min: 60.0,
    max: 320.0,
    step: 2.0,
    category: 'Neuro-Metabolic Panel',
    clinical_role: 'Monitors dexamethasone-induced steroid hyperglycemia',
  },
  {
    key: 'crp_mg_l',
    label: 'High-Sensitivity CRP',
    unit: 'mg/L',
    ref_min: 0.2,
    ref_max: 5.0,
    min: 0.1,
    max: 120.0,
    step: 0.5,
    category: 'Inflammatory & Liquid Biopsy',
    clinical_role: 'Markedly elevated (>25 mg/L) in cerebral abscess vs glioma',
  },
  {
    key: 'ldh_u_l',
    label: 'Serum LDH',
    unit: 'U/L',
    ref_min: 120.0,
    ref_max: 240.0,
    min: 90.0,
    max: 900.0,
    step: 5.0,
    category: 'Inflammatory & Liquid Biopsy',
    clinical_role: 'Elevated in Primary CNS Lymphoma (PCNSL) & high-grade necrosis',
  },
  {
    key: 'serum_gfap_pg_ml',
    label: 'Serum GFAP (Astroglial)',
    unit: 'pg/mL',
    ref_min: 20.0,
    ref_max: 110.0,
    min: 10.0,
    max: 1200.0,
    step: 10.0,
    category: 'Inflammatory & Liquid Biopsy',
    clinical_role: 'Astrocyte intermediate filament leaked across disrupted BBB',
  },
];

export const PATIENT_DEFAULT_BLOOD_PANELS: Record<string, BloodPanelValues> = {
  'TCGA-CS-4941': {
    hemoglobin_g_dl: 14.2,
    wbc_10e3_ul: 7.4,
    neutrophils_anc_10e3_ul: 4.6,
    lymphocytes_alc_10e3_ul: 1.85,
    platelets_10e3_ul: 235.0,
    inr: 1.04,
    d_dimer_ng_ml: 380.0,
    sodium_meq_l: 138.0,
    glucose_mg_dl: 104.0,
    crp_mg_l: 2.8,
    ldh_u_l: 188.0,
    serum_gfap_pg_ml: 165.0,
  },
  'TCGA-DU-5872': {
    hemoglobin_g_dl: 13.4,
    wbc_10e3_ul: 6.2,
    neutrophils_anc_10e3_ul: 3.5,
    lymphocytes_alc_10e3_ul: 1.95,
    platelets_10e3_ul: 260.0,
    inr: 0.98,
    d_dimer_ng_ml: 290.0,
    sodium_meq_l: 140.0,
    glucose_mg_dl: 92.0,
    crp_mg_l: 1.6,
    ldh_u_l: 162.0,
    serum_gfap_pg_ml: 118.0,
  },
  'TCGA-FG-6689': {
    hemoglobin_g_dl: 11.8,
    wbc_10e3_ul: 11.6,
    neutrophils_anc_10e3_ul: 8.9,
    lymphocytes_alc_10e3_ul: 1.1,
    platelets_10e3_ul: 142.0,
    inr: 1.18,
    d_dimer_ng_ml: 940.0,
    sodium_meq_l: 133.0,
    glucose_mg_dl: 158.0,
    crp_mg_l: 8.4,
    ldh_u_l: 310.0,
    serum_gfap_pg_ml: 480.0,
  },
  'TCGA-HT-7684': {
    hemoglobin_g_dl: 13.8,
    wbc_10e3_ul: 5.8,
    neutrophils_anc_10e3_ul: 3.1,
    lymphocytes_alc_10e3_ul: 2.1,
    platelets_10e3_ul: 295.0,
    inr: 0.96,
    d_dimer_ng_ml: 210.0,
    sodium_meq_l: 141.0,
    glucose_mg_dl: 88.0,
    crp_mg_l: 1.1,
    ldh_u_l: 148.0,
    serum_gfap_pg_ml: 85.0,
  },
  'TCGA-DB-5273': {
    hemoglobin_g_dl: 13.1,
    wbc_10e3_ul: 8.4,
    neutrophils_anc_10e3_ul: 5.6,
    lymphocytes_alc_10e3_ul: 1.65,
    platelets_10e3_ul: 210.0,
    inr: 1.08,
    d_dimer_ng_ml: 460.0,
    sodium_meq_l: 137.0,
    glucose_mg_dl: 112.0,
    crp_mg_l: 4.5,
    ldh_u_l: 205.0,
    serum_gfap_pg_ml: 240.0,
  },
  'TCGA-EZ-7264': {
    hemoglobin_g_dl: 10.6,
    wbc_10e3_ul: 3.1,
    neutrophils_anc_10e3_ul: 1.1,
    lymphocytes_alc_10e3_ul: 0.85,
    platelets_10e3_ul: 68.0,
    inr: 1.22,
    d_dimer_ng_ml: 690.0,
    sodium_meq_l: 134.0,
    glucose_mg_dl: 124.0,
    crp_mg_l: 6.2,
    ldh_u_l: 245.0,
    serum_gfap_pg_ml: 310.0,
  },
  'TCGA-HW-8319': {
    hemoglobin_g_dl: 14.5,
    wbc_10e3_ul: 6.7,
    neutrophils_anc_10e3_ul: 3.9,
    lymphocytes_alc_10e3_ul: 2.05,
    platelets_10e3_ul: 275.0,
    inr: 0.99,
    d_dimer_ng_ml: 255.0,
    sodium_meq_l: 140.0,
    glucose_mg_dl: 94.0,
    crp_mg_l: 1.9,
    ldh_u_l: 156.0,
    serum_gfap_pg_ml: 132.0,
  },
  'TCGA-IK-9412': {
    hemoglobin_g_dl: 12.2,
    wbc_10e3_ul: 14.2,
    neutrophils_anc_10e3_ul: 11.4,
    lymphocytes_alc_10e3_ul: 1.2,
    platelets_10e3_ul: 178.0,
    inr: 1.29,
    d_dimer_ng_ml: 1280.0,
    sodium_meq_l: 130.0,
    glucose_mg_dl: 186.0,
    crp_mg_l: 14.8,
    ldh_u_l: 390.0,
    serum_gfap_pg_ml: 590.0,
  },
  'TCGA-P5-6198': {
    hemoglobin_g_dl: 13.6,
    wbc_10e3_ul: 6.9,
    neutrophils_anc_10e3_ul: 4.1,
    lymphocytes_alc_10e3_ul: 1.9,
    platelets_10e3_ul: 248.0,
    inr: 1.01,
    d_dimer_ng_ml: 320.0,
    sodium_meq_l: 139.0,
    glucose_mg_dl: 96.0,
    crp_mg_l: 2.2,
    ldh_u_l: 172.0,
    serum_gfap_pg_ml: 145.0,
  },
  'TCGA-QH-4821': {
    hemoglobin_g_dl: 12.7,
    wbc_10e3_ul: 9.8,
    neutrophils_anc_10e3_ul: 7.1,
    lymphocytes_alc_10e3_ul: 1.4,
    platelets_10e3_ul: 195.0,
    inr: 1.11,
    d_dimer_ng_ml: 580.0,
    sodium_meq_l: 136.0,
    glucose_mg_dl: 132.0,
    crp_mg_l: 5.9,
    ldh_u_l: 265.0,
    serum_gfap_pg_ml: 355.0,
  },
  'TCGA-S9-7405': {
    hemoglobin_g_dl: 14.0,
    wbc_10e3_ul: 5.5,
    neutrophils_anc_10e3_ul: 3.0,
    lymphocytes_alc_10e3_ul: 1.95,
    platelets_10e3_ul: 310.0,
    inr: 0.95,
    d_dimer_ng_ml: 195.0,
    sodium_meq_l: 142.0,
    glucose_mg_dl: 86.0,
    crp_mg_l: 0.9,
    ldh_u_l: 142.0,
    serum_gfap_pg_ml: 92.0,
  },
  'TCGA-TM-8830': {
    hemoglobin_g_dl: 11.4,
    wbc_10e3_ul: 12.5,
    neutrophils_anc_10e3_ul: 9.8,
    lymphocytes_alc_10e3_ul: 1.05,
    platelets_10e3_ul: 128.0,
    inr: 1.19,
    d_dimer_ng_ml: 1050.0,
    sodium_meq_l: 132.0,
    glucose_mg_dl: 164.0,
    crp_mg_l: 10.2,
    ldh_u_l: 340.0,
    serum_gfap_pg_ml: 520.0,
  },
};

export const CLINICAL_PRESET_SCENARIOS: ClinicalPresetScenario[] = [
  {
    id: 'baseline_glioma',
    name: 'Baseline WHO Grade 2 Glioma (Surgical Candidate)',
    description:
      'Balanced hematologic profile with mildly elevated Serum GFAP (165 pg/mL) and low NLR (2.49); cleared for craniotomy.',
    values: PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941'],
  },
  {
    id: 'tmz_myelosuppression',
    name: 'Adjuvant TMZ Cycle 3 — Grade 3 Thrombocytopenia',
    description:
      'Platelets dropped to 42 ×10³/µL and ANC to 0.9 ×10³/µL following Temozolomide alkylating therapy; requires immediate chemo hold.',
    values: {
      hemoglobin_g_dl: 10.4,
      wbc_10e3_ul: 2.3,
      neutrophils_anc_10e3_ul: 0.9,
      lymphocytes_alc_10e3_ul: 0.65,
      platelets_10e3_ul: 42.0,
      inr: 1.14,
      d_dimer_ng_ml: 520.0,
      sodium_meq_l: 136.0,
      glucose_mg_dl: 112.0,
      crp_mg_l: 4.2,
      ldh_u_l: 215.0,
      serum_gfap_pg_ml: 140.0,
    },
  },
  {
    id: 'abscess_mimic',
    name: 'Pyogenic Cerebral Abscess Mimic (Acute Leukocytosis)',
    description:
      'High hs-CRP (68 mg/L), leukocytosis (WBC 18.4 ×10³/µL, ANC 15.2 ×10³/µL), and low GFAP shift Bayesian posterior toward infectious abscess.',
    values: {
      hemoglobin_g_dl: 12.9,
      wbc_10e3_ul: 18.4,
      neutrophils_anc_10e3_ul: 15.2,
      lymphocytes_alc_10e3_ul: 1.6,
      platelets_10e3_ul: 385.0,
      inr: 1.12,
      d_dimer_ng_ml: 780.0,
      sodium_meq_l: 134.0,
      glucose_mg_dl: 118.0,
      crp_mg_l: 68.0,
      ldh_u_l: 230.0,
      serum_gfap_pg_ml: 62.0,
    },
  },
  {
    id: 'anaplastic_transformation',
    name: 'High-Grade Transformation + Steroid Hyperglycemia',
    description:
      'Markedly elevated Serum GFAP (640 pg/mL), high NLR (9.20), D-Dimer hypercoagulability (1,420 ng/mL), and SIADH hyponatremia (129 mEq/L).',
    values: {
      hemoglobin_g_dl: 11.5,
      wbc_10e3_ul: 13.8,
      neutrophils_anc_10e3_ul: 11.5,
      lymphocytes_alc_10e3_ul: 1.25,
      platelets_10e3_ul: 165.0,
      inr: 1.32,
      d_dimer_ng_ml: 1420.0,
      sodium_meq_l: 129.0,
      glucose_mg_dl: 214.0,
      crp_mg_l: 11.5,
      ldh_u_l: 420.0,
      serum_gfap_pg_ml: 640.0,
    },
  },
];

export function computeClientHematologyAnalysis(
  patient: PatientRecord,
  panel: BloodPanelValues
): HematologyAnalysis {
  const hb = panel.hemoglobin_g_dl;
  const wbc = panel.wbc_10e3_ul;
  const anc = panel.neutrophils_anc_10e3_ul;
  const alc = Math.max(0.1, panel.lymphocytes_alc_10e3_ul);
  const plt = panel.platelets_10e3_ul;
  const inr = panel.inr;
  const dDimer = panel.d_dimer_ng_ml;
  const sodium = panel.sodium_meq_l;
  const crp = panel.crp_mg_l;
  const ldh = panel.ldh_u_l;
  const gfap = panel.serum_gfap_pg_ml;

  const nlr = +(anc / alc).toFixed(2);
  const sii = +((plt * anc) / alc).toFixed(1);

  let nlrTier = 'Favorable Immune Profile (NLR < 3.0)';
  let nlrStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
  if (nlr > 4.5) {
    nlrTier = 'High Myeloid Immunosuppression (NLR > 4.5)';
    nlrStatus = 'critical';
  } else if (nlr >= 3.0) {
    nlrTier = 'Borderline Neuro-Inflammation (NLR 3.0–4.5)';
    nlrStatus = 'warning';
  }

  let ctcaeGrade = 'CTCAE Grade 0–1 (Hematologically Cleared)';
  let tmzAction = 'CLEARED FOR 100% FULL STUPP DOSE (200 mg/m²/day × 5 days)';
  let tmzDosePct = 100;
  let tmzStatus: 'optimal' | 'warning' | 'critical' = 'optimal';

  if (plt < 25 || anc < 0.5 || hb < 8.0) {
    ctcaeGrade = 'CTCAE Grade 4 (Life-Threatening Myelosuppression)';
    tmzAction = 'DISCONTINUE / HOLD TMZ IMMEDIATELY • Urgent Platelet/G-CSF Support';
    tmzDosePct = 0;
    tmzStatus = 'critical';
  } else if (plt < 50 || anc < 1.0 || hb < 9.5) {
    ctcaeGrade = 'CTCAE Grade 3 (Severe Myelosuppression)';
    tmzAction = 'HOLD TMZ CYCLE • Resume at 75% Dose (150 mg/m²) Only After ANC ≥1.5 & Plt ≥100';
    tmzDosePct = 0;
    tmzStatus = 'critical';
  } else if (plt < 100 || anc < 1.5 || hb < 11.0) {
    ctcaeGrade = 'CTCAE Grade 2 (Moderate Cytopenia)';
    tmzAction = 'REDUCE TMZ DOSE TO 75% (150 mg/m²/day) • Weekly CBC Surveillance';
    tmzDosePct = 75;
    tmzStatus = 'warning';
  }

  const flags: string[] = [];
  if (plt < 100) flags.push(`Thrombocytopenia (Plt ${plt.toFixed(0)}k < 100k neurosurgical hemostasis threshold)`);
  if (inr > 1.25) flags.push(`Coagulopathy (INR ${inr.toFixed(2)} > 1.25 intracranial bleeding threshold)`);
  if (sodium < 132) flags.push(`Hyponatremia / SIADH (Na⁺ ${sodium.toFixed(0)} mEq/L < 132 mEq/L cerebral edema risk)`);
  if (hb < 10.0) flags.push(`Anemia (Hb ${hb.toFixed(1)} g/dL < 10.0 g/dL perioperative oxygen threshold)`);
  if (dDimer > 1000) flags.push(`Hypercoagulable State (D-Dimer ${dDimer.toFixed(0)} ng/mL — screen for lower-extremity DVT)`);

  let surgicalStatus = 'CLEARED FOR CRANIOTOMY';
  let surgicalTier: 'optimal' | 'warning' | 'critical' = 'optimal';
  let surgicalSummary =
    'All hemostatic, electrolyte, and oxygen-carrying indices meet neurosurgical thresholds for maximal safe resection.';

  if (flags.length > 0) {
    if (plt < 100 || inr > 1.25 || sodium < 130) {
      surgicalStatus = 'HOLD CRANIOTOMY — CORRECT ABNORMALITIES';
      surgicalTier = 'critical';
    } else {
      surgicalStatus = 'CONDITIONAL CLEARANCE (PRE-OP OPTIMIZATION)';
      surgicalTier = 'warning';
    }
    surgicalSummary = flags.join(' | ');
  }

  const vol = patient.volume_cm3;
  const isWildtype = patient.biomarkers.idh1 === 'Wildtype' ? 1.0 : 0.0;

  const gliomaLogit = 2.15 + 0.0038 * (gfap - 100) - 0.032 * Math.max(0, crp - 12) + 0.04 * vol;
  const abscessLogit = -1.25 + 0.055 * Math.max(0, crp - 8) + 0.16 * Math.max(0, wbc - 10.5) - 0.0025 * gfap;
  const pcnslLogit = -1.1 + 0.0085 * Math.max(0, ldh - 210) + 0.55 * Math.max(0, 1.3 - alc);
  const demyelLogit = -1.35 - 0.03 * Math.max(0, crp - 5) - 0.002 * Math.max(0, gfap - 120) - 0.03 * vol;

  const maxLogit = Math.max(gliomaLogit, abscessLogit, pcnslLogit, demyelLogit);
  const exps = [
    Math.exp(gliomaLogit - maxLogit),
    Math.exp(abscessLogit - maxLogit),
    Math.exp(pcnslLogit - maxLogit),
    Math.exp(demyelLogit - maxLogit),
  ];
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => +(e / sumExp).toFixed(4));

  const differential: DifferentialItem[] = [
    {
      condition: 'Diffuse Glioma (Astrocytoma / Oligodendroglioma)',
      probability: probs[0],
      key_drivers: `3D FLAIR Infiltration (${vol} cm³) + Serum GFAP (${gfap.toFixed(0)} pg/mL)`,
      color: '#087f72',
    },
    {
      condition: 'Pyogenic Cerebral Abscess (Infectious Mimic)',
      probability: probs[1],
      key_drivers: `hs-CRP (${crp.toFixed(1)} mg/L) + Total WBC (${wbc.toFixed(1)} ×10³/µL)`,
      color: '#f59e0b',
    },
    {
      condition: 'Primary CNS Lymphoma (PCNSL)',
      probability: probs[2],
      key_drivers: `Serum LDH (${ldh.toFixed(0)} U/L) + Lymphocyte Count (${alc.toFixed(2)} ×10³/µL)`,
      color: '#6366f1',
    },
    {
      condition: 'Tumefactive Demyelinating Lesion (MS)',
      probability: probs[3],
      key_drivers: 'Subcortical White Matter + Low Systemic Acute-Phase Reactants',
      color: '#64748b',
    },
  ].sort((a, b) => b.probability - a.probability);

  const hgScore =
    -1.95 +
    0.0042 * (gfap - 110) +
    0.24 * (nlr - 2.5) +
    0.0009 * (dDimer - 350) +
    0.003 * (ldh - 180) +
    0.045 * (vol - 12) +
    0.85 * isWildtype;
  const highGradeProb = +(1 / (1 + Math.exp(-hgScore))).toFixed(3);
  const predictedGrade =
    highGradeProb >= 0.5
      ? 'WHO CNS Grade 3/4 (High-Grade Transformation Risk)'
      : 'WHO CNS Grade 2 (Lower-Grade Indolent Spectrum)';

  const rawAttributions: AttributionItem[] = [
    {
      feature: '3D MRI FLAIR Volume & Asymmetry',
      modality: '3.0T Brain MRI',
      weight: 0.26 + 0.04 * (vol / 30),
      value_display: `${vol} cm³ (HD95: ${patient.hd95_mm} mm)`,
    },
    {
      feature: 'Serum GFAP (Liquid Biopsy BBB Leak)',
      modality: 'Blood Biomarker',
      weight: Math.min(0.28, 0.08 + gfap / 2500),
      value_display: `${gfap.toFixed(0)} pg/mL`,
    },
    {
      feature: 'Neutrophil-to-Lymphocyte Ratio (NLR)',
      modality: 'Immune Index',
      weight: Math.min(0.22, 0.07 + nlr / 45),
      value_display: `${nlr.toFixed(2)} (SII: ${sii.toFixed(0)})`,
    },
    {
      feature: 'hs-CRP & Leukocyte Differential',
      modality: 'Blood Biomarker',
      weight: Math.min(0.24, 0.06 + crp / 350),
      value_display: `CRP ${crp.toFixed(1)} mg/L • WBC ${wbc.toFixed(1)}k`,
    },
    {
      feature: 'Platelets & Coagulation (INR / D-Dimer)',
      modality: 'Hemostasis',
      weight: Math.min(0.18, 0.06 + Math.abs(240 - plt) / 2200 + dDimer / 12000),
      value_display: `Plt ${plt.toFixed(0)}k • D-Dimer ${dDimer.toFixed(0)}`,
    },
    {
      feature: 'Serum LDH & Metabolic Na⁺ / Glucose',
      modality: 'Metabolic Panel',
      weight: Math.min(0.16, 0.05 + ldh / 4500),
      value_display: `LDH ${ldh.toFixed(0)} U/L • Na⁺ ${sodium.toFixed(0)} mEq/L`,
    },
  ];
  const sumW = rawAttributions.reduce((acc, item) => acc + item.weight, 0);
  const attributions = rawAttributions
    .map((item) => ({ ...item, weight: +(item.weight / sumW).toFixed(3) }))
    .sort((a, b) => b.weight - a.weight);

  return {
    patient_id: patient.patient_id,
    panel,
    indices: {
      nlr,
      sii,
      nlr_tier: nlrTier,
      nlr_status: nlrStatus,
      bbb_disruption_index: +Math.min(100, (gfap / 650) * 100).toFixed(1),
    },
    chemo_safety: {
      ctcae_grade: ctcaeGrade,
      tmz_action: tmzAction,
      tmz_dose_pct: tmzDosePct,
      status: tmzStatus,
    },
    surgical_clearance: {
      status: surgicalStatus,
      tier: surgicalTier,
      summary: surgicalSummary,
      flags,
    },
    multimodal_fusion: {
      high_grade_probability: highGradeProb,
      low_grade_probability: +(1 - highGradeProb).toFixed(3),
      predicted_grade: predictedGrade,
      mri_modality_gate: 0.62,
      blood_modality_gate: 0.38,
      differential_diagnosis: differential,
      attributions,
    },
  };
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
  {
    patient_id: 'TCGA-DB-5273',
    mrn: 'MRN-52819-LGG',
    name: 'Patient TCGA-DB-5273',
    age: 44,
    sex: 'Male',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Diffuse Astrocytoma, IDH-mutant',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Intact', mgmt: 'Methylated' },
    location: 'Left Temporal Hippocampal Gyrus',
    volume_cm3: 15.2,
    recist_mm: 31.2,
    dsc: 0.922,
    hd95_mm: 3.24,
    ece: 0.019,
    urgency: 'Neurosurgical Review',
    status: 'Active Study',
    seed: 505,
  },
  {
    patient_id: 'TCGA-EZ-7264',
    mrn: 'MRN-72904-LGG',
    name: 'Patient TCGA-EZ-7264',
    age: 51,
    sex: 'Female',
    who_grade: 'WHO CNS Grade 3',
    histology: 'Anaplastic Oligodendroglioma, IDH-mutant, 1p/19q-codeleted',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Codeleted', mgmt: 'Methylated' },
    location: 'Right Parietal Centrum Semiovale',
    volume_cm3: 22.85,
    recist_mm: 38.6,
    dsc: 0.914,
    hd95_mm: 3.58,
    ece: 0.022,
    urgency: 'Hold TMZ (Thrombocytopenia)',
    status: 'Chemo Alert',
    seed: 606,
  },
  {
    patient_id: 'TCGA-HW-8319',
    mrn: 'MRN-83190-LGG',
    name: 'Patient TCGA-HW-8319',
    age: 36,
    sex: 'Male',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Oligodendroglioma, IDH-mutant, 1p/19q-codeleted',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Codeleted', mgmt: 'Methylated' },
    location: 'Left Supplementary Motor Area',
    volume_cm3: 9.45,
    recist_mm: 23.8,
    dsc: 0.928,
    hd95_mm: 2.91,
    ece: 0.016,
    urgency: 'Oncologic Follow-Up',
    status: 'Verified',
    seed: 707,
  },
  {
    patient_id: 'TCGA-IK-9412',
    mrn: 'MRN-94120-LGG',
    name: 'Patient TCGA-IK-9412',
    age: 59,
    sex: 'Male',
    who_grade: 'WHO CNS Grade 3',
    histology: 'Anaplastic Astrocytoma, IDH-wildtype',
    biomarkers: { idh1: 'Wildtype', codel_1p19q: 'Intact', mgmt: 'Unmethylated' },
    location: 'Bifrontal Corpus Callosum Genu',
    volume_cm3: 34.1,
    recist_mm: 46.8,
    dsc: 0.905,
    hd95_mm: 4.02,
    ece: 0.025,
    urgency: 'Urgent Resection Planning',
    status: 'Priority Triage',
    seed: 808,
  },
  {
    patient_id: 'TCGA-P5-6198',
    mrn: 'MRN-61982-LGG',
    name: 'Patient TCGA-P5-6198',
    age: 41,
    sex: 'Female',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Diffuse Astrocytoma, IDH-mutant',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Intact', mgmt: 'Methylated' },
    location: 'Right Insular-Opercular Cortex',
    volume_cm3: 13.6,
    recist_mm: 28.9,
    dsc: 0.925,
    hd95_mm: 3.08,
    ece: 0.018,
    urgency: 'Neurosurgical Review',
    status: 'Active Study',
    seed: 909,
  },
  {
    patient_id: 'TCGA-QH-4821',
    mrn: 'MRN-48215-LGG',
    name: 'Patient TCGA-QH-4821',
    age: 49,
    sex: 'Male',
    who_grade: 'WHO CNS Grade 3',
    histology: 'Anaplastic Astrocytoma, IDH-mutant',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Intact', mgmt: 'Methylated' },
    location: 'Left Occipitotemporal Fusiform Gyrus',
    volume_cm3: 24.9,
    recist_mm: 39.7,
    dsc: 0.916,
    hd95_mm: 3.51,
    ece: 0.021,
    urgency: 'Urgent Resection Planning',
    status: 'Priority Triage',
    seed: 1010,
  },
  {
    patient_id: 'TCGA-S9-7405',
    mrn: 'MRN-74053-LGG',
    name: 'Patient TCGA-S9-7405',
    age: 29,
    sex: 'Female',
    who_grade: 'WHO CNS Grade 2',
    histology: 'Oligodendroglioma, IDH-mutant, 1p/19q-codeleted',
    biomarkers: { idh1: 'Mutant', codel_1p19q: 'Codeleted', mgmt: 'Methylated' },
    location: 'Right Premotor Frontal Cortex',
    volume_cm3: 7.85,
    recist_mm: 21.4,
    dsc: 0.934,
    hd95_mm: 2.64,
    ece: 0.014,
    urgency: 'Routine Surveillance',
    status: 'Stable',
    seed: 1111,
  },
  {
    patient_id: 'TCGA-TM-8830',
    mrn: 'MRN-88309-LGG',
    name: 'Patient TCGA-TM-8830',
    age: 56,
    sex: 'Female',
    who_grade: 'WHO CNS Grade 3',
    histology: 'Anaplastic Astrocytoma, IDH-wildtype',
    biomarkers: { idh1: 'Wildtype', codel_1p19q: 'Intact', mgmt: 'Unmethylated' },
    location: 'Left Inferior Parietal Lobule',
    volume_cm3: 31.45,
    recist_mm: 44.5,
    dsc: 0.911,
    hd95_mm: 3.79,
    ece: 0.023,
    urgency: 'Urgent Resection Planning',
    status: 'Priority Triage',
    seed: 1212,
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

  async getHematology(patient: PatientRecord): Promise<HematologyAnalysis> {
    const defaultPanel =
      PATIENT_DEFAULT_BLOOD_PANELS[patient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941'];
    try {
      const res = await fetch(`/api/hematology/${encodeURIComponent(patient.patient_id)}`);
      if (!res.ok) throw new Error('Backend offline');
      const data = await res.json();
      return data.analysis;
    } catch {
      return computeClientHematologyAnalysis(patient, defaultPanel);
    }
  },

  async analyzeHematology(
    patient: PatientRecord,
    panel: BloodPanelValues
  ): Promise<HematologyAnalysis> {
    try {
      const res = await fetch('/api/hematology/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.patient_id, panel }),
      });
      if (!res.ok) throw new Error('Backend offline');
      const data = await res.json();
      return data.analysis;
    } catch {
      return computeClientHematologyAnalysis(patient, panel);
    }
  },

  async parseBloodReportText(
    patient: PatientRecord,
    rawText: string
  ): Promise<{ extracted_panel: BloodPanelValues; analysis: HematologyAnalysis }> {
    try {
      const res = await fetch('/api/hematology/parse-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.patient_id, raw_text: rawText }),
      });
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      const base: BloodPanelValues = {
        ...(PATIENT_DEFAULT_BLOOD_PANELS[patient.patient_id] ||
          PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941']),
      };
      const regexMap: Array<[keyof BloodPanelValues, RegExp]> = [
        ['hemoglobin_g_dl', /(?:hemoglobin|hb|hgb)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['wbc_10e3_ul', /(?:wbc|white blood cell|leukocytes)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['neutrophils_anc_10e3_ul', /(?:anc|neutrophils|neut)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['lymphocytes_alc_10e3_ul', /(?:alc|lymphocytes|lymph)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['platelets_10e3_ul', /(?:platelets|plt)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['inr', /(?:inr|prothrombin)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['d_dimer_ng_ml', /(?:d-dimer|ddimer|d dimer)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['sodium_meq_l', /(?:sodium|na\+?)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['glucose_mg_dl', /(?:glucose|fbs|blood sugar)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['crp_mg_l', /(?:crp|c-reactive protein|hs-crp)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['ldh_u_l', /(?:ldh|lactate dehydrogenase)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
        ['serum_gfap_pg_ml', /(?:gfap|glial fibrillary)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i],
      ];
      for (const [key, rx] of regexMap) {
        const m = rawText.match(rx);
        if (m) {
          const val = parseFloat(m[1]);
          if (!Number.isNaN(val)) base[key] = val;
        }
      }
      return {
        extracted_panel: base,
        analysis: computeClientHematologyAnalysis(patient, base),
      };
    }
  },

  async generateReport(
    patient: PatientRecord,
    volumetry: VolumetryData,
    indication: string,
    hematology?: HematologyAnalysis
  ): Promise<{ source: string; report_markdown: string }> {
    const hema =
      hematology ||
      computeClientHematologyAnalysis(
        patient,
        PATIENT_DEFAULT_BLOOD_PANELS[patient.patient_id] ||
          PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941']
      );
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
          hematology: hema,
        }),
      });
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      const topDiff = hema.multimodal_fusion.differential_diagnosis[0];
      return {
        source: 'NeuroSeg v3.0 Multimodal MRI + Hematology Engine',
        report_markdown: `# MULTIDISCIPLINARY NEURO-ONCOLOGY & MRI CONSULTATION REPORT
**Department of Diagnostic Neuro-Imaging & Molecular Neuro-Hematology**

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

### 3. NEURO-HEMATOLOGY, LIQUID BIOPSY & SURGICAL/CHEMO CLEARANCE
• **Systemic Immune-Inflammation Profile:** NLR = **${hema.indices.nlr}** (${hema.indices.nlr_tier}) | SII = **${hema.indices.sii}**
• **Astroglial Liquid Biopsy & Acute Phase:** Serum GFAP = **${hema.panel.serum_gfap_pg_ml} pg/mL** | hs-CRP = **${hema.panel.crp_mg_l} mg/L** | Serum LDH = **${hema.panel.ldh_u_l} U/L**
• **Complete Blood Count & Coagulation:** Hb **${hema.panel.hemoglobin_g_dl} g/dL** | WBC **${hema.panel.wbc_10e3_ul} ×10³/µL** (ANC ${hema.panel.neutrophils_anc_10e3_ul} / ALC ${hema.panel.lymphocytes_alc_10e3_ul}) | Platelets **${hema.panel.platelets_10e3_ul} ×10³/µL** | INR **${hema.panel.inr}** | D-Dimer **${hema.panel.d_dimer_ng_ml} ng/mL** | Na⁺ **${hema.panel.sodium_meq_l} mEq/L**
• **Pre-Craniotomy Surgical Clearance:** **${hema.surgical_clearance.status}** — ${hema.surgical_clearance.summary}
• **Adjuvant Temozolomide (CTCAE v5.0) Audit:** **${hema.chemo_safety.ctcae_grade}** → ${hema.chemo_safety.tmz_action}
• **Cross-Modal MRI + Blood Fusion Posterior:** **${topDiff.condition} (${(topDiff.probability * 100).toFixed(1)}%)** | Predicted Grade: **${hema.multimodal_fusion.predicted_grade}**

---

### 4. MULTI-MODAL MORPHOLOGIC & EXPLAINABILITY FINDINGS
1. **Primary Parenchymal Lesion:**
   Well-delineated T2/FLAIR hyperintense intra-axial lesion centered in the **${patient.location}**. Bi-hemispheric contralateral cross-attention confirms significant sagittal asymmetry with respect to normal contralateral white matter tracts.
2. **Boundary & Epistemic Uncertainty Audit:**
   Spectral Fourier high-pass attention gates (α ∈ [0,1]) isolate infiltrative peritumoral margins. Bayesian Monte Carlo dropout reveals low epistemic variance across the necrotic/solid core (p > 0.94) with a localized uncertainty halo (H = 0.14 bits) along the medial corticospinal interface.

---

### 5. IMPRESSION & MULTIDISCIPLINARY RECOMMENDATION
• **Impression:** ${patient.volume_cm3} cm³ infiltrative intra-axial mass in the ${patient.location}, consistent with **${topDiff.condition}** (${(topDiff.probability * 100).toFixed(1)}% Cross-Modal Bayesian Posterior).
• **Action Triage:** **${patient.urgency.toUpperCase()}** — Correlate pre-craniotomy hemostatic clearance and CTCAE v5.0 Temozolomide dosing status prior to neurosurgical resection or adjuvant chemotherapy.`,
      };
    }
  },
};
