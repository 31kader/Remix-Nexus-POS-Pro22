import React from 'react';
import { Search, Calendar, FileDown, Printer } from 'lucide-react';
import { Category } from '../../../types';
import { Button } from '../../ui';

interface LossReportHeaderProps {
  search: string;
  setSearch: (val: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (val: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  categories: Category[];
  onExportCSV: () => void;
  onPrintPDF: () => void;
}

export function LossReportHeader({
  search,
  setSearch,
  dateRange,
  setDateRange,
  selectedCategory,
  setSelectedCategory,
  categories,
  onExportCSV,
  onPrintPDF
}: LossReportHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/10">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text"
            placeholder="Rechercher produit, raison..."
            className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:border-indigo-500 transition-all outline-none md:w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-white/20" />
          <input 
            type="date"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <span className="text-white/20">à</span>
          <input 
            type="date"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>

        <select 
          className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 outline-none hover:border-white/20 cursor-pointer"
          value={selectedCategory}
          onChange={(e: any) => setSelectedCategory(e.target.value)}
        >
          <option value="all">Toutes les Catégories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id} className="bg-slate-900">{c.name.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          onClick={onExportCSV}
          className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest rounded-2xl px-6"
        >
          <FileDown size={14} className="mr-2" /> Exporter CSV
        </Button>
        <Button 
          onClick={onPrintPDF}
          className="bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl px-6"
        >
          <Printer size={14} className="mr-2" /> Imprimer Rapport (PDF)
        </Button>
      </div>
    </div>
  );
}
