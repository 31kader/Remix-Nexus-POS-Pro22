import React, { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';
import { AppHeader } from './AppHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';

export type SidebarMode = 'open' | 'collapsed' | 'closed';

interface MainAppContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  isMobileOverlayOpen: boolean;
  setIsMobileOverlayOpen: (open: boolean) => void;
  isDataLoading: boolean;
  [key: string]: any;
}

const EMPTY_LIST: any[] = [];

export const MainAppContent: React.FC<MainAppContentProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  isMobile,
  isMobileOverlayOpen,
  setIsMobileOverlayOpen,
  isDataLoading,
  children,
  ...props
}) => {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const settings = useCoreStore(s => s.settings);
  const employees = usePeopleStore(s => s.employees);
  const expiringProducts = props.expiringProducts ?? EMPTY_LIST;
  const lowStockProducts = props.lowStockProducts ?? EMPTY_LIST;

  // Mode 3-états du Menu Latéral : 'open' (260px) -> 'collapsed' (76px icônes) -> 'closed' (0px fermé complet)
  const [sidebarMode, setSidebarModeState] = useState<SidebarMode>(() => {
    try {
      const saved = localStorage.getItem('nexus_sidebar_mode_v2') as SidebarMode | null;
      if (saved === 'open' || saved === 'collapsed' || saved === 'closed') return saved;
    } catch {}
    return isSidebarOpen ? 'open' : 'collapsed';
  });

  const setSidebarMode = useCallback((mode: SidebarMode) => {
    setSidebarModeState(mode);
    setIsSidebarOpen(mode === 'open');
    try {
      localStorage.setItem('nexus_sidebar_mode_v2', mode);
    } catch {}
  }, [setIsSidebarOpen]);

  // Toggle Direct (1-clic) : Si ouvert ou réduit -> Fermé (0px). Si fermé -> Ouvert (260px).
  const cycleSidebarMode = useCallback(() => {
    if (isMobile) {
      setIsMobileOverlayOpen(!isMobileOverlayOpen);
      return;
    }
    setSidebarModeState(prev => {
      const next: SidebarMode = (prev === 'open' || prev === 'collapsed') ? 'closed' : 'open';
      setIsSidebarOpen(next === 'open');
      try {
        localStorage.setItem('nexus_sidebar_mode_v2', next);
      } catch {}
      return next;
    });
  }, [isMobile, isMobileOverlayOpen, setIsMobileOverlayOpen, setIsSidebarOpen]);

  useEffect(() => {
    setIsSidebarOpen(sidebarMode === 'open');
  }, [sidebarMode, setIsSidebarOpen]);

  // Écouteur clavier Échap : fermeture directe du menu latéral en 1 pression
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobile && isMobileOverlayOpen) {
          setIsMobileOverlayOpen(false);
        } else if (!isMobile && sidebarMode !== 'closed') {
          const hasModal = document.querySelector('[role="dialog"]');
          if (!hasModal) {
            setSidebarMode('closed');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isMobileOverlayOpen, setIsMobileOverlayOpen, sidebarMode, setSidebarMode]);

  // Écouteur global : fermeture/repli automatique du menu latéral (ex: ouverture de la barre de favoris)
  useEffect(() => {
    const handleCollapseSidebar = () => {
      setSidebarMode('collapsed');
      setIsMobileOverlayOpen(false);
    };
    const handleCycleSidebar = () => cycleSidebarMode();
    window.addEventListener('nexus-collapse-sidebar', handleCollapseSidebar);
    window.addEventListener('nexus-cycle-sidebar', handleCycleSidebar);
    return () => {
      window.removeEventListener('nexus-collapse-sidebar', handleCollapseSidebar);
      window.removeEventListener('nexus-cycle-sidebar', handleCycleSidebar);
    };
  }, [setSidebarMode, setIsMobileOverlayOpen, cycleSidebarMode]);

  return (
    <div className="flex h-[100dvh] text-slate-900 dark:text-slate-100 overflow-hidden font-sans bg-slate-50 dark:bg-zinc-950 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <Sidebar 
        user={user}
        profile={profile}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={sidebarMode === 'open'}
        setIsSidebarOpen={(open: boolean) => setSidebarMode(open ? 'open' : 'collapsed')}
        sidebarMode={sidebarMode}
        setSidebarMode={setSidebarMode}
        cycleSidebarMode={cycleSidebarMode}
        isMobile={isMobile}
        isMobileOverlayOpen={isMobileOverlayOpen}
        setIsMobileOverlayOpen={setIsMobileOverlayOpen}
        permissions={props.permissions}
        canAccess={props.canAccess}
        settings={settings}
        isCameraAgent={profile?.role === 'camera_agent'}
        isAdmin={props.isAdmin ?? (profile?.role === 'admin')}
        isManager={profile?.role === 'manager'}
        handleLogout={() => props.handleLogout(user)}
        handleInstallApp={props.handleInstallApp}
        deferredPrompt={props.deferredPrompt}
        setIsPriceCheckerModalOpen={props.setIsPriceCheckerModalOpen}
        setIsStorePosterModalOpen={props.setIsStorePosterModalOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 relative bg-transparent overflow-hidden">
        {/* Languette d'ouverture rapide sur PC si le menu est fermé (0px) */}
        {!isMobile && sidebarMode === 'closed' && (
          <button
            type="button"
            onClick={cycleSidebarMode}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-zinc-900/95 hover:bg-indigo-600 border border-l-0 border-zinc-700/80 rounded-r-xl text-zinc-400 hover:text-white shadow-xl transition-all cursor-pointer group"
            title="Ouvrir le menu latéral (Échap ou clic)"
          >
            <Menu size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        )}

        {activeTab !== 'checkout' && (
          <AppHeader 
            isMobile={isMobile}
            isMobileOverlayOpen={isMobileOverlayOpen}
            setIsMobileOverlayOpen={setIsMobileOverlayOpen}
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            cycleSidebarMode={cycleSidebarMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lowStockProducts={lowStockProducts}
            expiringProducts={expiringProducts}
            setIsLowStockModalOpen={props.setIsLowStockModalOpen}
            setIsExpirationModalOpen={props.setIsExpirationModalOpen}
            currentEmployee={props.currentEmployee}
            isClockedIn={props.isClockedIn}
            handleClockInOut={props.handleClockInOut}
            language={props.language}
            setLanguage={props.setLanguage}
            isLangMenuOpen={props.isLangMenuOpen}
            setIsLangMenuOpen={props.setIsLangMenuOpen}
            theme={props.theme}
            setTheme={props.setTheme}
            isThemeMenuOpen={props.isThemeMenuOpen}
            setIsThemeMenuOpen={props.setIsThemeMenuOpen}
            activeStaffId={props.activeStaffId}
            employees={employees}
            profile={profile}
            user={user}
            canAccess={props.canAccess}
            t={props.t}
            toast={props.toast}
            deferredPrompt={props.deferredPrompt}
            handleInstallApp={props.handleInstallApp}
          />
        )}

        <div className="flex-1 overflow-hidden min-h-0">
          <div className={cn(
            "h-full overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in duration-150",
            activeTab !== 'checkout' && (isMobile ? "p-2.5 sm:p-4" : "p-5")
          )}>
            {children}
          </div>
        </div>

        {isMobile && (
          <BottomBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenMenu={() => setIsMobileOverlayOpen(true)}
            canAccess={props.canAccess}
            isAdmin={props.isAdmin ?? (profile?.role === 'admin')}
            isOwner={props.isOwner}
            isManager={profile?.role === 'manager'}
          />
        )}
      </main>
    </div>
  );
};
