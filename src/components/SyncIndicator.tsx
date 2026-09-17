import React from 'react';
import { RefreshCw, Cloud, CloudOff, AlertCircle, CheckCircle2, Radio, BellRing, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processSyncQueue, getFailedSyncQueue } from '../services/SyncService';

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
  const isSyncing = syncInfo?.active || bgSyncActive;
  const [realtimeStatus, setRealtimeStatus] = React.useState<'connected' | 'reconnecting' | 'idle'>('idle');
  const [cashierAlert, setCashierAlert] = React.useState<{ message: string; from?: string; type?: string } | null>(null);
  const [dlqCount, setDlqCount] = React.useState(0);

  React.useEffect(() => {
    const refreshDlq = () => {
      getFailedSyncQueue().then(items => setDlqCount(items.length)).catch(() => {});
    };
    refreshDlq();

    window.addEventListener('nexus-sync-dlq-alert', refreshDlq);
    return () => window.removeEventListener('nexus-sync-dlq-alert', refreshDlq);
  }, []);

  React.useEffect(() => {
    const handleStatus = (e: any) => {
      if (e.detail?.status) setRealtimeStatus(e.detail.status);
    };
    const handleAlert = (e: any) => {
      if (e.detail) {
        setCashierAlert(e.detail);
        try {
          // Beep d'alerte sonore si disponible
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

    window.addEventListener('nexus-realtime-status', handleStatus);
    window.addEventListener('cashier-alert-received', handleAlert);

    return () => {
      window.removeEventListener('nexus-realtime-status', handleStatus);
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

  const handleManualSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    processSyncQueue();
    window.dispatchEvent(new CustomEvent('force-full-sync'));
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            onClick={handleClick}
            className="flex items-center gap-2.5 px-3.5 py-2 bg-rose-600 dark:bg-rose-700 text-white rounded-2xl shadow-xl shadow-rose-900/30 border border-rose-400/30 cursor-pointer pointer-events-auto hover:bg-rose-500 transition-all active:scale-95 group"
            title="Mode Hors-Ligne actif — Les ventes sont stockées localement en toute sécurité. Cliquer pour ouvrir le Studio."
          >
            <div className="relative">
              <CloudOff size={15} className="animate-pulse text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider leading-none">Hors-Ligne</span>
              <span className="text-[8px] font-bold text-rose-200 uppercase tracking-widest mt-0.5">
                {bgPendingChanges > 0 ? `${bgPendingChanges} vente(s) locales` : 'Base locale active'}
              </span>
            </div>
          </motion.div>
        )}

        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            onClick={handleClick}
            className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white border border-indigo-200 dark:border-indigo-500/30 p-3 rounded-2xl shadow-2xl ring-1 ring-indigo-500/20 flex items-center gap-3 cursor-pointer pointer-events-auto hover:border-indigo-500 transition-all active:scale-95"
            title="Synchronisation en cours... Cliquer pour voir les détails."
          >
            <div className="relative">
              <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col min-w-[120px]">
               <div className="flex items-center justify-between gap-2">
                 <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                   Synchro en cours
                 </span>
                 <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">
                   {Math.round(syncInfo?.progress || 0)}%
                 </span>
               </div>
               <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${syncInfo?.progress || 50}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />
               </div>
            </div>
          </motion.div>
        )}

        {bgPendingChanges > 0 && !isSyncing && isOnline && (
           <motion.div
             onClick={handleClick}
             initial={{ opacity: 0, y: 10, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 10, scale: 0.9 }}
             title="Changements en attente de synchronisation. Cliquer pour ouvrir le Studio."
             className="bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-xl shadow-amber-900/10 cursor-pointer transition-all active:scale-95 pointer-events-auto hover:bg-amber-100 dark:hover:bg-amber-900/80"
           >
              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-wide">
                  {bgPendingChanges} en attente
                </span>
                <span className="text-[8px] font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                  Cliquer pour synchroniser
                </span>
              </div>
              <button
                onClick={handleManualSync}
                className="p-1 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors ml-1"
                title="Forcer la synchronisation immédiate"
              >
                <RefreshCw size={12} className="text-amber-700 dark:text-amber-300" />
              </button>
           </motion.div>
        )}

        {dlqCount > 0 && (
          <motion.div
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-rose-600 text-white border border-rose-400 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-2xl cursor-pointer pointer-events-auto hover:bg-rose-700 transition-colors animate-bounce"
            title={`${dlqCount} élément(s) bloqué(s) dans la file d'échecs. Cliquer pour ouvrir le Studio de Synchro.`}
          >
            <AlertCircle size={15} className="text-white shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {dlqCount} Bloqué{dlqCount > 1 ? 's' : ''} (Studio)
            </span>
          </motion.div>
        )}

        {cashierAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="bg-amber-600 text-white px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 pointer-events-auto border border-amber-400/40"
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

        {isOnline && realtimeStatus === 'connected' && bgPendingChanges === 0 && !isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-wider pointer-events-auto cursor-pointer hover:bg-emerald-500/20 transition-colors shadow-sm"
            title="Realtime Supabase connecté en direct. Vos ventes et stocks sont synchronisés instantanément."
            onClick={handleClick}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Direct</span>
          </motion.div>
        )}

        {isOnline && realtimeStatus === 'reconnecting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-wider pointer-events-auto shadow-sm"
            title="Tentative de reconnexion au serveur temps réel..."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Reconnexion...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
