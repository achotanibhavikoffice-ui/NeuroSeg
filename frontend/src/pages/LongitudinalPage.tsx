import { useEffect, useState } from 'react';
import { Activity, Calendar, CheckCircle2, GitCompare, TrendingDown } from 'lucide-react';
import { neuroApi, type LongitudinalResponse, type PatientRecord } from '../api';

interface LongitudinalPageProps {
  activePatient: PatientRecord;
}

export function LongitudinalPage({ activePatient }: LongitudinalPageProps) {
  const [data, setData] = useState<LongitudinalResponse | null>(null);

  useEffect(() => {
    neuroApi.getLongitudinal(activePatient.patient_id).then(setData);
  }, [activePatient.patient_id]);

  const timepoints = data?.timepoints || [];
  const baseVol = timepoints[0]?.volume_cm3 || 18.42;
  const latestVol = timepoints[timepoints.length - 1]?.volume_cm3 || 11.34;
  const pctChange = (((latestVol - baseVol) / baseVol) * 100).toFixed(1);

  return (
    <div>
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>LONGITUDINAL RANO & RECIST 1.1 THERAPY RESPONSE TRACKER</span>
            <span className="eyebrow-divider">•</span>
            <span>{activePatient.patient_id}</span>
          </div>
          <h1>Multi-Temporal Volumetric Cytoreduction & Progression Analysis</h1>
          <p>{data?.protocol || 'Adjuvant Temozolomide + Fractionated Radiotherapy (54 Gy)'}</p>
        </div>

        <span className="change-pill change-up text-xs px-3 py-1.5">
          <CheckCircle2 size={14} /> {data?.rano_status || 'RANO Partial Response (PR)'}
        </span>
      </div>

      {/* Top KPI Cards */}
      <div className="stat-grid mb-5">
        <div className="stat-card">
          <div className="stat-label">
            <span>BASELINE TUMOR BURDEN (TP-1)</span>
            <Calendar size={15} />
          </div>
          <div className="stat-value">
            {baseVol} <span>cm³</span>
          </div>
          <div className="stat-foot">
            <span>Pre-radiotherapy reference scan</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>CURRENT FOLLOW-UP (TP-3)</span>
            <TrendingDown size={15} />
          </div>
          <div className="stat-value positive-text">
            {latestVol} <span>cm³</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">{pctChange}% Volume Shrinkage</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>RECIST DIAMETER DELTA</span>
            <GitCompare size={15} />
          </div>
          <div className="stat-value">
            34.8 → 24.1 <span>mm</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">-10.7 mm Transaxial</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>VASOGENIC EDEMA INDEX</span>
            <Activity size={15} />
          </div>
          <div className="stat-value positive-text">
            0.42 → 0.19 <span>ratio</span>
          </div>
          <div className="stat-foot">
            <span>-54.8% Perilesional FLAIR Edema</span>
          </div>
        </div>
      </div>

      {/* Timepoint Progression Timeline Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {timepoints.map((tp, idx) => {
          const deltaPct = idx === 0 ? 'Baseline' : `${(((tp.volume_cm3 - baseVol) / baseVol) * 100).toFixed(1)}% vs TP-1`;
          return (
            <div key={tp.scan_id} className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="rounded bg-[#e7f3ef] px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#087f72] dark:bg-[#1d2b36] dark:text-[#5bd0a8]">
                  {tp.scan_id}
                </span>
                <span className="font-mono text-xs text-slate-400">{tp.date}</span>
              </div>

              <div className="my-1 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">3D Segmented Volume</div>
                  <div className="font-mono text-2xl font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                    {tp.volume_cm3} cm³
                  </div>
                </div>
                <span className="change-pill change-up font-mono">{deltaPct}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-2.5 text-xs dark:border-[#2b3a45]">
                <div>
                  <span className="text-slate-400 block text-[10px]">RECIST 1.1 Dia</span>
                  <strong className="font-mono">{tp.recist_mm} mm</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Boundary HD95</span>
                  <strong className="font-mono">{tp.hd95_mm} mm</strong>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-300">{tp.clinical_note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
