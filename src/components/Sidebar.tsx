import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, ShoppingBag, Users, History, RotateCcw, Tag, Eye, 
  Package, CalendarClock, FolderTree, Truck, TrendingDown, 
  LayoutDashboard, Brain, FileText, Wallet, UserCog, ShieldCheck, 
  Camera, Settings as SettingsIcon, Database, HelpCircle, Download, 
  Menu, X, LogOut, ChevronDown, ChevronUp, Activity,
  FileCheck, ClipboardCheck, UserCheck, Image as ImageIcon, Printer,
  ExternalLink, Monitor, QrCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../translations';
import { RolePermissions, CompanySettings } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';
import { SafeImage } from './ui/SafeImage';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  href?: string;
  badge?: number | string;
  badgePulse?: boolean;
}

function NavItem({ icon, label, active, onClick, collapsed, href, badge, badgePulse }: NavItemProps) {
  return (
    <a
      href={href || "#"}
      tabIndex={-1}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || (e as any).button === 1) {
          return;
        }
        e.preventDefault();
        if (typeof onClick === 'function') {
          onClick();
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1 && href && href !== '#') {
          window.open(href, '_blank');
        }
      }}
      className={cn(
        "flex items-center gap-2.5 py-2 rounded-lg transition-colors duration-100 group relative cursor-pointer border touch-manipulation",
        collapsed 
          ? "justify-center px-0 w-10 h-10 mx-auto" 
          : "px-3",
        active 
          ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-bold"
          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 border-transparent"
      )}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center",
        active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
      )}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </div>

      {!collapsed && (
        <span className="font-medium text-xs truncate">
          {label}
        </span>
      )}
      
      {!collapsed && href && href !== '#' && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(href, '_blank', 'width=1400,height=900');
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded transition-opacity ml-auto"
          title="Ouvrir dans une nouvelle fenêtre (2ème écran)"
        >
          <ExternalLink size={12} />
        </button>
      )}

      {badge !== undefined && Number(badge) > 0 && (
        <span className={cn(
          "px-1.5 py-0.5 text-[10px] font-bold rounded-md",
          collapsed ? "absolute -top-1 -right-1 px-1 py-0 text-[8px]" : (href && href !== '#' ? "ml-1" : "ml-auto"),
          badgePulse 
            ? "bg-amber-500 text-slate-950 animate-pulse" 
            : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
        )}>
          {badge}
        </span>
      )}

      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl flex items-center gap-1.5 transition-all">
          <span>{label}</span>
          {href && href !== '#' && <ExternalLink size={10} className="text-indigo-400" />}
        </div>
      )}
    </a>
  );
}

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
  const canAccess = (perm: keyof RolePermissions) => permissions[perm];

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
          "flex flex-col h-full bg-zinc-950 border-r border-zinc-800 shadow-xl overflow-hidden select-none",
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
                    v1.2.26
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

          {/* Bouton Réduire sur PC */}
          {!isMobile && !isCollapsed && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                if (cycleSidebarMode) cycleSidebarMode();
                else setIsSidebarOpen(!isSidebarOpen);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Réduire le menu"
            >
              <Menu size={15} />
            </button>
          )}
        </div>

        {/* Contenu Défilant des Liens */}
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y overscroll-contain text-left rtl:text-right relative z-10",
          isCollapsed ? "p-2 space-y-3" : "p-4 space-y-5"
        )}>
          {/* Section Ventes */}
          <div className="space-y-1">
            {renderSectionHeader(t("Ventes"), isVentesOpen, setIsVentesOpen)}
            <AnimatePresence initial={false}>
              {(isVentesOpen || isCollapsed) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <NavItem href="#checkout" icon={<ShoppingCart size={20} />} label={t("Caisse")} active={activeTab === 'checkout'} onClick={() => { setActiveTab('checkout'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />
                  {canAccess('canAccessOnlineOrders') && (
                    <NavItem 
                      href="#orders" 
                      icon={<ShoppingBag size={20} />} 
                      label={t("Commandes")} 
                      active={activeTab === 'orders'} 
                      onClick={() => { setActiveTab('orders'); setIsMobileOverlayOpen(false); }} 
                      collapsed={isCollapsed}
                      badge={pendingOrdersCount > 0 ? pendingOrdersCount : undefined}
                      badgePulse={pendingOrdersCount > 0}
                    />
                  )}
                  {canAccess('canAccessCustomers') && <NavItem href="#customers" icon={<Users size={20} />} label={t("Clients")} active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessSales') && <NavItem href="#transactions" icon={<History size={20} />} label={t("Transactions")} active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessReturns') && <NavItem href="#returns" icon={<RotateCcw size={20} />} label={t("Retours")} active={activeTab === 'returns'} onClick={() => { setActiveTab('returns'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessPromotions') && <NavItem href="#promotions" icon={<Tag size={20} />} label={t("Promotions")} active={activeTab === 'promotions'} onClick={() => { setActiveTab('promotions'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  <NavItem icon={<Eye size={20} />} label={t("Vérificateur")} active={false} onClick={() => { setIsPriceCheckerModalOpen(true); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />
                  <NavItem href="/?mode=kiosk" icon={<Monitor size={20} />} label={t("Borne Kiosque")} active={false} onClick={() => { window.open('/?mode=kiosk', '_blank'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />
                  {setIsStorePosterModalOpen && (
                    <NavItem icon={<QrCode size={20} />} label={t("Affiche QR Client")} active={false} onClick={() => { setIsStorePosterModalOpen(true); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section Gestion */}
          <div className="space-y-1">
            {renderSectionHeader(t("Gestion"), isGestionOpen, setIsGestionOpen)}
            <AnimatePresence initial={false}>
              {(isGestionOpen || isCollapsed) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  {canAccess('canAccessInventory') && <NavItem href="#inventory" icon={<Package size={20} />} label={t("Inventaire")} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessInventory') && <NavItem href="#grns" icon={<FileCheck size={20} />} label={t("Bons de Réception (BR)")} active={activeTab === 'grns' || activeTab === 'grn'} onClick={() => { setActiveTab('grns'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessInventory') && <NavItem href="#audit" icon={<ClipboardCheck size={20} />} label={t("Inventaire Physique")} active={activeTab === 'audit' || activeTab === 'inventory_audit'} onClick={() => { setActiveTab('audit'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessInventory') && <NavItem href="#expiry" icon={<CalendarClock size={20} />} label={t("Suivi Péremption")} active={activeTab === 'expiry'} onClick={() => { setActiveTab('expiry'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessInventory') && <NavItem href="#inventory_settings" icon={<FolderTree size={20} />} label={t("Classifications")} active={activeTab === 'inventory_settings'} onClick={() => { setActiveTab('inventory_settings'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessVouchers') && <NavItem href="#vouchers" icon={<Tag size={20} />} label={t("Cartes Cadeaux & Bons")} active={activeTab === 'vouchers'} onClick={() => { setActiveTab('vouchers'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessSuppliers') && <NavItem href="#suppliers" icon={<Truck size={20} />} label={t("Fournisseurs")} active={activeTab === 'suppliers'} onClick={() => { setActiveTab('suppliers'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessPurchases') && <NavItem href="#purchases" icon={<ShoppingBag size={20} />} label={t("Achats")} active={activeTab === 'purchases'} onClick={() => { setActiveTab('purchases'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessExpenses') && <NavItem href="#expenses" icon={<TrendingDown size={20} />} label={t("Dépenses")} active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section Administration */}
          <div className="space-y-1">
            {renderSectionHeader(t("Administration"), isAdminOpen, setIsAdminOpen)}
            <AnimatePresence initial={false}>
              {(isAdminOpen || isCollapsed) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  {canAccess('canAccessAnalytics') && <NavItem href="#reports" icon={<FileText size={20} />} label={t("Rapports")} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessShifts') && <NavItem href="#shifts" icon={<Wallet size={20} />} label={t("Clôture")} active={activeTab === 'shifts'} onClick={() => { setActiveTab('shifts'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessEmployees') && <NavItem href="#employees" icon={<UserCog size={20} />} label={t("Personnel & Accès")} active={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessEmployees') && <NavItem href="#team" icon={<UserCheck size={20} />} label={t("Planning & Équipe")} active={activeTab === 'team'} onClick={() => { setActiveTab('team'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessInventory') && <NavItem href="#marketing" icon={<ImageIcon size={20} />} label={t("Affiches & Posters")} active={activeTab === 'marketing' || activeTab === 'posters'} onClick={() => { setActiveTab('marketing'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessInventory') && <NavItem href="#catalog_printer" icon={<Printer size={20} />} label={t("Impression Catalogue")} active={activeTab === 'catalog_printer' || activeTab === 'labels'} onClick={() => { setActiveTab('catalog_printer'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessAuditLogs') && <NavItem href="#audit_logs" icon={<ShieldCheck size={20} />} label={t("Audit")} active={activeTab === 'audit_logs'} onClick={() => { setActiveTab('audit_logs'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {(isCameraAgent || isAdmin || isManager) && settings.enableCameraPortal !== false && <NavItem href="#camera" icon={<Camera size={20} />} label={t("Audit Caméra")} active={activeTab === 'camera'} onClick={() => { setActiveTab('camera'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {canAccess('canAccessSettings') && <NavItem href="#settings" icon={<SettingsIcon size={20} />} label={t("Paramètres")} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  {(settings as any)?.hideSyncStudioInSidebar !== true && (
                    <NavItem href="#sync_studio" icon={<Activity size={20} />} label="Studio de Synchro" active={activeTab === 'sync_studio' || activeTab === 'sync'} onClick={() => { setActiveTab('sync_studio'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />
                  )}
                  {canAccess('canAccessSettings') && <NavItem href="#archives" icon={<Database size={20} />} label={t("Clôture de Mois")} active={activeTab === 'archives'} onClick={() => { setActiveTab('archives'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />}
                  <NavItem href="#help" icon={<HelpCircle size={20} />} label={t("Confidentialité & Aide")} active={activeTab === 'help'} onClick={() => { setActiveTab('help'); setIsMobileOverlayOpen(false); }} collapsed={isCollapsed} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Pied de page du menu : Profil & Actions */}
        <div className={cn(
          "border-t border-white/5 bg-[#050508]/50 relative z-10 shrink-0",
          isCollapsed ? "p-2" : "p-4 space-y-3"
        )}>
          {deferredPrompt && !isCollapsed && (
            <button 
              onClick={handleInstallApp}
              className="w-full p-2.5 rounded-xl flex items-center justify-center gap-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 transition-all font-black text-[9px] uppercase tracking-widest ring-1 ring-indigo-500/20 cursor-pointer"
            >
              <Download size={14} />
              <span>Installer l'App</span>
            </button>
          )}

          {/* Si menu réduit sur PC : bouton pour agrandir */}
          {!isMobile && isCollapsed && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                if (cycleSidebarMode) cycleSidebarMode();
                else setIsSidebarOpen(true);
              }}
              className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mb-2"
              title="Agrandir le menu"
            >
              <Menu size={16} />
            </button>
          )}

          {/* Boutons Réduire / Fermer sur PC (quand ouvert) */}
          {!isMobile && !isCollapsed && (
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                tabIndex={-1}
                onClick={() => {
                  if (cycleSidebarMode) cycleSidebarMode();
                  else setIsSidebarOpen(!isSidebarOpen);
                }}
                aria-label="Réduire ou fermer le menu latéral"
                title={sidebarMode === 'open' ? "Réduire en icônes" : "Agrandir le menu"}
                className="flex-1 p-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors bg-white/[0.03] hover:bg-indigo-600/20 text-slate-400 hover:text-white cursor-pointer border border-white/5 hover:border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider"
              >
                <Menu size={15} />
                <span>Réduire</span>
              </button>
              {setSidebarMode && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setSidebarMode('closed')}
                  title="Fermer complètement (0px)"
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          {/* Profil Utilisateur */}
          <div className={cn(
            "flex items-center transition-colors rounded-xl border border-white/5 shadow-inner bg-white/[0.02]",
            isCollapsed ? "p-1.5 justify-center" : "gap-3 p-3"
          )}>
            {user.photoURL ? (
              <SafeImage 
                src={user.photoURL} 
                className="w-9 h-9 rounded-xl border border-white/10 shadow-lg object-cover shrink-0" 
                alt={user.displayName}
                fallback={
                  <div className="w-9 h-9 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                }
              />
            ) : (
              <div className="w-9 h-9 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-white uppercase tracking-tight">{user.displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                    <p className="text-[8px] text-slate-500 truncate uppercase font-bold tracking-widest">{profile?.role || 'User'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  aria-label="Se déconnecter" 
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" 
                  title="Se déconnecter"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
};
