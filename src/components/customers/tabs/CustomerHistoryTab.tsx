import React, { useState, useMemo } from 'react';
import { 
  Clock, ShoppingBag, RotateCcw, Loader2, Store, Smartphone, 
  Search, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../../types';
import { cn, formatSafe, formatPrice } from '../../../lib/utils';
import { useCartStore } from '../../../store/useCartStore';

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
  selectedCustomer,
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 text-[11px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => { setHistoryFilter('all'); setHistoryPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px]",
                  historyFilter === 'all'
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                )}
              >
                Toutes ({timeline.length})
              </button>
              <button
                type="button"
                onClick={() => { setHistoryFilter('in_store'); setHistoryPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
                  historyFilter === 'in_store'
                    ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                )}
              >
                <Store size={12} />
                En Magasin ({historyStats.storeCount}) <span className="font-mono text-[10px] opacity-85">+{formatPrice(historyStats.storeTotal)}</span>
              </button>
              <button
                type="button"
                onClick={() => { setHistoryFilter('online'); setHistoryPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
                  historyFilter === 'online'
                    ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                    : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                )}
              >
                <Smartphone size={12} />
                Sur l'Application ({historyStats.onlineCount}) <span className="font-mono text-[10px] opacity-85">+{formatPrice(historyStats.onlineTotal)}</span>
              </button>
              <button
                type="button"
                onClick={() => { setHistoryFilter('returns'); setHistoryPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
                  historyFilter === 'returns'
                    ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                )}
              >
                <RotateCcw size={12} />
                Retours ({historyStats.returnsCount}) <span className="font-mono text-[10px] opacity-85">-{formatPrice(historyStats.refundTotal)}</span>
              </button>

              {/* Net Badge */}
              <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] flex items-center gap-1">
                <span className="text-[9px] uppercase text-slate-500 font-bold">Net:</span>
                <span className="font-black text-white">{formatPrice(historyStats.netTotal)} {settings.currency || 'DA'}</span>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
              <input
                type="text"
                placeholder="Rechercher ticket #, article..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                className="w-full pl-8 pr-6 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => { setHistorySearch(''); setHistoryPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

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
                {paginatedTimeline.map((item) => {
                  const isTx = item.type === 'transaction';
                  const isExpanded = expandedTxId === item.id;
                  const safeItems = Array.isArray(item.items) ? item.items : [];
                  const itemCount = safeItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

                  return (
                    <React.Fragment key={`${item.type}-${item.id}`}>
                      <tr className={cn(
                        "hover:bg-slate-800/40 transition-colors",
                        isExpanded && "bg-slate-900/40"
                      )}>
                        {/* Date & Heure */}
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-300 whitespace-nowrap text-xs">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-500" />
                            {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </td>

                        {/* Réf Ticket / Commande */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md w-fit">
                              #{String(item.externalOrderId || item.id || "").slice(-6).toUpperCase()}
                            </span>
                            {item.onlineOrderId && (
                              <span className="text-[9px] font-mono text-violet-400 pl-0.5 font-bold">
                                Cmd App #{String(item.onlineOrderId).slice(-6)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Origine & Type */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {item.type === 'return' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                              <RotateCcw size={11} /> Retour
                            </span>
                          ) : item.channel === 'online' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1 w-fit shadow-sm">
                                <Smartphone size={11} className="text-violet-400" /> Application
                              </span>
                              {item.type === 'online_order' && item.status && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                                  {item.status === 'pending' ? 'En attente' :
                                   item.status === 'confirmed' ? 'Confirmée' :
                                   item.status === 'processing' ? 'Préparation' :
                                   item.status === 'shipped' ? 'Expédiée' :
                                   item.status === 'delivered' ? 'Livrée' : item.status}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
                              <Store size={11} className="text-blue-400" /> Magasin
                            </span>
                          )}
                        </td>

                        {/* Articles & Détails */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                            <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold text-[10px] rounded">
                              {itemCount} art.
                            </span>
                            {safeItems.slice(0, 2).map((it: any, idx: number) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 font-medium text-[11px] rounded truncate max-w-[140px]"
                                title={it.productName || it.name}
                              >
                                <strong className="text-white font-bold">{it.quantity || 1}x</strong> {it.productName || it.name || 'Article'}
                              </span>
                            ))}
                            {safeItems.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                                className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-[10px] font-bold rounded transition-colors"
                              >
                                +{safeItems.length - 2} autres
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Paiement */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-300 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono uppercase w-fit">
                              {item.raw.paymentMethod === 'cash' ? 'Espèces' : item.raw.paymentMethod === 'card' ? 'Carte' : item.raw.paymentMethod === 'balance' ? 'Solde/Crédit' : item.raw.paymentMethod || 'Espèces'}
                            </span>
                            {item.type === 'online_order' && (
                              <span className={cn(
                                "text-[9px] font-bold uppercase",
                                item.paymentStatus === 'paid' ? "text-emerald-400" : "text-amber-400"
                              )}>
                                {item.paymentStatus === 'paid' ? 'Payé' : 'À régler'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Montant Net */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <span className={cn(
                            "font-mono font-black text-xs",
                            item.type === 'return' ? "text-rose-400" : "text-emerald-400"
                          )}>
                            {item.type === 'return' ? '- ' : '+ '}
                            {formatPrice(item.total)} <span className="text-[10px] font-sans font-bold">{settings.currency || 'DA'}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isTx && (
                              <button
                                type="button"
                                onClick={() => handleRestore(item.raw)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                title="Recharger cette vente dans le panier de caisse"
                              >
                                <ShoppingBag size={11} /> Reprendre
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                              title={isExpanded ? "Masquer les articles" : "Voir les articles"}
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Vue déroulante détaillée des articles du ticket */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={7} className="py-3 px-5 border-t border-b border-slate-800/80">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ShoppingBag size={12} /> Détail complet des articles (#{String(item.id).slice(-6).toUpperCase()})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {safeItems.map((it: any, iIdx: number) => (
                                  <div key={iIdx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                    <div className="truncate mr-2">
                                      <p className="font-bold text-white truncate text-[11px]">{it.productName || it.name || 'Article'}</p>
                                      <p className="text-[10px] font-mono text-slate-400">
                                        PU : {Number(it.price || it.unitPrice || 0).toFixed(2)} {settings.currency || 'DA'}
                                      </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="font-bold font-mono text-indigo-300 text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                                        x{it.quantity || 1}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1"
                >
                  <ChevronLeft size={13} /> Précédent
                </button>
                <button
                  type="button"
                  disabled={currentHistoryPage >= totalHistoryPages}
                  onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1"
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
