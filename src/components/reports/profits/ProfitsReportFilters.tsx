import React from 'react';
import { Search, X } from 'lucide-react';
import { getHierarchicalCategories } from '../../../lib/utils';
import { Category, Customer } from '../../../types';

interface ProfitsReportFiltersProps {
  profitFilterDate: string;
  setProfitFilterDate: (val: any) => void;
  profitFilterTimeStart: string;
  setProfitFilterTimeStart: (val: string) => void;
  profitFilterTimeEnd: string;
  setProfitFilterTimeEnd: (val: string) => void;
  profitFilterMinTotal: string;
  setProfitFilterMinTotal: (val: string) => void;
  profitFilterMaxTotal: string;
  setProfitFilterMaxTotal: (val: string) => void;
  profitFilterSource: string;
  setProfitFilterSource: (val: any) => void;
  profitFilterCategory: string;
  setProfitFilterCategory: (val: string) => void;
  categories: Category[];
  profitFilterCustomer: string;
  setProfitFilterCustomer: (val: string) => void;
  customers: Customer[];
  profitSearchProduct: string;
  setProfitSearchProduct: (val: string) => void;
}

export function ProfitsReportFilters({
  profitFilterDate,
  setProfitFilterDate,
  profitFilterTimeStart,
  setProfitFilterTimeStart,
  profitFilterTimeEnd,
  setProfitFilterTimeEnd,
  profitFilterMinTotal,
  setProfitFilterMinTotal,
  profitFilterMaxTotal,
  setProfitFilterMaxTotal,
  profitFilterSource,
  setProfitFilterSource,
  profitFilterCategory,
  setProfitFilterCategory,
  categories,
  profitFilterCustomer,
  setProfitFilterCustomer,
  customers,
  profitSearchProduct,
  setProfitSearchProduct
}: ProfitsReportFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 w-full mt-4 bg-white/5 p-3 rounded-2xl border border-white/5">
      <div className="flex-1 min-w-[150px] max-w-[200px]">
        <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Période</label>
        <select 
          value={profitFilterDate} 
          onChange={e => setProfitFilterDate(e.target.value)}
          className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Toutes périodes</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois-ci</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      <div className="flex-1 min-w-[150px] max-w-[200px] flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Heure début</label>
          <input 
            type="time" 
            value={profitFilterTimeStart} 
            onChange={e => setProfitFilterTimeStart(e.target.value)}
            className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Heure fin</label>
          <input 
            type="time" 
            value={profitFilterTimeEnd} 
            onChange={e => setProfitFilterTimeEnd(e.target.value)}
            className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {(profitFilterTimeStart || profitFilterTimeEnd) && (
            <button onClick={() => { setProfitFilterTimeStart(''); setProfitFilterTimeEnd(''); }} className="p-2.5 mb-0.5 text-white/40 hover:text-rose-500 bg-white/5 border border-white/10 rounded-xl transition-colors" title="Réinitialiser">
              <X size={14} />
            </button>
        )}
      </div>

      <div className="flex-1 min-w-[150px] max-w-[200px] flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Panier min</label>
          <input 
            type="number" 
            placeholder="0"
            value={profitFilterMinTotal} 
            onChange={e => setProfitFilterMinTotal(e.target.value)}
            className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Panier max</label>
          <input 
            type="number" 
            placeholder="Max"
            value={profitFilterMaxTotal} 
            onChange={e => setProfitFilterMaxTotal(e.target.value)}
            className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        {(profitFilterMinTotal || profitFilterMaxTotal) && (
            <button onClick={() => { setProfitFilterMinTotal(''); setProfitFilterMaxTotal(''); }} className="p-2.5 mb-0.5 text-white/40 hover:text-rose-500 bg-white/5 border border-white/10 rounded-xl transition-colors" title="Réinitialiser">
              <X size={14} />
            </button>
        )}
      </div>

      <div className="flex-1 min-w-[150px] max-w-[200px]">
        <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Source</label>
        <select 
          value={profitFilterSource} 
          onChange={e => setProfitFilterSource(e.target.value)}
          className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Toutes</option>
          <option value="pos">Magasin (Caisse)</option>
          <option value="online">En ligne (App)</option>
        </select>
      </div>

      <div className="flex-1 min-w-[150px] max-w-[200px]">
        <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Catégorie</label>
        <select 
          value={profitFilterCategory} 
          onChange={e => setProfitFilterCategory(e.target.value)}
          className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Toutes</option>
          {getHierarchicalCategories(categories).map(c => (
            <option key={c.id} value={c.id}>
              {'—'.repeat(c.level)} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[150px] max-w-[200px]">
        <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Client</label>
        <select 
          value={profitFilterCustomer} 
          onChange={e => setProfitFilterCustomer(e.target.value)}
          className="w-full text-sm font-black border-white/10 rounded-xl p-2 bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tous les clients</option>
          {customers?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[150px] md:max-w-xs relative text-left">
        <label className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1 block">Rechercher</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <input
            type="text"
            placeholder="Nom, SKU..."
            className="w-full pl-9 pr-4 py-2 text-sm font-bold border border-white/10 rounded-xl bg-[#0a0a0f] text-white outline-none focus:ring-2 focus:ring-indigo-500"
            value={profitSearchProduct}
            onChange={(e) => setProfitSearchProduct(e.target.value)}
          />
          {profitSearchProduct && (
            <button 
              onClick={() => setProfitSearchProduct('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
