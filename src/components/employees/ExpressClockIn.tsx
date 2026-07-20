import React from 'react';
import { motion } from 'motion/react';
import { Clock, LogOut, LogIn } from 'lucide-react';
import { Employee, AttendanceRecord } from '../../types';
import { cn } from '../../lib/utils';

interface ExpressClockInProps {
  employees: Employee[];
  todayRecords: AttendanceRecord[];
  handleClockOut: (id: string) => Promise<void>;
  handleExpressClockIn: (employeeId: string) => Promise<void>;
}

export function ExpressClockIn({
  employees,
  todayRecords,
  handleClockOut,
  handleExpressClockIn
}: ExpressClockInProps) {
  return (
    <div className="border border-white/5 bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
         <Clock className="text-indigo-400 rotate-12 w-[160px] h-[160px]" />
      </div>
      
      <div className="flex items-center gap-6 mb-10 relative z-10">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-neon-indigo/20">
          <Clock size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">Pointage Digital<span className="text-indigo-500">.nexus</span></h3>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">Real-time attendance tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 relative z-10">
        {employees.map(emp => {
          const activeRecord = todayRecords.find(r => r.employeeId === emp.id && !r.clockOut);
          const isClockedIn = !!activeRecord;

          return (
            <motion.button
              key={emp.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => isClockedIn ? handleClockOut(activeRecord!.id) : handleExpressClockIn(emp.id)}
              className={cn(
                "p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all border group shadow-xl cursor-pointer",
                isClockedIn 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 shadow-rose-500/5"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/5"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-lg",
                isClockedIn ? "bg-rose-500/20 border-rose-400/20 text-rose-300" : "bg-emerald-500/20 border-emerald-400/20 text-emerald-300"
              )}>
                {isClockedIn ? <LogOut size={28} /> : <LogIn size={28} />}
              </div>
              <div className="text-center w-full">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{isClockedIn ? 'Sortie' : 'Entrée'}</p>
                <p className="text-[11px] font-black uppercase tracking-widest truncate w-full">{emp.name}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
