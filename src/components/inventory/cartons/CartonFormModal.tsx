import React from 'react';
import { X, Camera, ScanLine, RotateCcw, Package, RefreshCw } from 'lucide-react';
import { Product } from '../../../types';
import { CartonTemplate } from '../../../services/cartonIntakeService';

interface CartonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate: CartonTemplate | null;
  formProductId: string;
  formProductSearch: string;
  setFormProductSearch: (s: string) => void;
  filteredProductOptions: Product[];
  handleSelectProductInForm: (p: Product) => void;
  formSelectedProduct: Product | null;
  formUnitsPerCarton: number;
  setFormUnitsPerCarton: (u: number) => void;
  formBarcode: string;
  setFormBarcode: (b: string) => void;
  setIsFormScannerOpen: (o: boolean) => void;
  formSku: string;
  setFormSku: (s: string) => void;
  formPhotoUrl: string;
  setFormPhotoUrl: (url: string) => void;
  formFileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  formCartonCostPrice: number;
  setFormCartonCostPrice: (p: number) => void;
  formRetailPrice: number;
  setFormRetailPrice: (p: number) => void;
  formWholesalePrice: number;
  setFormWholesalePrice: (p: number) => void;
  isFormSaving: boolean;
  handleSaveForm: (e: React.FormEvent) => Promise<void>;
}

export function CartonFormModal({
  isOpen,
  onClose,
  editingTemplate,
  formProductId,
  formProductSearch,
  setFormProductSearch,
  filteredProductOptions,
  handleSelectProductInForm,
  formSelectedProduct,
  formUnitsPerCarton,
  setFormUnitsPerCarton,
  formBarcode,
  setFormBarcode,
  setIsFormScannerOpen,
  formSku,
  setFormSku,
  formPhotoUrl,
  setFormPhotoUrl,
  formFileInputRef,
  handlePhotoUpload,
  formCartonCostPrice,
  setFormCartonCostPrice,
  formRetailPrice,
  setFormRetailPrice,
  formWholesalePrice,
  setFormWholesalePrice,
  isFormSaving,
  handleSaveForm
}: CartonFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-5 text-white shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base">
              {editingTemplate ? "Modifier le Carton" : "Nouveau Carton / Modèle de Colisage"}
            </h3>
            <p className="text-xs text-slate-400">
              Associez un colisage (quantité), code-barres et prix au carton pour la réception rapide
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveForm} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Sélection Produit Lié */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Article unitaire associé *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formProductSearch}
                onChange={(e) => setFormProductSearch(e.target.value)}
                placeholder="Rechercher l'article dans le catalogue..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              {formProductId && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  ✓ Associé
                </span>
              )}
            </div>

            {/* Suggestions d'articles */}
            {!formProductId && filteredProductOptions.length > 0 && (
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 p-1">
                {filteredProductOptions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProductInForm(p)}
                    className="w-full text-left p-2 hover:bg-slate-900 rounded-lg text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium text-white truncate max-w-[300px]">{p.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">Stock: {p.stock || 0} pcs</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colisage & Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Colisage (Pcs/Carton) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formUnitsPerCarton}
                onChange={(e) => setFormUnitsPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Code-barres Carton
                </label>
                <button
                  type="button"
                  onClick={() => setIsFormScannerOpen(true)}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ScanLine size={12} />
                  <span>Scanner</span>
                </button>
              </div>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="Code carton (optionnel)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                SKU / Réf Carton
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="Ex: CART-IFRI-12"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Photo du Carton */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Photo du Carton (Reconnaissance Visuelle)
            </label>
            <input
              ref={formFileInputRef as any}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="carton-form-file-input"
            />
            {formPhotoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 w-36 h-36 group">
                <img src={formPhotoUrl} alt="Carton" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFormPhotoUrl('')}
                  className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-slate-300 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="carton-form-file-input"
                className="w-full py-5 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-amber-500/50 hover:text-amber-400 cursor-pointer transition-all"
              >
                <Camera size={24} className="mb-1" />
                <span className="text-xs font-bold">Choisir ou Prendre une photo du carton</span>
              </label>
            )}
          </div>

          {/* Prix Carton (Achat, Détail, Gros) */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarifs Carton</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Prix d'Achat Carton</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formCartonCostPrice || ''}
                  onChange={(e) => setFormCartonCostPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-300">Prix Détail Carton</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formRetailPrice || ''}
                  onChange={(e) => setFormRetailPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-bold text-amber-400 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300">Prix Gros Carton</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formWholesalePrice || ''}
                  onChange={(e) => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs font-bold text-indigo-400 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isFormSaving || !formProductId}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isFormSaving && <RefreshCw size={14} className="animate-spin" />}
              <span>{editingTemplate ? "Mettre à jour le carton" : "Enregistrer le carton"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
