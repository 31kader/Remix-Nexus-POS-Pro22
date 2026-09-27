import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Employee, CompanySettings } from '../../types';
import { Card, SortableHeader } from '../ui';

interface PerformanceSummaryProps {
  sortedEmployeesPerformance: Employee[];
  employeePerformance: Record<string, { totalSales: number; transactionCount: number }>;
  sortConfig: any;
  requestSort: (key: string) => void;
  settings: CompanySettings;
}

export function PerformanceSummary({
  sortedEmployeesPerformance,
  employeePerformance,
  sortConfig,
  requestSort,
  settings
}: PerformanceSummaryProps) {
  const currency = settings.currency || 'DA';

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
      <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm">Résumé des Performances par Employé</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Chiffre d'affaires encaissé, nombre de tickets et panier moyen</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800">
              <SortableHeader label="EMPLOYÉ" sortKey="name" currentSort={sortConfig} onSort={() => requestSort('name')} className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase" />
              <SortableHeader label="TRANSACTIONS" sortKey="transactions" currentSort={sortConfig} onSort={() => requestSort('transactions')} className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase text-center justify-center" />
              <SortableHeader label="TOTAL VENTES" sortKey="revenue" currentSort={sortConfig} onSort={() => requestSort('revenue')} className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase text-right justify-end" />
              <SortableHeader label="PANIER MOYEN" sortKey="average" currentSort={sortConfig} onSort={() => requestSort('average')} className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase text-right justify-end" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {sortedEmployeesPerformance.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-slate-500 dark:text-zinc-400">
                  Aucun employé enregistré. Cliquez sur « Ajouter Employé » pour commencer.
                </td>
              </tr>
            ) : sortedEmployeesPerformance.map((employee: Employee) => {
              const perf = employeePerformance[employee.id] || { totalSales: 0, transactionCount: 0 };
              const avgSale = perf.transactionCount > 0 ? perf.totalSales / perf.transactionCount : 0;
              return (
                <tr 
                  key={`perf-row-${employee.id}`} 
                  className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-sm font-black">
                        {(employee.name || 'E').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900 dark:text-white">{employee.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase">{employee.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-sm font-black text-slate-900 dark:text-white">
                      {perf.transactionCount}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {perf.totalSales.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                      {avgSale.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
