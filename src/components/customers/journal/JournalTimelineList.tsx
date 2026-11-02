import React from 'react';
import { ShoppingBag, RotateCcw, ShoppingCart, ChevronUp, ChevronDown } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { Transaction, CompanySettings } from '../../../types';
import { cn, formatSafe } from '../../../lib/utils';
import { JournalTimelineItem } from './journalTypes';

export interface JournalTimelineListProps {
  paginatedTimeline: JournalTimelineItem[];
  expandedTxId: string | null;
  setExpandedTxId: (id: string | null) => void;
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  loadTransactionToCart: (transactionOrId: Transaction | string, setActiveTab: (tab: string) => void) => void;
}

export function JournalTimelineList({
  paginatedTimeline,
  expandedTxId,
  setExpandedTxId,
  settings,
  onRestore,
  loadTransactionToCart
}: JournalTimelineListProps) {
  const currency = settings.currency || 'DA';

  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-wider">
          <th className="py-3 px-4">Date & Heure</th>
          <th className="py-3 px-4">Type</th>
          <th className="py-3 px-4">Référence</th>
          <th className="py-3 px-4">Client</th>
          <th className="py-3 px-4">Articles</th>
          <th className="py-3 px-4">Paiement</th>
          <th className="py-3 px-4 text-right">Montant</th>
          <th className="py-3 px-4 text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/60 font-medium">
        {paginatedTimeline.map((item) => {
          const isSale = item.type === 'transaction';
          const isExpanded = expandedTxId === item.id;
          const itemsCount = (item.items || []).reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);

          return (
            <React.Fragment key={`${item.type}-${item.id}`}>
              <tr className={cn(
                "hover:bg-slate-800/50 transition-colors",
                isExpanded && "bg-slate-800/40"
              )}>
                <td className="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                  {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm', { locale: fr })}
                </td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1",
                    isSale
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  )}>
                    {isSale ? <ShoppingBag size={10} /> : <RotateCcw size={10} />}
                    {isSale ? 'Vente' : 'Retour'}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                  #{String(item.id).substring(0, 8)}
                </td>
                <td className="py-3 px-4 text-white font-bold max-w-[150px] truncate">
                  {item.customerName || 'Client de passage'}
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <span className="font-mono">{itemsCount}</span> article(s)
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold">
                    {item.paymentMethod || 'cash'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                  <span className={isSale ? "text-emerald-400" : "text-rose-400"}>
                    {isSale ? '+' : '-'}{Number(item.total || 0).toFixed(2)} {currency}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {isSale && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRestore) {
                            onRestore(item.raw);
                          } else {
                            loadTransactionToCart(item.raw, (tab: string) => {
                              window.location.hash = '#' + tab;
                            });
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                        title="Modifier ou reprendre cette vente en caisse"
                      >
                        <ShoppingCart size={12} /> Reprendre
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                      title="Voir détail des articles"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </td>
              </tr>

              {/* Expanded row with cart items breakdown */}
              {isExpanded && (
                <tr>
                  <td colSpan={8} className="p-4 bg-slate-950/90 border-y border-indigo-500/20">
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase text-indigo-400 border-b border-slate-800 pb-2">
                        <span>Détail des Articles du Ticket #{item.id}</span>
                        <span>Total : {Number(item.total || 0).toFixed(2)} {currency}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {(item.items || []).map((cartItem: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-white font-bold truncate max-w-[150px]">{cartItem.name}</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {cartItem.quantity || 1} × {(Number(cartItem.price) || 0).toFixed(2)}
                            </span>
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
  );
}
