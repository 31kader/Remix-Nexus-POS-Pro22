import React from 'react';
import { Sparkles, Trash } from 'lucide-react';
import { cn, formatSafe } from '../../../lib/utils';
import { Supplier } from '../../../types';

interface ReminderListProps {
  allReminders: any[];
  reminderFilter: 'all' | 'active' | 'completed';
  setReminderFilter: (f: 'all' | 'active' | 'completed') => void;
  selectedReminderDate: string | null;
  setSelectedReminderDate: (d: string | null) => void;
  handleToggleReminderComplete: (supplierId: string, reminderId: string, completed: boolean) => void;
  handleDeleteReminder: (supplierId: string, reminderId: string) => void;
  suppliers: Supplier[];
  setViewingDetailsSupplier: (s: Supplier) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (v: boolean) => void;
}

export function ReminderList({
  allReminders,
  reminderFilter,
  setReminderFilter,
  selectedReminderDate,
  setSelectedReminderDate,
  handleToggleReminderComplete,
  handleDeleteReminder,
  suppliers,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen
}: ReminderListProps) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
            <Sparkles size={16} /> Liste des Rappels
          </h4>
        </div>
        
        <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl">
          {[
            { id: 'all', label: 'Tout' },
            { id: 'active', label: 'Actifs' },
            { id: 'completed', label: 'Finis' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setReminderFilter(f.id as any)}
              className={cn(
                "px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer",
                reminderFilter === f.id ? "bg-white text-black" : "text-white/40 hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {selectedReminderDate && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-[10px] font-black flex justify-between items-center animate-in slide-in-from-top-2">
          <span>📅 Filtré au : {formatSafe(selectedReminderDate, 'dd MMMM yyyy') || selectedReminderDate}</span>
          <button type="button" onClick={() => setSelectedReminderDate(null)} className="text-rose-450 uppercase underline font-bold text-[9px] cursor-pointer">Enlever filtre</button>
        </div>
      )}

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {(() => {
          const filtered = allReminders
            .filter(r => {
              if (reminderFilter === 'active') return !r.isCompleted;
              if (reminderFilter === 'completed') return r.isCompleted;
              return true;
            })
            .filter(r => !selectedReminderDate || r.date === selectedReminderDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (filtered.length === 0) {
            return (
              <div className="py-12 text-center text-white/20 uppercase text-[10px] font-black tracking-widest border border-dashed border-white/5 rounded-2xl">
                Aucun rappel planifié
              </div>
            );
          }

          return filtered.map(r => {
            const isOverdue = !r.isCompleted && new Date(r.date).getTime() < new Date().setHours(0,0,0,0);
            return (
              <div 
                key={r.id} 
                className={cn(
                  "p-4 rounded-2xl border transition-all flex items-start gap-3 group text-left",
                  r.isCompleted 
                    ? "bg-slate-900/50 border-slate-950/20 opacity-60" 
                    : isOverdue 
                      ? "bg-rose-500/[0.03] border-rose-500/20 text-rose-200" 
                      : "bg-black/20 border-white/5 text-white"
                )}
              >
                <input 
                  type="checkbox"
                  checked={r.isCompleted}
                  onChange={(e) => handleToggleReminderComplete(r.supplierId, r.id, e.target.checked)}
                  className="w-4.5 h-4.5 rounded-md border-white/10 text-indigo-600 bg-black/40 mt-0.5 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-xs font-black uppercase tracking-wider leading-relaxed",
                      r.isCompleted && "line-through text-white/30"
                    )}>
                      {r.title}
                    </p>
                  </div>
                  {r.notes && (
                    <p className="text-[10px] text-white/40 leading-relaxed font-black mt-1 uppercase tracking-wider italic">
                      "{r.notes}"
                    </p>
                  )}
                  <div className="flex flex-wrap items-center mt-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const sup = suppliers.find(s => s.id === r.supplierId);
                        if (sup) {
                          setViewingDetailsSupplier(sup);
                          setActiveDetailsTab('products');
                          setIsDetailsModalOpen(true);
                        }
                      }}
                      className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:underline cursor-pointer"
                    >
                      💼 {r.supplierName}
                    </button>

                    <span className={cn(
                      "text-[9px] font-mono",
                      isOverdue ? "text-rose-400 font-bold" : "text-slate-400"
                    )}>
                      🕒 Échéance: {formatSafe(r.date, 'dd/MM/yy') || r.date} {isOverdue && '(Retardé)'}
                    </span>

                    <span className={cn(
                      "px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-wider border",
                      r.priority === 'high' 
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-455" 
                        : r.priority === 'medium' 
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                          : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                    )}>
                      {r.priority === 'high' ? 'HAUTE' : r.priority === 'medium' ? 'MOYENNE' : 'BASSE'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Voulez-vous supprimer ce rappel ?')) {
                      handleDeleteReminder(r.supplierId, r.id);
                    }
                  }}
                  className="text-white/20 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-4 h-fit cursor-pointer"
                  title="Supprimer ce rappel"
                >
                  <Trash size={12} />
                </button>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
