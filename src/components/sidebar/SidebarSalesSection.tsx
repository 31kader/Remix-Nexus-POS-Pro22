import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, ShoppingBag, Users, History, RotateCcw, Tag, Eye, 
  Monitor, QrCode 
} from 'lucide-react';
import { NavItem } from './NavItem';
import { RolePermissions } from '../../types';

export interface SidebarSalesSectionProps {
  t: (key: string) => string;
  isVentesOpen: boolean;
  setIsVentesOpen: (open: boolean) => void;
  isCollapsed: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsMobileOverlayOpen: (open: boolean) => void;
  isMobile: boolean;
  setSidebarMode?: (mode: 'open' | 'collapsed' | 'closed') => void;
  canAccess: (perm: keyof RolePermissions) => boolean;
  pendingOrdersCount: number;
  setIsPriceCheckerModalOpen: (open: boolean) => void;
  setIsStorePosterModalOpen?: (open: boolean) => void;
  renderSectionHeader: (title: string, isOpen: boolean, setIsOpen: (v: boolean) => void) => React.ReactNode;
}

export const SidebarSalesSection: React.FC<SidebarSalesSectionProps> = ({
  t,
  isVentesOpen,
  setIsVentesOpen,
  isCollapsed,
  activeTab,
  setActiveTab,
  setIsMobileOverlayOpen,
  isMobile,
  setSidebarMode,
  canAccess,
  pendingOrdersCount,
  setIsPriceCheckerModalOpen,
  setIsStorePosterModalOpen,
  renderSectionHeader
}) => {
  return (
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
            <NavItem 
              href="#checkout" 
              icon={<ShoppingCart size={20} />} 
              label={t("Caisse")} 
              active={activeTab === 'checkout'} 
              onClick={() => { 
                setActiveTab('checkout'); 
                setIsMobileOverlayOpen(false); 
                if (!isMobile && setSidebarMode) setSidebarMode('closed');
              }} 
              collapsed={isCollapsed} 
            />
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
            {canAccess('canAccessCustomers') && (
              <NavItem 
                href="#customers" 
                icon={<Users size={20} />} 
                label={t("Clients")} 
                active={activeTab === 'customers'} 
                onClick={() => { setActiveTab('customers'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessSales') && (
              <NavItem 
                href="#transactions" 
                icon={<History size={20} />} 
                label={t("Transactions")} 
                active={activeTab === 'transactions'} 
                onClick={() => { setActiveTab('transactions'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessReturns') && (
              <NavItem 
                href="#returns" 
                icon={<RotateCcw size={20} />} 
                label={t("Retours")} 
                active={activeTab === 'returns'} 
                onClick={() => { setActiveTab('returns'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessPromotions') && (
              <NavItem 
                href="#promotions" 
                icon={<Tag size={20} />} 
                label={t("Promotions")} 
                active={activeTab === 'promotions'} 
                onClick={() => { setActiveTab('promotions'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            <NavItem 
              icon={<Eye size={20} />} 
              label={t("Vérificateur")} 
              active={false} 
              onClick={() => { setIsPriceCheckerModalOpen(true); setIsMobileOverlayOpen(false); }} 
              collapsed={isCollapsed} 
            />
            <NavItem 
              href="/?mode=kiosk" 
              icon={<Monitor size={20} />} 
              label={t("Borne Kiosque")} 
              active={false} 
              onClick={() => { window.open('/?mode=kiosk', '_blank'); setIsMobileOverlayOpen(false); }} 
              collapsed={isCollapsed} 
            />
            {setIsStorePosterModalOpen && (
              <NavItem 
                icon={<QrCode size={20} />} 
                label={t("Affiche QR Client")} 
                active={false} 
                onClick={() => { setIsStorePosterModalOpen(true); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
