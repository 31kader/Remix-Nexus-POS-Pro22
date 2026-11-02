import React from 'react';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '../../ui';
import { cn, formatSafe } from '../../../lib/utils';
import { Employee, AttendanceRecord } from '../../../types';

interface AttendanceHistoryTableProps {
  filteredAttendance: AttendanceRecord[];
  employees: Employee[];
  handleClockOut: (id: string) => void;
}

export const AttendanceHistoryTable: React.FC<AttendanceHistoryTableProps> = ({
  filteredAttendance,
  employees,
  handleClockOut,
}) => {
  return (
    <Card className="overflow-hidden border-white/5 bg-white/5 rounded-xl shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-white/30 uppercase border-b border-white/5">
              <th className="p-6 text-[10px] font-black tracking-normal">EMPLOYÉ</th>
              <th className="p-6 text-[10px] font-black tracking-normal">DATE</th>
              <th className="p-6 text-[10px] font-black tracking-normal">ARRIVÉE</th>
              <th className="p-6 text-[10px] font-black tracking-normal">DÉPART</th>
              <th className="p-6 text-[10px] font-black tracking-normal">DURÉE</th>
              <th className="p-6 text-[10px] font-black tracking-normal">STATUT</th>
              <th className="p-6 text-[10px] font-black tracking-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAttendance.map((record, idx) => {
              const emp = employees.find(e => e.id === record.employeeId);
              let hoursWorked = '-';
              if (record.clockIn && record.clockOut) {
                const durationMs = new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime();
                const hours = durationMs / (1000 * 60 * 60);
                hoursWorked = hours > 0 ? hours.toFixed(2) + 'h' : '-';
              }
              return (
                <motion.tr 
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="p-6 font-black text-[11px] text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-xs text-indigo-400 font-black uppercase border border-white/10 shadow-lg group-hover:border-indigo-500 transition-colors">
                        {(emp?.name || record.employeeName || '?').charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="uppercase tracking-widest">
                          {emp?.name || record.employeeName || 'Inconnu'}
                        </span>
                        <span className="text-[9px] text-white/20 tracking-normal">
                          ID: {record.employeeId.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-[11px] text-white/60 font-black tracking-[0.1em]">
                    {format(new Date(record.date), 'dd MMMM yyyy', { locale: fr }).toUpperCase()}
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-sm tracking-tighter border border-emerald-500/10">
                      {formatSafe(record.clockIn, 'HH:mm')}
                    </span>
                  </td>
                  <td className="p-6">
                    {record.clockOut ? (
                      <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-black text-sm tracking-tighter border border-rose-500/10">
                        {formatSafe(record.clockOut, 'HH:mm')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest animate-pulse">
                        Running...
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-base font-black text-indigo-400 tracking-tighter">
                    {hoursWorked}
                  </td>
                  <td className="p-6">
                    <span className={cn(
                      "px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-normal border shadow-xl flex items-center gap-2 w-fit", 
                      record.status === 'present' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      record.status === 'late' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        record.status === 'present' ? "bg-emerald-400" :
                        record.status === 'late' ? "bg-amber-400" : "bg-rose-400"
                      )} />
                      {record.status === 'present' ? 'PRÉSENT' :
                       record.status === 'late' ? 'EN RETARD' :
                       record.status === 'absent' ? 'ABSENT' : 'PRÉSENT'}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    {!record.clockOut && record.status !== 'absent' && (
                      <button 
                        type="button"
                        onClick={() => handleClockOut(record.id)} 
                        className="px-6 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        POINTER SORTIE
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
            {filteredAttendance.length === 0 && (
              <tr>
                <td colSpan={7} className="p-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-white/20 mb-4">
                      <Calendar size={32} />
                    </div>
                    <p className="font-black text-white uppercase tracking-widest">
                      Aucun pointage archivé
                    </p>
                    <p className="text-[10px] font-black text-white/30 uppercase mt-2 tracking-widest">
                      Nexus pointage system v4.0
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
