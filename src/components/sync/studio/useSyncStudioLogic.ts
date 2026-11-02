import { useState, useEffect, useMemo } from 'react';
import { 
  loadPendingSyncQueue, 
  processSyncQueue, 
  clearSyncQueue, 
  onBackgroundSyncStatus, 
  SyncPayload, 
  getFailedSyncQueue, 
  clearFailedSyncQueue, 
  retryFailedSyncItem, 
  retryAllFailedSyncItems 
} from '../../../services/SyncService';
import { createBackupArchive } from '../../../services/backupRestoreService';
import { supabase } from '../../../services/SupabaseSync';
import { isSupabaseConfigured } from '../../../supabase';
import { toast } from 'sonner';
import { diagnosticService } from '../../../services/DiagnosticLogService';

export function useSyncStudioLogic() {
  const [mainTab, setMainTab] = useState<'queue' | 'diagnostics'>('queue');
  const [diagnosticCount, setDiagnosticCount] = useState<number>(0);
  const [queue, setQueue] = useState<SyncPayload[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'transactions' | 'products' | 'customers' | 'adjustments'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'ok' | 'unauthorized' | 'error'>('checking');
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('');
  const [failedQueue, setFailedQueue] = useState<any[]>([]);

  const refreshFailedQueue = async () => {
    try {
      const items = (await getFailedSyncQueue()) || [];
      setFailedQueue(prev => (prev.length === items.length && prev.every((x, i) => x?.opId === items[i]?.opId && x?.recordId === items[i]?.recordId)) ? prev : items);
    } catch (_) {}
  };

  const refreshQueue = () => {
    try {
      const items = loadPendingSyncQueue() || [];
      setQueue(prev => (prev.length === items.length && prev.every((x, i) => x?.opId === items[i]?.opId && x?.recordId === items[i]?.recordId)) ? prev : items);
      refreshFailedQueue();
    } catch (err) {
      console.error('[SyncStudio] Erreur de chargement de la file:', err);
    }
  };

  const checkSupabaseAuth = async () => {
    setAuthStatus('checking');
    setAuthErrorMessage('');
    if (!supabase) {
      setAuthStatus('error');
      setAuthErrorMessage("Client Supabase non initialisé ou clés manquantes");
      return;
    }
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401') || error.status === 401) {
          setAuthStatus('unauthorized');
          setAuthErrorMessage(error.message || "Session non autorisée ou expirée (401)");
        } else {
          setAuthStatus('error');
          setAuthErrorMessage(error.message || `Code d'erreur PostgREST: ${error.code}`);
        }
      } else {
        setAuthStatus('ok');
      }
    } catch (e: any) {
      setAuthStatus('error');
      setAuthErrorMessage(e?.message || "Échec de connexion réseau au serveur");
    }
  };

  useEffect(() => {
    refreshQueue();
    checkSupabaseAuth();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onBackgroundSyncStatus((status) => {
      const syncing = status?.isSyncing ?? false;
      setIsSyncing(syncing);
      refreshQueue();
      if (!syncing) {
        setLastSyncTime(new Date().toLocaleTimeString('fr-FR'));
      }
    });

    const updateDiagCount = () => {
      try {
        setDiagnosticCount(diagnosticService.getLogs().filter(l => l.level === 'error').length);
      } catch (_) {}
    };
    updateDiagCount();
    const unsubDiag = diagnosticService.subscribe(() => {
      updateDiagCount();
    });

    const interval = setInterval(() => {
      refreshQueue();
      updateDiagCount();
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      unsubDiag();
      clearInterval(interval);
    };
  }, []);

  const handleTriggerSync = async () => {
    if (!isOnline) {
      toast.error("Impossible de synchroniser : Le terminal est hors-ligne.");
      return;
    }
    setIsSyncing(true);
    toast.info("Lancement de la synchronisation...");
    try {
      await processSyncQueue();
      refreshQueue();
      toast.success("Synchronisation terminée avec succès !");
    } catch (err: any) {
      toast.error(`Erreur de synchronisation : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueue = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider la file d'attente locale ? Les modifications non synchronisées seront perdues.")) {
      clearSyncQueue();
      refreshQueue();
      toast.success("File d'attente vidée.");
    }
  };

  const handleClearFailedQueue = async () => {
    if (window.confirm("Purger définitivement tous les éléments rejetés de la Dead Letter Queue ?")) {
      await clearFailedSyncQueue();
      await refreshFailedQueue();
      toast.success("Dead Letter Queue purgée.");
    }
  };

  const handleRetryFailedItem = async (index: number) => {
    try {
      toast.info("Réintégration de l'élément dans la file active...");
      await retryFailedSyncItem(index);
      await refreshFailedQueue();
      refreshQueue();
      toast.success("Élément replacé en file active.");
    } catch {
      toast.error("Impossible de réintégrer l'élément.");
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      toast.info("Réintégration de tous les échecs dans la file active...");
      await retryAllFailedSyncItems();
      await refreshFailedQueue();
      refreshQueue();
      toast.success("Tous les éléments ont été réinjectés.");
    } catch {
      toast.error("Erreur lors de la réintégration des échecs.");
    }
  };

  const handleExportBackup = async () => {
    try {
      toast.loading("Génération de l'archive de sauvegarde...", { id: 'backup-task' });
      const archive = await createBackupArchive();
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Sauvegarde exportée !", { id: 'backup-task' });
    } catch (err) {
      toast.error("Échec de l'export de sauvegarde", { id: 'backup-task' });
    }
  };

  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      const targetTable = (item.table || '').toLowerCase();
      if (activeCategory === 'transactions' && targetTable !== 'transactions' && targetTable !== 'returns') return false;
      if (activeCategory === 'products' && targetTable !== 'products') return false;
      if (activeCategory === 'customers' && targetTable !== 'customers') return false;
      if (activeCategory === 'adjustments' && !targetTable.includes('adjust')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const payloadStr = JSON.stringify(item.payload || {}).toLowerCase();
        return item.table.toLowerCase().includes(q) || (item.recordId && item.recordId.toLowerCase().includes(q)) || payloadStr.includes(q);
      }
      return true;
    });
  }, [queue, activeCategory, searchQuery]);

  return {
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
    refreshQueue,
    checkSupabaseAuth,
    handleTriggerSync,
    handleClearQueue,
    handleClearFailedQueue,
    handleRetryFailedItem,
    handleRetryAllFailed,
    handleExportBackup,
    filteredQueue
  };
}
