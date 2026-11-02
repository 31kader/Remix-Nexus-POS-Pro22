import React from 'react';
import { BookOpen, X, Trash2, Package } from 'lucide-react';
import { CartonTemplate, deleteCartonTemplate } from '../../../services/cartonIntakeService';
import { toast } from 'sonner';

interface MobileCartonTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTemplates: CartonTemplate[];
  onReloadTemplates: () => Promise<void>;
}

export function MobileCartonTemplatesModal({
  isOpen,
  onClose,
  savedTemplates,
  onReloadTemplates
}: MobileCartonTemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Mémoire Visuelle des Cartons</h3>
              <p className="text-[11px] text-slate-400">{savedTemplates.length} cartons appris et reconnus automatiquement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          {savedTemplates.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Aucun carton mémorisé pour le moment.<br />
              Prenez en photo un carton et associez-le à un produit : Nexus s'en souviendra automatiquement !
            </div>
          ) : (
            savedTemplates.map(tmpl => (
              <div key={tmpl.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {tmpl.cartonPhotoUrl ? (
                    <img
                      src={tmpl.cartonPhotoUrl}
                      alt={tmpl.productName}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Package size={20} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-xs text-white">{tmpl.productName}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                        {tmpl.unitsPerCarton} pcs/carton
                      </span>
                      {tmpl.cartonCostPrice > 0 && (
                        <span>{tmpl.cartonCostPrice} DA</span>
                      )}
                      {tmpl.barcode && (
                        <span className="font-mono text-slate-500">#{tmpl.barcode}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteCartonTemplate(tmpl.id);
                    await onReloadTemplates();
                    toast.success("Modèle de carton oublié.");
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Oublier ce carton"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
