import { useEffect, useState } from 'react';
import { Check, Copy, Download, FileText, Printer, Sparkles } from 'lucide-react';
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
}

export function ReportsPage({ activePatient, study }: ReportsPageProps) {
  const [indication, setIndication] = useState(
    'New-onset focal neurological deficit with progressive morning cephalalgia and complex partial seizures.'
  );
  const [reportText, setReportText] = useState('');
  const [source, setSource] = useState('NeuroSeg v3.0 ACR/RSNA Autonomous Synthesis Engine');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const hema = computeClientHematologyAnalysis(
    activePatient,
    PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941']
  );

  const runSynthesis = async () => {
    if (!study) return;
    setLoading(true);
    try {
      const res = await neuroApi.generateReport(activePatient, study.volumetry, indication, hema);
      setReportText(res.report_markdown);
      setSource(res.source);
    } finally {
      setLoading(false);
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
    a.download = `${activePatient.patient_id}_NeuroSeg_Radiology_Report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>AUTONOMOUS ACR/RSNA RADIOLOGY REPORT SYNTHESIS</span>
            <span className="eyebrow-divider">•</span>
            <span>GROQ LLAMA 3.3 70B ENGINE</span>
          </div>
          <h1>Clinical Neuro-Radiology Consultation Report Studio</h1>
          <p>
            Automatically translates 3D volumetric tumor burden, RECIST 1.1 diameters, HD95 boundary metrics, and
            Bayesian epistemic uncertainty into a structured hospital consultation report.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="button button-dark" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>
          <button type="button" className="button button-dark" onClick={handleDownload}>
            <Download size={14} />
            <span>Export .MD</span>
          </button>
          <button type="button" className="button button-primary" onClick={() => window.print()}>
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left 4 Cols: Clinical Input Parameters */}
        <div className="panel p-5 lg:col-span-4 flex flex-col gap-4">
          <div>
            <span className="section-kicker">CLINICAL CONTEXT & BIOMARKERS</span>
            <h2 className="text-base font-bold">Study Synthesis Parameters</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-slate-200 p-3 dark:border-[#2b3a45]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Active Patient Study</div>
              <div className="font-bold text-sm mt-0.5">
                {activePatient.patient_id} ({activePatient.age}Y / {activePatient.sex})
              </div>
              <div className="text-slate-400 mt-0.5">{activePatient.histology}</div>
            </div>

            <div>
              <label className="block font-bold mb-1">Clinical Indication & Presenting Symptoms</label>
              <textarea
                rows={4}
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-transparent p-2.5 text-xs outline-none focus:border-[#087f72] dark:border-[#2b3a45]"
              />
            </div>

            <div className="rounded-md bg-slate-50 p-3 space-y-1.5 font-mono text-[11px] dark:bg-[#1d2b36]">
              <div className="font-bold text-[#087f72] dark:text-[#5bd0a8]">Injected Multimodal MRI + Blood Payload:</div>
              <div>• 3D Volume: {activePatient.volume_cm3} cm³ (RECIST: {activePatient.recist_mm} mm)</div>
              <div>• Surface HD95: {activePatient.hd95_mm} mm | ECE: {activePatient.ece}</div>
              <div>• IDH1 / 1p19q: {activePatient.biomarkers.idh1} / {activePatient.biomarkers.codel_1p19q}</div>
              <div>• Blood NLR / SII: {hema.indices.nlr} / {hema.indices.sii}</div>
              <div>• Liquid Biopsy sGFAP: {hema.panel.serum_gfap_pg_ml} pg/mL</div>
              <div>• Craniotomy Gate: {hema.surgical_clearance.status}</div>
              <div>• TMZ Status: {hema.chemo_safety.ctcae_grade}</div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={runSynthesis}
              className="button button-primary w-full"
            >
              <Sparkles size={15} />
              <span>{loading ? 'Synthesizing Report...' : 'Regenerate Clinical Report'}</span>
            </button>
          </div>
        </div>

        {/* Right 8 Cols: Rendered Clinical Report */}
        <div className="panel p-6 lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#2b3a45]">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#087f72]" />
              <strong className="text-sm">Official Neuro-Radiology Consultation Manuscript</strong>
            </div>
            <span className="rounded bg-[#e7f3ef] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#087f72] dark:bg-[#1d2b36] dark:text-[#5bd0a8]">
              {source}
            </span>
          </div>

          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-200 overflow-y-auto max-h-[540px] pr-2">
            {reportText}
          </pre>
        </div>
      </div>
    </div>
  );
}
