import React from 'react';
import { cn } from '../../lib/utils';
import { Customer } from '../../types';

interface VoucherCreationFormProps {
  type: 'fixed' | 'percent';
  setType: (type: 'fixed' | 'percent') => void;
  value: string;
  setValue: (value: string) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
  minPurchase: string;
  setMinPurchase: (value: string) => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Customer[];
  onGenerate: () => void;
  isGenerating: boolean;
}

export function VoucherCreationForm({
  type,
  setType,
  value,
  setValue,
  expiryDate,
  setExpiryDate,
  minPurchase,
  setMinPurchase,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  onGenerate,
  isGenerating
}: VoucherCreationFormProps) {
  return (
    <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-dashed border-white/10 text-left">
      <h4 className="text-xs font-black text-white/20 uppercase tracking-widest">Nouveau Bon</h4>
      
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
        <button 
          type="button"
          onClick={() => setType('fixed')}
          className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", 
            type === 'fixed' ? "bg-white text-indigo-600 shadow-xl" : "text-white/40")}
        >
          Montant Fixe
        </button>
        <button 
          type="button"
          onClick={() => setType('percent')}
          className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", 
            type === 'percent' ? "bg-white text-indigo-600 shadow-xl" : "text-white/40")}
        >
          Pourcentage %
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-black text-white/20 uppercase mb-1 block">
            Valeur ({type === 'percent' ? '%' : 'Montant'})
          </label>
          <div className="relative">
            <input 
              type="number" 
              value={value} 
              onChange={(e) => setValue(e.target.value)} 
              placeholder="25.00" 
              className="w-full px-4 py-2 rounded-xl border border-white/10 bg-[#0a0a0f] text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 font-bold">
              {type === 'percent' ? '%' : 'FCFA'}
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-white/20 uppercase mb-1 block">Date d'expiration</label>
          <input 
            type="date" 
            value={expiryDate} 
            onChange={(e) => setExpiryDate(e.target.value)} 
            className="w-full px-4 py-2 rounded-xl border border-white/10 bg-[#0a0a0f] text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" 
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-white/20 uppercase mb-1 block">Achat Minimum (Optionnel)</label>
          <input 
            type="number" 
            value={minPurchase} 
            onChange={(e) => setMinPurchase(e.target.value)} 
            placeholder="0.00" 
            className="w-full px-4 py-2 rounded-xl border border-white/10 bg-[#0a0a0f] text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" 
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-white/20 uppercase mb-1 block">Assigner au Client (Optionnel)</label>
          <select 
            value={selectedCustomer} 
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-white/10 bg-[#0a0a0f] text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
          >
            <option value="">Public / Tout client</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button 
          type="button"
          onClick={onGenerate} 
          className="w-full py-3 bg-amber-500 text-black rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
          disabled={isGenerating || !value}
        >
          Générer Bon
        </button>
      </div>
    </div>
  );
}
