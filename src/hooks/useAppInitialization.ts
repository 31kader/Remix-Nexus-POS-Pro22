import { useState, useEffect } from 'react';
import { onBackgroundSyncStatus } from '../services/SyncService';
import { notifyNetworkIssue, notifyNetworkRestored } from '../services/networkErrorHandler';

export type AppMode = 
  | 'pos' 
  | 'admin' 
  | 'inventory' 
  | 'customer' 
  | 'supplier' 
  | 'delivery' 
  | 'camera' 
  | string;

export interface AppSyncState {
  isSyncing: boolean;
  pendingCount: number;
}

export function useAppInitialization() {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m) return m as AppMode;
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('customer') || hash.includes('client')) return 'customer';
      if (hash.includes('supplier') || hash.includes('fournisseur')) return 'supplier';
    }
    return 'pos';
  });
  const [syncInfo, setSyncInfo] = useState<any>(null);
  const [bgSyncActive, setBgSyncActive] = useState<boolean>(false);
  const [bgPendingChanges, setBgPendingChanges] = useState<number>(0);
  const [syncState, setSyncState] = useState<AppSyncState>({
    isSyncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleOnline = () => {
      setIsOnline(true);
      notifyNetworkRestored(bgPendingChanges);
    };
    const handleOffline = () => {
      setIsOnline(false);
      notifyNetworkIssue(new Error('Mode Hors-Ligne'), 'Navigateur');
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeBgSync = onBackgroundSyncStatus((bgStatus) => {
      setSyncState(bgStatus);
      setBgSyncActive(bgStatus.isSyncing);
      setBgPendingChanges(bgStatus.pendingCount);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeBgSync) unsubscribeBgSync();
    };
  }, []);

  return {
    isMobile,
    isOnline,
    isStandalone,
    deferredPrompt,
    setDeferredPrompt,
    appMode,
    setAppMode,
    syncInfo,
    setSyncInfo,
    bgSyncActive,
    bgPendingChanges,
    syncState,
  };
}

export default useAppInitialization;