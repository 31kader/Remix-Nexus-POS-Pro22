import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Wallet, UserCog, UserCheck, Image as ImageIcon, 
  Printer, ShieldCheck, Camera, Settings as SettingsIcon, 
  Activity, Database, HelpCircle 
} from 'lucide-react';
import { NavItem } from './NavItem';
import { RolePermissions, CompanySettings } from '../../types';

export interface SidebarAdminSectionProps {
  t: (key: string) => string;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isCollapsed: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsMobileOverlayOpen: (open: boolean) => void;
  canAccess: (perm: keyof RolePermissions) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCameraAgent: boolean;
  settings: CompanySettings;
  renderSectionHeader: (title: string, isOpen: boolean, setIsOpen: (v: boolean) => void) => React.ReactNode;
}

export const SidebarAdminSection: React.FC<SidebarAdminSectionProps> = ({
  t,
  isAdminOpen,
  setIsAdminOpen,
  isCollapsed,
  activeTab,
  setActiveTab,
  setIsMobileOverlayOpen,
  canAccess,
  isAdmin,
  isManager,
  isCameraAgent,
  settings,
  renderSectionHeader
}) => {
  return (
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
            {canAccess('canAccessAnalytics') && (
              <NavItem 
                href="#reports" 
                icon={<FileText size={20} />} 
                label={t("Rapports")} 
                active={activeTab === 'reports'} 
                onClick={() => { setActiveTab('reports'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessShifts') && (
              <NavItem 
                href="#shifts" 
                icon={<Wallet size={20} />} 
                label={t("Clôture")} 
                active={activeTab === 'shifts'} 
                onClick={() => { setActiveTab('shifts'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessEmployees') && (
              <NavItem 
                href="#employees" 
                icon={<UserCog size={20} />} 
                label={t("Personnel & Accès")} 
                active={activeTab === 'employees'} 
                onClick={() => { setActiveTab('employees'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessEmployees') && (
              <NavItem 
                href="#team" 
                icon={<UserCheck size={20} />} 
                label={t("Planning & Équipe")} 
                active={activeTab === 'team'} 
                onClick={() => { setActiveTab('team'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#marketing" 
                icon={<ImageIcon size={20} />} 
                label={t("Affiches & Posters")} 
                active={activeTab === 'marketing' || activeTab === 'posters'} 
                onClick={() => { setActiveTab('marketing'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessInventory') && (
              <NavItem 
                href="#catalog_printer" 
                icon={<Printer size={20} />} 
                label={t("Impression Catalogue")} 
                active={activeTab === 'catalog_printer' || activeTab === 'labels'} 
                onClick={() => { setActiveTab('catalog_printer'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessAuditLogs') && (
              <NavItem 
                href="#audit_logs" 
                icon={<ShieldCheck size={20} />} 
                label={t("Audit")} 
                active={activeTab === 'audit_logs'} 
                onClick={() => { setActiveTab('audit_logs'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {(isCameraAgent || isAdmin || isManager) && settings.enableCameraPortal !== false && (
              <NavItem 
                href="#camera" 
                icon={<Camera size={20} />} 
                label={t("Audit Caméra")} 
                active={activeTab === 'camera'} 
                onClick={() => { setActiveTab('camera'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessSettings') && (
              <NavItem 
                href="#settings" 
                icon={<SettingsIcon size={20} />} 
                label={t("Paramètres")} 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {isAdmin && (settings as any)?.hideSyncStudioInSidebar !== true && (
              <NavItem 
                href="#sync_studio" 
                icon={<Activity size={20} />} 
                label="Studio de Synchro" 
                active={activeTab === 'sync_studio' || activeTab === 'sync'} 
                onClick={() => { setActiveTab('sync_studio'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            {canAccess('canAccessSettings') && (
              <NavItem 
                href="#archives" 
                icon={<Database size={20} />} 
                label={t("Clôture de Mois")} 
                active={activeTab === 'archives'} 
                onClick={() => { setActiveTab('archives'); setIsMobileOverlayOpen(false); }} 
                collapsed={isCollapsed} 
              />
            )}
            <NavItem 
              href="#help" 
              icon={<HelpCircle size={20} />} 
              label={t("Confidentialité & Aide")} 
              active={activeTab === 'help'} 
              onClick={() => { setActiveTab('help'); setIsMobileOverlayOpen(false); }} 
              collapsed={isCollapsed} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
