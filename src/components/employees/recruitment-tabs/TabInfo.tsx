import React from 'react';
import { motion } from 'motion/react';
import { UserCog } from 'lucide-react';
import { CompanySettings } from '../../../types';

interface TabInfoProps {
  formData: any;
  setFormData: (fd: any) => void;
  settings: CompanySettings;
  setRecruitmentTab: (tab: 'info' | 'identity' | 'contract') => void;
}

export function TabInfo({
  formData,
  setFormData,
  settings,
  setRecruitmentTab
}: TabInfoProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-white animate-fade-in">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Nom Complet *</label>
          <input required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 hover:border-white/20 transition-all text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Rôle Système *</label>
          <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 hover:border-white/20 transition-all cursor-pointer text-xs" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
            <option value="cashier" className="text-black">CAISSIER</option>
            <option value="manager" className="text-black">MANAGER</option>
            <option value="admin" className="text-black">ADMINISTRATEUR</option>
            <option value="delivery" className="text-black">LIVREUR</option>
            <option value="picker" className="text-black">RAMASSEUR</option>
            <option value="camera_agent" className="text-black">AGENT CAMÉRA</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Email Professionnel *</label>
          <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black lowercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 hover:border-white/20 transition-all text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Téléphone *</label>
          <input required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 hover:border-white/20 transition-all text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Date d'Arrivée</label>
          <input type="date" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 hover:border-white/20 transition-all text-xs" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Statut Nexus</label>
          <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 hover:border-white/20 transition-all cursor-pointer text-xs" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
            <option value="active" className="text-black font-semibold">ACTIF</option>
            <option value="inactive" className="text-black font-semibold">INACTIF</option>
          </select>
        </div>
      </div>

      <div className="p-8 bg-emerald-500/[0.02] rounded-[2rem] border border-emerald-500/10 space-y-6 relative overflow-hidden">
         <div className="flex items-center gap-3 text-emerald-400 mb-2 relative z-10 font-black">
            <UserCog size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Rémunération & Contrat (Nexus Payroll)</span>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 w-full">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Type de Salaire</label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 hover:border-white/20 transition-all cursor-pointer text-xs" 
                value={formData.salaryType} 
                onChange={e => setFormData({...formData, salaryType: e.target.value as any})}
              >
                <option value="monthly" className="text-black font-semibold">MENSUEL FIXE</option>
                <option value="hourly" className="text-black font-semibold">TAUX HORAIRE</option>
                <option value="daily" className="text-black font-semibold">TAUX JOURNALIER</option>
              </select>
            </div>
            
            {formData.salaryType === 'monthly' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Salaire de Base Mensuel ({settings.currency})</label>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-mono uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 hover:border-white/20 transition-all text-xs" 
                  value={formData.baseSalary} 
                  onChange={e => setFormData({...formData, baseSalary: parseFloat(e.target.value) || 0})} 
                />
              </div>
            )}

            {formData.salaryType === 'hourly' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Taux Horaire ({settings.currency}/Heure)</label>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-mono uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 hover:border-white/20 transition-all text-xs" 
                  value={formData.hourlyRate} 
                  onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})} 
                />
              </div>
            )}

            {formData.salaryType === 'daily' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Taux Journalier ({settings.currency}/Jour)</label>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-mono uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 hover:border-white/20 transition-all text-xs" 
                  value={formData.dailyRate} 
                  onChange={e => setFormData({...formData, dailyRate: parseFloat(e.target.value) || 0})} 
                />
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] pointer-events-none rounded-full -mr-16 -mt-16" />
      </div>

       <div className="flex justify-between items-center pt-4 border-t border-white/10 gap-3">
         <button
           type="submit"
           className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg cursor-pointer"
         >
           Enregistrer sans doc.
         </button>
         <button
           type="button"
           onClick={() => setRecruitmentTab('identity')}
           className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg cursor-pointer"
         >
           Suivant : Pièce d'Identité ➔
         </button>
       </div>
    </motion.div>
  );
}
