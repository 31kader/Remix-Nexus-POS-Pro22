import React from 'react';
import { Smartphone, MapPin, Award } from 'lucide-react';
import { Customer } from '../../../types';
import { cn } from '../../../lib/utils';

interface CustomerRowItemProps {
  customer: Customer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  style: any;
}

export function CustomerRowItem({ customer, isSelected, onSelect, style }: CustomerRowItemProps) {
  if (!customer) return null;

  const balance = Number(customer.balance) || 0;

  return (
    <div style={style} className="pr-1 pb-2">
      <div 
        onClick={() => onSelect(customer.id)}
        className={cn(
          "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group h-[72px] select-none",
          isSelected 
            ? "bg-indigo-50/80 dark:bg-indigo-500/15 border-indigo-400 dark:border-indigo-500/50 shadow-xs" 
            : "bg-white dark:bg-zinc-900/70 border-slate-200/80 dark:border-zinc-800/70 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-850/80 shadow-2xs"
        )}
      >
        {/* Gauche : Avatar & Nom & Statuts */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 text-sm transition-all shadow-2xs",
            isSelected 
              ? "bg-indigo-600 text-white font-black" 
              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
          )}>
            {(customer.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="truncate min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className={cn(
                "font-bold truncate text-sm transition-colors",
                isSelected
                  ? "text-indigo-950 dark:text-indigo-100"
                  : "text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
              )}>
                {customer.name || 'Client sans nom'}
              </h4>
              {customer.isAppUser && (
                <span title="Client Application Mobile" className="shrink-0">
                  <Smartphone size={13} className="text-indigo-500" />
                </span>
              )}
              {customer.latitude && (
                <span title="Position GPS enregistrée" className="shrink-0">
                  <MapPin size={12} className="text-emerald-500" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate mt-0.5">
              {customer.phone || 'Pas de numéro'}
            </p>
          </div>
        </div>

        {/* Droite : Points Fidélité & Solde / Dette nette en DA */}
        <div className="flex flex-col items-end flex-shrink-0 gap-1 font-financial">
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <Award size={11} className="text-amber-500 shrink-0" />
            <span className="tabular-nums">{customer.loyaltyPoints || 0} pts</span>
          </div>

          {balance < 0 ? (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 px-1.5 py-0.5 rounded-md tabular-nums">
              Dette : {Math.abs(balance).toFixed(0)} <span className="font-sans text-[8px]">DA</span>
            </span>
          ) : balance > 0 ? (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 px-1.5 py-0.5 rounded-md tabular-nums">
              Solde : +{balance.toFixed(0)} <span className="font-sans text-[8px]">DA</span>
            </span>
          ) : (
            <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
              0 DA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
