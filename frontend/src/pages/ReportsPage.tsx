import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Brain,
  Calendar,
  Check,
  Copy,
  Download,
  Droplets,
  FileText,
  Layers,
  Printer,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PATIENT_DEFAULT_BLOOD_PANELS,
  computeClientHematologyAnalysis,
  neuroApi,
  type PatientRecord,
  type StudyStackResponse,
} from '../api';

interface ReportsPageProps {
  activePatient: PatientRecord;
  study: StudyStackResponse | null;
  onSelectPatient?: (patientId: string) => void;
}

export function ReportsPage({
  activePatient,
  study,
  onSelectPatient,
}: ReportsPageProps) {
  const navigate = useNavigate();
  const params = useParams<{ patientId?: string }>();

  const [indication, setIndication] = useState(
    'New-onset focal neurological deficit with progressive morning cephalalgia and complex partial seizures.'
  );
  const [reportText, setReportText] = useState('');
  const [source, setSource] = useState(
    'NeuroSeg v3.0 Multimodal MRI + Hematology Engine'
  );
  const [loadingReport, setLoadingReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSliceIdx, setSelectedSliceIdx] = useState<number>(8);

  // Sync URL :patientId param if navigated via /case/:patientId
  useEffect(() => {
    if (
      params.patientId &&
      params.patientId !== activePatient.patient_id &&
      onSelectPatient
    ) {
      onSelectPatient(params.patientId);
    }
  }, [params.patientId, activePatient.patient_id, onSelectPatient]);

  useEffect(() => {
    if (study?.volumetry?.peak_lesion_slice_index) {
      setSelectedSliceIdx(Math.max(0, study.volumetry.peak_lesion_slice_index - 1));
    }
  }, [study?.patient_id]);

  const hema = computeClientHematologyAnalysis(
    activePatient,
    PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941']
  );

  const runSynthesis = async () => {
    if (!study) return;
    setLoadingReport(true);
    try {
      const res = await neuroApi.generateReport(
        activePatient,
        study.volumetry,
        indication,
        hema
      );
      setReportText(res.report_markdown);
      setSource(res.source);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (study) {
      void runSynthesis();
    }
  }, [activePatient.patient_id, study?.patient_id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePatient.patient_id}_NeuroSeg_Case_Report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const slices = study?.slices || [];
  const currentSlice = slices[selectedSliceIdx] || slices[8] || slices[0];
  const breakdown = study?.volumetry?.slice_breakdown || [];
  const maxArea = Math.max(1, ...breakdown.map((b) => b.area_mm2));

  const triageLevel = activePatient.triage_level || 'Priority';
  const triageBadgeStyle =
    triageLevel === 'Urgent'
      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800'
      : triageLevel === 'Priority'
      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800'
      : triageLevel === 'Follow-up'
      ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800'
      : 'bg-[#e6f4f1] text-[#087f72] border-[#b5e2d8] dark:bg-[#16342f] dark:text-[#5bd0a8] dark:border-[#25574e]';

  return (
    <div>
      {/* Top Bar with Prominent "← Back to Patient Directory" Button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[#087f72]/30 bg-white px-4 py-2 text-xs font-extrabold text-[#087f72] shadow-sm transition hover:bg-[#e6f4f1] dark:border-[#5bd0a8]/40 dark:bg-[#141f2b] dark:text-[#5bd0a8] dark:hover:bg-[#1c2b3a]"
        >
          <ArrowLeft size={15} />
          <span>← Back to Patient Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/workstation')}
          >
            <Layers size={14} />
            <span>Full 3D PACS Workstation</span>
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/hematology')}
          >
            <Droplets size={14} />
            <span>Blood + MRI Fusion Lab</span>
          </button>
          <button type="button" className="button button-dark" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>
          <button type="button" className="button button-dark" onClick={handleDownload}>
            <Download size={14} />
            <span>Export .MD</span>
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => window.print()}
          >
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Patient Case Header Card */}
      <div className="panel p-6 mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-[#087f72] px-3 py-1 font-mono text-xs font-extrabold text-white">
                {activePatient.patient_id}
              </span>
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-300">
                {activePatient.mrn}
              </span>
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-extrabold uppercase tracking-wide ${triageBadgeStyle}`}
              >
                {triageLevel} • {activePatient.urgency}
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-[#1c2b3a] dark:text-slate-200">
                {activePatient.who_grade}
              </span>
            </div>

            <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {activePatient.name} — {activePatient.histology}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span>
                <strong>Demographics:</strong> {activePatient.age} yrs • {activePatient.sex}
              </span>
              <span>•</span>
              <span>
                <strong>Anatomical Location:</strong> {activePatient.location}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar size={13} className="text-[#087f72]" />
                <strong>Scan Date & Sequence:</strong>{' '}
                {activePatient.scan_date || '2026-10-24'} ({activePatient.sequence || 'Axial T2-FLAIR 3.0T'})
              </span>
            </div>
          </div>

          {/* Molecular Biomarker Badges */}
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs dark:border-[#263646] dark:bg-[#141f2b]">
              <div className="text-[10px] font-bold uppercase text-slate-400">IDH1 Status</div>
              <div className="font-mono font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                {activePatient.biomarkers.idh1}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs dark:border-[#263646] dark:bg-[#141f2b]">
              <div className="text-[10px] font-bold uppercase text-slate-400">1p/19q Codel</div>
              <div className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                {activePatient.biomarkers.codel_1p19q}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs dark:border-[#263646] dark:bg-[#141f2b]">
              <div className="text-[10px] font-bold uppercase text-slate-400">MGMT Promoter</div>
              <div className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                {activePatient.biomarkers.mgmt}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Key 3D Volumetric, RECIST & Neuro-Hematology Cards */}
      <div className="metric-grid mb-5">
        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">3D TUMOR VOLUME & RECIST 1.1</span>
            <Brain size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono">
            {study?.volumetry.total_volume_cm3 ?? activePatient.volume_cm3}{' '}
            <span className="text-base">cm³</span>
          </div>
          <div className="metric-Sub">
            <span className="metric-positive font-mono">
              RECIST Dia: {study?.volumetry.recist_longest_diameter_mm ?? activePatient.recist_mm} mm
            </span>
            <span>Peak Slice #{study?.volumetry.peak_lesion_slice_index || 9}</span>
          </div>
        </div>

        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">SEGMENTATION DSC & BOUNDARY HD95</span>
            <Activity size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono">
            {(activePatient.dsc * 100).toFixed(1)}%{' '}
            <span className="text-sm font-normal opacity-80">DSC</span>
          </div>
          <div className="metric-Sub">
            <span className="metric-positive font-mono">
              HD95: {activePatient.hd95_mm} mm
            </span>
            <span>IoU: {((activePatient.dsc / (2 - activePatient.dsc)) * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">EPISTEMIC UNCERTAINTY & ECE</span>
            <ShieldAlert size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono">
            ECE {activePatient.ece}
          </div>
          <div className="metric-Sub">
            <span className="metric-positive font-mono">
              Conf: {((currentSlice?.confidence || 0.94) * 100).toFixed(1)}%
            </span>
            <span>Entropy: {currentSlice?.epistemic_entropy || 0.084} bits</span>
          </div>
        </div>

        <div className="panel metric-card">
          <div className="metric-top">
            <span className="metric-label">BLOOD LIQUID BIOPSY & SURGICAL GATE</span>
            <Droplets size={16} className="text-[#087f72]" />
          </div>
          <div className="metric-value font-mono text-base font-extrabold">
            {hema.surgical_clearance.status}
          </div>
          <div className="metric-Sub">
            <span className="metric-positive font-mono">
              NLR {hema.indices.nlr} • sGFAP {hema.panel.serum_gfap_pg_ml} pg/mL
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Slice Axial MRI Stack & Segmentation Preview Panel */}
      <div className="panel p-6 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-[#263646]">
          <div>
            <span className="section-kicker">
              MULTI-SLICE AXIAL MRI STACK & SEGMENTATION PREVIEW ({activePatient.patient_id})
            </span>
            <h2 className="text-base font-bold">
              Interactive 4-Channel Diagnostic Preview — Axial Slice #{selectedSliceIdx + 1} of{' '}
              {slices.length || 16}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#087f72] dark:text-[#5bd0a8]">
              Slice #{selectedSliceIdx + 1} Burden:{' '}
              {breakdown[selectedSliceIdx]?.area_mm2 ?? 0} mm²
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, slices.length - 1)}
              value={selectedSliceIdx}
              onChange={(e) => setSelectedSliceIdx(Number(e.target.value))}
              className="w-40 accent-[#087f72] cursor-pointer"
            />
          </div>
        </div>

        {/* 4 Diagnostic MRI Canvases */}
        {currentSlice ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. FLAIR MRI */}
            <div className="rounded-xl border border-slate-200 bg-[#070b10] p-3 text-white dark:border-[#263646]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>1. Axial T2-FLAIR (3.0T)</span>
                <span className="font-mono text-[#5bd0a8]">Slice #{currentSlice.slice_index}</span>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg">
                <img
                  src={`data:image/png;base64,${currentSlice.flair_image_b64}`}
                  alt="FLAIR MRI"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* 2. Predicted Segmentation Mask + GT Overlay */}
            <div className="rounded-xl border border-slate-200 bg-[#070b10] p-3 text-white dark:border-[#263646]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>2. Glioma Segmentation</span>
                <span className="font-mono text-rose-400">
                  {currentSlice.tumor_pixel_count} px
                </span>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg">
                <img
                  src={`data:image/png;base64,${currentSlice.flair_image_b64}`}
                  alt="FLAIR Base"
                  className="h-full w-full object-cover"
                />
                <img
                  src={`data:image/png;base64,${currentSlice.pred_mask_b64}`}
                  alt="Predicted Mask"
                  className="absolute inset-0 h-full w-full object-cover opacity-75 mix-blend-screen"
                />
                <img
                  src={`data:image/png;base64,${currentSlice.gt_mask_b64}`}
                  alt="Ground Truth Contour"
                  className="absolute inset-0 h-full w-full object-cover opacity-90"
                />
              </div>
            </div>

            {/* 3. Grad-CAM++ Saliency */}
            <div className="rounded-xl border border-slate-200 bg-[#070b10] p-3 text-white dark:border-[#263646]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>3. Grad-CAM++ Attention</span>
                <span className="font-mono text-amber-300">Spectral AG α</span>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg">
                <img
                  src={`data:image/png;base64,${currentSlice.flair_image_b64}`}
                  alt="FLAIR Base"
                  className="h-full w-full object-cover"
                />
                <img
                  src={`data:image/png;base64,${currentSlice.gradcam_b64}`}
                  alt="Grad-CAM++"
                  className="absolute inset-0 h-full w-full object-cover opacity-75 mix-blend-screen"
                />
              </div>
            </div>

            {/* 4. Bayesian Epistemic Uncertainty Halo */}
            <div className="rounded-xl border border-slate-200 bg-[#070b10] p-3 text-white dark:border-[#263646]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>4. Epistemic Uncertainty</span>
                <span className="font-mono text-[#5bd0a8]">
                  H={currentSlice.epistemic_entropy}
                </span>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg">
                <img
                  src={`data:image/png;base64,${currentSlice.flair_image_b64}`}
                  alt="FLAIR Base"
                  className="h-full w-full object-cover"
                />
                <img
                  src={`data:image/png;base64,${currentSlice.uncertainty_b64}`}
                  alt="Uncertainty Halo"
                  className="absolute inset-0 h-full w-full object-cover opacity-85 mix-blend-screen"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading 16-slice 3D MRI stack for {activePatient.patient_id}...
          </div>
        )}

        {/* Quick 16-Slice Selector Strip */}
        {breakdown.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
            }}
            className="mt-4 items-end gap-1.5 h-16 pt-2 px-2 rounded-lg bg-slate-50 dark:bg-[#141f2b]"
          >
            {breakdown.map((b, idx) => {
              const hPx = Math.max(6, Math.round((b.area_mm2 / maxArea) * 36));
              const isSelected = idx === selectedSliceIdx;
              return (
                <button
                  key={b.slice_index}
                  type="button"
                  onClick={() => setSelectedSliceIdx(idx)}
                  className={`flex flex-col items-center justify-end h-full rounded px-0.5 pb-1 transition ${
                    isSelected
                      ? 'bg-[#e6f4f1] dark:bg-[#1c3342]'
                      : 'hover:bg-slate-200/60 dark:hover:bg-[#1c2b3a]'
                  }`}
                >
                  <div
                    style={{
                      height: `${hPx}px`,
                      backgroundColor: isSelected
                        ? '#f59e0b'
                        : b.pixel_count > 0
                        ? '#087f72'
                        : '#94a3b8',
                    }}
                    className="w-full max-w-[18px] rounded-t"
                  />
                  <span className="mt-1 font-mono text-[9.5px] font-bold text-slate-600 dark:text-slate-300">
                    S{b.slice_index}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom 12-Col Grid: Left 4 Cols = Clinical Parameters | Right 8 Cols = Autonomous Radiology Report */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left 4 Cols: Clinical Input Parameters */}
        <div className="panel p-6 lg:col-span-4 flex flex-col gap-4">
          <div>
            <span className="section-kicker">CLINICAL CONTEXT & BIOMARKERS</span>
            <h2 className="text-base font-bold">Case Report Synthesis Controls</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-[#2b3a45]">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Active Patient Case
              </div>
              <div className="font-bold text-sm mt-0.5 text-slate-900 dark:text-slate-100">
                {activePatient.name}
              </div>
              <div className="text-slate-500 dark:text-slate-300 mt-0.5">
                {activePatient.histology} • {activePatient.location}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                Clinical Indication & Presenting Symptoms
              </label>
              <textarea
                rows={4}
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-transparent p-3 text-xs outline-none focus:border-[#087f72] dark:border-[#2b3a45]"
              />
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5 font-mono text-[11px] dark:bg-[#1d2b36]">
              <div className="font-bold text-[#087f72] dark:text-[#5bd0a8]">
                Injected Multimodal MRI + Blood Payload:
              </div>
              <div>
                • 3D Volume: {activePatient.volume_cm3} cm³ (RECIST:{' '}
                {activePatient.recist_mm} mm)
              </div>
              <div>
                • Surface HD95: {activePatient.hd95_mm} mm | ECE:{' '}
                {activePatient.ece}
              </div>
              <div>
                • IDH1 / 1p19q: {activePatient.biomarkers.idh1} /{' '}
                {activePatient.biomarkers.codel_1p19q}
              </div>
              <div>
                • Blood NLR / SII: {hema.indices.nlr} / {hema.indices.sii}
              </div>
              <div>• Liquid Biopsy sGFAP: {hema.panel.serum_gfap_pg_ml} pg/mL</div>
              <div>• Craniotomy Gate: {hema.surgical_clearance.status}</div>
              <div>• TMZ Status: {hema.chemo_safety.ctcae_grade}</div>
            </div>

            <button
              type="button"
              disabled={loadingReport}
              onClick={runSynthesis}
              className="button button-primary w-full justify-center"
            >
              <Sparkles size={15} />
              <span>
                {loadingReport
                  ? 'Synthesizing Case Report...'
                  : 'Regenerate Clinical Case Report'}
              </span>
            </button>
          </div>
        </div>

        {/* Right 8 Cols: Rendered Clinical Report */}
        <div className="panel p-6 lg:col-span-8 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5 dark:border-[#2b3a45]">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#087f72]" />
              <strong className="text-sm">
                Autonomous Neuro-Radiology & Neuro-Oncology Consultation Report (
                {activePatient.patient_id})
              </strong>
            </div>
            <span className="rounded bg-[#e7f3ef] px-2.5 py-1 font-mono text-[11px] font-bold text-[#087f72] dark:bg-[#1d2b36] dark:text-[#5bd0a8]">
              {source}
            </span>
          </div>

          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-200 overflow-y-auto max-h-[560px] pr-2">
            {reportText}
          </pre>
        </div>
      </div>
    </div>
  );
}
