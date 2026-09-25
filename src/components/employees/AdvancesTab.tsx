import React, { useState, memo } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, Plus, Check, X
} from 'lucide-react';
import { format } from 'date-fns';
import { localDb } from '../../services/LocalDatabase';
import { Employee, AdvanceRecord, CompanySettings } from '../../types';
import { Card, Modal } from '../ui';
import { cn, generateUniqueId } from '../../lib/utils';
import { toast } from 'sonner';

export const AdvancesTab = memo(function AdvancesTab({ advances, employees, settings }: { advances: AdvanceRecord[], employees: Employee[], settings: CompanySettings }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newId = generateUniqueId();
      await localDb.insert(`advances/${newId}`, {
        id: newId,
        employeeId: formData.employeeId,
        amount: formData.amount,
        date: formData.date,
        reason: formData.reason,
        status: 'pending'
      });
      setIsModalOpen(false);
      setFormData({ employeeId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), reason: '' });
      toast.success("Demande d'acompte enregistrée avec succès !");
    } catch (error: any) {
      toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'paid' | 'rejected') => {
    try {
      await localDb.update(`advances/${id}`, { status });
      toast.success(`Statut de l'acompte mis à jour (${status}) !`);
    } catch (error: any) {
      toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 text-left"
    >
      <div className="flex items-center justify-between bg-white/[0.02] p-5 rounded-xl border border-white/5">
        <div>
          <h4 className="font-black text-white  uppercase tracking-wider flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-400" />
            Gestion des Acomptes
          </h4>
          <p className="text-[10px] font-black text-white/30 tracking-normal mt-1 uppercase">EMPLOYEE ADVANCE PAYMENTS</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-xs/20 active:scale-95 group"
        >
          <Plus size={18} /> NOUVELLE DEMANDE
        </button>
      </div>

      <Card className="overflow-hidden border-white/5 bg-white/5  rounded-xl shadow-md">
        <div className="overflow-x-auto font-black text-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-white/30 uppercase border-b border-white/5">
                <th className="p-6 text-[10px] font-black tracking-normal">EMPLOYÉ</th>
                <th className="p-6 text-[10px] font-black tracking-normal">DATE</th>
                <th className="p-6 text-[10px] font-black tracking-normal text-right">MONTANT</th>
                <th className="p-6 text-[10px] font-black tracking-normal">MOTIF</th>
                <th className="p-6 text-[10px] font-black tracking-normal">STATUT</th>
                <th className="p-6 text-[10px] font-black tracking-normal text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {advances.map((record, idx) => {
                const emp = employees.find(e => e.id === record.employeeId);
                return (
                  <motion.tr 
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-6 font-black text-[11px] text-white uppercase tracking-widest">{emp?.name || 'Inconnu'}</td>
                    <td className="p-6 text-[11px] text-white/60 font-black tracking-widest">{record.date}</td>
                    <td className="p-6 text-right">
                      <span className="text-lg font-black text-white tracking-tighter">{record.amount.toFixed(2)}</span>
                       <span className="text-[10px] font-black text-white/20 ml-1 uppercase">{settings.currency}</span>
                    </td>
                    <td className="p-6 text-[11px] text-white/60 max-w-[200px] truncate font-black tracking-widest  opacity-40 uppercase">{record.reason || 'SANS MOTIF'}</td>
                    <td className="p-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-normal border shadow-xl flex items-center gap-2 w-fit",
                        record.status === 'paid' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        record.status === 'approved' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", record.status === 'paid' ? "bg-emerald-400" : record.status === 'approved' ? "bg-indigo-400" : "bg-amber-400")} />
                        {record.status === 'approved' ? 'APPROUVÉ' : record.status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {record.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                           <button onClick={() => updateStatus(record.id, 'approved')} className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all shadow-lg active:scale-95"><Check size={18} /></button>
                           <button onClick={() => updateStatus(record.id, 'rejected')} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all shadow-lg active:scale-95"><X size={18} /></button>
                        </div>
                      )}
                      {record.status === 'approved' && (
                        <div className="flex justify-end gap-2">
                           <button 
                              onClick={() => updateStatus(record.id, 'paid')}
                              className="px-6 py-2 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                           >
                              MARQUER PAYÉ
                           </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {advances.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-20 text-center text-white/20">
                      <DollarSign className="mx-auto mb-4 opacity-10 w-12 h-12" />
                      <p className="font-black text-sm uppercase tracking-widest">Aucun acompte enregistré</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Demander un Acompte">
        <form onSubmit={handleSubmit} className="p-2 space-y-8 text-white">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Employé Bénéficiaire *</label>
            <select required className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
              <option value="">Sélectionner un employé</option>
              {(employees || []).filter(Boolean).map(e => <option key={e.id} value={e.id} className="text-black">{String(e.name || 'EMPLOYÉ').toUpperCase()}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Montant ({settings.currency}) *</label>
              <input type="number" required min="0" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Date de Valeur</label>
              <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Justification / Motif</label>
            <textarea className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-32" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-normal rounded-xl shadow-xs/20 hover:bg-indigo-500 transition-all active:scale-[0.98]">
            ENREGISTRER LA DEMANDE
          </button>
        </form>
      </Modal>
    </motion.div>
  );
});
