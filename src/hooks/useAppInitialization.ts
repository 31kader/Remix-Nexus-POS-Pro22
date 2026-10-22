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
  | 'client_scan'
  | 'kiosk'
  | 'price_checker'
  | string;

export interface AppSyncState {
  isSyncing: boolean;
  pendingCount: number;
}

const checkIsMobile = () => {
  if (typeof window === 'undefined') return false;
  const isCapacitor = Boolean((window as any).Capacitor?.isNativePlatform());
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 1024;
  return isCapacitor || (isMobileUA && isSmallScreen) || window.innerWidth < 768;
};

export function useAppInitialization() {
  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile);
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
      if (m) {
        const lower = m.toLowerCase();
        if (lower === 'client_scan' || lower === 'scan' || lower === 'client-scan') return 'client_scan';
        if (lower === 'kiosk' || lower === 'borne' || lower === 'price_checker') return 'kiosk';
        return m as AppMode;
      }
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('client_scan') || hash === '#scan' || hash.includes('client-scan')) return 'client_scan';
      if (hash.includes('kiosk') || hash.includes('borne') || hash.includes('price_checker')) return 'kiosk';
      if (hash.startsWith('#portal-customer') || hash.startsWith('#customer-portal')) return 'customer';
      if (hash.startsWith('#portal-supplier') || hash.startsWith('#supplier-portal')) return 'supplier';
    }
    return 'pos';
  });
  const [syncInfo, setSyncInfo] = useState<{
    active: boolean;
    progress: number;
    currentTable: string;
    pendingCount?: number;
  }>({
    active: false,
    progress: 100,
    currentTable: ''
  });
  const [bgSyncActive, setBgSyncActive] = useState<boolean>(false);
  const [bgPendingChanges, setBgPendingChanges] = useState<number>(0);
  const [syncState, setSyncState] = useState<AppSyncState>({
    isSyncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
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
      setSyncState(prev => (prev.isSyncing === bgStatus.isSyncing && prev.pendingCount === bgStatus.pendingCount) ? prev : bgStatus);
      setBgSyncActive(prev => prev === bgStatus.isSyncing ? prev : bgStatus.isSyncing);
      setBgPendingChanges(prev => prev === bgStatus.pendingCount ? prev : bgStatus.pendingCount);
      setSyncInfo({
        active: bgStatus.isSyncing,
        progress: bgStatus.progress ?? (bgStatus.isSyncing ? 0 : 100),
        currentTable: bgStatus.currentTable || '',
        pendingCount: bgStatus.pendingCount
      });
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