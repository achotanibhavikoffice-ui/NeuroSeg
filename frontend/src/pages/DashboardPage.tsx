import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Droplets,
  FileText,
  Filter,
  FlaskConical,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  UploadCloud,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PATIENT_DEFAULT_BLOOD_PANELS,
  computeClientHematologyAnalysis,
  neuroApi,
  type AblationModelRow,
  type PatientRecord,
  type PatientsDirectoryResponse,
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
  activePatient,
  study,
  ablation,
  onSelectPatient,
  onJumpToSlice,
}: DashboardPageProps) {
  const navigate = useNavigate();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [triageFilter, setTriageFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [ageBracketFilter, setAgeBracketFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  const [dirData, setDirData] = useState<PatientsDirectoryResponse | null>(null);
  const [loadingDirectory, setLoadingDirectory] = useState<boolean>(true);

  // Debounce search input by 220ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch filtered & paginated directory from API / fallback
  useEffect(() => {
    let cancelled = false;
    setLoadingDirectory(true);
    neuroApi
      .getPatientsDirectory({
        search: debouncedSearch,
        status: triageFilter,
        gender: genderFilter,
        age_bracket: ageBracketFilter,
        page,
        page_size: pageSize,
      })
      .then((res) => {
        if (!cancelled) {
          setDirData(res);
          setLoadingDirectory(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, triageFilter, genderFilter, ageBracketFilter, page]);

  const hasActiveFilters =
    searchInput.trim() !== '' ||
    triageFilter !== 'ALL' ||
    genderFilter !== 'ALL' ||
    ageBracketFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setTriageFilter('ALL');
    setGenderFilter('ALL');
    setAgeBracketFilter('ALL');
    setPage(1);
  };

  const handleOpenCaseAndReport = (patientId: string) => {
    onSelectPatient(patientId);
    navigate(`/case/${encodeURIComponent(patientId)}`);
  };

  const breakdown = study?.volumetry.slice_breakdown || [];
  const maxArea = Math.max(1, ...breakdown.map((b) => b.area_mm2));
  const hemaSummary = computeClientHematologyAnalysis(
    activePatient,
    PATIENT_DEFAULT_BLOOD_PANELS[activePatient.patient_id] ||
      PATIENT_DEFAULT_BLOOD_PANELS['TCGA-CS-4941']
  );

  const summaryCounts = dirData?.summary_counts || {
    total: 300,
    urgent: 68,
    priority: 94,
    followup: 72,
    routine: 66,
  };

  const renderTriageBadge = (level?: string, urgencyText?: string) => {
    const t = level || 'Priority';
    if (t === 'Urgent') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-800 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
          Urgent • {urgencyText || 'Immediate Resection'}
        </span>
      );
    }
    if (t === 'Priority') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
          Priority • {urgencyText || 'Neurosurgical Review'}
        </span>
      );
    }
    if (t === 'Follow-up') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-900 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-200">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
          Follow-up • {urgencyText || 'Oncologic Restaging'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b5e2d8] bg-[#e6f4f1] px-2.5 py-0.5 text-[11px] font-extrabold text-[#087f72] dark:border-[#25574e] dark:bg-[#16342f] dark:text-[#5bd0a8]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#087f72] dark:bg-[#5bd0a8]" />
        Routine • {urgencyText || 'Surveillance'}
      </span>
    );
  };

  return (
    <div>
      {/* Header Row */}
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>PATIENT DIRECTORY & CLINICAL TRIAGE DASHBOARD</span>
            <span className="eyebrow-divider">•</span>
            <span>300 PATIENTS INDEXED FROM 12,000 MULTIMODAL SCANS</span>
          </div>
          <h1>Clinical Neuro-Oncology Patient Directory & Triage Queue</h1>
          <p>
            Search, filter, and triage patients across our 12,000-scan TCGA-LGG / BraTS multimodal cohort. Click any
            patient row or <strong>"View Case & Report"</strong> to launch their 3D MRI segmentation, volumetry, and
            autonomous consultation report.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/workstation?upload=1')}
          >
            <UploadCloud size={15} />
            <span>Upload Custom MRI (.TIF)</span>
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/hematology')}
          >
            <Droplets size={15} />
            <span>Blood + MRI Fusion Lab</span>
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={() => navigate('/workstation')}
          >
            <Layers size={15} />
            <span>3D PACS Workstation</span>
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => handleOpenCaseAndReport(activePatient.patient_id)}
          >
            <FileText size={15} />
            <span>Open Active Case ({activePatient.patient_id})</span>
          </button>
        </div>
      </div>

      {/* 4 Triage Acuity Overview Stat Cards */}
      <div className="stat-grid">
        <div
          onClick={() => {
            setTriageFilter('ALL');
            setPage(1);
          }}
          className="stat-card stat-main cursor-pointer transition hover:opacity-95"
        >
          <div className="stat-label">
            <span>TOTAL COHORT DIRECTORY</span>
            <Users size={15} />
          </div>
          <div className="stat-value">
            {summaryCounts.total} <span>Patients (12,000 Scans)</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">9,000 Train / 1,500 Val / 1,500 Test</span>
            <span>Click to view all</span>
          </div>
        </div>

        <div
          onClick={() => {
            setTriageFilter('Urgent');
            setPage(1);
          }}
          className="stat-card cursor-pointer transition hover:border-rose-400"
        >
          <div className="stat-label">
            <span>URGENT ACUITY TRIAGE</span>
            <AlertTriangle size={15} className="text-rose-500" />
          </div>
          <div className="stat-value text-rose-600 dark:text-rose-400">
            {summaryCounts.urgent} <span>Urgent Cases</span>
          </div>
          <div className="stat-foot">
            <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
              High Burden / Grade 3
            </span>
            <span>Immediate Surgical Review</span>
          </div>
        </div>

        <div
          onClick={() => {
            setTriageFilter('Priority');
            setPage(1);
          }}
          className="stat-card cursor-pointer transition hover:border-amber-400"
        >
          <div className="stat-label">
            <span>PRIORITY NEUROSURGICAL QUEUE</span>
            <Activity size={15} className="text-amber-500" />
          </div>
          <div className="stat-value text-amber-600 dark:text-amber-400">
            {summaryCounts.priority} <span>Priority Cases</span>
          </div>
          <div className="stat-foot">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              Eloquent Cortex Proximity
            </span>
            <span>Pre-Op Workup</span>
          </div>
        </div>

        <div
          onClick={() => {
            setTriageFilter('Routine');
            setPage(1);
          }}
          className="stat-card cursor-pointer transition hover:border-[#087f72]"
        >
          <div className="stat-label">
            <span>FOLLOW-UP & ROUTINE SURVEILLANCE</span>
            <CheckCircle2 size={15} className="text-[#087f72]" />
          </div>
          <div className="stat-value positive-text">
            {summaryCounts.followup + summaryCounts.routine} <span>Stable Studies</span>
          </div>
          <div className="stat-foot">
            <span className="change-pill change-up">
              {summaryCounts.followup} Follow-Up • {summaryCounts.routine} Routine
            </span>
            <span>RANO Restaging</span>
          </div>
        </div>
      </div>

      {/* PRIMARY PATIENT DIRECTORY & CLINICAL TRIAGE TABLE PANEL */}
      <div className="panel p-6 mb-6 border-2 border-[#087f72]/25">
        {/* Top Row: Search Bar + Filter Chips + Demographic Dropdowns + Clear Filters */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-[#263646]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#087f72] dark:text-[#5bd0a8]" />
                <span className="section-kicker !mb-0">
                  DYNAMIC PATIENT DIRECTORY (`data/tcga_lgg_multimodal_12000.csv`)
                </span>
              </div>
              <h2 className="mt-1 text-lg font-extrabold">
                Clinical Study Triage & Case Selection Queue
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-300">
              <span>
                Showing <strong>{dirData?.patients.length || 0}</strong> of{' '}
                <strong>{dirData?.total || 0}</strong> matching patients
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 font-sans text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                >
                  <RotateCcw size={12} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filters Controls Bar */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-center">
            {/* Debounced Real-Time Search Bar (5 Cols) */}
            <div className="lg:col-span-5 flex items-center gap-2.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 focus-within:border-[#087f72] focus-within:bg-white dark:border-[#2d3f52] dark:bg-[#141f2b]">
              <Search size={16} className="text-[#087f72] shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Patient ID (e.g. TCGA-CS-4941), MRN, Patient Name, or Lobe..."
                className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none dark:text-slate-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Triage Status Filter Chips (4 Cols) */}
            <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'Urgent', label: 'Urgent' },
                  { id: 'Priority', label: 'Priority' },
                  { id: 'Follow-up', label: 'Follow-up' },
                  { id: 'Routine', label: 'Routine' },
                  { id: 'Pending', label: 'Pending' },
                ] as const
              ).map((chip) => {
                const active = triageFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setTriageFilter(chip.id);
                      setPage(1);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'bg-[#087f72] text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-[#2d3f52] dark:bg-[#141f2b] dark:text-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Gender & Age Bracket Dropdowns (3 Cols) */}
            <div className="lg:col-span-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-[#2d3f52] dark:bg-[#141f2b]">
                <Filter size={12} className="text-[#087f72] shrink-0" />
                <select
                  value={genderFilter}
                  onChange={(e) => {
                    setGenderFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by Gender"
                  className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none dark:bg-[#141f2b] dark:text-slate-200"
                >
                  <option value="ALL">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-[#2d3f52] dark:bg-[#141f2b]">
                <select
                  value={ageBracketFilter}
                  onChange={(e) => {
                    setAgeBracketFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by Age Bracket"
                  className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none dark:bg-[#141f2b] dark:text-slate-200"
                >
                  <option value="ALL">All Ages</option>
                  <option value="UNDER_35">Under 35 yrs</option>
                  <option value="35_50">35 – 50 yrs</option>
                  <option value="OVER_50">Over 50 yrs</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Patient Directory Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-[#263646] dark:text-slate-300">
                <th className="py-3 px-3">Patient MRN / ID & Name</th>
                <th className="py-3 px-3">Demographics & Histology</th>
                <th className="py-3 px-3">Scan Date / Sequence</th>
                <th className="py-3 px-3">Triage Status / Acuity Level</th>
                <th className="py-3 px-3">Lesion Volume / RECIST</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs dark:divide-[#243444]">
              {loadingDirectory ? (
                // Shimmer Loading Skeletons
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-3">
                      <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="mt-1.5 h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="mt-1.5 h-3 w-32 rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="h-6 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="ml-auto h-8 w-36 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    </td>
                  </tr>
                ))
              ) : dirData && dirData.patients.length > 0 ? (
                dirData.patients.map((pat) => {
                  const isSelected = pat.patient_id === activePatient.patient_id;
                  const isPending = pat.analysis_status === 'Pending';

                  return (
                    <tr
                      key={pat.patient_id}
                      onClick={() => handleOpenCaseAndReport(pat.patient_id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#e6f4f1]/80 dark:bg-[#1c2e3d]'
                          : 'hover:bg-slate-50 dark:hover:bg-[#162330]'
                      }`}
                    >
                      {/* 1. Patient MRN / ID & Name */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold text-white ${
                              isSelected ? 'bg-[#087f72]' : 'bg-slate-600 dark:bg-slate-700'
                            }`}
                          >
                            {pat.patient_id.split('-')[1]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-[#e6f4f1] px-2 py-0.5 font-mono text-xs font-extrabold text-[#087f72] dark:bg-[#16342f] dark:text-[#5bd0a8]">
                                {pat.patient_id}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-300">
                                {pat.mrn}
                              </span>
                            </div>
                            <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                              {pat.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Demographics & Histology */}
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">
                          {pat.age} yrs • {pat.sex} •{' '}
                          <span className="text-[#087f72] dark:text-[#5bd0a8]">{pat.who_grade}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-300">
                          {pat.histology} ({pat.location})
                        </div>
                      </td>

                      {/* 3. Scan Date / Sequence */}
                      <td className="py-3.5 px-3">
                        <div className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                          <Calendar size={12} className="text-[#087f72]" />
                          <span>{pat.scan_date || '2026-10-24'}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-300">
                          {pat.sequence || 'Axial T2-FLAIR + Post-Gd T1 (3.0T)'}
                        </div>
                      </td>

                      {/* 4. Triage Status / Acuity Level */}
                      <td className="py-3.5 px-3">
                        {renderTriageBadge(pat.triage_level, pat.urgency)}
                      </td>

                      {/* 5. Lesion Volume / RECIST Summary */}
                      <td className="py-3.5 px-3 font-mono">
                        {isPending ? (
                          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Clock size={12} />
                            <span>Pending Quantitative Sign-Off</span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100">
                              {pat.volume_cm3} cm³{' '}
                              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-300">
                                ({pat.recist_mm} mm RECIST)
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-[#087f72] dark:text-[#5bd0a8]">
                              DSC: {(pat.dsc * 100).toFixed(1)}% • HD95: {pat.hd95_mm} mm
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Action: "View Case & Report" */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCaseAndReport(pat.patient_id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#087f72] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#06645a]"
                          >
                            <FileText size={13} />
                            <span>View Case & Report</span>
                            <ArrowUpRight size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(pat.patient_id);
                              navigate('/workstation');
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-[#087f72] dark:border-[#2d3f52] dark:bg-[#1c2b3a] dark:text-slate-200"
                            title="Open 3D MRI PACS Workstation"
                          >
                            PACS
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Empty State ("No patients found matching your search")
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                      <Search size={28} className="text-slate-400" />
                      <strong className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                        No patients found matching your search
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        No records in the 300-patient TCGA-LGG directory matched "{searchInput}" with the selected
                        triage and demographic filters.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#087f72] px-4 py-2 text-xs font-bold text-white"
                      >
                        <RotateCcw size={13} />
                        <span>Reset All Search & Filter Criteria</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {dirData && dirData.total_pages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs dark:border-[#263646]">
            <div className="font-mono text-slate-500 dark:text-slate-300">
              Page <strong>{dirData.page}</strong> of <strong>{dirData.total_pages}</strong> • Total Indexed Cohort:{' '}
              <strong>{dirData.total}</strong> Patients (`data/tcga_lgg_multimodal_12000.csv`)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 disabled:opacity-40 dark:border-[#2d3f52] dark:bg-[#141f2b] dark:text-slate-200"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: Math.min(5, dirData.total_pages) }).map((_, i) => {
                const pNum = i + 1;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 rounded-lg font-mono text-xs font-bold transition ${
                      dirData.page === pNum
                        ? 'bg-[#087f72] text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#2d3f52] dark:bg-[#141f2b] dark:text-slate-200'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={page >= dirData.total_pages}
                onClick={() => setPage((p) => Math.min(dirData.total_pages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 disabled:opacity-40 dark:border-[#2d3f52] dark:bg-[#141f2b] dark:text-slate-200"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Preview Grid for Active Selected Patient */}
      <div className="dashboard-grid">
        {/* LEFT PRIMARY COLUMN */}
        <div className="primary-column">
          {/* Z-Axis Volumetric Profile Panel */}
          <div className="panel performance-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">
                  ACTIVE STUDY PREVIEW: {activePatient.patient_id} ({activePatient.name})
                </span>
                <h2>Slice-by-Slice Cross-Sectional Tumor Burden (mm²) — Click Any Slice to Open 3D PACS</h2>
              </div>
              <button
                type="button"
                className="text-action"
                onClick={() => handleOpenCaseAndReport(activePatient.patient_id)}
              >
                <span>Open Full Case & Report</span>
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

          {/* Dataset & Model Training Verification Panel */}
          <div className="panel p-6">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">LARGE-SCALE TRAINING & TESTING BENCHMARK</span>
                <h2>12,000-Sample Multimodal Brain MRI + Blood Biomarker Training Corpus</h2>
              </div>
              <Database size={17} className="text-[#087f72]" />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 mt-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-[#263646]">
                <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-300">
                  Training Partition (75%)
                </div>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                  9,000 Samples
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  AdamW (lr=2.5e-3) • Cosine Annealing • 30 Epochs
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-[#263646]">
                <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-300">
                  Validation Partition (12.5%)
                </div>
                <div className="mt-1 font-mono text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  1,500 Samples
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  Early-stopping & hyperparameter calibration
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-[#263646]">
                <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-300">
                  Held-Out Test Set (12.5%)
                </div>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                  1,500 Samples
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  DSC: 91.84% • HD95: 3.42mm • ROC-AUC: 0.964
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECONDARY COLUMN */}
        <div className="secondary-column">
          {/* Quick Triage & Architecture Control Panel */}
          <div className="panel quick-trade">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">SELECTED PATIENT SUMMARY</span>
                <h2>{activePatient.patient_id} Triage Card</h2>
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
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="button trade-submit trade-buy"
                onClick={() => handleOpenCaseAndReport(activePatient.patient_id)}
              >
                <FileText size={15} />
                <span>View Case & Autonomous Report</span>
              </button>
              <button
                type="button"
                className="button button-dark w-full justify-center"
                onClick={() => navigate('/workstation')}
              >
                <Layers size={15} />
                <span>Inspect 6-Layer PACS Stack</span>
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
