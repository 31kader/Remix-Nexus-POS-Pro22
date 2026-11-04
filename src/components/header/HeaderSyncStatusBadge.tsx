import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { onBackgroundSyncStatus, flushSyncQueueImmediate } from '../../services/SyncService';
import { cn } from '../../lib/utils';

interface HeaderSyncStatusBadgeProps {
  toast: any;
}

export const HeaderSyncStatusBadge: React.FC<HeaderSyncStatusBadgeProps> = ({ toast }) => {
  const [syncStatus, setSyncStatus] = useState<{ isSyncing: boolean; pendingCount: number }>({
    isSyncing: false,
    pendingCount: 0,
  });
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const unsub = onBackgroundSyncStatus((status) => {
      setSyncStatus((prev) =>
        prev.isSyncing === status.isSyncing && prev.pendingCount === status.pendingCount
          ? prev
          : status
      );
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncClick = () => {
    if (syncStatus.pendingCount > 0) {
      flushSyncQueueImmediate();
      toast.info("Envoi immédiat des modifications locales vers le Cloud...");
    } else {
      window.dispatchEvent(new CustomEvent('force-full-sync'));
      toast.info("Actualisation complète du catalogue depuis Supabase...");
    }
  };

  return (
    <button
      type="button"
      onClick={handleSyncClick}
      className={cn(
        "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border shadow-2xs shrink-0",
        !isOnline
          ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
          : syncStatus.isSyncing || syncStatus.pendingCount > 0
          ? "bg-blue-500/15 border-blue-500/40 text-blue-500 hover:bg-blue-500/25 animate-pulse"
          : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
      )}
      title={
        !isOnline
          ? "Mode Hors-Ligne (IndexedDB actif)"
          : syncStatus.pendingCount > 0
          ? `${syncStatus.pendingCount} modification(s) locale(s) en attente d'envoi`
          : "Synchronisation Cloud active et à jour"
      }
    >
      {!isOnline ? (
        <>
          <CloudOff size={14} className="text-amber-500" />
          <span className="hidden md:inline">Hors-Ligne</span>
        </>
      ) : syncStatus.isSyncing || syncStatus.pendingCount > 0 ? (
        <>
          <RefreshCw size={14} className="animate-spin text-blue-500" />
          <span>{syncStatus.pendingCount}</span>
        </>
      ) : (
        <>
          <Cloud size={14} className="text-emerald-500" />
          <span className="hidden md:inline">Synchro</span>
        </>
      )}
    </button>
  );
};
