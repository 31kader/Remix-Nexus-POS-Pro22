import React from 'react';
import { Phone, Mail, UserCog, Printer, Edit2, Trash2 } from 'lucide-react';
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
  handleDeleteEmployee,
  handlePrintDossier,
  setEditingEmployee,
  setIsModalOpen
}: EmployeeCardProps) {
  const currency = settings.currency || 'DA';

  return (
    <Card className="relative overflow-hidden group border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:border-indigo-500/40 transition-colors">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 font-black text-lg">
              {(employee.name || 'E').charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">{employee.name}</h4>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{employee.role}</p>
            </div>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", 
            employee.status === 'active' 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
          )}>
            {employee.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>

        <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300 mb-4">
          <div className="flex items-center gap-2.5">
            <Phone size={14} className="text-indigo-500 shrink-0" />
            <span className="font-medium">{employee.phone || 'Non renseigné'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Mail size={14} className="text-indigo-500 shrink-0" />
            <span className="truncate font-medium">{employee.email || 'Non renseigné'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <UserCog size={14} className="text-indigo-500 shrink-0" />
            <span>Recruté le : <strong className="text-slate-900 dark:text-white">{employee.hireDate || 'N/A'}</strong></span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-slate-200/70 dark:border-zinc-700/60 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Total Ventes</p>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {perf.totalSales.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-400">{currency}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Tickets Encaissés</p>
              <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{perf.transactionCount}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center mb-4 text-[10px] font-bold">
          <span className={cn(
            "flex-1 py-1.5 rounded-lg uppercase text-center border",
            employee.idCardRectoUrl && employee.idCardVersoUrl 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700"
          )}>
            🪪 Pièce d'identité
          </span>
          <span className={cn(
            "flex-1 py-1.5 rounded-lg uppercase text-center border",
            employee.digitalSignatureUrl 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700"
          )}>
            ✍️ Contrat signé
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button 
            type="button"
            onClick={() => handleDeleteEmployee(employee)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} /> Supprimer
          </button>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => handlePrintDossier(employee)}
              className="px-3 py-2 rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-500/20 flex items-center gap-1.5"
              title="Imprimer le Contrat et le Dossier complet"
            >
              <Printer size={13} /> Dossier
            </button>
            <button 
              type="button"
              onClick={() => { setEditingEmployee(employee); setIsModalOpen(true); }}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
            >
              <Edit2 size={13} /> Modifier
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
