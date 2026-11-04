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

// Couleurs d'avatars satinées reposantes basées sur le nom
const AVATAR_PALETTE = [
  'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'bg-rose-500/15 text-rose-400 border-rose-500/25',
  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
];

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_PALETTE[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

export function CustomerRowItem({ customer, isSelected, onSelect, style }: CustomerRowItemProps) {
  if (!customer) return null;

  const balance = Number(customer.balance) || 0;
  const name = customer.name || 'Client sans nom';
  const initial = name.charAt(0).toUpperCase();
  const avatarClass = getAvatarColor(name);

  return (
    <div style={style} className="pr-1 pb-2">
      <div 
        onClick={() => onSelect(customer.id)}
        className={cn(
          "p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between group h-[74px] select-none relative overflow-hidden",
          isSelected 
            ? "bg-indigo-600/[0.08] dark:bg-indigo-500/[0.12] border-indigo-500/50 shadow-xs ring-1 ring-indigo-500/30" 
            : "bg-white/80 dark:bg-zinc-900/60 border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-400/40 dark:hover:border-indigo-500/30 hover:bg-slate-50/80 dark:hover:bg-zinc-850/80 shadow-2xs"
        )}
      >
        {/* Liseré gauche feutré actif */}
        {isSelected && (
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />
        )}

        {/* Gauche : Avatar personnalisé & Nom & Badges */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0 pl-1">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 text-sm transition-all border shadow-2xs",
            isSelected 
              ? "bg-indigo-600 text-white border-indigo-500 font-black shadow-indigo-500/20" 
              : `${avatarClass} group-hover:scale-105`
          )}>
            {initial}
          </div>
          <div className="truncate min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className={cn(
                "font-bold truncate text-sm transition-colors",
                isSelected
                  ? "text-indigo-950 dark:text-indigo-100 font-extrabold"
                  : "text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
              )}>
                {name}
              </h4>
              {customer.isAppUser && (
                <span title="Client Application Mobile" className="shrink-0 p-0.5 rounded bg-indigo-500/10 text-indigo-400">
                  <Smartphone size={12} />
                </span>
              )}
              {customer.latitude && (
                <span title="Position GPS enregistrée" className="shrink-0 p-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  <MapPin size={11} />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate mt-0.5 flex items-center gap-1.5">
              <span>{customer.phone || 'Pas de numéro'}</span>
              {customer.city && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="truncate">{customer.city}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Droite : Points Fidélité & Solde / Dette nette en DA */}
        <div className="flex flex-col items-end flex-shrink-0 gap-1 font-financial">
          {Number(customer.loyaltyPoints) > 0 ? (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
              <Award size={11} className="text-amber-500 shrink-0" />
              <span className="tabular-nums">{customer.loyaltyPoints} pts</span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
              0 pts
            </div>
          )}

          {balance < 0 ? (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-lg tabular-nums shadow-2xs">
              Dette : {Math.abs(balance).toFixed(0)} <span className="font-sans text-[8px] opacity-80">DA</span>
            </span>
          ) : balance > 0 ? (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg tabular-nums shadow-2xs">
              Solde : +{balance.toFixed(0)} <span className="font-sans text-[8px] opacity-80">DA</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono bg-slate-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-zinc-700/40">
              0 DA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
