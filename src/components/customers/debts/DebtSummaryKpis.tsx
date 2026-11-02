import React from 'react';
import { CreditCard, Users, TrendingDown, CheckCircle2 } from 'lucide-react';
import { CompanySettings } from '../../../types';
import { DebtorCustomerItem } from './debtsTypes';

export interface DebtSummaryKpisProps {
  totalDebt: number;
  debtorCustomers: DebtorCustomerItem[];
  allCustomersCount: number;
  settings: CompanySettings;
}

export function DebtSummaryKpis({
  totalDebt,
  debtorCustomers,
  allCustomersCount,
  settings
}: DebtSummaryKpisProps) {
  const currency = settings.currency || 'DA';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Debts */}
      <div className="p-5 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-slate-900 border border-rose-500/25 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-rose-400 tracking-wider">
          <span>Total Dettes Globales</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <CreditCard size={17} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {totalDebt.toFixed(2)} <span className="text-sm font-sans text-rose-400 font-bold">{currency}</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Montant total dû par vos clients</p>
      </div>

      {/* Total Debtors */}
      <div className="p-5 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/25 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-amber-400 tracking-wider">
          <span>Comptes Débiteurs</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Users size={17} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {debtorCustomers.length} <span className="text-xs font-sans text-amber-400 font-bold">clients</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Clients ayant un solde négatif</p>
      </div>

      {/* Biggest Debt */}
      <div className="p-5 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-slate-900 border border-indigo-500/25 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-indigo-400 tracking-wider">
          <span>Plus Forte Dette</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <TrendingDown size={17} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {(debtorCustomers[0]?.debtAmount || 0).toFixed(2)} <span className="text-sm font-sans text-indigo-400 font-bold">{currency}</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
          {debtorCustomers[0] ? debtorCustomers[0].name : 'Aucun débiteur'}
        </p>
      </div>

      {/* Up to date customers */}
      <div className="p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-slate-900 border border-emerald-500/25 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400 tracking-wider">
          <span>Comptes à Jour / Crédits</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={17} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {allCustomersCount - debtorCustomers.length} <span className="text-xs font-sans text-emerald-400 font-bold">clients</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Soldes nuls ou prépayés</p>
      </div>
    </div>
  );
}
