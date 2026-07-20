import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Supplier } from '../../../types';
import { cn } from '../../../lib/utils';

interface MonthlyCalendarProps {
  currentCalendarMonth: Date;
  setCurrentCalendarMonth: (d: Date) => void;
  selectedReminderDate: string | null;
  setSelectedReminderDate: (d: string | null) => void;
  calendarDays: { date: Date; isCurrentMonth: boolean }[];
  allReminders: any[];
  suppliers: Supplier[];
  formatDateKey: (d: Date) => string;
}

export function MonthlyCalendar({
  currentCalendarMonth,
  setCurrentCalendarMonth,
  selectedReminderDate,
  setSelectedReminderDate,
  calendarDays,
  allReminders,
  suppliers,
  formatDateKey
}: MonthlyCalendarProps) {
  const activeMonthName = format(currentCalendarMonth, 'MMMM yyyy', { locale: fr });

  return (
    <div className="xl:col-span-5 bg-white/5 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 font-sans">
            <Calendar size={16} className="text-indigo-400 animate-pulse" />
            Calendrier Opérationnel
          </h4>
          <span className="text-[10px] text-slate-400 font-mono uppercase block mt-0.5">Cliquez sur un jour pour voir les détails</span>
        </div>
        
        <div className="flex items-center gap-1 text-white">
          <button 
            type="button"
            onClick={() => {
              setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1));
            }}
            className="p-1 px-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-sm cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider px-2 min-w-[100px] text-center">
            {activeMonthName.replace(/^\w/, c => c.toUpperCase())}
          </span>
          <button 
            type="button"
            onClick={() => {
              setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1));
            }}
            className="p-1 px-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-sm cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Calendrier Grid */}
      <div className="space-y-2">
        {/* Jours de la semaine abreviation */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <span key={day} className="text-[9px] font-black text-slate-400 uppercase tracking-wider py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-white">
          {calendarDays.map((cell, idx) => {
            const cellDateStr = formatDateKey(cell.date);
            const isSelected = selectedReminderDate === cellDateStr;
            
            const cellTodayStr = formatDateKey(new Date());
            const isToday = cellDateStr === cellTodayStr;

            // Reminders on this day (active only)
            const cellReminders = allReminders.filter(r => r.date === cellDateStr && !r.isCompleted);
            
            // Cyclical pre-sale, delivery, payment events for this cell weekday
            const cellDayOfWeek = (cell.date.getDay() + 6) % 7;
            const cellWeekdayName = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][cellDayOfWeek];
            
            const cellPreSales = suppliers.filter(s => s.preSaleDays?.includes(cellWeekdayName));
            const cellDeliveries = suppliers.filter(s => s.deliveryDays?.includes(cellWeekdayName));
            const cellPayments = suppliers.filter(s => s.paymentDays?.includes(cellWeekdayName));
            const activeEventsCount = cellPreSales.length + cellDeliveries.length + cellPayments.length;

            return (
              <button
                key={`${cellDateStr}-${idx}`}
                type="button"
                onClick={() => setSelectedReminderDate(isSelected ? null : cellDateStr)}
                className={cn(
                  "relative p-3 rounded-xl border flex flex-col items-center justify-between min-h-[50px] transition-all group active:scale-95 cursor-pointer",
                  cell.isCurrentMonth 
                    ? isSelected 
                      ? "bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : isToday 
                        ? "bg-indigo-600 border-indigo-500 text-white font-bold" 
                        : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:border-slate-500"
                    : "bg-white/[0.02] border-transparent text-white/30 hover:bg-white/5 hover:border-white/5"
                )}
              >
                <span className="text-xs font-black tracking-widest">{cell.date.getDate()}</span>
                
                <div className="flex gap-0.5 mt-1 items-center justify-center">
                  {cellReminders.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" title={`${cellReminders.length} Rappel(s)`} />
                  )}
                  {activeEventsCount > 0 && (
                    <span className="w-1 h-1 rounded-full bg-amber-400" title={`${activeEventsCount} Actions de Planning`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
