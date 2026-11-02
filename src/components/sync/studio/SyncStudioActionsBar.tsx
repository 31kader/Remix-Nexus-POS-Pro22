import React from 'react';
import { 
  Cloud, CloudOff, RefreshCw, Download, Trash2, ShieldAlert, Activity, Database, CheckCircle2 
} from 'lucide-react';

interface SyncStudioActionsBarProps {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncTime: string | null;
  authStatus: 'checking' | 'ok' | 'unauthorized' | 'error';
  authErrorMessage: string;
  checkSupabaseAuth: () => void;
  handleTriggerSync: () => Promise<void>;
  handleExportBackup: () => Promise<void>;
  handleClearQueue: () => void;
  mainTab: 'queue' | 'diagnostics';
  setMainTab: (t: 'queue' | 'diagnostics') => void;
  diagnosticCount: number;
}

export function SyncStudioActionsBar({
  isOnline,
  isSyncing,
  queueLength,
  lastSyncTime,
  authStatus,
  authErrorMessage,
  checkSupabaseAuth,
  handleTriggerSync,
  handleExportBackup,
  handleClearQueue,
  mainTab,
  setMainTab,
  diagnosticCount
}: SyncStudioActionsBarProps) {
  return (
    <div className="space-y-4">
      {/* Alerte Auth Supabase si erreur ou 401 */}
      {authStatus !== 'ok' && authStatus !== 'checking' && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
          authStatus === 'unauthorized' 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="shrink-0" />
            <div>
              <p className="font-bold">
                {authStatus === 'unauthorized' ? "Authentification requise pour la synchronisation" : "Erreur de connexion Supabase"}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">{authErrorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={checkSupabaseAuth}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold shrink-0 cursor-pointer"
          >
            Tester l'accès
          </button>
        </div>
      )}

      {/* Header Cartes Statut & Boutons */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {isOnline ? <Cloud size={24} /> : <CloudOff size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Studio de Synchronisation
              </h2>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                isOnline 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {queueLength === 0 
                ? "Toutes les modifications locales sont synchronisées avec le cloud Supabase."
                : `${queueLength} opération(s) en attente dans la file IndexedDB.`}
              {lastSyncTime && ` (Dernière synchro : ${lastSyncTime})`}
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exporter une sauvegarde JSON complète de la base locale"
          >
            <Download size={14} />
            <span>Sauvegarde</span>
          </button>

          {queueLength > 0 && (
            <button
              type="button"
              onClick={handleClearQueue}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Vider la file d'attente IndexedDB"
            >
              <Trash2 size={14} />
              <span>Vider</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSyncing || !isOnline}
            onClick={handleTriggerSync}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Synchronisation..." : "Synchroniser"}</span>
          </button>
        </div>
      </div>

      {/* Onglets : File d'attente vs Console Diagnostic F12 */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => setMainTab('queue')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'queue'
              ? 'bg-indigo-600 text-white shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database size={15} />
          <span>File d'Attente IndexedDB</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            mainTab === 'queue' ? 'bg-indigo-950/60 text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {queueLength}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('diagnostics')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'diagnostics'
              ? 'bg-indigo-600 text-white shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity size={15} />
          <span>Console Diagnostic (F12)</span>
          {diagnosticCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {diagnosticCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
