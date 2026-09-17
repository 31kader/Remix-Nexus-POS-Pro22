import React, { useState } from 'react';
import { Customer } from '../types';
import { useTranslation } from '../translations';
import { Cake, Heart, Coffee, AlertTriangle, NotebookText, Plus } from 'lucide-react';
import { cn, formatSafe, parseCashierNotes } from '../lib/utils';

interface CustomerProfileProps {
  customer: Customer | null;
  onAddNote: (note: string) => void;
  hideHeader?: boolean;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer, onAddNote, hideHeader = false }) => {
  const { t, isRtl } = useTranslation();
  const [newNote, setNewNote] = useState('');

  const displayName = customer?.name?.trim() || 'Client sans nom';
  const initials = displayName.slice(0, 2).toUpperCase();
  const alerts = Array.isArray(customer?.alerts) ? customer.alerts : [];
  const favoriteItems = Array.isArray(customer?.favoriteItems) ? customer.favoriteItems : [];
  const cashierNotes = parseCashierNotes(customer?.cashierNotes || (customer as any)?.cashier_notes);

  if (!customer) {
    return (
      <div className="bg-slate-100 dark:bg-industrial-900 border border-slate-200 dark:border-industrial-800 rounded-3xl p-6 shadow-sm dark:shadow-2xl">
        <p className="text-sm text-slate-500 dark:text-white/60">Aucun client sélectionné.</p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "bg-slate-100/80 dark:bg-industrial-900 border border-slate-200 dark:border-industrial-800 rounded-3xl p-6 shadow-sm dark:shadow-2xl space-y-6",
        isRtl ? "text-right" : "text-left"
      )} 
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {!hideHeader && (
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl border border-indigo-200 dark:border-indigo-500/20 shadow-inner">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
            <p className="text-sm text-slate-500 dark:text-white/40">
              {t("Client depuis")}: {customer.joinDate || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            <span className="font-bold text-xs uppercase tracking-widest">{t("Alertes")}</span>
          </div>
          <ul className="list-disc list-inside text-xs text-red-700/80 dark:text-red-200/60">
            {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-industrial-800 p-4 rounded-2xl border border-slate-200 dark:border-transparent">
          <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase mb-1">{t("Produits favoris")}</p>
          <div className="flex flex-wrap gap-2">
            {favoriteItems.map(item => (
              <span key={item} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-200 dark:border-transparent">{item}</span>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-industrial-800 p-4 rounded-2xl border border-slate-200 dark:border-transparent">
          <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase mb-1">{t("Anniversaire")}</p>
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <Cake size={16} className="text-amber-500 dark:text-amber-400" />
            5 {t("jours")}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2"><NotebookText size={16} /> {t("Notes caissier")}</h3>
          <button className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline cursor-pointer" onClick={() => { onAddNote(newNote); setNewNote(''); }}>{t("Ajouter")}</button>
        </div>
        <div className="space-y-2">
          {cashierNotes.map((n, i) => (
            <div key={i} className="text-xs text-slate-700 dark:text-white/60 bg-white dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/5">
              {n.note} <span className="text-slate-400 dark:text-white/20 ml-2">({n.author})</span>
            </div>
          ))}
          <input 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t("Ajouter une note...")}
            className="w-full bg-white dark:bg-industrial-800 p-3 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-industrial-500 outline-none border border-slate-200 dark:border-industrial-700 focus:border-indigo-500 transition-all" 
          />
        </div>
      </div>
    </div>
  );
};
