import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';
import { AppHeader } from './AppHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useProductStats } from '../hooks/useAppPermissionsAndStats';

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
  const { expiringProducts, lowStockProducts } = useProductStats();

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

  // Cycle : Ouvert (260px) -> Réduit (76px) -> Fermé (0px) -> Ouvert (260px)
  const cycleSidebarMode = useCallback(() => {
    if (isMobile) {
      setIsMobileOverlayOpen(!isMobileOverlayOpen);
      return;
    }
    setSidebarModeState(prev => {
      const next: SidebarMode = prev === 'open' ? 'collapsed' : prev === 'collapsed' ? 'closed' : 'open';
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

  return (
    <div className="flex h-[100dvh] text-slate-900 dark:text-slate-100 overflow-hidden font-sans bg-slate-50 dark:bg-zinc-950">
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
        settings={settings}
        isCameraAgent={profile?.role === 'camera_agent'}
        isAdmin={profile?.role === 'admin'}
        isManager={profile?.role === 'manager'}
        handleLogout={() => props.handleLogout(user)}
        handleInstallApp={props.handleInstallApp}
        deferredPrompt={props.deferredPrompt}
        setIsPriceCheckerModalOpen={props.setIsPriceCheckerModalOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 relative bg-transparent overflow-hidden">
        <AppHeader 
          isMobile={isMobile}
          setIsMobileOverlayOpen={setIsMobileOverlayOpen}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          cycleSidebarMode={cycleSidebarMode}
          activeTab={activeTab}
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
          t={props.t}
          toast={props.toast}
          deferredPrompt={props.deferredPrompt}
          handleInstallApp={props.handleInstallApp}
        />

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
          />
        )}
      </main>
    </div>
  );
};
