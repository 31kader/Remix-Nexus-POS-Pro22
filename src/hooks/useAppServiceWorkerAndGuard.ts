import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useAppServiceWorkerAndGuard() {
  // 🛡️ NEXUS GUARD : Intercepteur global d'erreurs (Traque le bug ".active")
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message?.includes("reading 'active'")) {
        console.error('🚨 [NEXUS GUARD] CRASH .active INTERCEPTÉ ! 🚨');
        console.error('Ouvre ce lien pour voir le composant coupable 👉', event.error);
      }
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  // --- PWA Service Worker ---
  useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        if ((window as any).__swUpdateIntervalId) {
          clearInterval((window as any).__swUpdateIntervalId);
        }
        const intervalId = setInterval(() => r.update(), 60 * 60 * 1000);
        (window as any).__swUpdateIntervalId = intervalId;
      }
    },
    onRegisterError(error: any) {
      console.warn('SW registration error', error);
    },
  });

  // 📦 Sauvegarde automatique quotidienne (exécutée une fois par jour après démarrage)
  useEffect(() => {
    const timer = setTimeout(() => {
      import('../services/backup/autoDailyBackupService').then(m => {
        m.runDailyAutoBackup().catch(err => console.warn('[AutoBackup] Background execution failed', err));
      });
    }, 10000);
    return () => clearTimeout(timer);
  }, []);
}
