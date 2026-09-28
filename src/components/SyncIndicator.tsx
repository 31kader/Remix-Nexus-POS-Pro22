import React from 'react';
import { RefreshCw, CloudOff, AlertCircle, BellRing, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processSyncQueue, getFailedSyncQueue } from '../services/SyncService';
import { useCoreStore } from '../store/useCoreStore';

interface SyncIndicatorProps {
  syncInfo: {
    active: boolean;
    progress: number;
    currentTable: string;
  };
  isOnline: boolean;
  bgSyncActive: boolean;
  bgPendingChanges: number;
  onOpenSyncStudio?: () => void;
}

export const SyncIndicator = ({ 
  syncInfo, 
  isOnline, 
  bgSyncActive, 
  bgPendingChanges,
  onOpenSyncStudio
}: SyncIndicatorProps) => {
  const settings = useCoreStore(s => s.settings);
  // Par défaut (true), on active le mode silencieux : aucune notification technique inutile en bas à droite !
  const silentSyncMode = (settings as any)?.silentSyncNotifications !== false;

  const isSyncing = syncInfo?.active || bgSyncActive;
  const [cashierAlert, setCashierAlert] = React.useState<{ message: string; from?: string; type?: string } | null>(null);
  const [dlqCount, setDlqCount] = React.useState(0);
  const [dismissedOffline, setDismissedOffline] = React.useState(false);
  const [dismissedPending, setDismissedPending] = React.useState(false);

  React.useEffect(() => {
    if (isOnline) {
      setDismissedOffline(false);
    }
  }, [isOnline]);

  React.useEffect(() => {
    const refreshDlq = () => {
      getFailedSyncQueue().then(items => setDlqCount(items.length)).catch(() => {});
    };
    refreshDlq();

    window.addEventListener('nexus-sync-dlq-alert', refreshDlq);
    return () => window.removeEventListener('nexus-sync-dlq-alert', refreshDlq);
  }, []);

  React.useEffect(() => {
    const handleAlert = (e: any) => {
      if (e.detail) {
        setCashierAlert(e.detail);
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch (_) {}
      }
    };

    window.addEventListener('cashier-alert-received', handleAlert);
    return () => {
      window.removeEventListener('cashier-alert-received', handleAlert);
    };
  }, []);

  React.useEffect(() => {
    if (cashierAlert) {
      const timer = setTimeout(() => setCashierAlert(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [cashierAlert]);

  React.useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      processSyncQueue().catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleClick = () => {
    if (onOpenSyncStudio) {
      onOpenSyncStudio();
    } else {
      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'sync_studio' }));
      processSyncQueue();
    }
  };

  // En mode silencieux (par défaut), on n'affiche RIEN en bas à droite tant qu'il n'y a pas d'alerte caisse ou de coupure Internet
  if (silentSyncMode && isOnline && !cashierAlert) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {!isOnline && !dismissedOffline && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="flex items-center gap-2.5 px-3.5 py-2 bg-rose-600 text-white rounded-xl shadow-lg border border-rose-400/30 pointer-events-auto transition-all"
            title="Mode Hors-Ligne actif — Les ventes sont stockées localement en toute sécurité."
          >
            <div onClick={handleClick} className="flex items-center gap-2.5 cursor-pointer">
              <CloudOff size={15} className="animate-pulse text-white" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-wider leading-none">Mode Hors-Ligne</span>
                <span className="text-[8px] font-bold text-rose-100 uppercase tracking-widest mt-0.5">
                  {bgPendingChanges > 0 ? `${bgPendingChanges} vente(s) sauvegardées sur PC` : 'Sauvegarde locale active'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDismissedOffline(true); }}
              className="p-1 hover:bg-white/20 rounded-lg ml-1 text-white/80 hover:text-white"
              title="Masquer cette notification"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}

        {!silentSyncMode && isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            onClick={handleClick}
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-indigo-200 dark:border-indigo-500/30 p-3 rounded-xl shadow-md flex items-center gap-3 cursor-pointer pointer-events-auto"
          >
            <RefreshCw size={16} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Synchro Cloud ({Math.round(syncInfo?.progress || 50)}%)
            </span>
          </motion.div>
        )}

        {!silentSyncMode && bgPendingChanges > 0 && !isSyncing && isOnline && !dismissedPending && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-amber-50 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 px-3 py-2 rounded-xl flex items-center gap-2 shadow-md pointer-events-auto"
          >
            <div onClick={handleClick} className="flex items-center gap-2 cursor-pointer">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wide">
                {bgPendingChanges} en attente
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDismissedPending(true)}
              className="p-0.5 hover:bg-amber-200/50 rounded"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}

        {!silentSyncMode && dlqCount > 0 && (
          <motion.div
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-rose-600 text-white border border-rose-400 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md cursor-pointer pointer-events-auto"
          >
            <AlertCircle size={14} className="text-white shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {dlqCount} Bloqué(s)
            </span>
          </motion.div>
        )}

        {cashierAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="bg-amber-600 text-white px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2.5 pointer-events-auto border border-amber-400/40"
          >
            <BellRing size={16} className="animate-bounce shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-200">Alerte Caisse</span>
              <span className="text-xs font-bold leading-tight">{cashierAlert.message}</span>
            </div>
            <button onClick={() => setCashierAlert(null)} className="p-1 hover:bg-white/20 rounded-lg ml-1">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
