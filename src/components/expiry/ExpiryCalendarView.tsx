import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, isSameDay, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface ExpiryCalendarViewProps {
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  calendarDays: Date[];
  analyzedProducts: any[];
  now: Date;
}

export function ExpiryCalendarView({
  currentMonth,
  setCurrentMonth,
  calendarDays,
  analyzedProducts,
  now
}: ExpiryCalendarViewProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-white uppercase tracking-tighter">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(prev => addDays(startOfMonth(prev), -1))}
            className="p-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}
            className="p-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} className="bg-black/40 p-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest underline decoration-indigo-500/10 underline-offset-8">
            {day}
          </div>
        ))}
        {calendarDays.map((day, i) => {
          const dayProducts = analyzedProducts.filter(p => isSameDay(p.expiryDate, day));
          const isToday = isSameDay(day, now);
          
          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[140px] bg-slate-900/40 p-3 flex flex-col gap-1 transition-all hover:bg-white/5 group/day",
                !isSameMonth(day, currentMonth) && "opacity-20",
                isToday && "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-xs font-black",
                  isToday ? "text-indigo-400" : "text-white/40"
                )}>
                  {format(day, 'd')}
                </span>
                {dayProducts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse hidden group-hover/day:block" />
                )}
              </div>
              
              <div className="space-y-1">
                {dayProducts.slice(0, 4).map(p => (
                  <div 
                    key={p.id}
                    className={cn(
                      "text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded border truncate cursor-default transition-all hover:scale-105",
                      p.expiryStatus === 'expired' ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                      p.expiryStatus === 'critical' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    )}
                    title={`${p.name} (${p.stock} unités)`}
                  >
                    {p.name.substring(0, 10)}...
                  </div>
                ))}
                {dayProducts.length > 4 && (
                  <div className="text-[7px] text-white/20 font-black text-center pt-1">+ {dayProducts.length - 4} autres</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
