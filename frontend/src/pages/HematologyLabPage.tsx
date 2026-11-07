import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FileText,
  FlaskConical,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BIOMARKER_METADATA_LIST,
  CLINICAL_PRESET_SCENARIOS,
  PATIENT_DEFAULT_BLOOD_PANELS,
  computeClientHematologyAnalysis,
  neuroApi,
  type BloodPanelValues,
  type HematologyAnalysis,
  type PatientRecord,
} from '../api';

interface HematologyLabPageProps {
  activePatient: PatientRecord;
}

const SAMPLE_LAB_REPORT_TEXT = `HOSPITAL NEURO-ONCOLOGY PERIPHERAL BLOOD & LIQUID BIOPSY PANEL
Patient ID: TCGA-CS-4941 | Specimen: Peripheral Venous Blood
--------------------------------------------------------------
Hemoglobin (Hb): 13.9 g/dL        (Ref: 12.5 - 17.0)
Total WBC: 8.2 x10^3/uL           (Ref: 4.0 - 10.5)
Neutrophils (ANC): 5.4 x10^3/uL   (Ref: 1.8 - 7.0)
Lymphocytes (ALC): 1.65 x10^3/uL  (Ref: 1.0 - 3.5)
Platelets (PLT): 215 x10^3/uL     (Ref: 150 - 400)
Prothrombin INR: 1.06             (Ref: 0.85 - 1.15)
D-Dimer: 440 ng/mL                (Ref: 50 - 500)
Serum Sodium (Na+): 137 mEq/L     (Ref: 135 - 145)
Fasting Glucose: 108 mg/dL        (Ref: 70 - 110)
hs-CRP: 3.6 mg/L                  (Ref: 0.2 - 5.0)
Serum LDH: 196 U/L                (Ref: 120 - 240)
Serum GFAP: 225 pg/mL             (Ref: 20 - 110)`;

