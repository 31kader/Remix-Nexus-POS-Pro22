import React from 'react';
import {
  LayoutGrid,
  Package,
  DollarSign,
  Layers,
  Sparkles,
  History,
  TrendingUp
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type FicheTab = 'all' | 'identity' | 'pricing' | 'stock' | 'media';

interface ProductFormTabNavProps {
  activeFicheTab: FicheTab;
  setActiveFicheTab: (tab: FicheTab) => void;
  setIsPurchaseHistoryModalOpen?: (v: boolean) => void;
  setIsSalesHistoryModalOpen?: (v: boolean) => void;
}

const TABS: { id: FicheTab; label: string; icon: any }[] = [
  { id: 'all', label: '👁️ Vue Complète Structurée', icon: LayoutGrid },
  { id: 'identity', label: '1. Identification & Rayon', icon: Package },
  { id: 'pricing', label: '2. Tarifs, Gros & Marges', icon: DollarSign },
  { id: 'stock', label: '3. Stock, Emplacement & Lots', icon: Layers },
  { id: 'media', label: '✨ 4. Studio Photo & Médias', icon: Sparkles },
];

export function ProductFormTabNav({
  activeFicheTab,
  setActiveFicheTab,
  setIsPurchaseHistoryModalOpen,
  setIsSalesHistoryModalOpen
}: ProductFormTabNavProps) {
  return (
    <div className="bg-slate-100/80 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeFicheTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFicheTab(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-indigo-400'
              )}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {(setIsPurchaseHistoryModalOpen || setIsSalesHistoryModalOpen) && (
        <div className="flex items-center gap-2">
          {setIsPurchaseHistoryModalOpen && (
            <button
              type="button"
              onClick={() => setIsPurchaseHistoryModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:border-indigo-500 flex items-center gap-1 cursor-pointer"
            >
              <History size={12} className="text-indigo-500" /> Achats
            </button>
          )}
          {setIsSalesHistoryModalOpen && (
            <button
              type="button"
              onClick={() => setIsSalesHistoryModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:border-emerald-500 flex items-center gap-1 cursor-pointer"
            >
              <TrendingUp size={12} className="text-emerald-500" /> Ventes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
