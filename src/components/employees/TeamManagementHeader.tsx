import React from 'react';
import { Calendar, Users, Shield, Printer, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TeamManagementHeaderProps {
  activeSubTab: 'planning' | 'users' | 'permissions';
  setActiveSubTab: (tab: 'planning' | 'users' | 'permissions') => void;
  staffCount: number;
  isOwner: boolean;
  isProcessing: boolean;
  onPrintPlanning: () => void;
  onAddMember: () => void;
  onPurgeAll: () => void;
}

export const TeamManagementHeader: React.FC<TeamManagementHeaderProps> = ({
  activeSubTab,
  setActiveSubTab,
  staffCount,
  isOwner,
  isProcessing,
  onPrintPlanning,
  onAddMember,
  onPurgeAll
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <Calendar size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Planning Hebdomadaire & Gestion de l'Équipe
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Organisez les horaires de roulement (Matin / Soir / Journée / Repos), les accès PIN Caisse et les permissions par rôle
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button 
            type="button"
            onClick={() => setActiveSubTab('planning')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'planning'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Calendar size={14} /> Planning 7 Jours
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('users')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'users'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Users size={14} /> Comptes & PIN ({staffCount})
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('permissions')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'permissions'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Shield size={14} /> Permissions
          </button>
        </div>

        {activeSubTab === 'planning' && (
          <button
            type="button"
            onClick={onPrintPlanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            <Printer size={15} /> Imprimer Planning A4
          </button>
        )}

        <button 
          type="button"
          onClick={onAddMember}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
        >
          <Plus size={16} /> Ajouter Membre
        </button>

        {isOwner && (
          <button 
            type="button"
            onClick={onPurgeAll}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-colors font-bold text-xs cursor-pointer disabled:opacity-50"
            title="Réinitialiser les comptes secondaires"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
