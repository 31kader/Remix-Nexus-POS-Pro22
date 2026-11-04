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
  renderSectionHeader: (title: string, isOpen: boolean, setIsOpen: (v: boolean) => void, colorDot?: string) => React.ReactNode;
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
      {renderSectionHeader(t("Logistique & Stocks"), isGestionOpen, setIsGestionOpen, "bg-indigo-500")}
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
                icon={<Package size={18} />} 
                label={t("Inventaire & Stock")} 
                active={activeTab === 'inventory'} 
                shortcutKey="F2"
                onClick={() => { setActiveTab('inventory'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            <NavItem 
              href="#carton_reception" 
              icon={<Boxes size={18} className="text-amber-400" />} 
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
                icon={<FileCheck size={18} />} 
                label={t("Bons Réception (BR)")} 
                active={activeTab === 'grns' || activeTab === 'grn'} 
                onClick={() => { setActiveTab('grns'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#audit" 
                icon={<ClipboardCheck size={18} />} 
                label={t("Inventaire Physique")} 
                active={activeTab === 'audit' || activeTab === 'inventory_audit'} 
                onClick={() => { setActiveTab('audit'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#stock_transfers" 
                icon={<Truck size={18} className="text-indigo-400" />} 
                label={t("Transferts Inter-Dépôts")} 
                active={activeTab === 'stock_transfers' || activeTab === 'transfers'} 
                onClick={() => { setActiveTab('stock_transfers'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#expiry" 
                icon={<CalendarClock size={18} />} 
                label={t("Suivi Périmés (DLC)")} 
                active={activeTab === 'expiry'} 
                onClick={() => { setActiveTab('expiry'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#inventory_settings" 
                icon={<FolderTree size={18} />} 
                label={t("Rayons & Catégories")} 
                active={activeTab === 'inventory_settings'} 
                onClick={() => { setActiveTab('inventory_settings'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessVouchers') && (
              <NavItem 
                href="#vouchers" 
                icon={<Tag size={18} />} 
                label={t("Bons & Cartes Cadeaux")} 
                active={activeTab === 'vouchers'} 
                onClick={() => { setActiveTab('vouchers'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessSuppliers') && (
              <NavItem 
                href="#suppliers" 
                icon={<Truck size={18} />} 
                label={t("Fournisseurs")} 
                active={activeTab === 'suppliers'} 
                onClick={() => { setActiveTab('suppliers'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessPurchases') && (
              <NavItem 
                href="#purchases" 
                icon={<ShoppingBag size={18} />} 
                label={t("Bons de Commande")} 
                active={activeTab === 'purchases'} 
                onClick={() => { setActiveTab('purchases'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessExpenses') && (
              <NavItem 
                href="#expenses" 
                icon={<TrendingDown size={18} />} 
                label={t("Dépenses & Charges")} 
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
