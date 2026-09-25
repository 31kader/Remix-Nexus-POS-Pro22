import React from 'react';
import { cn } from '../../lib/utils';
import { AlertOctagon } from 'lucide-react';

interface ProductStockSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  displayExpDate: string;
  handleDisplayDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProductStockSection({
  formData,
  setFormData,
  displayExpDate,
  handleDisplayDateChange
}: ProductStockSectionProps) {
  const commonUnits = [
    'Pièce (pcs)',
    'Kilogramme (kg)',
    'Gramme (g)',
    'Litre (L)',
    'Mètre (m)',
    'Paquet (pqt)',
    'Boîte (bte)',
    'Carton (ctn)',
    'Pack'
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 bg-white/5 p-6 rounded-xl border border-white/5 shadow-xl ring-1 ring-white/5">
      {/* 1. Stock actuel */}
      <div className="space-y-2 group col-span-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">
          STOCK ACTUEL * {formData.useMultiExpiry && <span className="text-indigo-400 font-extrabold">(AUTO)</span>}
        </label>
        <div className="relative">
          <input
            required
            type="number"
            placeholder="0"
            className={cn(
              "w-full bg-black/40 border rounded-xl py-3 px-4 text-white text-sm font-black font-mono focus:outline-none focus:ring-4 transition-all shadow-inner ",
              formData.useMultiExpiry ? "border-indigo-500/20 text-indigo-400/60 opacity-60 cursor-not-allowed bg-indigo-500/5" : "border-white/10 group-hover:border-white/20 focus:ring-indigo-500/5 focus:border-indigo-500/40"
            )}
            value={formData.stock}
            disabled={formData.useMultiExpiry}
            onChange={e => setFormData({...formData, stock: e.target.value})}
          />
          {formData.useMultiExpiry && (
            <p className="text-[7px] text-indigo-400 font-black uppercase tracking-[0.1em] mt-1 ml-1  animate-pulse">SOMME DES LOTS ACTIFS</p>
          )}
        </div>
      </div>

      {/* 2. Seuil d'alerte */}
      <div className="space-y-2 group col-span-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">SEUIL ALERTE</label>
        <input
          type="number"
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500/40 transition-all shadow-inner group-hover:border-white/20 "
          value={formData.minStock}
          onChange={e => setFormData({...formData, minStock: e.target.value})}
        />
      </div>

      {/* 3. Stock défectueux / pertes */}
      <div className="space-y-2 group col-span-1">
        <label className="text-[9px] font-black text-rose-400 uppercase tracking-normal  ml-1 flex items-center gap-1">
          <AlertOctagon size={11} />
          STOCK DÉFECTUEUX
        </label>
        <input
          type="number"
          min="0"
          className="w-full bg-black/40 border border-rose-500/30 rounded-xl py-3 px-4 text-rose-300 text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/60 transition-all shadow-inner group-hover:border-rose-500/50 "
          value={formData.damagedStock ?? '0'}
          onChange={e => setFormData({...formData, damagedStock: e.target.value})}
        />
      </div>

      {/* 4. Unité de mesure avec suggestions */}
      <div className="space-y-2 group col-span-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">UNITÉ MESURE</label>
        <input
          list="product-units-datalist"
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-black placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 uppercase "
          placeholder="EX: PCS, KG..."
          value={formData.unit}
          onChange={e => setFormData({...formData, unit: e.target.value})}
        />
        <datalist id="product-units-datalist">
          {commonUnits.map(u => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>

      {/* 5. Date d'expiration */}
      <div className="space-y-2 group col-span-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">EXPIRATION</label>
        <input 
          type="text" 
          inputMode="numeric"
          className={cn(
            "w-full bg-black/40 border rounded-xl py-3 px-4 text-white text-sm font-black font-mono text-center tracking-[0.1em] focus:outline-none focus:ring-4 transition-all shadow-inner ",
            formData.useMultiExpiry ? "opacity-30 border-white/5 cursor-not-allowed" : "border-white/10 group-hover:border-white/20 focus:ring-amber-500/5 focus:border-amber-500/40"
          )}
          placeholder="JJ MM AA"
          value={formData.useMultiExpiry ? "MULTI" : displayExpDate} 
          disabled={formData.useMultiExpiry}
          onChange={handleDisplayDateChange} 
        />
      </div>

      {/* 6. Numéro de lot */}
      <div className="space-y-2 group col-span-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">TRAÇABILITÉ / LOT</label>
        <input 
          className={cn(
            "w-full bg-black/40 border rounded-xl py-3 px-4 text-white text-xs font-black font-mono text-center uppercase tracking-widest focus:outline-none focus:ring-4 transition-all shadow-inner ",
            formData.useMultiExpiry ? "opacity-30 border-white/5 cursor-not-allowed" : "border-white/10 group-hover:border-white/20 focus:ring-indigo-500/5 focus:border-indigo-500/40"
          )}
          placeholder="N° LOT..."
          value={formData.useMultiExpiry ? "MULTI-BATCH" : formData.batchNumber}
          disabled={formData.useMultiExpiry}
          onChange={e => setFormData({...formData, batchNumber: e.target.value})} 
        />
      </div>
    </div>
  );
}
