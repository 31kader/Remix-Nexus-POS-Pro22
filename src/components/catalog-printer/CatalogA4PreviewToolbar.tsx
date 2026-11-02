import React from 'react';
import { Eye } from 'lucide-react';

interface CatalogA4PreviewToolbarProps {
  activePreviewPage: number;
  setActivePreviewPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  zoom: number;
  setZoom: (z: number) => void;
}

export function CatalogA4PreviewToolbar({
  activePreviewPage,
  setActivePreviewPage,
  totalPages,
  zoom,
  setZoom
}: CatalogA4PreviewToolbarProps) {
  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 px-2">
      <div className="flex items-center gap-2">
        <Eye size={16} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Aperçu Direct A4 Haute Définition
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
          Page {activePreviewPage + 1} / {Math.max(1, totalPages)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={activePreviewPage === 0}
              onClick={() => setActivePreviewPage(p => Math.max(0, p - 1))}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              ◀ Préc.
            </button>
            <button
              type="button"
              disabled={activePreviewPage >= totalPages - 1}
              onClick={() => setActivePreviewPage(p => Math.min(totalPages - 1, p + 1))}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Suiv. ▶
            </button>
          </div>
        )}
        <span className="text-[11px] font-bold text-slate-500">Zoom :</span>
        <input
          type="range"
          min={0.45}
          max={0.9}
          step={0.05}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-24 accent-indigo-600 cursor-pointer"
        />
      </div>
    </div>
  );
}
