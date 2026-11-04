import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from '../translations';
import { RolePermissions, CompanySettings } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';
import { SidebarBrandHeader } from './sidebar/SidebarBrandHeader';
import { SidebarSearchFilter } from './sidebar/SidebarSearchFilter';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [isVentesOpen, setIsVentesOpen] = useState(true);
  const [isGestionOpen, setIsGestionOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  const isCollapsed = !isSidebarOpen && !isMobile;

  const handleCloseSidebar = () => {
    if (setSidebarMode) setSidebarMode('closed');
    else if (cycleSidebarMode) cycleSidebarMode();
    else setIsSidebarOpen(false);
  };

  const handleExpandSidebar = () => {
    if (setSidebarMode) setSidebarMode('open');
    else setIsSidebarOpen(true);
  };

  const renderSectionHeader = (
    title: string,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    colorDot: string = 'bg-indigo-500'
  ) => {
    return (
      <SidebarNavCategory
        title={title}
        isOpen={searchQuery ? true : isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        isCollapsed={isCollapsed}
        colorDot={colorDot}
      />
    );
  };

  // Si fermé complet sur PC (0px)
  if (!isMobile && sidebarMode === 'closed') {
    return null;
  }

  return (
    <>
      {/* 1. Backdrop sombre sur Mobile lors de l'ouverture du tiroir */}
      <AnimatePresence>
        {isMobile && isMobileOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOverlayOpen(false)}
            onTouchEnd={() => setIsMobileOverlayOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[70] cursor-pointer touch-manipulation"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 2. Menu Latéral : Tiroir fluide sur mobile / Barre réactive sur PC */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? 285 : (sidebarMode === 'open' ? 260 : 72),
          x: isMobile ? (isMobileOverlayOpen ? 0 : -320) : 0
        }}
        transition={{ type: 'spring', damping: 26, stiffness: 250 }}
        className={cn(
          "flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 shadow-2xl select-none",
          isCollapsed && !isMobile ? "overflow-visible" : "overflow-hidden",
          isMobile 
            ? cn(
                "fixed inset-y-0 left-0 z-[75] w-[285px] max-w-[85vw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                !isMobileOverlayOpen && "pointer-events-none invisible"
              )
            : "relative z-40 shrink-0"
        )}
      >
        {/* En-tête de marque & Dépôt Actuel */}
        <SidebarBrandHeader
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          isMobileOverlayOpen={isMobileOverlayOpen}
          onCloseSidebar={handleCloseSidebar}
          onCloseMobileOverlay={() => setIsMobileOverlayOpen(false)}
        />

        {/* Champ de recherche instantanée (Ctrl+K) */}
        <SidebarSearchFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isCollapsed={isCollapsed}
          onExpandSidebar={handleExpandSidebar}
        />

        {/* Navigation Principale Défilante */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar touch-pan-y overscroll-contain text-left rtl:text-right relative z-10",
            isCollapsed ? "p-2 space-y-2 overflow-x-visible" : "p-3 space-y-4 overflow-x-hidden"
          )}
        >
          <SidebarSalesSection
            t={t}
            isVentesOpen={searchQuery ? true : isVentesOpen}
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
            isGestionOpen={searchQuery ? true : isGestionOpen}
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
            isAdminOpen={searchQuery ? true : isAdminOpen}
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
          onCloseSidebar={handleCloseSidebar}
        />
      </motion.aside>
    </>
  );
};
