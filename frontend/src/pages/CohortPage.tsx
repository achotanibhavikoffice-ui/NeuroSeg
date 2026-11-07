import { useState } from 'react';
import { ArrowUpRight, Dna, Layers, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PatientRecord } from '../api';

interface CohortPageProps {
  patients: PatientRecord[];
  activePatient: PatientRecord;
  onSelectPatient: (id: string) => void;
}

export function CohortPage({ patients, activePatient, onSelectPatient }: CohortPageProps) {
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = patients.filter(
    (p) =>
      p.patient_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.histology.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.who_grade.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div>
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>THE CANCER GENOME ATLAS (TCGA-LGG) REPOSITORY</span>
            <span className="eyebrow-divider">•</span>
            <span>110 PATIENTS • 3,929 SCANS</span>
          </div>
          <h1>Multi-Institutional Neuro-Oncology Study Cohort</h1>
          <p>
            Select any patient study to load their 16-slice 3.0T FLAIR volumetric stack, molecular biomarkers, and
            Bayesian uncertainty maps into the PACS Workstation.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-[#2b3a45] dark:bg-[#17232d]">
          <Search size={14} className="text-[#087f72]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by IDH1, histology, lobe..."
            className="bg-transparent outline-none w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((pat) => {
          const isCurrent = pat.patient_id === activePatient.patient_id;
          return (
            <div
              key={pat.patient_id}
              className={`panel p-5 flex flex-col gap-3.5 transition ${
                isCurrent ? 'ring-2 ring-[#087f72] dark:ring-[#5bd0a8]' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="workspace-avatar">{pat.patient_id.split('-')[1]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-base font-extrabold">{pat.patient_id}</strong>
                      <span className="font-mono text-xs text-slate-400">({pat.mrn})</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {pat.age}Y • {pat.sex} • {pat.location}
                    </div>
                  </div>
                </div>
                <span className="change-pill change-up">{pat.who_grade}</span>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-xs dark:bg-[#1d2b36]">
                <div className="font-bold text-[#087f72] dark:text-[#5bd0a8] mb-1 flex items-center gap-1.5">
                  <Dna size={13} />
                  <span>{pat.histology}</span>
                </div>
                <div className="flex flex-wrap gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-300">
                  <span>IDH1: {pat.biomarkers.idh1}</span>
                  <span>•</span>
                  <span>1p/19q: {pat.biomarkers.codel_1p19q}</span>
                  <span>•</span>
                  <span>MGMT: {pat.biomarkers.mgmt}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="rounded border border-slate-200 p-2 dark:border-[#2b3a45]">
                  <div className="text-[10px] text-slate-400">3D Vol</div>
                  <strong className="text-[#087f72] dark:text-[#5bd0a8]">{pat.volume_cm3} cm³</strong>
                </div>
                <div className="rounded border border-slate-200 p-2 dark:border-[#2b3a45]">
                  <div className="text-[10px] text-slate-400">RECIST</div>
                  <strong>{pat.recist_mm} mm</strong>
                </div>
                <div className="rounded border border-slate-200 p-2 dark:border-[#2b3a45]">
                  <div className="text-[10px] text-slate-400">Dice DSC</div>
                  <strong className="text-emerald-500">{(pat.dsc * 100).toFixed(1)}%</strong>
                </div>
                <div className="rounded border border-slate-200 p-2 dark:border-[#2b3a45]">
                  <div className="text-[10px] text-slate-400">HD95</div>
                  <strong>{pat.hd95_mm} mm</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-amber-500">Triage: {pat.urgency}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="button button-dark !h-8 !px-3 !text-xs"
                    onClick={() => onSelectPatient(pat.patient_id)}
                  >
                    <Users size={13} />
                    <span>{isCurrent ? 'Active Study' : 'Select Study'}</span>
                  </button>
                  <button
                    type="button"
                    className="button button-primary !h-8 !px-3 !text-xs"
                    onClick={() => {
                      onSelectPatient(pat.patient_id);
                      navigate('/workstation');
                    }}
                  >
                    <Layers size={13} />
                    <span>Open in PACS</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
