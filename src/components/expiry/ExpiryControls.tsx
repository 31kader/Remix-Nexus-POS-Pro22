import React from 'react';
import { 
  LayoutList, 
  CalendarDays, 
  TrendingDown, 
  FileDown, 
  Printer, 
  Percent, 
  Search 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExpiryControlsProps {
  view: 'list' | 'calendar' | 'analytics';
  setView: (view: 'list' | 'calendar' | 'analytics') => void;
  search: string;
  setSearch: (search: string) => void;
  filterStatus: 'all' | 'expired' | 'critical' | 'warning';
  setFilterStatus: (status: 'all' | 'expired' | 'critical' | 'warning') => void;
  handleExportCSV: () => void;
  handlePrintPDF: () => void;
  handleBatchDiscount: (status: 'expired' | 'critical') => void;
}

export function ExpiryControls({
  view,
  setView,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  handleExportCSV,
  handlePrintPDF,
  handleBatchDiscount
}: ExpiryControlsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/10">
      <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5">
        <button 
          onClick={() => setView('list')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            view === 'list' ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          <LayoutList size={14} /> Liste
        </button>
        <button 
          onClick={() => setView('calendar')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            view === 'calendar' ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          <CalendarDays size={14} /> Calendrier
        </button>
        <button 
          onClick={() => setView('analytics')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            view === 'analytics' ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          <TrendingDown size={14} /> Analystique
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button 
          onClick={handleExportCSV}
          className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 shadow-lg"
        >
          <FileDown size={14} /> Exporter (CSV)
        </button>
        
        <button 
          onClick={handlePrintPDF}
          className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 shadow-lg"
        >
          <Printer size={14} /> Imprimer (PDF)
        </button>

        <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />

        <button 
          onClick={() => handleBatchDiscount('critical')}
          className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/5"
        >
          <Percent size={14} /> Tout solder (-20%)
        </button>

        <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text"
            placeholder="Rechercher..."
            className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:border-indigo-500 transition-all outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 outline-none hover:border-white/20 cursor-pointer"
          value={filterStatus}
          onChange={(e: any) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tous les Statuts</option>
          <option value="expired" className="bg-slate-900">Expirés</option>
          <option value="critical" className="bg-slate-900">Critiques (7j)</option>
          <option value="warning" className="bg-slate-900">À surveiller (30j)</option>
        </select>
      </div>
    </div>
  );
}