export function HematologyLabPage({ activePatient }: HematologyLabPageProps) {
  const navigate = useNavigate();
  const defaultPanel =
    PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
    PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941'];

  const [panel, setPanel] = useState<BloodPanelValues>(defaultPanel);
  const [analysis, setAnalysis] = useState<HematologyAnalysis>(() =>
    computeClientHematologyAnalysis(activePatient, defaultPanel)
  );
  const [activePresetId, setActivePresetId] = useState<string>('baseline_glioma');
  const [parserOpen, setParserOpen] = useState<boolean>(false);
  const [rawReportText, setRawReportText] = useState<string>(SAMPLE_LAB_REPORT_TEXT);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  useEffect(() => {
    const patDefault =
      PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941'];
    setPanel(patDefault);
    setActivePresetId('baseline_glioma');
    neuroApi.getHematology(activePatient).then(setAnalysis);
  }, [activePatient.patient_id]);

  const updateBiomarker = (key: keyof BloodPanelValues, val: number) => {
    const next = { ...panel, [key]: val };
    setPanel(next);
    setActivePresetId('custom');
    // Immediate responsive local calculation + async backend verification
    setAnalysis(computeClientHematologyAnalysis(activePatient, next));
    void neuroApi.analyzeHematology(activePatient, next).then(setAnalysis);
  };

  const applyPreset = (presetId: string, values: BloodPanelValues) => {
    setActivePresetId(presetId);
    setPanel(values);
    setAnalysis(computeClientHematologyAnalysis(activePatient, values));
    void neuroApi.analyzeHematology(activePatient, values).then(setAnalysis);
  };

  const handleReset = () => {
    const patDefault =
      PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941'];
    applyPreset('baseline_glioma', patDefault);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = String(ev.target?.result || '');
      setRawReportText(content);
      const res = await neuroApi.parseBloodReportText(activePatient, content);
      setPanel(res.extracted_panel);
      setAnalysis(res.analysis);
      setActivePresetId('uploaded_report');
    };
    reader.readAsText(file);
  };

  const handleParseText = async () => {
    const res = await neuroApi.parseBloodReportText(activePatient, rawReportText);
    setPanel(res.extracted_panel);
    setAnalysis(res.analysis);
    setActivePresetId('uploaded_report');
    setParserOpen(false);
  };

  const getBadgeTone = (tier: 'optimal' | 'warning' | 'critical') => {
    if (tier === 'optimal') {
      return 'bg-[#e6f4f1] text-[#087f72] dark:bg-[#16342f] dark:text-[#5bd0a8]';
    }
    if (tier === 'warning') {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
    }
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
  };

  return (
    <div>
      {/* Header Row */}
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>CROSS-MODAL BRAIN MRI + PERIPHERAL BLOOD FUSION</span>
            <span className="eyebrow-divider">•</span>
            <span>LIQUID BIOPSY (sGFAP) & CTCAE v5.0 CHEMO-SAFETY</span>
          </div>
          <h1>Neuro-Hematology & Multimodal Blood Report Fusion Lab</h1>
          <p>
            Fuses 3D MRI volumetric & boundary embeddings from <strong>{activePatient.patient_id}</strong> ({activePatient.volume_cm3} cm³) with a 12-biomarker peripheral blood & astroglial liquid biopsy panel via Cross-Modal Gated Attention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="button button-dark"
            onClick={() => setParserOpen((prev) => !prev)}
          >
            <Upload size={15} />
            <span>{parserOpen ? 'Close Blood Report Parser' : 'Upload / Paste Blood Report'}</span>
          </button>
          <button type="button" className="button button-dark" onClick={handleReset}>
            <RotateCcw size={14} />
            <span>Reset Patient Baseline</span>
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate('/reports')}
          >
            <FileText size={15} />
            <span>Synthesize Combined Report</span>
          </button>
        </div>
      </div>

      {/* Collapsible Smart Blood Report Upload / OCR Text Parser */}
      {parserOpen && (
        <div className="panel p-6 mb-5 border-2 border-[#087f72]/40">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <span className="section-kicker">AUTOMATED CLINICAL LAB REPORT EXTRACTOR</span>
              <h2 className="text-base font-bold">
                Upload Hospital Blood Report (.TXT / .CSV / .JSON) or Paste Raw Lab Values
              </h2>
            </div>
            <label className="button button-dark cursor-pointer">
              <Upload size={14} />
              <span>{uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Choose Lab Report File'}</span>
              <input
                type="file"
                accept=".txt,.csv,.json,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            rows={6}
            value={rawReportText}
            onChange={(e) => setRawReportText(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs text-slate-800 outline-none focus:border-[#087f72] dark:border-[#2d3f52] dark:bg-[#141f2b] dark:text-slate-100"
            placeholder="Paste CBC, Coagulation, Electrolyte, hs-CRP, LDH, and Serum GFAP values here..."
          />

          <div className="mt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              className="button button-dark"
              onClick={() => setParserOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleParseText}
            >
              <Sparkles size={14} />
              <span>Extract Biomarkers & Run Cross-Modal MRI Fusion</span>
            </button>
          </div>
        </div>
      )}

      {/* Clinical Scenario Preset Strip */}
      <div className="panel p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="section-kicker">CLINICAL NEURO-ONCOLOGY SIMULATION PRESETS</span>
            <h2 className="text-sm font-bold">
              Select a Clinical Hematology Scenario to Observe Real-Time MRI + Blood Posterior Shifts
            </h2>
          </div>
          <span className="rounded-md bg-[#e6f4f1] px-2.5 py-1 font-mono text-[11px] font-bold text-[#087f72] dark:bg-[#1c2b3a] dark:text-[#5bd0a8]">
            Active Mode: {activePresetId.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CLINICAL_PRESET_SCENARIOS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id, preset.values)}
                className={`rounded-xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-[#087f72] bg-[#e6f4f1]/60 dark:border-[#5bd0a8] dark:bg-[#1c2b3a]'
                    : 'border-slate-200 hover:border-slate-300 dark:border-[#263646] dark:hover:border-[#3b5268]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {preset.name}
                  </strong>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-[#087f72] dark:bg-[#5bd0a8]" />
                  )}
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Top Neuro-Hematology & Multimodal KPI Cards */}
      <div className="metric-grid mb-5">
        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">SYSTEMIC IMMUNE-INFLAMMATION (NLR & SII)</span>
            <Activity size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono">
            NLR {analysis.indices.nlr}{' '}
            <span className="text-sm font-semibold opacity-75">
              / SII {analysis.indices.sii}
            </span>
          </div>
          <div className="metric-Sub">
            <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${getBadgeTone(analysis.indices.nlr_status)}`}>
              {analysis.indices.nlr_tier}
            </span>
          </div>
        </div>

        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">PRE-CRANIOTOMY SURGICAL CLEARANCE</span>
            {analysis.surgical_clearance.tier === 'optimal' ? (
              <CheckCircle2 size={16} className="text-[#087f72]" />
            ) : (
              <AlertTriangle size={16} className="text-amber-500" />
            )}
          </div>
          <div className="metric-value text-lg font-extrabold">
            {analysis.surgical_clearance.status}
          </div>
          <div className="metric-Sub">
            <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${getBadgeTone(analysis.surgical_clearance.tier)}`}>
              Plt {panel.platelets_10e3_ul}k • INR {panel.inr} • Na⁺ {panel.sodium_meq_l}
            </span>
          </div>
        </div>

        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">TEMOZOLOMIDE CHEMO-SAFETY (CTCAE v5.0)</span>
            <ShieldAlert size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono">
            {analysis.chemo_safety.tmz_dose_pct}% Stupp Dose
          </div>
          <div className="metric-Sub">
            <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${getBadgeTone(analysis.chemo_safety.status)}`}>
              {analysis.chemo_safety.ctcae_grade}
            </span>
          </div>
        </div>

        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">ASTROGLIAL LIQUID BIOPSY (SERUM GFAP)</span>
            <Droplets size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono">
            {panel.serum_gfap_pg_ml} <span className="text-base">pg/mL</span>
          </div>
          <div className="metric-Sub">
            <span className="metric-positive font-mono">
              High-Grade Risk: {(analysis.multimodal_fusion.high_grade_probability * 100).toFixed(1)}%
            </span>
            <span>BBB Leak Index: {analysis.indices.bbb_disruption_index}%</span>
          </div>
        </div>
      </div>

      {/* Main 12-Col Grid: Left 6 Cols = Interactive 12-Biomarker Blood Panel | Right 6 Cols = Cross-Modal MRI+Blood Fusion */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left 6 Cols: Interactive 12-Biomarker Blood Panel */}
        <div className="panel p-6 lg:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 dark:border-[#263646]">
            <div>
              <span className="section-kicker">PERIPHERAL VENOUS BLOOD & LIQUID BIOPSY</span>
              <h2 className="text-base font-bold">
                Interactive 12-Biomarker Neuro-Hematology Panel
              </h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 dark:bg-[#1c2b3a] dark:text-slate-200">
              12 Biomarkers Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {BIOMARKER_METADATA_LIST.map((meta) => {
              const val = panel[meta.key];
              const isLow = val < meta.ref_min;
              const isHigh = val > meta.ref_max;
              const statusLabel = isLow ? 'LOW' : isHigh ? 'HIGH' : 'NORMAL';
              const statusClass = isLow
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                : isHigh
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                : 'bg-[#e6f4f1] text-[#087f72] dark:bg-[#16342f] dark:text-[#5bd0a8]';

              return (
                <div
                  key={meta.key}
                  className="rounded-xl border border-slate-200 p-3.5 transition hover:border-[#087f72]/50 dark:border-[#263646]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {meta.label}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-base font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                      {val} <small className="text-[11px] font-normal opacity-80">{meta.unit}</small>
                    </span>
                    <span className="font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                      Ref: {meta.ref_min}–{meta.ref_max}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={val}
                    onChange={(e) => updateBiomarker(meta.key, parseFloat(e.target.value))}
                    className="mt-2 w-full accent-[#087f72] cursor-pointer"
                  />

                  <div className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-300">
                    {meta.clinical_role}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 Cols: Bayesian MRI + Blood Differential Diagnosis & Cross-Modal Attention */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Panel 1: Bayesian Differential Diagnosis Resolver */}
          <div className="panel p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 dark:border-[#263646]">
              <div>
                <span className="section-kicker">BAYESIAN MULTIMODAL DIAGNOSTIC RESOLVER</span>
                <h2 className="text-base font-bold">
                  3D Brain MRI + Blood Biomarker Differential Diagnosis Posterior
                </h2>
              </div>
              <FlaskConical size={18} className="text-[#087f72]" />
            </div>

            <div className="space-y-3.5">
              {analysis.multimodal_fusion.differential_diagnosis.map((item, idx) => {
                const pct = +(item.probability * 100).toFixed(1);
                return (
                  <div
                    key={item.condition}
                    className={`rounded-xl border p-3.5 ${
                      idx === 0
                        ? 'border-[#087f72] bg-[#e6f4f1]/40 dark:border-[#5bd0a8] dark:bg-[#1c2b3a]/70'
                        : 'border-slate-200 dark:border-[#263646]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <strong className="font-extrabold text-slate-900 dark:text-slate-100">
                        {idx + 1}. {item.condition}
                      </strong>
                      <span className="font-mono text-sm font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(3, pct)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      Key Multimodal Drivers: {item.key_drivers}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 2: Pre-Craniotomy & Temozolomide Clinical Action Card */}
          <div className="panel p-6 flex flex-col gap-3.5">
            <div>
              <span className="section-kicker">PERIOPERATIVE & ONCOLOGIC DECISION SUPPORT</span>
              <h2 className="text-base font-bold">
                Neurosurgical Craniotomy & Adjuvant Temozolomide Clearance
              </h2>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-[#263646]">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                1. Pre-Craniotomy Hemostasis & Electrolyte Audit
              </div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {analysis.surgical_clearance.status}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {analysis.surgical_clearance.summary}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-[#263646]">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                2. Adjuvant Temozolomide (TMZ) Regimen Dosing Gate
              </div>
              <div className="mt-1 text-sm font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                {analysis.chemo_safety.tmz_action}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Evaluated per NCCN CNS & Stupp Protocol CTCAE v5.0 hematologic thresholds (Platelets{' '}
                {panel.platelets_10e3_ul} ×10³/µL, ANC {panel.neutrophils_anc_10e3_ul} ×10³/µL, Hb{' '}
                {panel.hemoglobin_g_dl} g/dL).
              </p>
            </div>
          </div>

          {/* Panel 3: Cross-Modal Gated Attention Attribution */}
          <div className="panel p-6 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="section-kicker">PYTORCH CROSS-MODAL GATED MULTIMODAL UNIT (GMU)</span>
                <h2 className="text-base font-bold">
                  Feature Attribution & Modality Gate Balance
                </h2>
              </div>
              <span className="rounded-md bg-[#e6f4f1] px-2.5 py-1 font-mono text-[11px] font-bold text-[#087f72] dark:bg-[#1c2b3a] dark:text-[#5bd0a8]">
                MRI {(analysis.multimodal_fusion.mri_modality_gate * 100).toFixed(0)}% : Blood{' '}
                {(analysis.multimodal_fusion.blood_modality_gate * 100).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-2.5">
              {analysis.multimodal_fusion.attributions.map((attr) => {
                const pct = +(attr.weight * 100).toFixed(1);
                return (
                  <div key={attr.feature} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {attr.feature}{' '}
                        <small className="font-mono text-[10px] opacity-75">({attr.modality})</small>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#087f72] dark:text-[#5bd0a8]">
                        {pct}% • {attr.value_display}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-[#087f72] dark:bg-[#5bd0a8]"
                        style={{ width: `${Math.min(100, pct * 2.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="dark-code-box mt-1 space-y-1">
              <div className="font-bold">Cross-Modal Gated Multimodal Fusion Formulation:</div>
              <div>• z = σ(W_z · [f_MRI(x) ∥ f_Blood(b)]) ∈ [0, 1]^128</div>
              <div>• h_fused = LayerNorm(z ⊙ tanh(W_m f_MRI) + (1 − z) ⊙ tanh(W_b f_Blood))</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
