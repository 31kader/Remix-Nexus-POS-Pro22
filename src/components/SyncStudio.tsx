import React from 'react';
import { useSyncStudioLogic } from './sync/studio/useSyncStudioLogic';
import { SyncStudioActionsBar } from './sync/studio/SyncStudioActionsBar';
import { SyncStudioQueueTable } from './sync/studio/SyncStudioQueueTable';
import { DiagnosticMonitorTab } from './sync/DiagnosticMonitorTab';
import { useCoreStore } from '../store/useCoreStore';
import { localDb } from '../services/LocalDatabase';
import { CompanySettings } from '../types';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

interface SyncStudioProps {
  setActiveTab?: (tab: string) => void;
}

export const SyncStudio: React.FC<SyncStudioProps> = ({ setActiveTab }) => {
  const settings = useCoreStore(s => s.settings);
  const {
    mainTab,
    setMainTab,
    diagnosticCount,
    queue,
    isOnline,
    isSyncing,
    lastSyncTime,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    expandedItemId,
    setExpandedItemId,
    authStatus,
    authErrorMessage,
    failedQueue,
    checkSupabaseAuth,
    handleTriggerSync,
    handleClearQueue,
    handleClearFailedQueue,
    handleRetryFailedItem,
    handleRetryAllFailed,
    handleExportBackup,
    filteredQueue
  } = useSyncStudioLogic();

  const handleToggleSilentNotifications = async () => {
    const current = settings?.silentSyncNotifications !== false;
    const nextVal = !current;
    const updated: CompanySettings = { ...settings, silentSyncNotifications: nextVal };
    useCoreStore.getState().setSettings(updated);
    await localDb.insert('settings/company', updated);
    toast.success(nextVal ? 'Notifications en bas à droite masquées (Mode Silencieux)' : 'Notifications de synchronisation réactivées');
  };

  const handleHideStudio = async () => {
    const updated: CompanySettings = { ...settings, hideSyncStudioInSidebar: true };
    useCoreStore.getState().setSettings(updated);
    await localDb.insert('settings/company', updated);
    toast.success('Studio de Synchro masqué du menu latéral (réactivable dans Paramètres > Sécurité)');
    if (setActiveTab) setActiveTab('settings');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Bandeau Pilote Automatique & Préférences */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              Pilote Automatique Cloud Actif
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">100% Auto</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Toutes vos opérations sont synchronisées en tâche de fond avec Supabase. Ce studio sert d'outil de contrôle et d'inspection.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleSilentNotifications}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              settings?.silentSyncNotifications !== false
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700"
            }`}
          >
            {settings?.silentSyncNotifications !== false
              ? "🔕 Notifications : Silencieux"
              : "🔔 Notifications : Visibles"}
          </button>

          <button
            type="button"
            onClick={handleHideStudio}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:border-indigo-500 transition-all cursor-pointer"
          >
            👁️ Masquer du menu latéral
          </button>
        </div>
      </div>

      {/* Barre d'Actions & Sélecteur d'onglets */}
      <SyncStudioActionsBar
        isOnline={isOnline}
        isSyncing={isSyncing}
        queueLength={queue.length}
        lastSyncTime={lastSyncTime}
        authStatus={authStatus}
        authErrorMessage={authErrorMessage}
        checkSupabaseAuth={checkSupabaseAuth}
        handleTriggerSync={handleTriggerSync}
        handleExportBackup={handleExportBackup}
        handleClearQueue={handleClearQueue}
        mainTab={mainTab}
        setMainTab={setMainTab}
        diagnosticCount={diagnosticCount}
      />

      {/* Vue Onglet Actif */}
      {mainTab === 'diagnostics' ? (
        <DiagnosticMonitorTab />
      ) : (
        <SyncStudioQueueTable
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredQueue={filteredQueue}
          expandedItemId={expandedItemId}
          setExpandedItemId={setExpandedItemId}
          failedQueue={failedQueue}
          handleRetryFailedItem={handleRetryFailedItem}
          handleRetryAllFailed={handleRetryAllFailed}
          handleClearFailedQueue={handleClearFailedQueue}
        />
      )}
    </div>
  );
};

export default SyncStudio;
