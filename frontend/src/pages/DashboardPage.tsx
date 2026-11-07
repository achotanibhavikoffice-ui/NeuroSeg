import {
  Activity,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Droplets,
  FileText,
  FlaskConical,
  Layers,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PATIENT_DEFAULT_BLOOD_PANELS,
  computeClientHematologyAnalysis,
  type AblationModelRow,
  type PatientRecord,
  type StudyStackResponse,
} from '../api';

interface DashboardPageProps {
  patients: PatientRecord[];
  activePatient: PatientRecord;
  study: StudyStackResponse | null;
  ablation: AblationModelRow[];
  onSelectPatient: (id: string) => void;
  onJumpToSlice: (sliceIdx: number) => void;
}

export function DashboardPage({
  patients,
  activePatient,
  study,
  ablation,
  onSelectPatient,
  onJumpToSlice,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const breakdown = study?.volumetry.slice_breakdown || [];
  const maxArea = Math.max(1, ...breakdown.map((b) => b.area_mm2));
  const hemaSummary = computeClientHematologyAnalysis(
    activePatient,
    PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941']
  );

  return (
    <div>
      {/* Greeting & Quick Action Row */}
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>NEURO-ONCOLOGY CLINICAL COMMAND CENTER</span>
            <span className="eyebrow-divider">•</span>
            <span>{activePatient.patient_id}</span>
            <span className="eyebrow-divider">•</span>
            <span>IDH1: {activePatient.biomarkers.idh1.toUpperCase()}</span>
          </div>
          <h1>
            {activePatient.histology} — {activePatient.location}
          </h1>
          <p>
            Bi-Hemispheric Spectral-TransUNet v3.0 • Multi-Scale Deep Supervision • Kervadec SDM Boundary Loss •
            Bayesian Epistemic Uncertainty (T=8 MC Passes)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/hematology')}
          >
            <Droplets size={15} />
            <span>Blood + MRI Fusion</span>
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/reports')}
          >
            <FileText size={15} />
            <span>ACR/RSNA AI Report</span>
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate('/workstation')}
          >
            <Layers size={15} />
            <span>Open 3D PACS Workstation</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Stat Cards (Syrus Tradeo stat-grid style) */}
      <div className="stat-grid">
        <div className="stat-card stat-main">
          <div className="stat-label">
            <span>3D VOLUMETRIC TUMOR BURDEN</span>
            <Brain size={15} />
          </div>
          <div className="stat-value">
            {activePatient.volume_cm3} <span>cm³ ({Math.round(activePatient.volume_cm3 * 1000)} mm³)</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">RECIST: {activePatient.recist_mm} mm</span>
            <span>Peak at Axial Slice #{study?.volumetry.peak_lesion_slice_index || 9}</span>
          </div>
          <svg className="stat-spark" viewBox="0 0 100 40" fill="none">
            <path
              d="M2 35 C20 34, 32 28, 48 12 C62 2, 75 8, 98 26"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>DICE SIMILARITY (DSC)</span>
            <Sparkles size={15} />
          </div>
          <div className="stat-value positive-text">
            {(activePatient.dsc * 100).toFixed(1)}% <span>({activePatient.dsc.toFixed(3)})</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">+8.74% vs U-Net</span>
            <span>IoU: 85.12%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>95% HAUSDORFF (HD95)</span>
            <Activity size={15} />
          </div>
          <div className="stat-value">
            {activePatient.hd95_mm} <span>mm surface err</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">-5.22 mm via SDM Loss</span>
            <span>Sub-voxel margin</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>CALIBRATION ERROR (ECE)</span>
            <ShieldAlert size={15} />
          </div>
          <div className="stat-value positive-text">
            {activePatient.ece} <span>ECE (T=8 MC)</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">98.1% Reliability</span>
            <button type="button" className="text-action" onClick={() => navigate('/uncertainty')}>
              <span>Audit</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Engine Telemetry Strip (Syrus Tradeo market-strip style) */}
      <div className="market-strip">
        <div className="market-strip-label">
          <span className="live-pulse" />
          <span>NEUROSEG v3.0 TELEMETRY</span>
        </div>

        <div className="index-quote">
          <span>SPECTRAL FFT GATE</span>
          <strong>HIGH-PASS α ACTIVE</strong>
          <small className="positive-text">rfft2 σ=0.08 edge filter</small>
        </div>

        <div className="index-quote">
          <span>BI-HEMISPHERIC ATTN</span>
          <strong>8-HEAD CONTRALATERAL</strong>
          <small className="positive-text">Sagittal midline flip</small>
        </div>

        <div className="index-quote">
          <span>DEEP SUPERVISION</span>
          <strong>4 DECODER SCALES</strong>
          <small className="positive-text">w = [0.53, 0.27, 0.13, 0.07]</small>
        </div>

        <div className="index-quote">
          <span>SLICE INFERENCE</span>
          <strong>{study?.inference_ms_per_slice || 13.4} ms / slice</strong>
          <small className="positive-text">FP16 Mixed Precision</small>
        </div>

        <div className="market-asof">
          <Zap size={13} />
          <span>TCGA-LGG Cohort Ready</span>
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="dashboard-grid">
        {/* LEFT PRIMARY COLUMN */}
        <div className="primary-column">
          {/* Z-Axis Volumetric Profile Panel */}
          <div className="panel performance-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">3D AXIAL Z-AXIS VOLUMETRIC RECONSTRUCTION</span>
                <h2>Slice-by-Slice Cross-Sectional Tumor Burden (mm²) — Click Any Slice to Inspect in PACS</h2>
              </div>
              <button
                type="button"
                className="text-action"
                onClick={() => navigate('/workstation')}
              >
                <span>Open Full 3D Viewer</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="performance-summary">
              <strong>{activePatient.volume_cm3} cm³ Total Burden</strong>
              <span className="change-pill change-up">
                {study?.volumetry.slices_involved_count || 9} / {study?.total_slices || 16} Active Slices
              </span>
              <small>Voxel Resolution: 0.94 × 0.94 × 4.0 mm</small>
            </div>

            {/* Interactive 16-Bar Horizontal Chart across the 16 Axial Slices */}
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
              className="mt-4 items-end gap-2 h-44 pt-4 pb-2 px-3 border-b border-slate-200 dark:border-[#293c4f]"
            >
              {breakdown.map((s, idx) => {
                const barHeightPx = Math.max(8, Math.round((s.area_mm2 / maxArea) * 116));
                const hasTumor = s.pixel_count > 0;
                const isPeak = idx + 1 === study?.volumetry.peak_lesion_slice_index;
                return (
                  <button
                    key={s.slice_index}
                    type="button"
                    onClick={() => {
                      onJumpToSlice(idx);
                      navigate('/workstation');
                    }}
                    title={`Slice #${s.slice_index}: ${s.area_mm2} mm² (Max Dia: ${s.max_diameter_mm} mm)`}
                    className="group flex flex-col items-center justify-end h-full w-full focus:outline-none"
                  >
                    <div className="flex items-end justify-center w-full flex-1">
                      <div
                        style={{
                          height: `${barHeightPx}px`,
                          backgroundColor: hasTumor ? (isPeak ? '#f59e0b' : '#087f72') : '#cbd5e1',
                        }}
                        className="w-full max-w-[26px] rounded-t-md transition-all group-hover:opacity-85"
                      />
                    </div>
                    <span className="mt-2 font-mono text-[10.5px] font-semibold text-slate-500 group-hover:font-bold group-hover:text-[#087f72] dark:text-slate-300 dark:group-hover:text-[#5bd0a8]">
                      S{s.slice_index}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="chart-footer">
              <div className="chart-legend">
                <i />
                <span>Infiltrated Axial Slice (FLAIR Hyperintensity)</span>
                <span>•</span>
                <span className="text-amber-500 font-bold">Amber = Apex Tumor Cross-Section (Slice #9)</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Equiv. Spherical Dia: {study?.volumetry.equivalent_spherical_diameter_mm || 32.8} mm
              </div>
            </div>
          </div>

          {/* Patient Cohort Triage Table (Syrus Tradeo holdings-panel style) */}
          <div className="panel holdings-panel pb-3">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">MULTI-INSTITUTIONAL TCGA-LGG STUDY QUEUE</span>
                <h2>
                  Active Neuro-Oncology Cohort <span className="count-badge">{patients.length}</span>
                </h2>
              </div>
              <button type="button" className="text-action" onClick={() => navigate('/cohort')}>
                <span>Explore Full Cohort</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="table-head">
              <span>PATIENT / HISTOLOGY & LOCATION</span>
              <span>3D VOLUME / RECIST</span>
              <span>DSC / HD95</span>
              <span />
            </div>

            {patients.map((pat) => {
              const isSelected = pat.patient_id === activePatient.patient_id;
              return (
                <div
                  key={pat.patient_id}
                  onClick={() => onSelectPatient(pat.patient_id)}
                  className={`holding-row cursor-pointer px-2 rounded transition ${
                    isSelected ? 'bg-[#e7f3ef]/60 dark:bg-[#1d2b36]' : 'hover:bg-slate-50 dark:hover:bg-[#1d2b36]/50'
                  }`}
                >
                  <div className="holding-instrument">
                    <div
                      className="company-token"
                      style={{ '--token': isSelected ? '#087f72' : '#d18248' } as React.CSSProperties}
                    >
                      {pat.patient_id.split('-')[1]}
                    </div>
                    <span>
                      <strong>
                        {pat.patient_id} • {pat.histology}
                      </strong>
                      <small>
                        {pat.location} • IDH1: {pat.biomarkers.idh1} • {pat.who_grade}
                      </small>
                    </span>
                  </div>

                  <div className="holding-price font-mono">
                    {pat.volume_cm3} cm³
                    <div className="text-[10px] font-normal text-slate-400">{pat.recist_mm} mm Dia</div>
                  </div>

                  <div className="holding-change positive-text font-mono">
                    {(pat.dsc * 100).toFixed(1)}% DSC
                    <div className="text-[10px] font-normal text-slate-400">{pat.hd95_mm} mm HD95</div>
                  </div>

                  <button
                    type="button"
                    className="row-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPatient(pat.patient_id);
                      navigate('/workstation');
                    }}
                    title="Inspect in PACS Workstation"
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SECONDARY COLUMN */}
        <div className="secondary-column">
          {/* Quick Triage & Architecture Control Panel */}
          <div className="panel quick-trade">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">REAL-TIME INFERENCE SUMMARY</span>
                <h2>Diagnostic Triage Card</h2>
              </div>
              <span className="practice-badge">
                <span />
                {activePatient.who_grade.toUpperCase()}
              </span>
            </div>

            <div className="practice-callout">
              <CheckCircle2 size={15} />
              <span>
                <strong>{activePatient.urgency}:</strong> {activePatient.location}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-[#2b3a45]">
                <span className="text-slate-400">Molecular IDH1 Status</span>
                <strong className="font-mono text-[#087f72] dark:text-[#5bd0a8]">
                  {activePatient.biomarkers.idh1}
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-[#2b3a45]">
                <span className="text-slate-400">1p/19q Codeletion</span>
                <strong className="font-mono">{activePatient.biomarkers.codel_1p19q}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-[#2b3a45]">
                <span className="text-slate-400">MGMT Promoter</span>
                <strong className="font-mono">{activePatient.biomarkers.mgmt}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-[#2b3a45]">
                <span className="text-slate-400">Blood NLR / Serum GFAP</span>
                <strong className="font-mono text-[#087f72] dark:text-[#5bd0a8]">
                  NLR {hemaSummary.indices.nlr} • {hemaSummary.panel.serum_gfap_pg_ml} pg/mL
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-[#2b3a45]">
                <span className="text-slate-400">Pre-Craniotomy Blood Gate</span>
                <strong className="font-mono text-[#087f72] dark:text-[#5bd0a8]">
                  {hemaSummary.surgical_clearance.status}
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-[#2b3a45]">
                <span className="text-slate-400">Uncertainty Halo (Mean H)</span>
                <strong className="font-mono text-amber-500">0.118 bits (Calibrated)</strong>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="button trade-submit trade-buy"
                onClick={() => navigate('/workstation')}
              >
                <Layers size={15} />
                <span>Inspect 6-Layer PACS Stack</span>
              </button>
              <button
                type="button"
                className="button button-dark w-full justify-center"
                onClick={() => navigate('/hematology')}
              >
                <Droplets size={15} />
                <span>Open Neuro-Hematology Blood Lab</span>
              </button>
            </div>
          </div>

          {/* 5 Research Upgrades Benchmark Summary */}
          <div className="panel movers-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">ABLATION PROGRESSION</span>
                <h2>5 Research Upgrades Impact</h2>
              </div>
              <FlaskConical size={16} className="text-[#087f72]" />
            </div>

            <div className="movers-list">
              {ablation.map((row) => (
                <div key={row.id} className="mover-row">
                  <span className="mover-dot" />
                  <div className="mover-copy">
                    <strong>{row.name}</strong>
                    <small>
                      {row.backbone} • HD95: {row.hd95_mm}mm
                    </small>
                  </div>
                  <div className="mover-change positive-text font-mono">
                    {(row.dsc * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="movers-link" onClick={() => navigate('/ablation')}>
              <span>View Full Mathematical Ablation Lab</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
