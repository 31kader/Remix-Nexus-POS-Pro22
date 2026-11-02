import React from 'react';
import { User, X } from 'lucide-react';
import { Customer, CompanySettings } from '../../../types';

export interface JournalCustomerHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  customers: Customer[];
  activeCustomerId: string | null;
  selectedCustomerObj: Customer | null | undefined;
  onSelectCustomer: (id: string | null) => void;
  settings: CompanySettings;
}

export function JournalCustomerHeader({
  icon,
  title,
  subtitle,
  customers,
  activeCustomerId,
  selectedCustomerObj,
  onSelectCustomer,
  settings
}: JournalCustomerHeaderProps) {
  const currency = settings.currency || 'DA';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            {title}
            {selectedCustomerObj && (
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                {selectedCustomerObj.name}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {activeCustomerId ? (
          <div className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/40 rounded-xl px-3 py-1.5">
            <User size={13} className="text-indigo-400" />
            <span className="text-xs font-bold text-white">{selectedCustomerObj?.name || 'Client sélectionné'}</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              (Number(selectedCustomerObj?.balance) || 0) < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              Solde: {Number(selectedCustomerObj?.balance || 0).toFixed(2)} {currency}
            </span>
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
              title="Afficher tous les clients"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <select
            value={activeCustomerId || ''}
            onChange={(e) => onSelectCustomer(e.target.value || null)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">-- Filtrer par Client (Tous) --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
