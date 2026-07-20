import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, ShoppingBag, Users, History, RotateCcw, Tag, Eye, 
  Package, CalendarClock, FolderTree, Truck, TrendingDown, 
  LayoutDashboard, Brain, FileText, Wallet, UserCog, ShieldCheck, 
  Camera, Settings as SettingsIcon, Database, HelpCircle, Download, 
  Menu, X, LogOut, ChevronDown, ChevronUp 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../translations';
import { RolePermissions, CompanySettings } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  href?: string;
}

function NavItem({ icon, label, active, onClick, collapsed, href }: NavItemProps) {
  return (
    <a
      href={href || "#"}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group relative cursor-pointer border",
        active 
          ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold scale-[1.02]"
          : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/5"
      )}
    >
      <div className={cn(
        "transition-transform duration-300 shrink-0",
        active ? "scale-110 text-indigo-400" : "group-hover:scale-110 group-hover:text-indigo-400"
      )}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </div>
      {!collapsed && (
        <span className="font-semibold text-xs tracking-wide transition-all group-hover:translate-x-1 duration-300">
          {label}
        </span>
      )}
      {active && !collapsed && (
        <span className="absolute right-3 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_#6366f1]" />
      )}
      {collapsed && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 shadow-2xl border border-white/10">
          {label}
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
}

