import React from 'react';
import { Search, X } from 'lucide-react';
import { Card } from '../ui';
import { ReturnsDateFilter } from './returnsTypes';

interface ReturnsFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateFilter: ReturnsDateFilter;
  setDateFilter: (filter: ReturnsDateFilter) => void;
  customRange: { start: string; end: string };
  setCustomRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
}

export const ReturnsFilterBar: React.FC<ReturnsFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  customRange,
  setCustomRange,
}) => {
  return (
    <Card className="p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Rechercher par N° de transaction ou motif..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Tout
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'yesterday' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Hier
          </button>
          <button
            onClick={() => setDateFilter('last7days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'last7days' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            7 Jours
          </button>
          <button
            onClick={() => setDateFilter('last30days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'last30days' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            30 Jours
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Période
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input 
              type="date"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              value={customRange.start}
              onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-500 text-xs">à</span>
            <input 
              type="date"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              value={customRange.end}
              onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        )}
      </div>
    </Card>
  );
};
