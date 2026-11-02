import React from 'react';
import { ShoppingBag, ShoppingCart, ChevronUp, ChevronDown } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { Transaction, CompanySettings } from '../../../types';
import { cn, formatSafe } from '../../../lib/utils';
import { JournalTimelineItem } from './journalTypes';

export interface JournalTimelineMobileCardProps {
  item: JournalTimelineItem;
  expandedTxId: string | null;
  setExpandedTxId: (id: string | null) => void;
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  loadTransactionToCart: (transactionOrId: Transaction | string, setActiveTab: (tab: string) => void) => void;
  customerNameDisplay?: string;
  minButtonClass?: string;
}

export function JournalTimelineMobileCard({
  item,
  expandedTxId,
  setExpandedTxId,
  settings,
  onRestore,
  loadTransactionToCart
}: JournalTimelineMobileCardProps) {
  const currency = settings.currency || 'DA';
  const isSale = item.type === 'transaction';
  const isExpanded = expandedTxId === item.id;
  const itemsCount = (item.items || []).reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm space-y-3 transition-all",
        isExpanded && "border-indigo-500/40 bg-slate-900"
      )}
    >
      {/* Header: Date, Ref, Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border",
            isSale
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
          )}>
            {isSale ? 'Vente' : 'Retour'}
          </span>
          <span className="font-mono text-xs text-slate-400">
            #{String(item.id).substring(0, 8)}
          </span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          {formatSafe(item.timestamp, 'dd/MM/yyyy HH:mm', { locale: fr })}
        </span>
      </div>

      {/* Customer & Articles Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="font-black text-white uppercase text-sm truncate block">
            {item.customerName || 'Client de passage'}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <ShoppingBag size={12} className="text-indigo-400" />
            {itemsCount} article(s)
          </span>
        </div>

        {/* Montant Net */}
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Montant Net</span>
          <span className={cn(
            "font-mono font-black text-sm",
            isSale ? "text-emerald-400" : "text-rose-400"
          )}>
            {isSale ? '+' : '-'}{Number(item.total || 0).toFixed(2)} {currency}
          </span>
        </div>
      </div>

      {/* Mode de paiement & Actions */}
      <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/80">
        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold">
          Mode : {item.paymentMethod || 'cash'}
        </span>

        <div className="flex items-center gap-1.5">
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
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart size={14} /> Reprendre
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
            className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center cursor-pointer"
            title="Détail du panier"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Accordéon déplié du panier sur mobile */}
      {isExpanded && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 pb-1.5">
            <span>Articles du Panier</span>
            <span>Qté × Prix</span>
          </div>
          {(item.items || []).map((cartItem: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1">
              <span className="text-white font-bold truncate max-w-[180px]">{cartItem.name}</span>
              <span className="font-mono text-slate-300 text-[11px]">
                {cartItem.quantity || 1} × {(Number(cartItem.price) || 0).toFixed(2)} {currency}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
