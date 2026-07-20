import React from 'react';
import { Filter, Check, RotateCcw } from 'lucide-react';
import { Button, Card } from '../ui';

interface Props {
  tempDateFilter: string;
  setTempDateFilter: (v: string) => void;
  tempPaymentMethodFilter: string;
  setTempPaymentMethodFilter: (v: string) => void;
  tempDeliveryMethodFilter: string;
  setTempDeliveryMethodFilter: (v: string) => void;
  tempCustomRange: { start: string, end: string };
  setTempCustomRange: (v: { start: string, end: string }) => void;
  tempCustomerNameSearch: string;
  setTempCustomerNameSearch: (v: string) => void;
  tempAmountSearch: string;
  setTempAmountSearch: (v: string) => void;
  applyFilters: () => void;
  resetFilters: () => void;
}

export const TransactionFilters: React.FC<Props> = ({
  tempDateFilter, setTempDateFilter,
  tempPaymentMethodFilter, setTempPaymentMethodFilter,
  tempDeliveryMethodFilter, setTempDeliveryMethodFilter,
  tempCustomRange, setTempCustomRange,
  tempCustomerNameSearch, setTempCustomerNameSearch,
  tempAmountSearch, setTempAmountSearch,
  applyFilters, resetFilters
}) => {
  return (
    <Card className="p-4 bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
        <Filter size={16} className="text-indigo-400" />
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Filtres de recherche avancés</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Période</label>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
              <button onClick={() => setTempDateFilter('all')} className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${tempDateFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Tous</button>
              <button onClick={() => setTempDateFilter('today')} className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${tempDateFilter === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Aujourd'hui</button>
              <button onClick={() => setTempDateFilter('last7days')} className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${tempDateFilter === 'last7days' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>7 jrs</button>
              <button onClick={() => setTempDateFilter('custom')} className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${tempDateFilter === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Perso.</button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Client & Montant</label>
          <div className="space-y-1.5">
            <input type="text" placeholder="Nom du client..." value={tempCustomerNameSearch} onChange={(e) => setTempCustomerNameSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500" />
            <input type="text" placeholder="Montant..." value={tempAmountSearch} onChange={(e) => setTempAmountSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Paiement & Mode</label>
          <div className="space-y-1.5">
            <select value={tempPaymentMethodFilter} onChange={(e) => setTempPaymentMethodFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none">
              <option value="all">Tous les paiements</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
            </select>
            <select value={tempDeliveryMethodFilter} onChange={(e) => setTempDeliveryMethodFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none">
              <option value="all">Tous les modes</option>
              <option value="in_store">En magasin</option>
              <option value="delivery">Livraison</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-end gap-2">
          <Button onClick={applyFilters} className="w-full bg-indigo-600 text-xs font-bold">Appliquer</Button>
          <Button variant="outline" onClick={resetFilters} className="w-full border-slate-800 text-xs font-bold text-slate-400">Réinitialiser</Button>
        </div>
      </div>
      {tempDateFilter === 'custom' && (
        <div className="pt-3 border-t border-slate-800/20 flex gap-4">
          <input type="date" className="p-1.5 px-3 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg" value={tempCustomRange.start} onChange={e => setTempCustomRange({...tempCustomRange, start: e.target.value})} />
          <input type="date" className="p-1.5 px-3 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg" value={tempCustomRange.end} onChange={e => setTempCustomRange({...tempCustomRange, end: e.target.value})} />
        </div>
      )}
    </Card>
  );
};
