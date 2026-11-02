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

  return (
    <div style={style} className="pr-1 pb-2">
      <div 
        onClick={() => onSelect(customer.id)}
        className={cn(
          "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group h-[74px]",
          isSelected 
            ? "bg-indigo-600/20 border-indigo-500/40 shadow-xs" 
            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
        )}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center font-black flex-shrink-0 text-sm transition-all shadow-inner",
            isSelected ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 group-hover:text-indigo-400"
          )}>
            {(customer.name || '?').charAt(0)}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-white truncate text-sm uppercase tracking-wider">{customer.name || 'Client sans nom'}</h4>
              {customer.isAppUser && (
                <span title="Client Application Mobile">
                  <Smartphone size={14} className="text-indigo-400 flex-shrink-0" />
                </span>
              )}
              {customer.latitude && (
                <span title="Position GPS enregistrée">
                  <MapPin size={13} className="text-emerald-400 flex-shrink-0" />
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter truncate">{customer.phone || 'Pas de téléphone'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse">
            <Award size={12} />
            {customer.loyaltyPoints}
          </div>
          {(Number(customer.balance) || 0) < 0 && (
            <span className="text-[8px] font-black tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-mono uppercase">
              Dette: {Math.abs(Number(customer.balance) || 0).toFixed(2)}
            </span>
          )}
          {(Number(customer.balance) || 0) > 0 && (
            <span className="text-[8px] font-black tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono uppercase">
              Solde: {Number(customer.balance || 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
