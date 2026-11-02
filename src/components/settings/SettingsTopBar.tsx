import React from 'react';
import { Sliders, CheckCircle2, Search, Download, UploadCloud, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createBackupArchive, restoreBackupArchive } from '../../services/backupRestoreService';

export interface SettingsTopBarProps {
  quickSearch: string;
  setQuickSearch: (value: string) => void;
  isSaving: boolean;
  onSave: (e?: React.FormEvent) => Promise<void>;
}

export const SettingsTopBar: React.FC<SettingsTopBarProps> = ({
  quickSearch,
  setQuickSearch,
  isSaving,
  onSave
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
          <Sliders size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Paramètres Généraux & Configuration POS
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 size={11} /> v1.2.59
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Personnalisez l'identité fiscale de votre magasin, le comportement de la caisse, vos imprimantes et la sécurité Cloud
          </p>
        </div>
      </div>

      {/* Actions Globales : Recherche Rapide + Backup + Enregistrer */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[230px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={quickSearch}
            onChange={e => setQuickSearch(e.target.value)}
            placeholder="Rechercher un réglage (TVA, NIF, Tiroir...)"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={() => createBackupArchive()}
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
          title="Télécharger une sauvegarde complète .nexus-backup"
        >
          <Download size={14} className="text-emerald-500" />
          <span>Backup</span>
        </button>

        <label
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
          title="Restaurer une archive .nexus-backup"
        >
          <UploadCloud size={14} className="text-indigo-500" />
          <span>Restaurer</span>
          <input
            type="file"
            accept=".json,.nexus-backup"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (file) {
                await restoreBackupArchive(file);
                e.target.value = '';
              }
            }}
          />
        </label>

        <button
          disabled={isSaving}
          onClick={() => onSave()}
          className={cn(
            "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer",
            isSaving && "opacity-60 cursor-not-allowed"
          )}
        >
          <Save size={15} />
          <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
        </button>
      </div>
    </div>
  );
};
