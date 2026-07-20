import React from 'react';
import { Plus } from 'lucide-react';
import { Supplier } from '../../../types';

interface ReminderFormProps {
  newReminderData: {
    supplierId: string;
    title: string;
    notes: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
  };
  setNewReminderData: React.Dispatch<React.SetStateAction<{
    supplierId: string;
    title: string;
    notes: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
  }>>;
  handleAddReminder: (e: React.FormEvent) => void;
  suppliers: Supplier[];
}

export function ReminderForm({
  newReminderData,
  setNewReminderData,
  handleAddReminder,
  suppliers
}: ReminderFormProps) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-md">
      <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2 font-sans">
        <Plus size={16} /> Planifier un Rappel
      </h4>

      <form onSubmit={handleAddReminder} className="space-y-4 text-left">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fournisseur Associé *</label>
          <select 
            required
            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-white"
            value={newReminderData.supplierId}
            onChange={e => setNewReminderData({ ...newReminderData, supplierId: e.target.value })}
          >
            <option value="" className="text-black">SÉLECTIONNEZ LE PARTENAIRE...</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id} className="text-black">{s.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Titre du Rappel *</label>
          <input 
            required
            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-white uppercase tracking-wider font-bold"
            placeholder="EX: RÉGLER SOLDE FACTURE, RETOURNER PRODUITS..."
            value={newReminderData.title}
            onChange={e => setNewReminderData({ ...newReminderData, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Échéance *</label>
            <input 
              required
              type="date"
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-white"
              value={newReminderData.date}
              onChange={e => setNewReminderData({ ...newReminderData, date: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priorité</label>
            <select
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-white"
              value={newReminderData.priority}
              onChange={e => setNewReminderData({ ...newReminderData, priority: e.target.value as any })}
            >
              <option value="low" className="text-black">🔴 PRIORITÉ BASSE</option>
              <option value="medium" className="text-black">🟡 PRIORITÉ MOYENNE</option>
              <option value="high" className="text-black">🟢 PRIORITÉ HAUTE</option>
            </select>
          </div>
        </div>

        <div className="space-y-1 block">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Consignes & Notes de Rappel</label>
          <textarea 
            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-white min-h-[60px]"
            placeholder="Consignes particulières ou détails..."
            value={newReminderData.notes}
            onChange={e => setNewReminderData({ ...newReminderData, notes: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg cursor-pointer"
        >
          💾 Enregistrer l'Action de Planning
        </button>
      </form>
    </div>
  );
}
