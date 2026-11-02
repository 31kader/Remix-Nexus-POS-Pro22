import React from 'react';
import { Minus, Plus, ShoppingCart, CheckCircle2, Boxes, Package } from 'lucide-react';
import { Product } from '../../../types';
import { CartonIntakeItem } from '../../../services/cartonIntakeService';

interface MobileCartonFormViewProps {
  selectedProduct: Product | null;
  unitsPerCarton: number;
  handleUnitsPerCartonChange: (val: number) => void;
  cartonCount: number;
  setCartonCount: React.Dispatch<React.SetStateAction<number>>;
  cartonCostPrice: number;
  handleCartonCostChange: (val: number) => void;
  unitCostPrice: number;
  handleUnitCostChange: (val: number) => void;
  totalUnits: number;
  totalCostAmount: number;
  isSubmitting: boolean;
  handleSendToCart: () => Promise<void>;
  handleDirectValidate: () => Promise<void>;
  recentIntakes: CartonIntakeItem[];
}

export function MobileCartonFormView({
  selectedProduct,
  unitsPerCarton,
  handleUnitsPerCartonChange,
  cartonCount,
  setCartonCount,
  cartonCostPrice,
  handleCartonCostChange,
  unitCostPrice,
  handleUnitCostChange,
  totalUnits,
  totalCostAmount,
  isSubmitting,
  handleSendToCart,
  handleDirectValidate,
  recentIntakes
}: MobileCartonFormViewProps) {
  if (!selectedProduct) {
    return (
      <div className="bg-slate-50 dark:bg-industrial-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-industrial-800 p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-industrial-800 text-slate-400 dark:text-industrial-500 flex items-center justify-center">
          <Boxes size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-industrial-300">
            En attente de sélection d'article
          </h3>
          <p className="text-xs text-slate-500 dark:text-industrial-400 max-w-sm mt-1">
            Recherchez un produit ou scannez son code-barres à gauche pour configurer le colisage et valider la réception en stock.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="bg-slate-50 dark:bg-industrial-900/70 rounded-2xl border border-slate-200 dark:border-industrial-800 p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
              3
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-industrial-200">
              Colisage, Quantité & Prix d'Achat
            </span>
          </div>
        </div>

        {/* Colisage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-industrial-300">
              Quantité dans le carton (Colisage) :
            </span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400">
              {unitsPerCarton} pièces / carton
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {[6, 12, 20, 24, 30, 48].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => handleUnitsPerCartonChange(qty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  unitsPerCarton === qty
                    ? 'bg-amber-500 text-industrial-950 shadow-md shadow-amber-500/20'
                    : 'bg-white dark:bg-industrial-950 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 hover:border-amber-500/50'
                }`}
              >
                {qty} pcs
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            value={unitsPerCarton}
            onChange={(e) => handleUnitsPerCartonChange(parseInt(e.target.value) || 1)}
            className="w-full mt-1 py-2 px-3 rounded-lg bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-800 text-slate-900 dark:text-white font-mono text-xs focus:border-amber-500 outline-none"
            placeholder="Autre colisage personnalisé..."
          />
        </div>

        {/* Nombre de cartons reçus */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-industrial-300">
              Nombre de cartons reçus :
            </span>
            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
              {cartonCount} carton(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCartonCount(prev => Math.max(1, prev - 1))}
              className="w-12 h-12 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-800 hover:bg-slate-100 dark:hover:bg-industrial-800 text-slate-900 dark:text-white flex items-center justify-center font-black active:scale-95 cursor-pointer shadow-xs"
            >
              <Minus size={18} />
            </button>
            <input
              type="number"
              min="1"
              value={cartonCount}
              onChange={(e) => setCartonCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 h-12 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-indigo-500 text-slate-900 dark:text-white text-center font-mono font-black text-lg outline-none shadow-xs"
            />
            <button
              type="button"
              onClick={() => setCartonCount(prev => prev + 1)}
              className="w-12 h-12 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-800 hover:bg-slate-100 dark:hover:bg-industrial-800 text-slate-900 dark:text-white flex items-center justify-center font-black active:scale-95 cursor-pointer shadow-xs"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {[1, 2, 5, 10, 20].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCartonCount(c)}
                className="flex-1 py-1 rounded bg-white dark:bg-industrial-950 border border-slate-200 dark:border-industrial-800 text-[11px] font-mono text-slate-600 dark:text-industrial-400 hover:text-indigo-600 dark:hover:text-white cursor-pointer"
              >
                {c} ct
              </button>
            ))}
          </div>
        </div>

        {/* Prix d'Achat */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-industrial-800/80">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-industrial-400 uppercase block mb-1">
              Prix d'Achat Carton (DA)
            </label>
            <input
              type="number"
              step="any"
              value={cartonCostPrice || ''}
              onChange={(e) => handleCartonCostChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-emerald-500 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none shadow-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-industrial-400 uppercase block mb-1">
              Prix Unitaire Pièce (DA)
            </label>
            <input
              type="number"
              step="any"
              value={unitCostPrice || ''}
              onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-emerald-500 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Synthèse */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-100 dark:via-industrial-900 to-indigo-500/10 border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-industrial-300 font-bold">Total Réceptionné :</span>
            <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-300 font-mono">
              {cartonCount} cartons × {unitsPerCarton} = {totalUnits} unités
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-industrial-400">Montant Total Achat :</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
              {totalCostAmount.toLocaleString('fr-DZ')} DA
            </span>
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSendToCart}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShoppingCart size={16} />
            <span>Envoyer au Panier d'Approvisionnement</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDirectValidate}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>Valider la Réception Immédiate (+{totalUnits} en stock)</span>
          </button>
        </div>
      </section>

      {/* Historique récent */}
      {recentIntakes.length > 0 && (
        <section className="bg-slate-50 dark:bg-industrial-900/50 rounded-2xl border border-slate-200 dark:border-industrial-800/80 p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-500 dark:text-industrial-400 uppercase tracking-wider">
            Derniers Cartons Traités
          </h3>
          <div className="space-y-2">
            {recentIntakes.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white dark:bg-industrial-950 border border-slate-200 dark:border-industrial-800/80 flex items-center justify-between text-xs shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.cartonPhotoUrl ? (
                    <img src={item.cartonPhotoUrl} alt="Carton" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-industrial-900 flex items-center justify-center text-slate-400 dark:text-industrial-500">
                      <Package size={14} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.productName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {item.cartonCount} ct × {item.unitsPerCarton} = {item.totalUnits} pcs
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    +{item.totalUnits} pcs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
