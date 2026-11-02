import React, { useState, useMemo } from 'react';
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../../types';
import { useCartStore } from '../../../store/useCartStore';
import { CustomerHistoryFilterBar } from './history/CustomerHistoryFilterBar';
import { CustomerHistoryTimelineRow } from './history/CustomerHistoryTimelineRow';

export interface CustomerHistoryTabProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
  timeline: any[];
  historyStats: {
    totalOps: number;
    salesCount: number;
    salesTotal: number;
    storeCount: number;
    storeTotal: number;
    onlineCount: number;
    onlineTotal: number;
    returnsCount: number;
    refundTotal: number;
    netTotal: number;
  };
  isLoadingTxs: boolean;
  onRestore?: (t: Transaction) => void;
}

export const CustomerHistoryTab: React.FC<CustomerHistoryTabProps> = ({
  selectedCustomer: _selectedCustomer,
  settings,
  timeline,
  historyStats,
  isLoadingTxs,
  onRestore
}) => {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in_store' | 'online' | 'returns'>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const HISTORY_PAGE_SIZE = 15;

  const handleRestore = (t: Transaction) => {
    if (typeof onRestore === 'function') {
      onRestore(t);
    } else {
      useCartStore.getState().loadTransactionToCart(t, (tab: string) => {
        window.dispatchEvent(new CustomEvent('change-tab', { detail: tab }));
      });
    }
  };

  const filteredTimeline = useMemo(() => {
    return timeline.filter(item => {
      if (historyFilter === 'in_store' && (item.channel !== 'in_store' || item.type === 'return')) return false;
      if (historyFilter === 'online' && item.channel !== 'online') return false;
      if (historyFilter === 'returns' && item.type !== 'return') return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const idMatch = String(item.id || '').toLowerCase().includes(q) ||
                        String(item.externalOrderId || '').toLowerCase().includes(q) ||
                        String(item.onlineOrderId || '').toLowerCase().includes(q);
        const itemMatch = (item.items || []).some((it: any) => 
          (it.name || it.productName || '').toLowerCase().includes(q)
        );
        if (!idMatch && !itemMatch) return false;
      }
      return true;
    });
  }, [timeline, historyFilter, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTimeline.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedTimeline = useMemo(() => {
    const start = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
    return filteredTimeline.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredTimeline, currentHistoryPage]);

  return (
    <div className="space-y-4">
      {isLoadingTxs && timeline.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Loader2 size={28} className="mx-auto mb-2.5 animate-spin text-indigo-400" />
          <p className="font-bold text-xs uppercase tracking-wider text-slate-400">Chargement du journal de bord...</p>
        </div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60 p-5">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30 text-indigo-400" />
          <p className="font-bold text-sm text-slate-300">Aucune opération enregistrée</p>
          <p className="text-xs text-slate-500 mt-1">Les achats et retours liés à ce client apparaîtront ici sous forme de tableau complet.</p>
        </div>
      ) : (
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 shadow-xl space-y-2.5">
          {/* Barre d'outils compacte avec statistiques intégrées */}
          <CustomerHistoryFilterBar
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            totalTimelineCount={timeline.length}
            historyStats={historyStats}
            currency={settings.currency || 'DA'}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            onFilterChange={() => setHistoryPage(1)}
          />

          {/* Le Grand TABLEAU du Journal de Bord */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-lg">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-[11px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-3 px-3.5">Date & Heure</th>
                  <th className="py-3 px-3.5">Réf Ticket / Cmd</th>
                  <th className="py-3 px-3.5">Origine & Type</th>
                  <th className="py-3 px-3.5">Articles & Détails</th>
                  <th className="py-3 px-3.5">Paiement</th>
                  <th className="py-3 px-3.5 text-right">Montant</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {paginatedTimeline.map((item) => (
                  <CustomerHistoryTimelineRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    isExpanded={expandedTxId === item.id}
                    onToggleExpand={() => setExpandedTxId(expandedTxId === item.id ? null : item.id)}
                    onRestore={handleRestore}
                    currency={settings.currency || 'DA'}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination du Journal de bord */}
          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 text-[11px]">
                Page <strong className="text-white">{currentHistoryPage}</strong> sur <strong className="text-white">{totalHistoryPages}</strong> ({filteredTimeline.length} opérations)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentHistoryPage <= 1}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={13} /> Précédent
                </button>
                <button
                  type="button"
                  disabled={currentHistoryPage >= totalHistoryPages}
                  onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  Suivant <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
