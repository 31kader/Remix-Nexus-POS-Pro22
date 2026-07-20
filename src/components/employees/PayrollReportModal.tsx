import React from 'react';
import { DollarSign, Printer, Send } from 'lucide-react';
import { Employee, CompanySettings } from '../../types';
import { Modal } from '../ui';

interface PayrollReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  salaryEmployeeId: string;
  setSalaryEmployeeId: (id: string) => void;
  computedPayroll: any;
  bonusAmount: number;
  setBonusAmount: (amount: number) => void;
  bonusReason: string;
  setBonusReason: (reason: string) => void;
  penaltyAmount: number;
  setPenaltyAmount: (amount: number) => void;
  penaltyReason: string;
  setPenaltyReason: (reason: string) => void;
  handlePrintPayslip: () => void;
  handleWhatsAppShare: () => void;
  settings: CompanySettings;
}

export function PayrollReportModal({
  isOpen,
  onClose,
  employees,
  selectedMonth,
  setSelectedMonth,
  salaryEmployeeId,
  setSalaryEmployeeId,
  computedPayroll,
  bonusAmount,
  setBonusAmount,
  bonusReason,
  setBonusReason,
  penaltyAmount,
  setPenaltyAmount,
  penaltyReason,
  setPenaltyReason,
  handlePrintPayslip,
  handleWhatsAppShare,
  settings
}: PayrollReportModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="RAPPORT DU PERSONNEL & BULLETIN DE PAIE"
    >
      <div className="p-2 space-y-6 text-white text-left animate-fade-in">
        <div className="p-6 bg-white/5 rounded-[1.8rem] border border-white/10 space-y-4">
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Configuration du Salarié</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Salarié à auditer</label>
              <select 
                className="w-full bg-black border border-white/10 rounded-xl p-4 text-[11px] font-black text-white uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                value={salaryEmployeeId}
                onChange={e => {
                  setSalaryEmployeeId(e.target.value);
                  setBonusAmount(0);
                  setBonusReason('');
                  setPenaltyAmount(0);
                  setPenaltyReason('');
                }}
              >
                {employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Mois audité</label>
              <input 
                type="month"
                className="w-full bg-black border border-white/10 rounded-xl p-4 text-[11px] font-black text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </div>

        {computedPayroll ? (
          <div className="space-y-6">
            {/* Statistics bento grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">Présences</p>
                <p className="text-lg font-black text-emerald-400 tracking-tighter">{computedPayroll.workedDays} <span className="text-[9px] text-white/30 font-bold">Jours</span></p>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">Heures Travaillées</p>
                <p className="text-lg font-black text-indigo-400 tracking-tighter">{computedPayroll.totalHoursWorked.toFixed(1)} <span className="text-[9px] text-white/30 font-bold">H</span></p>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">Retards Enregistrés</p>
                <p className="text-lg font-black text-rose-500 tracking-tighter">{computedPayroll.latenessCount} <span className="text-[9px] text-white/30 font-bold">Retard(s)</span></p>
              </div>
            </div>

            {/* Adjustments: Adds custom prime and deduction */}
            <div className="p-6 bg-white/[0.02] rounded-[1.8rem] border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 leading-none">Ajustements Manuels Éphémères</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bonus Column */}
                <div className="space-y-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Ajouter un Gain +</p>
                  <input 
                    type="number"
                    placeholder="Montant prime"
                    min="0"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-black text-white uppercase outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    value={bonusAmount || ''}
                    onChange={e => setBonusAmount(parseFloat(e.target.value) || 0)}
                  />
                  <input 
                    type="text"
                    placeholder="Motif (ex: Prime de nuit)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-medium text-white/80 outline-none focus:ring-1 focus:ring-emerald-500 transition-all uppercase placeholder:text-white/20"
                    value={bonusReason}
                    onChange={e => setBonusReason(e.target.value)}
                  />
                </div>
                
                {/* Penalty Column */}
                <div className="space-y-3 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Appliquer une Retenue -</p>
                  <input 
                    type="number"
                    placeholder="Montant retenue"
                    min="0"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-black text-white uppercase outline-none focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                    value={penaltyAmount || ''}
                    onChange={e => setPenaltyAmount(parseFloat(e.target.value) || 0)}
                  />
                  <input 
                    type="text"
                    placeholder="Motif (ex: Retenue absence)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-medium text-white/80 outline-none focus:ring-1 focus:ring-rose-500 transition-all uppercase placeholder:text-white/20"
                    value={penaltyReason}
                    onChange={e => setPenaltyReason(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Salary breakdown card */}
            <div className="p-6 bg-black/60 rounded-[1.8rem] border border-white/10 space-y-4">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Calculateur de Paie en direct</p>
              
              <div className="space-y-3 text-[11px] font-black uppercase tracking-widest">
                <div className="flex justify-between text-white/50">
                  <span>Salaire de base calculé :</span>
                  <span className="font-mono text-white">{computedPayroll.calculatedSalary.toFixed(2)} {settings.currency}</span>
                </div>
                {bonusAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>(+) Primes & Bonus :</span>
                    <span className="font-mono">{bonusAmount.toFixed(2)} {settings.currency}</span>
                  </div>
                )}
                {computedPayroll.advancesTotal > 0 && (
                  <div className="flex justify-between text-rose-400/80">
                    <span>(-) Acomptes perçus (Automatique) :</span>
                    <span className="font-mono">-{computedPayroll.advancesTotal.toFixed(2)} {settings.currency}</span>
                  </div>
                )}
                {penaltyAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>(-) Retenues diverses :</span>
                    <span className="font-mono">-{penaltyAmount.toFixed(2)} {settings.currency}</span>
                  </div>
                )}
                
                <div className="pt-4 border-t border-white/10 flex justify-between items-center bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                  <span className="text-indigo-300 text-[10px]">SOLDE NET A RETIRER :</span>
                  <span className="text-xl font-black text-indigo-400 tracking-tighter font-mono">
                    {(computedPayroll.calculatedSalary + bonusAmount - (computedPayroll.advancesTotal + penaltyAmount)).toFixed(2)} {settings.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Print and WhatsApp trigger controls */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handlePrintPayslip}
                className="flex items-center justify-center gap-3 py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-neutral-200 transition-all active:scale-[0.98] shadow-lg cursor-pointer"
              >
                <Printer size={16} /> IMPRIMER RAPPORT (PDF)
              </button>

              <button 
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-3 py-5 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:scale-102 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 border border-emerald-500/20 cursor-pointer"
              >
                <Send size={16} /> PARTAGER WHATSAPP
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center font-black text-white/30 text-[11px] uppercase py-8 tracking-widest">Échec du chargement du bulletin de paie.</p>
        )}

        <button 
          onClick={onClose}
          className="w-full py-4 text-white/40 hover:text-white text-[10px] uppercase font-black tracking-widest bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 cursor-pointer"
        >
          Fermer le Panneau
        </button>
      </div>
    </Modal>
  );
}
