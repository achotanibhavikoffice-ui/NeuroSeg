import { Brain } from 'lucide-react';

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" style={{ display: 'grid', placeItems: 'center', paddingRight: 0 }}>
        <Brain size={16} strokeWidth={2.5} />
      </div>
      <span className="brand-wordmark dark:text-slate-100">
        NeuroSeg<span className="brand-period">.</span>
      </span>
    </div>
  );
}
