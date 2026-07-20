import { useState, useEffect } from 'react';
import { onSyncUpdate } from '../services/SupabaseSync';
import { onBackgroundSyncStatus } from '../services/SyncService';

export function useAppInitialization() {
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appMode, setAppMode] = useState<'pos' | 'customer' | 'supplier' | 'price_checker' | 'delivery' | 'camera'>('pos');
  const [syncInfo, setSyncInfo] = useState({ active: false, progress: 0, currentTable: '' });
  const [bgSyncActive, setBgSyncActive] = useState(false);
  const [bgPendingChanges, setBgPendingChanges] = useState(0);

  useEffect(() => {
    // Import from database.ts
    
    const unsubSync = onSyncUpdate((info: any) => {
      setSyncInfo(info);
    });

    const unsubBgSync = onBackgroundSyncStatus((status: any) => {
      setBgSyncActive(status.active);
      setBgPendingChanges(status.pendingChanges);
    });

    const handleQuotaError = (e: any) => {
      // Ignore quota errors from blocking the whole app
    };
    window.addEventListener('database-error', handleQuotaError);
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as any;
    if (['customer', 'supplier', 'price_checker', 'camera'].includes(mode)) {
      setAppMode(mode);
    }

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if running as PWA
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMedia || isNavigatorStandalone);
    };
    checkStandalone();

    return () => {
      unsubSync();
      unsubBgSync();
      window.removeEventListener('database-error', handleQuotaError);
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return { 
    isMobile, isOnline, isStandalone, deferredPrompt, setDeferredPrompt, 
    appMode, setAppMode, syncInfo, bgSyncActive, bgPendingChanges 
  };
}

