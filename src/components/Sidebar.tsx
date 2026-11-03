import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../translations';
import { RolePermissions, CompanySettings } from '../types';
import { APP_CONFIG } from '../config/appConfig';
import { useTransactionStore } from '../store/useTransactionStore';
import { SidebarSalesSection } from './sidebar/SidebarSalesSection';
import { SidebarManagementSection } from './sidebar/SidebarManagementSection';
import { SidebarAdminSection } from './sidebar/SidebarAdminSection';
import { SidebarFooter } from './sidebar/SidebarFooter';

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

export const Sidebar = ({
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
}: SidebarProps) => {
  const { t } = useTranslation();
  const canAccess = (perm: keyof RolePermissions) => {
    if (typeof propCanAccess === 'function') return propCanAccess(perm);
    if (isAdmin) return true;
    const snakePerm = perm.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    return Boolean(permissions?.[perm] ?? (permissions as any)?.[snakePerm]);
  };

  // Calcul dynamique ciblé des commandes en attente
  const pendingOrdersCount = useTransactionStore(s => 
    Array.isArray(s.onlineOrders) ? s.onlineOrders.filter(o => o && o.status === 'pending').length : 0
  );

  const [isVentesOpen, setIsVentesOpen] = useState(true);
  const [isGestionOpen, setIsGestionOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  const isCollapsed = !isSidebarOpen && !isMobile;

  const renderSectionHeader = (title: string, isOpen: boolean, setIsOpen: (v: boolean) => void) => {
    if (isCollapsed) {
      return <div className="h-[1px] bg-white/10 my-2.5 mx-1" />;
    }
    return (
      <button 
        tabIndex={-1}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-white/30 uppercase tracking-normal hover:text-white/60 transition-colors mb-2 cursor-pointer group"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1 h-1 bg-indigo-500 rounded-full opacity-50" />
          {title}
        </span>
        {isOpen ? <ChevronDown size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" /> : <ChevronUp size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
      </button>
    );
  };

  const handleCloseSidebar = () => {
    if (setSidebarMode) setSidebarMode('closed');
    else if (cycleSidebarMode) cycleSidebarMode();
    else setIsSidebarOpen(false);
  };

  // Si en mode fermé complet sur PC/Tablette (0px)
  if (!isMobile && sidebarMode === 'closed') {
    return null;
  }

  return (
    <>
      {/* 1. Backdrop sombre sur Mobile/Android lors de l'ouverture du tiroir */}
      <AnimatePresence>
        {isMobile && isMobileOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOverlayOpen(false)}
            onTouchEnd={() => setIsMobileOverlayOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] cursor-pointer touch-manipulation"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 2. Menu Latéral : Tiroir fluide 285px sur mobile / Barre réactive sur PC */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? 285 : (sidebarMode === 'open' ? 260 : 72),
          x: isMobile ? (isMobileOverlayOpen ? 0 : -320) : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 240 }}
        className={cn(
          "flex flex-col h-full bg-zinc-950 border-r border-zinc-800 shadow-xl select-none",
          isCollapsed && !isMobile ? "overflow-visible" : "overflow-hidden",
          isMobile 
            ? cn(
                "fixed inset-y-0 left-0 z-[75] w-[285px] max-w-[85vw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                !isMobileOverlayOpen && "pointer-events-none invisible"
              )
            : "relative z-40 shrink-0"
        )}
      >
        {/* En-tête de marque */}
        <div className={cn(
          "flex items-center justify-between border-b border-white/5 relative z-10 shrink-0",
          isCollapsed ? "p-3 justify-center" : "p-4 sm:p-5"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5">
              <ShoppingCart size={20} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-base truncate text-white tracking-tight uppercase flex items-center gap-1.5">
                  NEXUS 
                  <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono px-1.5 py-0.5 rounded-md normal-case">
                    {`v${APP_CONFIG.version}`}
                  </span>
                </span>
                <span className="text-[8px] font-black text-white/30 uppercase tracking-normal mt-0.5">Systems Guard</span>
              </div>
            )}
          </div>

          {/* Bouton Fermer sur Mobile */}
          {isMobile && isMobileOverlayOpen && (
            <button 
              type="button"
              onClick={() => setIsMobileOverlayOpen(false)}
              aria-label="Fermer le menu"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          )}

          {/* Bouton Fermer sur PC (Fermeture complète 0px en 1 seul clic) */}
          {!isMobile && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleCloseSidebar}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all cursor-pointer shrink-0"
              title="Fermer le menu (1 clic / Échap)"
              aria-label="Fermer le menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Contenu Défilant des Liens */}
        <nav className={cn(
          "flex-1 overflow-y-auto custom-scrollbar touch-pan-y overscroll-contain text-left rtl:text-right relative z-10",
          isCollapsed ? "p-2 space-y-3 overflow-x-visible" : "p-4 space-y-5 overflow-x-hidden"
        )}>
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

        {/* Pied de page du menu : Profil & Actions */}
        <SidebarFooter
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
