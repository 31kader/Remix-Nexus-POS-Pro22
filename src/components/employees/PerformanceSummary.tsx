import React from 'react';
import { motion } from 'motion/react';
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
  return (
    <Card className="overflow-hidden border-white/5 bg-white/5 backdrop-blur-md rounded-[2.5rem] shadow-2xl">
      <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-neon-indigo/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <h4 className="font-black text-white uppercase tracking-wider text-sm italic">Résumé des Performances</h4>
            <p className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase mt-0.5">Sales Metrics & Efficiency</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto text-white font-black">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-white/40 uppercase">
              <SortableHeader label="EMPLOYÉ" sortKey="name" currentSort={sortConfig} onSort={() => requestSort('name')} className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]" />
              <SortableHeader label="TRANSACTIONS" sortKey="transactions" currentSort={sortConfig} onSort={() => requestSort('transactions')} className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center justify-center" />
              <SortableHeader label="TOTAL VENTES" sortKey="revenue" currentSort={sortConfig} onSort={() => requestSort('revenue')} className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right justify-end" />
              <SortableHeader label="MOYENNE / VENTE" sortKey="average" currentSort={sortConfig} onSort={() => requestSort('average')} className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right justify-end" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedEmployeesPerformance.map((employee: Employee, idx: number) => {
              const perf = employeePerformance[employee.id] || { totalSales: 0, transactionCount: 0 };
              const avgSale = perf.transactionCount > 0 ? perf.totalSales / perf.transactionCount : 0;
              return (
                <motion.tr 
                  key={`perf-row-${employee.id}`} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black/40 border border-white/10 text-indigo-400 rounded-2xl flex items-center justify-center text-lg font-black group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-500 shadow-xl">
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-white uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{employee.name}</p>
                        <p className="text-[10px] text-white/30 font-black tracking-widest uppercase mt-0.5">{employee.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="text-lg font-black text-white tracking-widest">{perf.transactionCount}</span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-emerald-400 tracking-tighter">{perf.totalSales.toFixed(2)}</span>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{settings.currency}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex flex-col items-end">
                       <span className="text-base font-black text-white/60 tracking-tight">{avgSale.toFixed(2)}</span>
                       <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">AVG PER ORDER</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
