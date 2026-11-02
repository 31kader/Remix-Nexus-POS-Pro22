import React from 'react';
import { PinLockModal } from './PinLockModal';
import { IOSInstallModal } from './IOSInstallModal';
import { 
  Menu, AlertTriangle, Calendar, LogOut, LogIn, Sun, Moon,
  Cloud, CloudOff, RefreshCw, Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { onBackgroundSyncStatus, flushSyncQueueImmediate } from '../services/SyncService';
import { LanStatusBadge } from './lan/LanStatusBadge';
import { HeaderLanguageMenu } from './header/HeaderLanguageMenu';
import { HeaderThemeMenu } from './header/HeaderThemeMenu';
import { getTabTitle } from './header/headerTabTitles';
import { HeaderHardwareActions } from './header/HeaderHardwareActions';

interface AppHeaderProps {
  isMobile: boolean;
  isMobileOverlayOpen?: boolean;
  setIsMobileOverlayOpen: (open: boolean) => void;
  sidebarMode?: 'open' | 'collapsed' | 'closed';
  setSidebarMode?: (mode: 'open' | 'collapsed' | 'closed') => void;
  cycleSidebarMode?: () => void;
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  lowStockProducts?: any[];
  expiringProducts?: any[];
  setIsLowStockModalOpen: (open: boolean) => void;
  setIsExpirationModalOpen: (open: boolean) => void;
  currentEmployee: any;
  isClockedIn: boolean;
  handleClockInOut: () => Promise<void>;
  language: string;
  setLanguage: (lang: string) => void;
  isLangMenuOpen: boolean;
  setIsLangMenuOpen: (open: boolean) => void;
  theme: string;
  setTheme: (theme: any) => void;
  isThemeMenuOpen: boolean;
  setIsThemeMenuOpen: (open: boolean) => void;
  activeStaffId: string | null;
  employees: any[];
  profile: any;
  user: any;
  canAccess?: (permission: any) => boolean;
  t: (key: string) => string;
  toast: any;
  deferredPrompt?: any;
  handleInstallApp?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isMobile,
  isMobileOverlayOpen = false,
  setIsMobileOverlayOpen,
  sidebarMode = 'open',
  setSidebarMode: _setSidebarMode,
  cycleSidebarMode,
  activeTab,
  setActiveTab,
  lowStockProducts = [],
  expiringProducts = [],
  setIsLowStockModalOpen,
  setIsExpirationModalOpen,
  currentEmployee,
  isClockedIn,
  handleClockInOut,
  language,
  setLanguage,
  isLangMenuOpen,
  setIsLangMenuOpen,
  theme,
  setTheme,
  isThemeMenuOpen,
  setIsThemeMenuOpen,
  activeStaffId: _activeStaffId,
  employees: _employees,
  profile,
  user,
  canAccess,
  t: _t,
  toast,
  deferredPrompt,
  handleInstallApp
}) => {
  const hasInventoryAccess = canAccess ? canAccess('canAccessInventory') : (profile?.role === 'admin' || profile?.role === 'manager');
  const [isPinLockOpen, setIsPinLockOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nexus_pos_pin_locked') === 'true';
    }
    return false;
  });
  const [isIOSInstallModalOpen, setIsIOSInstallModalOpen] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{ isSyncing: boolean; pendingCount: number }>({ isSyncing: false, pendingCount: 0 });
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const unsub = onBackgroundSyncStatus(status => {
      setSyncStatus(prev => (prev.isSyncing === status.isSyncing && prev.pendingCount === status.pendingCount) ? prev : status);
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

  const handleLockPin = () => {
    sessionStorage.setItem('nexus_pos_pin_locked', 'true');
    setIsPinLockOpen(true);
  };

  return (
    <header className="min-h-12 sm:h-14 pt-[env(safe-area-inset-top,0px)] border-b pl-[max(env(safe-area-inset-left,0px),10px)] pr-[max(env(safe-area-inset-right,0px),10px)] sm:px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 sticky top-0 z-[60]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button 
          type="button"
          onClick={() => {
            if (isMobile) {
              setIsMobileOverlayOpen(!isMobileOverlayOpen);
            } else if (cycleSidebarMode) {
              cycleSidebarMode();
            }
          }}
          className={cn(
            "p-2 border rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
            (isMobile ? isMobileOverlayOpen : (!isMobile && sidebarMode === 'closed'))
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm hover:bg-indigo-500"
              : "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
          )}
          title={
            isMobile
              ? (isMobileOverlayOpen ? "Fermer le menu" : "Ouvrir le menu")
              : (sidebarMode === 'closed' ? "Ouvrir le menu latéral" : "Fermer le menu latéral")
          }
          aria-label="Basculer le menu latéral"
        >
          <Menu size={18} />
          {!isMobile && sidebarMode === 'closed' && (
            <span className="text-[10px] font-black uppercase tracking-wider pr-0.5">Menu</span>
          )}
        </button>
        <h2 className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-none">
          {getTabTitle(activeTab, isMobile)}
        </h2>

        {hasInventoryAccess && lowStockProducts.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsLowStockModalOpen(true)}
            className="relative p-1.5 sm:p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
            title="Alertes de stock bas"
          >
            <div className="relative">
              <AlertTriangle size={20} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                {lowStockProducts.length > 99 ? '99+' : lowStockProducts.length}
              </span>
            </div>
          </button>
        )}

        {hasInventoryAccess && expiringProducts.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsExpirationModalOpen(true)}
            className="relative p-1.5 sm:p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
            title="Alertes de péremption (DLC)"
          >
            <Calendar size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
              {expiringProducts.length > 99 ? '99+' : expiringProducts.length}
            </span>
          </button>
        )}

        {currentEmployee && (
          <button 
            type="button"
            onClick={handleClockInOut}
            className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer",
              isClockedIn 
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            )}
          >
            {isClockedIn ? <LogOut size={16} /> : <LogIn size={16} />}
            <span className="hidden md:inline">{isClockedIn ? 'Fin de service' : 'Début de service'}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Bouton Installation iPhone / Android */}
        <button
          type="button"
          onClick={() => setIsIOSInstallModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
          title="Installer Nexus POS Pro sur iPhone (iOS) ou Smartphone Android"
        >
          <Smartphone size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="hidden sm:inline">iPhone / Mobile</span>
        </button>

        {/* Badge État de Synchronisation Temps Réel */}
        <button
          type="button"
          onClick={() => {
            if (syncStatus.pendingCount > 0) {
              flushSyncQueueImmediate();
              toast.info("Envoi immédiat des modifications locales vers le Cloud...");
            } else {
              window.dispatchEvent(new CustomEvent('force-full-sync'));
              toast.info("Actualisation complète du catalogue depuis Supabase...");
            }
          }}
          className={cn(
            "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border shadow-xs",
            !isOnline
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
              : (syncStatus.isSyncing || syncStatus.pendingCount > 0)
                ? "bg-blue-500/15 border-blue-500/40 text-blue-500 hover:bg-blue-500/25 animate-pulse"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          )}
          title={
            !isOnline 
              ? "Mode Hors-Ligne (IndexedDB actif)" 
              : syncStatus.pendingCount > 0 
                ? `${syncStatus.pendingCount} modification(s) en cours d'envoi` 
                : "Synchronisation Cloud active et à jour"
          }
        >
          {!isOnline ? (
            <>
              <CloudOff size={14} className="text-amber-500" />
              <span className="hidden md:inline">Hors-Ligne</span>
            </>
          ) : (syncStatus.isSyncing || syncStatus.pendingCount > 0) ? (
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

        {/* Badge Réseau Hybride (LAN Câble / Wi-Fi & Cloud Supabase) */}
        <LanStatusBadge onOpenSettings={() => setActiveTab && setActiveTab('settings')} />

        {/* Actions Matérielles PC (Terminal ID, Tiroir, Écran Client, Lock PIN) */}
        <HeaderHardwareActions
          activeTab={activeTab}
          onLockPin={handleLockPin}
          toast={toast}
        />

        {/* Sélecteur de Langue */}
        <HeaderLanguageMenu
          language={language}
          setLanguage={setLanguage}
          isOpen={isLangMenuOpen}
          setIsOpen={setIsLangMenuOpen}
          toast={toast}
        />

        {/* Quick Light/Dark Mode Switch */}
        <button
          type="button"
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : 'light';
            setTheme(nextTheme);
          }}
          className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-amber-500 dark:text-indigo-400 transition-all shadow-xs flex items-center justify-center cursor-pointer"
          title={theme === 'light' ? 'Passer en Mode Sombre (Onyx)' : 'Passer en Mode Clair (Albâtre)'}
        >
          {theme === 'light' ? <Moon size={16} className="text-indigo-600" /> : <Sun size={16} className="text-amber-400" />}
        </button>

        {/* Sélecteur Multi-Thèmes (PC/Tablette uniquement) */}
        <HeaderThemeMenu
          theme={theme}
          setTheme={setTheme}
          isOpen={isThemeMenuOpen}
          setIsOpen={setIsThemeMenuOpen}
          toast={toast}
        />
      </div>

      <PinLockModal 
        isOpen={isPinLockOpen} 
        onUnlock={() => {
          sessionStorage.removeItem('nexus_pos_pin_locked');
          setIsPinLockOpen(false);
        }} 
        expectedPin={currentEmployee?.pin || currentEmployee?.passwordHash || (currentEmployee as any)?.password_hash || profile?.pin || profile?.passwordHash || profile?.password_hash}
        currentEmployeeName={currentEmployee?.name || profile?.displayName || 'Caissier'}
        currentEmployeeEmail={currentEmployee?.email || profile?.email || user?.email || undefined}
      />
      <IOSInstallModal
        isOpen={isIOSInstallModalOpen}
        onClose={() => setIsIOSInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onAndroidInstall={handleInstallApp}
      />
    </header>
  );
};
