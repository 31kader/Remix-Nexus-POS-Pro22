import React from 'react';
import { X, Wallet, Phone } from 'lucide-react';
import { Supplier } from '../../../types';
import { cn, formatPrice } from '../../../lib/utils';

interface WeeklyDayCardProps {
  day: string;
  isToday: boolean;
  preSaleSuppliers: Supplier[];
  deliverySuppliers: Supplier[];
  paymentSuppliers: Supplier[];
  setViewingDetailsSupplier: (s: Supplier) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (v: boolean) => void;
  onQuickPaySupplier?: (s: Supplier) => void;
  currency?: string;
  handleRemoveDayActivity: (
    e: React.MouseEvent,
    supplier: Supplier,
    field: 'preSaleDays' | 'deliveryDays' | 'paymentDays',
    day: string
  ) => void;
}

export const WeeklyDayCard: React.FC<WeeklyDayCardProps> = ({
  day,
  isToday,
  preSaleSuppliers,
  deliverySuppliers,
  paymentSuppliers,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen,
  onQuickPaySupplier,
  currency = 'DA',
  handleRemoveDayActivity
}) => {
  const totalEvents = preSaleSuppliers.length + deliverySuppliers.length + paymentSuppliers.length;

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900/90 border rounded-xl p-4 transition-all flex flex-col justify-between shadow-xs",
        isToday
          ? "border-indigo-500 ring-2 ring-indigo-500/15"
          : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/40"
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h4 className="font-black text-slate-900 dark:text-white text-base uppercase">{day}</h4>
            {isToday && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase">
                Aujourd'hui
              </span>
            )}
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
            totalEvents > 0
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
          )}>
            {totalEvents} {totalEvents <= 1 ? 'Action' : 'Actions'}
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Commandes / Pré-ventes */}
          {preSaleSuppliers.map(s => (
            <div
              key={`presale-${s.id}`}
              onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('products'); setIsDetailsModalOpen(true); }}
              className="bg-purple-500/10 border border-purple-500/25 rounded-xl p-3 hover:bg-purple-500/15 transition-all cursor-pointer group relative"
            >
              <button
                type="button"
                onClick={(e) => handleRemoveDayActivity(e, s, 'preSaleDays', day)}
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50"
                title="Retirer de ce jour"
              >
                <X size={12} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400">📝 Commande / Pré-vente</span>
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1 pr-5">{s.name}</p>
              {s.phone && (
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {s.phone}
                </p>
              )}
              {s.planningNotes && (
                <p className="text-[10px] text-purple-700 dark:text-purple-300/80 font-mono truncate mt-1">
                  "{s.planningNotes}"
                </p>
              )}
            </div>
          ))}

          {/* Livraisons */}
          {deliverySuppliers.map(s => (
            <div
              key={`delivery-${s.id}`}
              onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('purchases'); setIsDetailsModalOpen(true); }}
              className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 hover:bg-emerald-500/15 transition-all cursor-pointer group relative"
            >
              <button
                type="button"
                onClick={(e) => handleRemoveDayActivity(e, s, 'deliveryDays', day)}
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50"
                title="Retirer de ce jour"
              >
                <X size={12} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">🚚 Livraison</span>
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1 pr-5">{s.name}</p>
              {s.phone && (
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {s.phone}
                </p>
              )}
              {s.planningNotes && (
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300/80 font-mono truncate mt-1">
                  "{s.planningNotes}"
                </p>
              )}
            </div>
          ))}

          {/* Règlements */}
          {paymentSuppliers.map(s => {
            const debt = Number(s.balance) || 0;
            return (
              <div
                key={`payment-${s.id}`}
                onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('payments'); setIsDetailsModalOpen(true); }}
                className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 hover:bg-rose-500/15 transition-all cursor-pointer group relative"
              >
                <button
                  type="button"
                  onClick={(e) => handleRemoveDayActivity(e, s, 'paymentDays', day)}
                  className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50"
                  title="Retirer de ce jour"
                >
                  <X size={12} />
                </button>
                <div className="flex items-center justify-between pr-5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400">💳 Règlement</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-rose-600 dark:text-rose-400">
                    {formatPrice(debt)} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{s.name}</p>
                  {onQuickPaySupplier && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onQuickPaySupplier(s); }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[9px] font-black uppercase flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Wallet size={10} /> Régler
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {totalEvents === 0 && (
            <div className="py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-3">
              <p className="text-[10px] font-black text-slate-400 uppercase">Jour Libre</p>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Aucune visite planifiée</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
