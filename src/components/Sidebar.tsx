import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from '../translations';
import { RolePermissions, CompanySettings } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';
import { SidebarBrandHeader } from './sidebar/SidebarBrandHeader';
import { SidebarNavCategory } from './sidebar/SidebarNavCategory';
import { SidebarSalesSection } from './sidebar/SidebarSalesSection';
import { SidebarManagementSection } from './sidebar/SidebarManagementSection';
import { SidebarAdminSection } from './sidebar/SidebarAdminSection';
import { SidebarFooterPro } from './sidebar/SidebarFooterPro';

interface SidebarProps {
  user: any;
  profile: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sidebarMode?: 'open' | 'collapsed' | 'closed';
  setSidebarMode?: (mode: 'open' | 'collapsed' | 'closed') => void;
  cycleSidebarMode?: () => void;
  isMobile: boolean;
  isMobileOverlayOpen: boolean;
  setIsMobileOverlayOpen: (open: boolean) => void;
  permissions: RolePermissions;
  canAccess?: (perm: keyof RolePermissions) => boolean;
  settings: CompanySettings;
  isCameraAgent: boolean;
  isAdmin: boolean;
  isManager: boolean;
  handleLogout: () => void;
  handleInstallApp: () => void;
  deferredPrompt: any;
  setIsPriceCheckerModalOpen: (open: boolean) => void;
  setIsStorePosterModalOpen?: (open: boolean) => void;
}

/**
 * ⚡ Barre Latérale Nexus POS Pro (Version Allégée & Haute Fluidité)
 * - Sans barre de recherche interne superflue (supprimée pour fluidité maximale).
 * - Transitions fluides matérielles sans lag ni désassemblage brutal du DOM.
 * - Fermeture automatique propre sur mobile à chaque sélection d'onglet.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  user,
  profile,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  sidebarMode = isSidebarOpen ? 'open' : 'collapsed',
  setSidebarMode,
  cycleSidebarMode,
  isMobile,
  isMobileOverlayOpen,
  setIsMobileOverlayOpen,
  permissions,
  canAccess: propCanAccess,
  settings,
  isCameraAgent,
  isAdmin,
  isManager,
  handleLogout,
  handleInstallApp,
  deferredPrompt,
  setIsPriceCheckerModalOpen,
  setIsStorePosterModalOpen
}) => {
  const { t } = useTranslation();

  const canAccess = (perm: keyof RolePermissions) => {
    if (typeof propCanAccess === 'function') return propCanAccess(perm);
    if (isAdmin) return true;
    const snakePerm = perm.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    return Boolean(permissions?.[perm] ?? (permissions as any)?.[snakePerm]);
  };

  const pendingOrdersCount = useTransactionStore(s => 
    Array.isArray(s.onlineOrders) ? s.onlineOrders.filter(o => o && o.status === 'pending').length : 0
  );

  const [isVentesOpen, setIsVentesOpen] = useState(true);
  const [isGestionOpen, setIsGestionOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  // Support des 3 modes sur Desktop : 'open' (245px), 'collapsed' (68px), 'closed' (0px fermé total)
  const isClosed = !isMobile && sidebarMode === 'closed';
  const isCollapsed = !isMobile && !isClosed && (sidebarMode === 'collapsed' || !isSidebarOpen);

  const handleToggleCollapse = () => {
    if (cycleSidebarMode) {
      cycleSidebarMode();
    } else if (setSidebarMode) {
      setSidebarMode(isClosed ? 'open' : 'closed');
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const renderSectionHeader = (
    title: string,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    colorDot: string = 'bg-indigo-500'
  ) => (
    <SidebarNavCategory
      title={title}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      isCollapsed={isCollapsed}
      colorDot={colorDot}
    />
  );

  return (
    <>
      {/* 1. Backdrop sombre sur Mobile avec fermeture instantanée au toucher */}
      <AnimatePresence>
        {isMobile && isMobileOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsMobileOverlayOpen(false)}
            onTouchEnd={() => setIsMobileOverlayOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[70] cursor-pointer touch-manipulation"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 2. Menu Latéral : Tiroir fluide sur Mobile / Fermeture totale (0px) ou Barre réactive sur Desktop */}
      <aside
        className={cn(
          "flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 shadow-2xl select-none transition-all duration-200 ease-in-out",
          isCollapsed ? "overflow-visible" : "overflow-hidden",
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 z-[75] w-[275px] max-w-[85vw] transform-gpu pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                isMobileOverlayOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
              )
            : cn(
                "relative z-40 shrink-0",
                isClosed
                  ? "w-0 max-w-0 opacity-0 pointer-events-none -translate-x-full overflow-hidden border-none shadow-none"
                  : isCollapsed
                    ? "w-[68px]"
                    : "w-[245px]"
              )
        )}
      >
        {/* En-tête de marque & Dépôt Actuel */}
        <SidebarBrandHeader
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          isMobileOverlayOpen={isMobileOverlayOpen}
          onCloseSidebar={handleToggleCollapse}
          onCloseMobileOverlay={() => setIsMobileOverlayOpen(false)}
        />

        {/* Navigation Principale Défilante (sans barre de recherche encombrante) */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar touch-pan-y overscroll-contain text-left rtl:text-right relative z-10",
            isCollapsed ? "p-1.5 space-y-2 overflow-x-visible" : "p-2.5 space-y-3 overflow-x-hidden"
          )}
        >
          <SidebarSalesSection
            t={t}
            isVentesOpen={isVentesOpen}
            setIsVentesOpen={setIsVentesOpen}
            isCollapsed={isCollapsed}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setIsMobileOverlayOpen={setIsMobileOverlayOpen}
            isMobile={isMobile}
            setSidebarMode={setSidebarMode}
            canAccess={canAccess}
            pendingOrdersCount={pendingOrdersCount}
            setIsPriceCheckerModalOpen={setIsPriceCheckerModalOpen}
            setIsStorePosterModalOpen={setIsStorePosterModalOpen}
            renderSectionHeader={renderSectionHeader}
          />

          <SidebarManagementSection
            t={t}
            isGestionOpen={isGestionOpen}
            setIsGestionOpen={setIsGestionOpen}
            isCollapsed={isCollapsed}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setIsMobileOverlayOpen={setIsMobileOverlayOpen}
            canAccess={canAccess}
            renderSectionHeader={renderSectionHeader}
          />

          <SidebarAdminSection
            t={t}
            isAdminOpen={isAdminOpen}
            setIsAdminOpen={setIsAdminOpen}
            isCollapsed={isCollapsed}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setIsMobileOverlayOpen={setIsMobileOverlayOpen}
            canAccess={canAccess}
            isAdmin={isAdmin}
            isManager={isManager}
            isCameraAgent={isCameraAgent}
            settings={settings}
            renderSectionHeader={renderSectionHeader}
          />
        </nav>

        {/* Pied de Page Profil & Session */}
        <SidebarFooterPro
          deferredPrompt={deferredPrompt}
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          user={user}
          profile={profile}
          handleInstallApp={handleInstallApp}
          handleLogout={handleLogout}
          onCloseSidebar={handleToggleCollapse}
        />
      </aside>
    </>
  );
};
