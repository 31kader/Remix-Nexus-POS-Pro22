import { RolePermissions } from '../types';

/**
 * 🛡️ NEXUS PERMISSION GUARD — Table de correspondance stricte Onglet <-> Permission
 * Assure une défense en profondeur contre l'accès non autorisé à des modules sensibles
 * (Rapports financiers, gestion de stock, salaires, journaux d'audit, paramètres).
 */
export const TAB_PERMISSION_MAP: Record<string, keyof RolePermissions | 'admin_only' | null> = {
  // --- Modules POS Vente & Caisse (Accessibles Caissier / Vendeur) ---
  checkout: null,
  caisse: null,
  pos: null,
  dashboard: null,
  ai_assistant: null,

  // --- Analytique & Rapports Financiers (Bénéfices, CA, Marges, Rapprochements) ---
  reports: 'canAccessAnalytics',

  // --- Gestion de Stock & Inventaire ---
  inventory: 'canAccessInventory',
  expiry: 'canAccessInventory',
  inventory_settings: 'canAccessInventory',
  marketing: 'canAccessInventory',
  posters: 'canAccessInventory',
  catalog_printer: 'canAccessInventory',
  labels: 'canAccessInventory',
  label_printer: 'canAccessInventory',
  grns: 'canAccessInventory',
  grn: 'canAccessInventory',
  audit: 'canAccessInventory',
  inventory_audit: 'canAccessInventory',

  // --- Gestion Commerciale & Clients ---
  transactions: 'canAccessSales',
  customers: 'canAccessCustomers',
  returns: 'canAccessReturns',
  promotions: 'canAccessPromotions',
  vouchers: 'canAccessVouchers',
  orders: 'canAccessOnlineOrders',

  // --- Achats & Dépenses Fournisseurs ---
  purchases: 'canAccessPurchases',
  suppliers: 'canAccessSuppliers',
  expenses: 'canAccessExpenses',
  shifts: 'canAccessShifts',

  // --- Personnel, Salaires & Équipe ---
  employees: 'canAccessEmployees',
  team: 'canAccessEmployees',

  // --- Administration Système & Outils Critiques ---
  camera: null, // Vérifié par rôle (camera_agent, admin, manager)
  settings: 'canAccessSettings',
  archives: 'canAccessSettings',
  audit_logs: 'canAccessAuditLogs',
  sync_studio: 'admin_only',
  sync: 'admin_only',

  // --- Aide & Informations Légales ---
  help: null
};

/**
 * Vérifie si un onglet donné est autorisé pour le profil utilisateur actif.
 */
export function isTabAllowed(
  tab: string,
  canAccess?: (permission: keyof RolePermissions) => boolean,
  options?: {
    isAdmin?: boolean;
    isOwner?: boolean;
    isManager?: boolean;
    isCameraAgent?: boolean;
  }
): boolean {
  const { isAdmin = false, isOwner = false, isManager = false, isCameraAgent = false } = options || {};

  // 🛡️ Seul l'owner authentifié (vérifié par checkIsOwner contre .env) a un court-circuit universel immédiat
  if (isOwner) return true;

  // Cas spécifique : module Caméra
  if (tab === 'camera') {
    return isCameraAgent || isManager || (isAdmin && (canAccess ? canAccess('canAccessInventory') : false));
  }

  const requiredPermission = TAB_PERMISSION_MAP[tab];

  // Onglet libre sans restriction (ex: caisse, aide)
  if (requiredPermission === null || requiredPermission === undefined) {
    return true;
  }

  // Onglet réservé exclusivement à l'administrateur
  if (requiredPermission === 'admin_only') {
    return isOwner || (isAdmin && (canAccess ? canAccess('canAccessSettings') : false));
  }

  // Vérifier la permission accordée au rôle via canAccess
  if (!canAccess) return false;
  return canAccess(requiredPermission);
}
