import React, { useState } from 'react';
import { Menu, Smartphone, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

// Modales
import { PinLockModal } from './PinLockModal';
import { IOSInstallModal } from './IOSInstallModal';

// Sous-composants d'en-tête Pro
import { LanStatusBadge } from './lan/LanStatusBadge';
import { HeaderLanguageMenu } from './header/HeaderLanguageMenu';
import { HeaderThemeMenu } from './header/HeaderThemeMenu';
import { HeaderHardwareActions } from './header/HeaderHardwareActions';
import { HeaderWarehouseBadge } from './header/HeaderWarehouseBadge';
import { HeaderAlertBadges } from './header/HeaderAlertBadges';
import { HeaderSyncStatusBadge } from './header/HeaderSyncStatusBadge';
import { HeaderClockInOutButton } from './header/HeaderClockInOutButton';
import { getTabTitle } from './header/headerTabTitles';

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
  profile,
  user,
  canAccess,
  toast,
  deferredPrompt,
  handleInstallApp,
}) => {
  const hasInventoryAccess = canAccess
    ? canAccess('canAccessInventory')
    : profile?.role === 'admin' || profile?.role === 'manager';

  const [isPinLockOpen, setIsPinLockOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nexus_pos_pin_locked') === 'true';
    }
    return false;
  });

  const [isIOSInstallModalOpen, setIsIOSInstallModalOpen] = useState(false);

  const handleLockPin = () => {
    sessionStorage.setItem('nexus_pos_pin_locked', 'true');
    setIsPinLockOpen(true);
  };

  const handleToggleMenu = () => {
    if (isMobile) {
      setIsMobileOverlayOpen(!isMobileOverlayOpen);
    } else if (cycleSidebarMode) {
      cycleSidebarMode();
    }
  };

  return (
    <header className="min-h-12 sm:h-14 pt-[env(safe-area-inset-top,0px)] border-b pl-[max(env(safe-area-inset-left,0px),10px)] pr-[max(env(safe-area-inset-right,0px),10px)] sm:px-5 flex items-center justify-between flex-shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-slate-200/80 dark:border-zinc-800/80 sticky top-0 z-[60] select-none">
      {/* 1. Zone Gauche : Burger + Titre de Vue + Magasin Actuel + Alertes */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={handleToggleMenu}
          className={cn(
            "p-2 border rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs",
            (isMobile ? isMobileOverlayOpen : !isMobile && sidebarMode === 'closed')
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm hover:bg-indigo-500"
              : "bg-slate-100 dark:bg-zinc-850 border-slate-200 dark:border-zinc-700/80 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-750"
          )}
          title={
            isMobile
              ? isMobileOverlayOpen ? "Fermer le menu" : "Ouvrir le menu"
              : sidebarMode === 'closed' ? "Ouvrir le menu latéral" : "Fermer le menu latéral"
          }
          aria-label="Basculer le menu latéral"
        >
          <Menu size={18} />
          {!isMobile && sidebarMode === 'closed' && (
            <span className="text-[10px] font-black uppercase tracking-wider pr-0.5">Menu</span>
          )}
        </button>

        <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 truncate max-w-[120px] sm:max-w-none">
          {getTabTitle(activeTab, isMobile)}
        </h2>

        {/* Sélecteur de magasin actif BLT */}
        <HeaderWarehouseBadge />

        {/* Badges d'alertes Stocks & DLC */}
        <HeaderAlertBadges
          hasInventoryAccess={hasInventoryAccess}
          lowStockProducts={lowStockProducts}
          expiringProducts={expiringProducts}
          onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
          onOpenExpirationModal={() => setIsExpirationModalOpen(true)}
        />

        {/* Pointage employé */}
        <HeaderClockInOutButton
          currentEmployee={currentEmployee}
          isClockedIn={isClockedIn}
          onClockInOut={handleClockInOut}
        />
      </div>

      {/* 2. Zone Droite : Outils, Connectivité Hybride, Langue, Thème */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Bouton Installation iPhone / Android */}
        <button
          type="button"
          onClick={() => setIsIOSInstallModalOpen(true)}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          title="Installer Nexus POS Pro sur iPhone (iOS) ou Smartphone Android"
        >
          <Smartphone size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="hidden md:inline">iPhone / Mobile</span>
        </button>

        {/* Badge État de Synchronisation Cloud */}
        <HeaderSyncStatusBadge toast={toast} />

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

        {/* Bascule Rapide Sombre/Clair */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'albatros' ? 'titanium' : 'albatros')}
          className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-700/80 text-amber-500 dark:text-indigo-400 hover:bg-slate-200 dark:hover:bg-zinc-750 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
          title={theme === 'albatros' ? 'Passer en Mode Sombre Titanium' : 'Passer en Mode Clair Albâtre'}
          aria-label="Basculer thème sombre/clair"
        >
          {theme === 'albatros' ? <Moon size={15} className="text-indigo-600" /> : <Sun size={15} className="text-amber-400" />}
        </button>

        {/* Sélecteur Multi-Thèmes */}
        <HeaderThemeMenu
          theme={theme}
          setTheme={setTheme}
          isOpen={isThemeMenuOpen}
          setIsOpen={setIsThemeMenuOpen}
          toast={toast}
        />
      </div>

      {/* Modales de verrouillage et d'installation */}
      <PinLockModal
        isOpen={isPinLockOpen}
        onUnlock={() => {
          sessionStorage.removeItem('nexus_pos_pin_locked');
          setIsPinLockOpen(false);
        }}
        expectedPin={
          currentEmployee?.pin ||
          currentEmployee?.passwordHash ||
          (currentEmployee as any)?.password_hash ||
          profile?.pin ||
          profile?.passwordHash ||
          profile?.password_hash
        }
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
