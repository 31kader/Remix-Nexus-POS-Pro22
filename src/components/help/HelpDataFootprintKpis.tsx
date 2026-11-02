import React from 'react';
import { Package, ShoppingCart, Database, Server, KeyRound } from 'lucide-react';

interface HelpDataFootprintKpisProps {
  productsCount: number;
  transactionsCount: number;
  customersCount: number;
  suppliersCount: number;
}

export const HelpDataFootprintKpis: React.FC<HelpDataFootprintKpisProps> = ({
  productsCount,
  transactionsCount,
  customersCount,
  suppliersCount
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
          <span className="text-[10px] font-black uppercase">Catalogue Local</span>
          <Package size={16} />
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{productsCount}</p>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Articles indexés sur PC</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
          <span className="text-[10px] font-black uppercase">Ventes & Tickets</span>
          <ShoppingCart size={16} />
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{transactionsCount}</p>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Transactions protégées</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
          <span className="text-[10px] font-black uppercase">Fichier Clients</span>
          <Database size={16} />
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{customersCount}</p>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Comptes & Points fidélité</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
          <span className="text-[10px] font-black uppercase">Fournisseurs</span>
          <Server size={16} />
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{suppliersCount}</p>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Partenaires & Soldes</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
          <span className="text-[10px] font-black uppercase">Chiffrement PIN</span>
          <KeyRound size={16} />
        </div>
        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1.5">Bcrypt $2a$</p>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Session isolée active</p>
      </div>
    </div>
  );
};
