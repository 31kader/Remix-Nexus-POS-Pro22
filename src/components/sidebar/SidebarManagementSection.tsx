import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Boxes, FileCheck, ClipboardCheck, CalendarClock, 
  FolderTree, Tag, Truck, ShoppingBag, TrendingDown 
} from 'lucide-react';
import { NavItem } from './NavItem';
import { RolePermissions } from '../../types';

export interface SidebarManagementSectionProps {
  t: (key: string) => string;
  isGestionOpen: boolean;
  setIsGestionOpen: (open: boolean) => void;
  isCollapsed: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsMobileOverlayOpen: (open: boolean) => void;
  canAccess: (perm: keyof RolePermissions) => boolean;
  renderSectionHeader: (title: string, isOpen: boolean, setIsOpen: (v: boolean) => void) => React.ReactNode;
}

export const SidebarManagementSection: React.FC<SidebarManagementSectionProps> = ({
  t,
  isGestionOpen,
  setIsGestionOpen,
  isCollapsed,
  activeTab,
  setActiveTab,
  setIsMobileOverlayOpen,
  canAccess,
  renderSectionHeader
}) => {
  return (
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
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#inventory" 
                icon={<Package size={20} />} 
                label={t("Inventaire")} 
                active={activeTab === 'inventory'} 
                onClick={() => { setActiveTab('inventory'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            <NavItem 
              href="#carton_reception" 
              icon={<Boxes size={20} className="text-amber-400" />} 
              label={t("Réception Cartons")} 
              active={activeTab === 'carton_reception' || activeTab === 'cartons'} 
              onClick={() => { setActiveTab('carton_reception'); setIsMobileOverlayOpen(false); }} 
              collapsed={isCollapsed} 
              badge="IA" 
              badgePulse 
            />
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#grns" 
                icon={<FileCheck size={20} />} 
                label={t("Bons de Réception (BR)")} 
                active={activeTab === 'grns' || activeTab === 'grn'} 
                onClick={() => { setActiveTab('grns'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#audit" 
                icon={<ClipboardCheck size={20} />} 
                label={t("Inventaire Physique")} 
                active={activeTab === 'audit' || activeTab === 'inventory_audit'} 
                onClick={() => { setActiveTab('audit'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#expiry" 
                icon={<CalendarClock size={20} />} 
                label={t("Suivi Péremption")} 
                active={activeTab === 'expiry'} 
                onClick={() => { setActiveTab('expiry'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#inventory_settings" 
                icon={<FolderTree size={20} />} 
                label={t("Classifications")} 
                active={activeTab === 'inventory_settings'} 
                onClick={() => { setActiveTab('inventory_settings'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessVouchers') && (
              <NavItem 
                href="#vouchers" 
                icon={<Tag size={20} />} 
                label={t("Cartes Cadeaux & Bons")} 
                active={activeTab === 'vouchers'} 
                onClick={() => { setActiveTab('vouchers'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessSuppliers') && (
              <NavItem 
                href="#suppliers" 
                icon={<Truck size={20} />} 
                label={t("Fournisseurs")} 
                active={activeTab === 'suppliers'} 
                onClick={() => { setActiveTab('suppliers'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessPurchases') && (
              <NavItem 
                href="#purchases" 
                icon={<ShoppingBag size={20} />} 
                label={t("Achats")} 
                active={activeTab === 'purchases'} 
                onClick={() => { setActiveTab('purchases'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessExpenses') && (
              <NavItem 
                href="#expenses" 
                icon={<TrendingDown size={20} />} 
                label={t("Dépenses")} 
                active={activeTab === 'expenses'} 
                onClick={() => { setActiveTab('expenses'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
