import React from 'react';
import { History, FileSpreadsheet, DollarSign } from 'lucide-react';
import { Employee } from '../../../types';

interface AttendanceFiltersBarProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedEmployeeFilter: string;
  setSelectedEmployeeFilter: (filter: string) => void;
  employees: Employee[];
  onExportCSV: () => void;
  onOpenReportModal: () => void;
}

export const AttendanceFiltersBar: React.FC<AttendanceFiltersBarProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedEmployeeFilter,
  setSelectedEmployeeFilter,
  employees,
  onExportCSV,
  onOpenReportModal,
}) => {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-end gap-6 mt-12 bg-white/[0.02] p-5 rounded-xl border border-white/5">
      <div>
        <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-2">
          <History size={18} className="text-indigo-400" />
          Historique de Pointage
        </h4>
        <p className="text-[10px] font-black text-white/30 tracking-normal mt-1 uppercase">
          ARCHIVE & VERIFIED RECORDS
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
        <div className="flex flex-col gap-2 shrink-0">
          <label className="text-[9px] font-black text-white/20 uppercase tracking-normal ml-2">
            Période
          </label>
          <input
            type="month"
            className="px-6 py-3 bg-black/40 border border-white/10 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <label className="text-[9px] font-black text-white/20 uppercase tracking-normal ml-2">
            Employé
          </label>
          <select
            className="px-6 py-3 bg-black/40 border border-white/10 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={selectedEmployeeFilter}
            onChange={e => setSelectedEmployeeFilter(e.target.value)}
          >
            <option value="all">TOUS LES EMPLOYÉS</option>
            {(employees || []).filter(Boolean).map(e => (
              <option key={e.id} value={e.id}>
                {String(e.name || 'EMPLOYÉ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 items-center pt-5 sm:pt-0">
          <button
            type="button"
            onClick={onExportCSV}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-indigo-500/20"
            title="Exporter l'historique en format tableur CSV"
          >
            <FileSpreadsheet size={14} /> EXPORTER CSV
          </button>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
            title="Générer les bulletins de paie et les rapports mensuels"
          >
            <DollarSign size={14} /> BULLETIN & PAIE
          </button>
        </div>
      </div>
    </div>
  );
};
