import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Crosshair,
  Eye,
  FileText,
  FileUp,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  neuroApi,
  type CustomUploadInferenceResponse,
  type PatientRecord,
  type SliceData,
  type StudyStackResponse,
} from '../api';

interface WorkstationPageProps {
  activePatient: PatientRecord;
  study: StudyStackResponse | null;
  currentSlice: number;
  onSliceChange: (idx: number) => void;
}

const SAMPLE_TIFF_SCANS = [
  { id: 1, label: 'TCGA_LGG_slice_0001.tif', desc: 'Left Frontal Glioma (WHO Gr 2)' },
  { id: 14, label: 'TCGA_LGG_slice_0014.tif', desc: 'Insular Infiltrative Mass' },
  { id: 28, label: 'TCGA_LGG_slice_0028.tif', desc: 'Right Temporal Oligodendroglioma' },
  { id: 42, label: 'TCGA_LGG_slice_0042.tif', desc: 'Parietal High-Burden Astrocytoma' },
];

export function WorkstationPage({
  activePatient,
  study,
  currentSlice,
  onSliceChange,
}: WorkstationPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Live Custom MRI Upload & Instant Inference State
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(true);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [mcPasses, setMcPasses] = useState<number>(8);
  const [customResult, setCustomResult] = useState<CustomUploadInferenceResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      setShowUploadPanel(true);
    }
  }, [searchParams]);

  const slices = study?.slices || [];
  const stackSliceData = slices[currentSlice] || slices[0];
  const activeBreakdown = study?.volumetry.slice_breakdown[currentSlice];

  // If a custom scan is active, project it directly into the 6-Layer PACS Viewport
  const activeSliceData: SliceData | undefined = customResult
    ? {
        slice_index: 1,
        flair_image_b64: customResult.flair_image_b64,
        gt_mask_b64: customResult.gt_mask_b64,
        pred_mask_b64: customResult.pred_mask_b64,
        gradcam_b64: customResult.gradcam_b64,
        uncertainty_b64: customResult.uncertainty_b64,
        asymmetry_b64: customResult.asymmetry_b64,
        tumor_pixel_count: customResult.metrics.tumor_pixel_count,
        confidence: customResult.metrics.confidence,
        epistemic_entropy: customResult.metrics.epistemic_entropy,
        hd95_mm: customResult.metrics.hd95_mm,
      }
    : stackSliceData;

  const displayAreaMm2 = customResult
    ? customResult.metrics.planar_area_mm2
    : activeBreakdown?.area_mm2 || 0;
  const displayFeretMm = customResult
    ? customResult.metrics.recist_diameter_mm
    : activeBreakdown?.max_diameter_mm || 0;

  useEffect(() => {
    if (!playing || slices.length === 0 || customResult) return;
    const timer = window.setInterval(() => {
      onSliceChange((currentSlice + 1) % slices.length);
    }, 380);
    return () => window.clearInterval(timer);
  }, [playing, currentSlice, slices.length, onSliceChange, customResult]);

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

  const handleFileSelected = (file: File) => {
    setUploadError(null);
    setUploadLoading(true);
    setPlaying(false);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const b64 = typeof reader.result === 'string' ? reader.result : '';
        const res = await neuroApi.segmentUploadedScan(b64, file.name, mcPasses);
        setCustomResult(res);
      } catch {
        setUploadError('Could not process MRI image file. Please try a .tif, .png, or .jpg scan.');
      } finally {
        setUploadLoading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read selected file from disk.');
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRunSampleTiff = async (scanId: number) => {
    setUploadError(null);
    setUploadLoading(true);
    setPlaying(false);
    try {
      const res = await neuroApi.runSampleTiffScan(scanId, mcPasses);
      setCustomResult(res);
    } catch {
      setUploadError('Failed to load sample TCGA-LGG .tif scan.');
    } finally {
      setUploadLoading(false);
    }
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
            <span>{customResult ? `CUSTOM SCAN: ${customResult.filename}` : activePatient.patient_id}</span>
            <span className="eyebrow-divider">•</span>
            <span>{study?.sequence || 'Axial T2-FLAIR 3.0T'}</span>
          </div>
          <h1>6-Layer Volumetric MRI & Live Inference Dropzone</h1>
          <p>
            Upload any custom Brain MRI slice (<code>.tif</code>, <code>.png</code>, <code>.jpg</code>) for live PyTorch{' '}
            <code>AttentionUNet</code> segmentation, or scroll the 16-slice 3D patient stack below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="button button-primary"
            onClick={() => setShowUploadPanel((v) => !v)}
          >
            <UploadCloud size={14} />
            <span>{showUploadPanel ? 'Hide Custom MRI Dropzone' : 'Upload Custom MRI Scan'}</span>
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={() => {
              setCustomResult(null);
              setPlaying((p) => !p);
            }}
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
            className="button button-dark"
            onClick={() => navigate(`/case/${encodeURIComponent(activePatient.patient_id)}`)}
          >
            <FileText size={14} />
            <span>Case Report</span>
          </button>
        </div>
      </div>

      {/* UPGRADE #5: Live Custom Brain MRI Upload & Instant PyTorch Inference Dropzone */}
      {showUploadPanel && (
        <div className="panel p-6 mb-6 border-2 border-[#087f72]/25 dark:border-[#5bd0a8]/30">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="section-kicker !mb-0">
                  LIVE PYTORCH INFERENCE DROPZONE (POST /api/segment-upload)
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  FP16 AMP • AttentionUNet + Grad-CAM++ + MC-Dropout
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                Drag & Drop Any Brain MRI Slice (.TIF / .PNG / .JPG) or Test a Raw TCGA-LGG .TIF Scan
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">MC-Dropout Passes:</span>
                {[4, 8, 12].map((passes) => (
                  <button
                    key={passes}
                    type="button"
                    onClick={() => setMcPasses(passes)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold transition ${
                      mcPasses === passes
                        ? 'bg-[#087f72] text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-[#2b3a45] dark:bg-[#142029] dark:text-slate-200'
                    }`}
                  >
                    T={passes}
                  </button>
                ))}
              </div>

              {customResult && (
                <button
                  type="button"
                  onClick={() => setCustomResult(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20"
                >
                  <X size={13} />
                  <span>Exit Custom Scan Mode</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Dropzone Box (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelected(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                  isDraggingOver
                    ? 'border-[#087f72] bg-[#087f72]/10 dark:border-[#5bd0a8]'
                    : 'border-slate-300 bg-slate-50/70 hover:border-[#087f72] hover:bg-slate-100/70 dark:border-[#2b3a45] dark:bg-[#111b22] dark:hover:border-[#5bd0a8]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tif,.tiff,.png,.jpg,.jpeg,.webp,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = '';
                  }}
                />
                <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#087f72]/15 text-[#087f72] dark:text-[#5bd0a8]">
                  {uploadLoading ? <RefreshCw size={20} className="animate-spin" /> : <FileUp size={20} />}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {uploadLoading
                    ? 'Running PyTorch AttentionUNet + Grad-CAM++ + MC-Dropout...'
                    : 'Drop Brain MRI Slice Here or Click to Browse'}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supports raw <code>.tif / .tiff</code> (from <code>data/tcga_lgg_scans/</code>), <code>.png</code>,{' '}
                  <code>.jpg</code>, and <code>.webp</code>
                </p>
              </div>

              {/* 4 One-Click Raw .TIF Test Scans */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Or Instant-Load a Real Paired .TIF Scan from Disk:</span>
                  <span className="font-mono text-[#087f72] dark:text-[#5bd0a8]">data/tcga_lgg_scans/</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_TIFF_SCANS.map((sc) => {
                    const isActive = customResult?.filename === sc.label;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        disabled={uploadLoading}
                        onClick={() => handleRunSampleTiff(sc.id)}
                        className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
                          isActive
                            ? 'border-[#087f72] bg-[#087f72]/10 dark:border-[#5bd0a8] dark:bg-[#5bd0a8]/10'
                            : 'border-slate-200 bg-white hover:border-[#087f72]/50 dark:border-[#2b3a45] dark:bg-[#142029]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-mono text-[11px] font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                            {sc.label}
                          </span>
                          <Cpu size={12} className="text-slate-400" />
                        </div>
                        <span className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                          {sc.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {uploadError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                  {uploadError}
                </div>
              )}
            </div>

            {/* Live 5-Channel Output Strip & Quantitative Metrics (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#2b3a45] dark:bg-[#0f1820]">
              {customResult ? (
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-[#24323d]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {customResult.filename}
                      </span>
                      <span className="rounded bg-[#087f72]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#087f72] dark:text-[#5bd0a8]">
                        {customResult.resolution}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Inference Latency: {customResult.latency_ms} ms (T={customResult.mc_passes} MC passes)
                    </div>
                  </div>

                  {/* 5-Panel Explainability Strip */}
                  <div className="grid grid-cols-5 gap-2.5">
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#05080d]">
                      <div className="relative aspect-square">
                        <img
                          src={`data:image/png;base64,${customResult.flair_image_b64}`}
                          alt="Uploaded FLAIR"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="p-1.5 text-center font-mono text-[10px] font-bold text-slate-200 bg-[#0b1118]">
                        1. Input FLAIR
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#05080d]">
                      <div className="relative aspect-square">
                        <img
                          src={`data:image/png;base64,${customResult.flair_image_b64}`}
                          alt="Base"
                          className="h-full w-full object-contain opacity-80"
                        />
                        <img
                          src={`data:image/png;base64,${customResult.pred_mask_b64}`}
                          alt="Predicted Mask"
                          style={{ mixBlendMode: 'screen' }}
                          className="absolute inset-0 h-full w-full object-contain opacity-85"
                        />
                      </div>
                      <div className="p-1.5 text-center font-mono text-[10px] font-bold text-rose-300 bg-[#0b1118]">
                        2. Tumor Mask
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#05080d]">
                      <div className="relative aspect-square">
                        <img
                          src={`data:image/png;base64,${customResult.flair_image_b64}`}
                          alt="Base"
                          className="h-full w-full object-contain opacity-65"
                        />
                        <img
                          src={`data:image/png;base64,${customResult.gradcam_b64}`}
                          alt="Grad-CAM++"
                          style={{ mixBlendMode: 'screen' }}
                          className="absolute inset-0 h-full w-full object-contain opacity-75"
                        />
                      </div>
                      <div className="p-1.5 text-center font-mono text-[10px] font-bold text-cyan-300 bg-[#0b1118]">
                        3. Grad-CAM++
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#05080d]">
                      <div className="relative aspect-square">
                        <img
                          src={`data:image/png;base64,${customResult.flair_image_b64}`}
                          alt="Base"
                          className="h-full w-full object-contain opacity-60"
                        />
                        <img
                          src={`data:image/png;base64,${customResult.uncertainty_b64}`}
                          alt="Epistemic Halo"
                          style={{ mixBlendMode: 'screen' }}
                          className="absolute inset-0 h-full w-full object-contain opacity-90"
                        />
                      </div>
                      <div className="p-1.5 text-center font-mono text-[10px] font-bold text-amber-300 bg-[#0b1118]">
                        4. Epistemic σ²
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#05080d]">
                      <div className="relative aspect-square">
                        <img
                          src={`data:image/png;base64,${customResult.asymmetry_b64}`}
                          alt="Contralateral Asymmetry"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="p-1.5 text-center font-mono text-[10px] font-bold text-emerald-300 bg-[#0b1118]">
                        5. Asymmetry
                      </div>
                    </div>
                  </div>

                  {/* 6 Quantitative Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#24323d] dark:bg-[#142029]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Planar Area</div>
                      <div className="font-mono text-xs font-extrabold text-[#087f72] dark:text-[#5bd0a8]">
                        {customResult.metrics.planar_area_mm2} mm²
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#24323d] dark:bg-[#142029]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">RECIST Feret</div>
                      <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {customResult.metrics.recist_diameter_mm} mm
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#24323d] dark:bg-[#142029]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Est. Volume</div>
                      <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {customResult.metrics.estimated_volume_cm3} cm³
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#24323d] dark:bg-[#142029]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Dice (DSC)</div>
                      <div className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        {(customResult.metrics.dsc * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#24323d] dark:bg-[#142029]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">HD95 Margin</div>
                      <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {customResult.metrics.hd95_mm} mm
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#24323d] dark:bg-[#142029]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Confidence</div>
                      <div className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        {(customResult.metrics.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                  <Sparkles size={28} className="text-[#087f72] dark:text-[#5bd0a8] mb-2" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ready for Live Single-Slice Brain MRI Inference
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                    Click any of the <strong>4 TCGA-LGG .tif sample buttons</strong> on the left or drag-and-drop your
                    own MRI image to execute live segmentation, Grad-CAM++, and Bayesian uncertainty estimation and
                    project it into the 6-Layer PACS Viewport below.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-Column PACS Workstation Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (3 cols): Layer Toggles & Windowing */}
        <div className="panel p-6 lg:col-span-3 flex flex-col gap-5">
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
        <div className="panel p-6 lg:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye size={16} className="text-[#087f72]" />
              <span className="font-bold text-sm">
                {customResult
                  ? `Custom Scan: ${customResult.filename}`
                  : `Axial Plane #${currentSlice + 1} / ${slices.length || 16}`}
              </span>
              {(activeSliceData?.tumor_pixel_count || 0) > 0 ? (
                <span className="change-pill change-down">
                  LESION ACTIVE ({displayAreaMm2} mm²)
                </span>
              ) : (
                <span className="change-pill change-up">PARENCHYMA CLEAR</span>
              )}
            </div>
            <div className="font-mono text-xs text-slate-500 dark:text-slate-300">
              {customResult
                ? `Latency: ${customResult.latency_ms} ms • HD95: ${activeSliceData?.hd95_mm || 0} mm`
                : `Z-Coord: ${((currentSlice - 8) * 4.0).toFixed(1)} mm • HD95: ${activeSliceData?.hd95_mm || 0} mm`}
            </div>
          </div>

          {/* Main Interactive PACS Viewport */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              if (slices.length === 0 || customResult) return;
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
            className="relative mx-auto aspect-square w-full max-w-[450px] overflow-hidden rounded-xl border border-slate-800 bg-[#05080d] shadow-inner cursor-crosshair select-none"
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

            {/* Corner PACS DICOM HUD Overlays (Forced High-Contrast Light Text over Black MRI) */}
            <div
              style={{ color: '#6ee7b7' }}
              className="pointer-events-none absolute left-3.5 top-3.5 font-mono text-[11px] font-semibold leading-relaxed drop-shadow"
            >
              <div style={{ color: '#6ee7b7' }}>
                {customResult
                  ? `UPLOAD: ${customResult.filename}`
                  : `${activePatient.patient_id} (${activePatient.sex}, ${activePatient.age}Y)`}
              </div>
              <div style={{ color: '#a7f3d0' }}>SEQ: 3D-FLAIR + BI-HEMISPHERIC ATTN</div>
              <div style={{ color: '#cbd5e1' }}>FOV: 240mm • Matrix: 256×256</div>
            </div>

            <div
              style={{ color: '#67e8f9' }}
              className="pointer-events-none absolute right-3.5 top-3.5 text-right font-mono text-[11px] font-semibold leading-relaxed drop-shadow"
            >
              <div style={{ color: '#67e8f9' }}>
                {customResult ? 'CUSTOM SLICE MODE' : `SLICE #${currentSlice + 1} / ${slices.length || 16}`}
              </div>
              <div style={{ color: '#e2e8f0' }}>
                CONF: {((activeSliceData?.confidence || 0.94) * 100).toFixed(1)}%
              </div>
              <div style={{ color: '#fbbf24' }}>
                H(p): {activeSliceData?.epistemic_entropy || 0.012} bits
              </div>
            </div>

            <div
              style={{ color: '#f1f5f9' }}
              className="pointer-events-none absolute bottom-3.5 left-3.5 flex items-center gap-2 font-mono text-[11px] font-semibold drop-shadow"
            >
              <Crosshair size={13} color="#5bd0a8" />
              <span style={{ color: '#f1f5f9' }}>
                Voxel ({cursorCoords.x}, {cursorCoords.y}, {customResult ? 1 : currentSlice + 1}) • Stereotactic (
                {((cursorCoords.x - 128) * 0.94).toFixed(1)}mm, {((cursorCoords.y - 128) * 0.94).toFixed(1)}mm)
              </span>
            </div>
          </div>

          {/* Axial Slice Scroller Slider */}
          <div className="px-2 pt-1">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-300 mb-1.5">
              <span>Superior (Cranial Vertex)</span>
              <strong className="font-mono text-[#087f72] dark:text-[#5bd0a8]">
                {customResult
                  ? 'Click Any Filmstrip Thumbnail to Return to 16-Slice Stack'
                  : `Scroll Wheel or Drag Axial Plane (${currentSlice + 1} / ${slices.length || 16})`}
              </strong>
              <span>Inferior (Skull Base)</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, slices.length - 1)}
              value={currentSlice}
              onChange={(e) => {
                setCustomResult(null);
                onSliceChange(parseInt(e.target.value, 10));
              }}
              className="w-full accent-[#087f72]"
            />
          </div>
        </div>

        {/* RIGHT COLUMN (3 cols): Slice Telemetry & Multi-Slice Filmstrip */}
        <div className="panel p-6 lg:col-span-3 flex flex-col gap-5">
          <div>
            <span className="section-kicker">QUANTITATIVE SLICE TELEMETRY</span>
            <h2 className="text-sm font-bold">
              {customResult ? 'Uploaded Scan Biomarkers' : `Plane #${currentSlice + 1} Biomarkers`}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-[#2b3a45]">
              <div className="text-[10px] text-slate-400 uppercase font-bold">2D Planar Area</div>
              <div className="font-mono text-base font-extrabold mt-0.5 text-[#087f72] dark:text-[#5bd0a8]">
                {displayAreaMm2} mm²
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-[#2b3a45]">
              <div className="text-[10px] text-slate-400 uppercase font-bold">In-Plane Feret</div>
              <div className="font-mono text-base font-extrabold mt-0.5">{displayFeretMm} mm</div>
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
                const isCurr = !customResult && idx === currentSlice;
                const hasLesion = s.tumor_pixel_count > 0;
                return (
                  <button
                    key={s.slice_index}
                    type="button"
                    onClick={() => {
                      setCustomResult(null);
                      onSliceChange(idx);
                    }}
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
