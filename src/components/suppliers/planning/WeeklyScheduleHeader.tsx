import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Supplier } from '../../../types';
import { cn, formatPrice } from '../../../lib/utils';

export const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface WeeklyScheduleHeaderProps {
  todayName: string;
  activityFilter: 'all' | 'presale' | 'delivery' | 'payment';
  setActivityFilter: (val: 'all' | 'presale' | 'delivery' | 'payment') => void;
  focusTodayOnly: boolean;
  setFocusTodayOnly: (val: boolean) => void;
  quickAssignSupplierId: string;
  setQuickAssignSupplierId: (val: string) => void;
  quickAssignDay: string;
  setQuickAssignDay: (val: string) => void;
  quickAssignType: 'preSaleDays' | 'deliveryDays' | 'paymentDays';
  setQuickAssignType: (val: 'preSaleDays' | 'deliveryDays' | 'paymentDays') => void;
  handleQuickAssign: (e: React.FormEvent) => Promise<void>;
  suppliers: Supplier[];
  currency?: string;
}

export const WeeklyScheduleHeader: React.FC<WeeklyScheduleHeaderProps> = ({
  todayName,
  activityFilter,
  setActivityFilter,
  focusTodayOnly,
  setFocusTodayOnly,
  quickAssignSupplierId,
  setQuickAssignSupplierId,
  quickAssignDay,
  setQuickAssignDay,
  quickAssignType,
  setQuickAssignType,
  handleQuickAssign,
  suppliers,
  currency = 'DA'
}) => {
  return (
    <div className="p-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              TABLEAU DE BORD DES ACTIVITÉS FOURNISSEURS
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
              Aujourd'hui : {todayName}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Suivez et planifiez les visites de pré-vente, les réceptions de marchandises et les échéances de règlement de la semaine.
          </p>
        </div>

        {/* Filtres rapides par type d'activité */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Tout voir', color: 'bg-indigo-600 text-white' },
            { id: 'presale', label: '📝 Commandes', color: 'bg-purple-600 text-white' },
            { id: 'delivery', label: '🚚 Livraisons', color: 'bg-emerald-600 text-white' },
            { id: 'payment', label: '💳 Règlements', color: 'bg-rose-600 text-white' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivityFilter(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer border",
                activityFilter === tab.id
                  ? `${tab.color} border-transparent shadow-xs`
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setFocusTodayOnly(!focusTodayOnly)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer border",
              focusTodayOnly
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            )}
          >
            {focusTodayOnly ? '📅 Voir 7 Jours' : `🎯 Focus ${todayName}`}
          </button>
        </div>
      </div>

      {/* Barre d'ajout rapide au planning en 1 clic */}
      <form
        onSubmit={handleQuickAssign}
        className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-2.5"
      >
        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider shrink-0 px-1">
          ⚡ Planification Rapide :
        </span>
        <select
          value={quickAssignSupplierId}
          onChange={(e) => setQuickAssignSupplierId(e.target.value)}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
        >
          <option value="">— Choisir un fournisseur —</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} {Number(s.balance) > 0 ? `(Dette: ${formatPrice(Number(s.balance))} ${currency})` : ''}
            </option>
          ))}
        </select>

        <select
          value={quickAssignDay}
          onChange={(e) => setQuickAssignDay(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
        >
          {WEEK_DAYS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={quickAssignType}
          onChange={(e) => setQuickAssignType(e.target.value as any)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
        >
          <option value="preSaleDays">📝 Commande / Pré-vente</option>
          <option value="deliveryDays">🚚 Livraison de marchandise</option>
          <option value="paymentDays">💳 Règlement / Paiement</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
        >
          <Plus size={14} /> Planifier
        </button>
      </form>
    </div>
  );
};
