import { describe, it, expect } from 'vitest';
import { isTabAllowed, TAB_PERMISSION_MAP } from '../src/lib/permissions';
import { DEFAULT_PERMISSIONS } from '../src/constants';
import { RolePermissions } from '../src/types';

describe('🛡️ Permission Strategy & Tab Access Control Suite', () => {
  const createCanAccess = (permissions: RolePermissions) => {
    return (perm: keyof RolePermissions) => !!permissions[perm];
  };

  describe('1. Vérification des accès par Rôle (Règle Métier & Sécurité)', () => {
    it('Autorise l\'administrateur ou l\'owner sur tous les onglets sensibles sans exception', () => {
      const adminCanAccess = createCanAccess(DEFAULT_PERMISSIONS.admin);
      const sensitiveTabs = ['reports', 'inventory', 'settings', 'sync_studio', 'employees', 'archives', 'purchases'];

      for (const tab of sensitiveTabs) {
        expect(isTabAllowed(tab, adminCanAccess, { isAdmin: true, isOwner: true })).toBe(true);
      }
    });

    it('Bloque strictement l\'accès aux Rapports (canAccessAnalytics) pour un Caissier', () => {
      const cashierCanAccess = createCanAccess(DEFAULT_PERMISSIONS.cashier);
      const isAllowed = isTabAllowed('reports', cashierCanAccess, { isAdmin: false, isOwner: false, isManager: false });
      expect(isAllowed).toBe(false);
    });

    it('Bloque strictement l\'accès à l\'Inventaire et Gestion de Stock pour un Caissier', () => {
      const cashierCanAccess = createCanAccess(DEFAULT_PERMISSIONS.cashier);
      const inventoryTabs = ['inventory', 'expiry', 'grns', 'audit', 'inventory_settings', 'catalog_printer'];

      for (const tab of inventoryTabs) {
        expect(isTabAllowed(tab, cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      }
    });

    it('Bloque strictement l\'accès aux Paramètres et au Studio de Synchro pour un Caissier', () => {
      const cashierCanAccess = createCanAccess(DEFAULT_PERMISSIONS.cashier);
      expect(isTabAllowed('settings', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      expect(isTabAllowed('sync_studio', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      expect(isTabAllowed('employees', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      expect(isTabAllowed('archives', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
    });

    it('Autorise le Caissier sur ses modules légitimes de travail (Caisse, Ventes, Clients, Retours, Sessions)', () => {
      const cashierCanAccess = createCanAccess(DEFAULT_PERMISSIONS.cashier);
      expect(isTabAllowed('checkout', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(true);
      expect(isTabAllowed('transactions', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(true);
      expect(isTabAllowed('customers', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(true);
      expect(isTabAllowed('returns', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(true);
      expect(isTabAllowed('shifts', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(true);
    });

    it('Autorise le Gérant (Manager) sur l\'inventaire et les rapports mais bloque les Paramètres globaux', () => {
      const managerCanAccess = createCanAccess(DEFAULT_PERMISSIONS.manager);
      expect(isTabAllowed('reports', managerCanAccess, { isAdmin: false, isOwner: false, isManager: true })).toBe(true);
      expect(isTabAllowed('inventory', managerCanAccess, { isAdmin: false, isOwner: false, isManager: true })).toBe(true);
      expect(isTabAllowed('settings', managerCanAccess, { isAdmin: false, isOwner: false, isManager: true })).toBe(false);
      expect(isTabAllowed('sync_studio', managerCanAccess, { isAdmin: false, isOwner: false, isManager: true })).toBe(false);
    });
  });

  describe('2. Table de Cartographie TAB_PERMISSION_MAP', () => {
    it('Définit une permission pour chaque onglet critique du système', () => {
      expect(TAB_PERMISSION_MAP.reports).toBe('canAccessAnalytics');
      expect(TAB_PERMISSION_MAP.inventory).toBe('canAccessInventory');
      expect(TAB_PERMISSION_MAP.settings).toBe('canAccessSettings');
      expect(TAB_PERMISSION_MAP.employees).toBe('canAccessEmployees');
      expect(TAB_PERMISSION_MAP.sync_studio).toBe('admin_only');
      expect(TAB_PERMISSION_MAP.checkout).toBeNull();
    });
  });
});
