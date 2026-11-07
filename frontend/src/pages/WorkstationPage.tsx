import { useEffect, useState } from 'react';
import {
  Activity,
  Crosshair,
  Eye,
  FileText,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PatientRecord, StudyStackResponse } from '../api';

interface WorkstationPageProps {
  activePatient: PatientRecord;
  study: StudyStackResponse | null;
  currentSlice: number;
  onSliceChange: (idx: number) => void;
}

export function WorkstationPage({
  activePatient,
  study,
  currentSlice,
  onSliceChange,
}: WorkstationPageProps) {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [showPredMask, setShowPredMask] = useState(true);
  const [showGtContour, setShowGtContour] = useState(true);
  const [showGradCam, setShowGradCam] = useState(true);
  const [showUncertaintyHalo, setShowUncertaintyHalo] = useState(true);
  const [showAsymmetryMap, setShowAsymmetryMap] = useState(false);

  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [camOpacity, setCamOpacity] = useState(0.45);
  const [uncertaintyOpacity, setUncertaintyOpacity] = useState(0.85);
  const [contrast, setContrast] = useState(1.1);
  const [brightness, setBrightness] = useState(1.05);

  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 96, y: 114 });

  const slices = study?.slices || [];
  const activeSliceData = slices[currentSlice] || slices[0];
  const activeBreakdown = study?.volumetry.slice_breakdown[currentSlice];

  useEffect(() => {
    if (!playing || slices.length === 0) return;
    const timer = window.setInterval(() => {
      onSliceChange((currentSlice + 1) % slices.length);
    }, 380);
    return () => window.clearInterval(timer);
  }, [playing, currentSlice, slices.length, onSliceChange]);

  const resetPreset = () => {
    setShowPredMask(true);
    setShowGtContour(true);
    setShowGradCam(true);
    setShowUncertaintyHalo(true);
    setShowAsymmetryMap(false);
    setMaskOpacity(0.7);
    setCamOpacity(0.45);
    setUncertaintyOpacity(0.85);
    setContrast(1.1);
    setBrightness(1.05);
  };

  return (
    <div>
      {/* Header Row */}
      <div className="greeting-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            <span>INTERACTIVE PACS DIAGNOSTIC WORKSTATION v3.0</span>
            <span className="eyebrow-divider">•</span>
            <span>{activePatient.patient_id}</span>
            <span className="eyebrow-divider">•</span>
            <span>{study?.sequence || 'Axial T2-FLAIR 3.0T'}</span>
          </div>
          <h1>6-Layer Volumetric MRI & Explainability Inspector</h1>
          <p>
            Scroll axial planes or toggle Bayesian Epistemic Uncertainty Halo (σ²), Grad-CAM++, and Bi-Hemispheric
            Contralateral Asymmetry overlays in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="button button-dark"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? 'Pause Cine Loop' : 'Play 3D Cine Loop'}</span>
          </button>
          <button type="button" className="button button-dark" onClick={resetPreset}>
            <RotateCcw size={14} />
            <span>Reset Window</span>
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate('/reports')}
          >
            <FileText size={14} />
            <span>Synthesize Report</span>
          </button>
        </div>
      </div>

      {/* 3-Column PACS Workstation Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN (3 cols): Layer Toggles & Windowing */}
        <div className="panel p-4 lg:col-span-3 flex flex-col gap-4">
          <div>
            <span className="section-kicker">MULTI-MODAL OVERLAY ENGINE</span>
            <h2 className="text-sm font-bold">Diagnostic Layer Stack (6 Layers)</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 cursor-pointer dark:border-[#2b3a45]">
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                NeuroSeg v3.0 Mask
              </span>
              <input
                type="checkbox"
                checked={showPredMask}
                onChange={(e) => setShowPredMask(e.target.checked)}
                className="accent-[#087f72]"
              />
            </label>

            <label className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 cursor-pointer dark:border-[#2b3a45]">
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-3 w-3 rounded-full border-2 border-dashed border-emerald-400" />
                Ground-Truth Contour (GT)
              </span>
              <input
                type="checkbox"
                checked={showGtContour}
                onChange={(e) => setShowGtContour(e.target.checked)}
                className="accent-[#087f72]"
              />
            </label>

            <label className="flex items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 cursor-pointer">
              <span className="flex items-center gap-2 font-bold text-amber-500">
                <ShieldAlert size={14} />
                Epistemic Uncertainty Halo (σ²)
              </span>
              <input
                type="checkbox"
                checked={showUncertaintyHalo}
                onChange={(e) => setShowUncertaintyHalo(e.target.checked)}
                className="accent-amber-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 cursor-pointer dark:border-[#2b3a45]">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles size={14} className="text-cyan-400" />
                Grad-CAM++ Saliency (dec1)
              </span>
              <input
                type="checkbox"
                checked={showGradCam}
                onChange={(e) => setShowGradCam(e.target.checked)}
                className="accent-[#087f72]"
              />
            </label>

            <label className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 cursor-pointer dark:border-[#2b3a45]">
              <span className="flex items-center gap-2 font-semibold">
                <Layers size={14} className="text-teal-400" />
                Bi-Hemispheric Asymmetry Map
              </span>
              <input
                type="checkbox"
                checked={showAsymmetryMap}
                onChange={(e) => setShowAsymmetryMap(e.target.checked)}
                className="accent-[#087f72]"
              />
            </label>
          </div>

          <div className="border-t border-slate-200 pt-3 dark:border-[#2b3a45] space-y-3 text-xs">
            <span className="section-kicker">OPACITY & DICOM WINDOWING</span>

            <div>
              <div className="flex justify-between mb-1">
                <span>Tumor Mask Opacity</span>
                <strong className="font-mono">{Math.round(maskOpacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={maskOpacity}
                onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#087f72]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Uncertainty Halo Intensity</span>
                <strong className="font-mono text-amber-500">{Math.round(uncertaintyOpacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={uncertaintyOpacity}
                onChange={(e) => setUncertaintyOpacity(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Grad-CAM++ Heatmap Blend</span>
                <strong className="font-mono">{Math.round(camOpacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={camOpacity}
                onChange={(e) => setCamOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#087f72]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Contrast</span>
                  <strong className="font-mono">{contrast.toFixed(1)}x</strong>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.1}
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full accent-[#087f72]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Brightness</span>
                  <strong className="font-mono">{brightness.toFixed(1)}x</strong>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.1}
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-full accent-[#087f72]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (6 cols): Interactive Multi-Layer Canvas Viewport */}
        <div className="panel p-4 lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-[#087f72]" />
              <span className="font-bold text-sm">
                Axial Plane #{currentSlice + 1} / {slices.length || 16}
              </span>
              {activeSliceData?.tumor_pixel_count > 0 ? (
                <span className="change-pill change-down">
                  LESION ACTIVE ({activeBreakdown?.area_mm2} mm²)
                </span>
              ) : (
                <span className="change-pill change-up">PARENCHYMA CLEAR</span>
              )}
            </div>
            <div className="font-mono text-xs text-slate-400">
              Z-Coord: {((currentSlice - 8) * 4.0).toFixed(1)} mm • HD95: {activeSliceData?.hd95_mm || 0} mm
            </div>
          </div>

          {/* Main Interactive PACS Viewport */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              if (slices.length === 0) return;
              const delta = e.deltaY > 0 ? 1 : -1;
              const next = Math.max(0, Math.min(slices.length - 1, currentSlice + delta));
              onSliceChange(next);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.round(((e.clientX - rect.left) / rect.width) * 256);
              const y = Math.round(((e.clientY - rect.top) / rect.height) * 256);
              setCursorCoords({ x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) });
            }}
            className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-xl border border-slate-800 bg-[#05080d] shadow-inner cursor-crosshair select-none"
          >
            {activeSliceData && (
              <>
                {/* Layer 1: FLAIR MRI */}
                <img
                  src={`data:image/png;base64,${activeSliceData.flair_image_b64}`}
                  alt="FLAIR MRI"
                  style={{ filter: `brightness(${brightness}) contrast(${contrast})` }}
                  className="absolute inset-0 h-full w-full object-contain"
                />

                {/* Layer 2: Contralateral Bi-Hemispheric Asymmetry Map */}
                {showAsymmetryMap && (
                  <img
                    src={`data:image/png;base64,${activeSliceData.asymmetry_b64}`}
                    alt="Contralateral Asymmetry"
                    style={{ opacity: 0.65, mixBlendMode: 'screen' }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}

                {/* Layer 3: Grad-CAM++ Higher-Order Saliency */}
                {showGradCam && (
                  <img
                    src={`data:image/png;base64,${activeSliceData.gradcam_b64}`}
                    alt="Grad-CAM++"
                    style={{ opacity: camOpacity, mixBlendMode: 'screen' }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}

                {/* Layer 4: Predicted Tumor Mask */}
                {showPredMask && (
                  <img
                    src={`data:image/png;base64,${activeSliceData.pred_mask_b64}`}
                    alt="Predicted Mask"
                    style={{ opacity: maskOpacity, mixBlendMode: 'screen' }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}

                {/* Layer 5: Bayesian Epistemic Uncertainty Halo */}
                {showUncertaintyHalo && (
                  <img
                    src={`data:image/png;base64,${activeSliceData.uncertainty_b64}`}
                    alt="Epistemic Uncertainty Halo"
                    style={{ opacity: uncertaintyOpacity, mixBlendMode: 'screen' }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}

                {/* Layer 6: Radiologist Ground-Truth Contour */}
                {showGtContour && (
                  <img
                    src={`data:image/png;base64,${activeSliceData.gt_mask_b64}`}
                    alt="Ground Truth Contour"
                    style={{ opacity: 0.9, mixBlendMode: 'screen' }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
              </>
            )}

            {/* Corner PACS DICOM HUD Overlays */}
            <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-relaxed text-emerald-400/90">
              <div>{activePatient.patient_id} ({activePatient.sex}, {activePatient.age}Y)</div>
              <div>SEQ: 3D-FLAIR + BI-HEMISPHERIC ATTN</div>
              <div>FOV: 240mm • Matrix: 256×256</div>
            </div>

            <div className="pointer-events-none absolute right-3 top-3 text-right font-mono text-[11px] leading-relaxed text-cyan-300/90">
              <div>SLICE #{currentSlice + 1} / {slices.length || 16}</div>
              <div>CONF: {((activeSliceData?.confidence || 0.94) * 100).toFixed(1)}%</div>
              <div className="text-amber-400">H(p): {activeSliceData?.epistemic_entropy || 0.012} bits</div>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[11px] text-slate-300">
              <Crosshair size={13} className="text-[#5bd0a8]" />
              <span>
                Voxel ({cursorCoords.x}, {cursorCoords.y}, {currentSlice + 1}) • Stereotactic ({((cursorCoords.x - 128) * 0.94).toFixed(1)}mm, {((cursorCoords.y - 128) * 0.94).toFixed(1)}mm)
              </span>
            </div>
          </div>

          {/* Axial Slice Scroller Slider */}
          <div className="px-2 pt-1">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Superior (Cranial Vertex)</span>
              <strong className="font-mono text-[#087f72] dark:text-[#5bd0a8]">
                Scroll Wheel or Drag Axial Plane ({currentSlice + 1} / {slices.length || 16})
              </strong>
              <span>Inferior (Skull Base)</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, slices.length - 1)}
              value={currentSlice}
              onChange={(e) => onSliceChange(parseInt(e.target.value, 10))}
              className="w-full accent-[#087f72]"
            />
          </div>
        </div>

        {/* RIGHT COLUMN (3 cols): Slice Telemetry & Multi-Slice Filmstrip */}
        <div className="panel p-4 lg:col-span-3 flex flex-col gap-4">
          <div>
            <span className="section-kicker">QUANTITATIVE SLICE TELEMETRY</span>
            <h2 className="text-sm font-bold">Plane #{currentSlice + 1} Biomarkers</h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-[#2b3a45]">
              <div className="text-[10px] text-slate-400 uppercase font-bold">2D Planar Area</div>
              <div className="font-mono text-base font-extrabold mt-0.5 text-[#087f72] dark:text-[#5bd0a8]">
                {activeBreakdown?.area_mm2 || 0} mm²
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-[#2b3a45]">
              <div className="text-[10px] text-slate-400 uppercase font-bold">In-Plane Feret</div>
              <div className="font-mono text-base font-extrabold mt-0.5">
                {activeBreakdown?.max_diameter_mm || 0} mm
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-[#2b3a45]">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Boundary HD95</div>
              <div className="font-mono text-base font-extrabold mt-0.5 text-emerald-500">
                {activeSliceData?.hd95_mm || 0} mm
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-[#2b3a45]">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Epistemic H(p)</div>
              <div className="font-mono text-base font-extrabold mt-0.5 text-amber-500">
                {activeSliceData?.epistemic_entropy || 0.012} b
              </div>
            </div>
          </div>

          {/* 4x4 Axial Contact Sheet Thumbnail Grid */}
          <div className="border-t border-slate-200 pt-3 dark:border-[#2b3a45]">
            <div className="flex items-center justify-between mb-2">
              <span className="section-kicker !mb-0">16-SLICE CONTACT FILMSTRIP</span>
              <Activity size={13} className="text-[#087f72]" />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {slices.map((s, idx) => {
                const isCurr = idx === currentSlice;
                const hasLesion = s.tumor_pixel_count > 0;
                return (
                  <button
                    key={s.slice_index}
                    type="button"
                    onClick={() => onSliceChange(idx)}
                    className={`relative aspect-square overflow-hidden rounded border transition ${
                      isCurr
                        ? 'border-2 border-[#087f72] ring-2 ring-[#087f72]/30 dark:border-[#5bd0a8]'
                        : hasLesion
                        ? 'border-red-500/40 opacity-85 hover:opacity-100'
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={`data:image/png;base64,${s.flair_image_b64}`}
                      alt={`Slice ${s.slice_index}`}
                      className="h-full w-full object-cover"
                    />
                    {hasLesion && (
                      <img
                        src={`data:image/png;base64,${s.pred_mask_b64}`}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-70"
                      />
                    )}
                    <span className="absolute bottom-0.5 right-1 font-mono text-[9px] font-bold text-white drop-shadow">
                      S{s.slice_index}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
