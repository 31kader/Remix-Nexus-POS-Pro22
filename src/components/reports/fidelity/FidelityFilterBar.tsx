import React from 'react';
import { Crown, Tag, Search, Download } from 'lucide-react';
import { Card } from '../../ui';
import { cn } from '../../../lib/utils';
import { MarketingFilterDate, FidelitySubView } from './fidelityTypes';

interface FidelityFilterBarProps {
  subView: FidelitySubView;
  setSubView: (view: FidelitySubView) => void;
  totalCustomersCount: number;
  totalPromoTxCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  marketingFilterDate: MarketingFilterDate;
  setMarketingFilterDate: (date: MarketingFilterDate) => void;
  onPageReset: () => void;
  onExportCSV: () => void;
}

export const FidelityFilterBar: React.FC<FidelityFilterBarProps> = ({
  subView,
  setSubView,
  totalCustomersCount,
  totalPromoTxCount,
  searchQuery,
  setSearchQuery,
  marketingFilterDate,
  setMarketingFilterDate,
  onPageReset,
  onExportCSV,
}) => {
  return (
    <Card className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubView('customers');
              onPageReset();
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer',
              subView === 'customers'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            )}
          >
            <Crown size={15} className={subView === 'customers' ? 'text-amber-300' : 'text-zinc-400'} />
            Classement Clients Fidèles ({totalCustomersCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('promos');
              onPageReset();
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer',
              subView === 'promos'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            )}
          >
            <Tag size={15} />
            Ventes avec Remises & Bons ({totalPromoTxCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Rechercher un client ou N° ticket..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                onPageReset();
              }}
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Période:</label>
            <select
              value={marketingFilterDate}
              onChange={e => {
                setMarketingFilterDate(e.target.value as MarketingFilterDate);
                onPageReset();
              }}
              className="text-xs font-bold bg-zinc-950 text-white border-none outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">Toutes les périodes</option>
              <option value="today" className="bg-zinc-900 text-white">Aujourd&apos;hui</option>
              <option value="yesterday" className="bg-zinc-900 text-white">Hier</option>
              <option value="week" className="bg-zinc-900 text-white">Cette semaine</option>
              <option value="month" className="bg-zinc-900 text-white">Ce mois-ci</option>
              <option value="year" className="bg-zinc-900 text-white">Cette année</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download size={14} /> Exporter CSV
          </button>
        </div>
      </div>
    </Card>
  );
};