export const Sidebar = ({
  user,
  profile,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
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
  setIsPriceCheckerModalOpen
}: SidebarProps) => {
  const { t } = useTranslation();
  const canAccess = (perm: keyof RolePermissions) => permissions[perm];

  // Accordion open/close state to keep sidebar lightweight
  const [isVentesOpen, setIsVentesOpen] = useState(true);
  const [isGestionOpen, setIsGestionOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  const renderSectionHeader = (title: string, isOpen: boolean, setIsOpen: (v: boolean) => void) => {
    if (!isSidebarOpen && !isMobile) return null;
    return (
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white/60 transition-colors mb-2 cursor-pointer group"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1 h-1 bg-indigo-500 rounded-full opacity-50" />
          {title}
        </span>
        {isOpen ? <ChevronDown size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" /> : <ChevronUp size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
      </button>
    );
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isMobile ? (isMobileOverlayOpen ? '100%' : 0) : (isSidebarOpen ? 260 : 76),
        x: isMobile && !isMobileOverlayOpen ? -300 : 0
      }}
      className={cn(
        "border-r flex flex-col h-full z-40 bg-[#08080c]/90 backdrop-blur-2xl border-white/5 shadow-2xl relative",
        isMobile ? "fixed inset-y-0 left-0" : "relative"
      )}
    >
      {/* Background radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.05),transparent_40%)] pointer-events-none" />

      {isMobile && isMobileOverlayOpen && (
        <button 
          onClick={() => setIsMobileOverlayOpen(false)}
          className="absolute top-5 right-5 p-2 bg-white/5 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all z-50 cursor-pointer"
        >
          <X size={18} />
        </button>
      )}

      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3.5 border-b border-white/5 relative z-10">
        <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/5 hover:rotate-6 transition-transform">
          <ShoppingCart size={20} />
        </div>
        {(isSidebarOpen || isMobile) && (
          <div className="flex flex-col">
            <span className="font-black text-lg truncate text-white tracking-tighter uppercase italic flex items-center gap-1.5">
              NEXUS 
              <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono px-1.5 py-0.5 rounded-md not-italic tracking-normal normal-case">
                v1.2
              </span>
            </span>
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mt-0.5">Systems Guard</span>
          </div>
        )}
      </div>

      {/* Nav Content */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar text-left rtl:text-right relative z-10">
        {/* Ventes */}
        <div className="space-y-1">
          {renderSectionHeader(t("Ventes"), isVentesOpen, setIsVentesOpen)}
          <AnimatePresence initial={false}>
            {(isVentesOpen || (!isSidebarOpen && !isMobile)) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                <NavItem href="#checkout" icon={<ShoppingCart size={20} />} label={t("Caisse")} active={activeTab === 'checkout'} onClick={() => { setActiveTab('checkout'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
                {canAccess('canAccessOnlineOrders') && <NavItem href="#orders" icon={<ShoppingBag size={20} />} label={t("Commandes")} active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessCustomers') && <NavItem href="#customers" icon={<Users size={20} />} label={t("Clients")} active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessSales') && <NavItem href="#transactions" icon={<History size={20} />} label={t("Transactions")} active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessReturns') && <NavItem href="#returns" icon={<RotateCcw size={20} />} label={t("Retours")} active={activeTab === 'returns'} onClick={() => { setActiveTab('returns'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessPromotions') && <NavItem href="#promotions" icon={<Tag size={20} />} label={t("Promotions")} active={activeTab === 'promotions'} onClick={() => { setActiveTab('promotions'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                <NavItem icon={<Eye size={20} />} label={t("Vérificateur")} active={false} onClick={() => { setIsPriceCheckerModalOpen(true); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Gestion */}
        <div className="space-y-1">
          {renderSectionHeader(t("Gestion"), isGestionOpen, setIsGestionOpen)}
          <AnimatePresence initial={false}>
            {(isGestionOpen || (!isSidebarOpen && !isMobile)) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {canAccess('canAccessInventory') && <NavItem href="#inventory" icon={<Package size={20} />} label={t("Inventaire")} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessInventory') && <NavItem href="#expiry" icon={<CalendarClock size={20} />} label={t("Suivi Péremption")} active={activeTab === 'expiry'} onClick={() => { setActiveTab('expiry'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessInventory') && <NavItem href="#inventory_settings" icon={<FolderTree size={20} />} label={t("Classifications")} active={activeTab === 'inventory_settings'} onClick={() => { setActiveTab('inventory_settings'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessVouchers') && <NavItem href="#vouchers" icon={<Tag size={20} />} label={t("Cartes Cadeaux & Bons")} active={activeTab === 'vouchers'} onClick={() => { setActiveTab('vouchers'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessSuppliers') && <NavItem href="#suppliers" icon={<Truck size={20} />} label={t("Fournisseurs")} active={activeTab === 'suppliers'} onClick={() => { setActiveTab('suppliers'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessPurchases') && <NavItem href="#purchases" icon={<ShoppingBag size={20} />} label={t("Achats")} active={activeTab === 'purchases'} onClick={() => { setActiveTab('purchases'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessExpenses') && <NavItem href="#expenses" icon={<TrendingDown size={20} />} label={t("Dépenses")} active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Administration */}
        <div className="space-y-1">
          {renderSectionHeader(t("Administration"), isAdminOpen, setIsAdminOpen)}
          <AnimatePresence initial={false}>
            {(isAdminOpen || (!isSidebarOpen && !isMobile)) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {canAccess('canAccessAnalytics') && <NavItem href="#dashboard" icon={<LayoutDashboard size={20} />} label={t("Tableau de bord")} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessAnalytics') && <NavItem href="#ai_assistant" icon={<Brain size={20} />} label={t("Assistant IA")} active={activeTab === 'ai_assistant'} onClick={() => { setActiveTab('ai_assistant'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessAnalytics') && <NavItem href="#reports" icon={<FileText size={20} />} label={t("Rapports")} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessShifts') && <NavItem href="#shifts" icon={<Wallet size={20} />} label={t("Clôture")} active={activeTab === 'shifts'} onClick={() => { setActiveTab('shifts'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessEmployees') && <NavItem href="#employees" icon={<UserCog size={20} />} label={t("Personnel & Accès")} active={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessAuditLogs') && <NavItem href="#audit_logs" icon={<ShieldCheck size={20} />} label={t("Audit")} active={activeTab === 'audit_logs'} onClick={() => { setActiveTab('audit_logs'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {(isCameraAgent || isAdmin || isManager) && settings.enableCameraPortal !== false && <NavItem href="#camera" icon={<Camera size={20} />} label={t("Audit Caméra")} active={activeTab === 'camera'} onClick={() => { setActiveTab('camera'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessSettings') && <NavItem href="#settings" icon={<SettingsIcon size={20} />} label={t("Paramètres")} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                {canAccess('canAccessSettings') && <NavItem href="#archives" icon={<Database size={20} />} label={t("Clôture de Mois")} active={activeTab === 'archives'} onClick={() => { setActiveTab('archives'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />}
                <NavItem href="#help" icon={<HelpCircle size={20} />} label={t("Aide")} active={activeTab === 'help'} onClick={() => { setActiveTab('help'); setIsMobileOverlayOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Footer Profile & Toggles */}
      <div className="p-4 border-t border-white/5 space-y-3 bg-[#050508]/50 relative z-10">
        {deferredPrompt && (
          <button 
            onClick={handleInstallApp}
            className="w-full p-3 rounded-xl flex items-center justify-center gap-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 transition-all font-black text-[9px] uppercase tracking-widest ring-1 ring-indigo-500/20 cursor-pointer"
          >
            <Download size={14} />
            {(isSidebarOpen || isMobile) && "Installer l'App"}
          </button>
        )}
        
        {!isMobile && (
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full p-2.5 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer border border-transparent hover:border-white/5"
          >
            <Menu size={16} />
          </button>
        )}

        <div className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-2xl border border-white/5 shadow-inner">
          {user.photoURL ? (
            <img src={user.photoURL} className="w-9 h-9 rounded-xl border border-white/10 shadow-lg object-cover" referrerPolicy="no-referrer" alt={user.displayName} />
          ) : (
            <div className="w-9 h-9 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0">
              {user.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          {(isSidebarOpen || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-white uppercase tracking-tight italic">{user.displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                <p className="text-[8px] text-slate-500 truncate uppercase font-bold tracking-widest">{profile?.role || 'User'}</p>
              </div>
            </div>
          )}
          {(isSidebarOpen || isMobile) && (
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" title="Se déconnecter">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
