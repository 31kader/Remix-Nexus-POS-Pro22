import React from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, UserCog, Printer } from 'lucide-react';
import { Employee, CompanySettings } from '../../types';
import { Card } from '../ui';
import { cn } from '../../lib/utils';

interface EmployeeCardProps {
  employee: Employee;
  perf: { totalSales: number; transactionCount: number };
  settings: CompanySettings;
  idx: number;
  handleDeleteEmployee: (employee: Employee) => void;
  handlePrintDossier: (employee: Employee) => void;
  setEditingEmployee: (employee: Employee | null) => void;
  setIsModalOpen: (open: boolean) => void;
}

export function EmployeeCard({
  employee,
  perf,
  settings,
  idx,
  handleDeleteEmployee,
  handlePrintDossier,
  setEditingEmployee,
  setIsModalOpen
}: EmployeeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card className="relative overflow-hidden group border-white/5 bg-white/5 backdrop-blur-md rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:border-white/10 transition-all duration-500">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-black/60 rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-xl group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-500">
                <UserCog size={24} />
              </div>
              <div>
                <h4 className="font-black text-white uppercase tracking-wider text-base">{employee.name}</h4>
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-0.5 italic">{employee.role}</p>
              </div>
            </div>
            <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl", 
              employee.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5" : "bg-white/5 text-white/30 border-white/10"
            )}>
              {employee.status}
            </span>
          </div>

          <div className="space-y-4 text-[11px] font-black tracking-widest uppercase mb-8 text-white/60 text-left">
            <div className="flex items-center gap-3 group-hover:text-white transition-colors">
              <div className="p-2 bg-white/5 rounded-xl"><Phone size={14} className="text-indigo-400" /></div>
              <span>{employee.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 group-hover:text-white transition-colors">
              <div className="p-2 bg-white/5 rounded-xl"><Mail size={14} className="text-indigo-400" /></div>
              <span className="lowercase truncate">{employee.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 group-hover:text-white transition-colors">
              <div className="p-2 bg-white/5 rounded-xl"><UserCog size={14} className="text-indigo-400" /></div>
              <span>Recruté le: <span className="text-indigo-400">{employee.hireDate || 'N/A'}</span></span>
            </div>
          </div>

          <div className="bg-black/40 rounded-[1.5rem] p-6 border border-white/5 space-y-4 mb-8 text-white text-left">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Sales Performance Report</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Ventes</p>
                <p className="text-xl font-black text-white tracking-tighter">{perf.totalSales.toFixed(2)} <span className="text-[10px] text-white/20">{settings.currency}</span></p>
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Transactions</p>
                <p className="text-xl font-black text-white tracking-tighter">{perf.transactionCount}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center mb-6 text-white text-[8px] font-black">
            <span className={cn(
              "flex-1 py-1.5 rounded-xl uppercase tracking-widest text-center border",
              employee.idCardRectoUrl && employee.idCardVersoUrl 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-white/5 text-white/20 border-white/5"
            )}>
              🪪 PIÈCE IDENTITY
            </span>
            <span className={cn(
              "flex-1 py-1.5 rounded-xl uppercase tracking-widest text-center border",
              employee.digitalSignatureUrl 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-white/5 text-white/20 border-white/5"
            )}>
              ✍️ CONTRAT SIGNÉ
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-6 border-t border-white/5 text-white">
            <button 
              type="button"
              onClick={() => handleDeleteEmployee(employee)}
              className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all font-mono"
            >
              SUPPRIMER
            </button>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => handlePrintDossier(employee)}
                className="px-4 py-3 rounded-2xl bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/10 flex items-center gap-1.5"
                title="Imprimer le Contrat et le Dossier complet"
              >
                <Printer size={12} /> DOSSIER
              </button>
              <button 
                type="button"
                onClick={() => { setEditingEmployee(employee); setIsModalOpen(true); }}
                className="px-5 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all border border-white/5"
              >
                MODIFIER
              </button>
            </div>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] pointer-events-none rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors" />
      </Card>
    </motion.div>
  );
}
