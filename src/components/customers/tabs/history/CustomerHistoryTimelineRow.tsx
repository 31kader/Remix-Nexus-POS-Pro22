import React from 'react';
import { Clock, RotateCcw, Smartphone, Store, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatSafe, formatPrice } from '../../../../lib/utils';
import { Transaction } from '../../../../types';

export interface CustomerHistoryTimelineRowProps {
  item: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRestore: (t: Transaction) => void;
  currency: string;
}

export const CustomerHistoryTimelineRow: React.FC<CustomerHistoryTimelineRowProps> = ({
  item,
  isExpanded,
  onToggleExpand,
  onRestore,
  currency
}) => {
  const isTx = item.type === 'transaction';
  const safeItems = Array.isArray(item.items) ? item.items : [];
  const itemCount = safeItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

  return (
    <React.Fragment>
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
                onClick={onToggleExpand}
                className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-[10px] font-bold rounded transition-colors cursor-pointer"
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
            {formatPrice(item.total)} <span className="text-[10px] font-sans font-bold">{currency}</span>
          </span>
        </td>

        {/* Actions */}
        <td className="py-3 px-3.5 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1.5">
            {isTx && (
              <button
                type="button"
                onClick={() => onRestore(item.raw)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                title="Recharger cette vente dans le panier de caisse"
              >
                <ShoppingBag size={11} /> Reprendre
              </button>
            )}
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
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
                        PU : {Number(it.price || it.unitPrice || 0).toFixed(2)} {currency}
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
};
