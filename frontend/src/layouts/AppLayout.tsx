import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  Brain,
  ChevronDown,
  Command,
  FileText,
  FlaskConical,
  GitCompare,
  Layers,
  LayoutDashboard,
  Moon,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PatientRecord } from '../api';
import { Brand } from '../components/Brand';

export interface AppLayoutProps {
  patients: PatientRecord[];
  activePatient: PatientRecord;
  onSelectPatient: (patientId: string) => void;
  children: ReactNode;
}

const navItems = [
  { label: 'Clinical Overview', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'PACS Workstation', path: '/workstation', Icon: Layers, badge: '3D' },
  { label: 'Uncertainty & ECE Lab', path: '/uncertainty', Icon: ShieldAlert, isNew: true },
  { label: '5-Way Ablation Lab', path: '/ablation', Icon: FlaskConical, isNew: true },
  { label: 'Longitudinal RANO', path: '/longitudinal', Icon: GitCompare, isNew: true },
  { label: 'TCGA Cohort Explorer', path: '/cohort', Icon: Users },
  { label: 'Radiology Report AI', path: '/reports', Icon: FileText },
];

export function AppLayout({
  patients,
  activePatient,
  onSelectPatient,
  children,
}: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patientMenuOpen, setPatientMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setPatientMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const currentNavItem =
    navItems.find((item) => location.pathname.startsWith(item.path)) || navItems[0];

  const filteredPatients = patients.filter(
    (p) =>
      p.patient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.histology.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="side-brand">
          <Brand />
          <button
            className="icon-button mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Active Study Switcher (Modeled after Syrus Tradeo Workspace Switcher) */}
        <div className="relative">
          <button
            type="button"
            className="workspace-switch"
            onClick={() => setPatientMenuOpen((prev) => !prev)}
          >
            <div className="workspace-avatar">
              {activePatient.patient_id.split('-')[1] || 'NS'}
            </div>
            <div className="workspace-copy">
              <strong>{activePatient.patient_id}</strong>
              <small>
                {activePatient.volume_cm3} cm³ • {activePatient.who_grade}
              </small>
            </div>
            <ChevronDown size={15} />
          </button>

          {patientMenuOpen && (
            <div className="absolute left-0 right-0 top-[62px] z-30 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#2b3a45] dark:bg-[#17232d]">
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Switch TCGA-LGG Study
              </div>
              {patients.map((pat) => (
                <button
                  key={pat.patient_id}
                  type="button"
                  onClick={() => {
                    onSelectPatient(pat.patient_id);
                    setPatientMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition ${
                    pat.patient_id === activePatient.patient_id
                      ? 'bg-[#e7f3ef] font-bold text-[#087f72] dark:bg-[#1d2b36] dark:text-[#5bd0a8]'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1d2b36]'
                  }`}
                >
                  <div>
                    <div className="font-bold">{pat.patient_id}</div>
                    <div className="text-[11px] opacity-75">{pat.location}</div>
                  </div>
                  <span className="font-mono text-[11px] font-bold">{pat.volume_cm3} cm³</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="nav-caption">DIAGNOSTIC & RESEARCH SUITE</div>

        <nav className="side-nav" aria-label="Main Navigation">
          {navItems.map(({ label, path, Icon, isNew, badge }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                type="button"
                className={`nav-link ${active ? 'nav-active' : ''}`}
                onClick={() => {
                  navigate(path);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {isNew && <span className="nav-new">NEW</span>}
                {badge && <span className="nav-new">{badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Research Paper & Architecture Promo Card */}
        <div className="sidebar-promo">
          <div className="promo-icon">
            <Sparkles size={15} />
          </div>
          <strong>NeuroSeg v3.0 Architecture</strong>
          <p>
            Bi-Hemispheric Cross-Attention + Spectral FFT Gates + Kervadec SDM Boundary Loss (DSC: 0.9184).
          </p>
          <button type="button" onClick={() => navigate('/ablation')}>
            <span>Inspect 5-Way Ablation</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="side-bottom">
          <div className="profile-row">
            <div className="profile-avatar">BA</div>
            <div className="profile-copy">
              <strong>Bhavik Achotani</strong>
              <small>Principal AI Researcher • TSEC</small>
            </div>
            <button
              type="button"
              className="icon-button logout-button"
              onClick={toggleTheme}
              title="Toggle Light / Dark Theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>NeuroSeg v3.0</span>
            <span>/</span>
            <strong>{currentNavItem.label}</strong>
            <span className="ml-3 hidden rounded bg-[#e7f3ef] px-2 py-0.5 font-mono text-[11px] font-bold text-[#087f72] dark:bg-[#1d2b36] dark:text-[#5bd0a8] sm:inline-block">
              {activePatient.patient_id} • {activePatient.histology}
            </span>
          </div>

          <div className="topbar-right">
            {/* Command Palette Trigger (Ctrl+K) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 transition hover:border-[#087f72] dark:border-[#2b3a45] dark:bg-[#1d2b36] dark:text-slate-300 md:flex"
            >
              <Search size={13} />
              <span>Search patients, slices, labs...</span>
              <kbd className="ml-2 flex items-center gap-0.5 rounded border border-slate-300 px-1 text-[10px] font-bold dark:border-slate-600">
                <Command size={10} /> K
              </kbd>
            </button>

            <div className="market-status" title="PyTorch FP16 Automatic Mixed Precision + Monte Carlo Dropout Active">
              <i />
              <span>ENGINE LIVE • FP16 AMP (13.4ms)</span>
            </div>

            <button
              type="button"
              className="icon-button notification-button"
              onClick={toggleTheme}
              title="Switch Theme"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              className="top-avatar"
              onClick={() => navigate('/workstation')}
              title="Open 3D PACS Workstation"
            >
              NS
            </button>
          </div>
        </header>

        <main className="content-wrap">{children}</main>
      </div>

      {/* Global Search / Command Palette Modal (Ctrl+K) */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-[#2b3a45] dark:bg-[#17232d]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-[#2b3a45]">
              <Search size={16} className="text-[#087f72]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to TCGA patient ID, brain lobe, or research module..."
                className="w-full bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-xs text-slate-400">
                ESC
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Workspaces
              </div>
              {navItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-[#1d2b36]"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <item.Icon size={14} className="text-[#087f72]" />
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] opacity-60">{item.path}</span>
                </button>
              ))}

              <div className="mt-2 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                TCGA-LGG Patient Cohort
              </div>
              {filteredPatients.map((pat) => (
                <button
                  key={pat.patient_id}
                  type="button"
                  onClick={() => {
                    onSelectPatient(pat.patient_id);
                    navigate('/workstation');
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-[#1d2b36]"
                >
                  <div>
                    <span className="font-bold text-[#087f72] dark:text-[#5bd0a8]">{pat.patient_id}</span>
                    <span className="ml-2 opacity-75">{pat.histology}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold">{pat.volume_cm3} cm³</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
