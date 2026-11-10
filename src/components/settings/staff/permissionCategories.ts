import { RolePermissions } from '../../../types';

export interface PermissionDefinition {
  key: keyof RolePermissions;
  label: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  title: string;
  badgeColor: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'pos_sales',
    title: '1. Ventes & Caisse Directe',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    permissions: [
      { key: 'canAccessSales', label: 'Accès au module Caisse (POS)', description: 'Ouvrir la caisse et enregistrer des ventes au comptoir' },
      { key: 'canApplyDiscount', label: 'Appliquer une remise sur ticket', description: 'Accorder une réduction en % ou en DA sur la commande' },
      { key: 'canModifyPrices', label: 'Modifier les prix unitaires', description: 'Changer manuellement le prix d\'un article lors de l\'encaissement' },
      { key: 'canVoidTransaction', label: 'Annuler une vente / Ligne', description: 'Supprimer un ticket en cours ou purger une commande' },
      { key: 'canAccessReturns', label: 'Traiter les retours d\'articles', description: 'Accepter les retours clients et réintégrer le stock' },
      { key: 'canAccessPromotions', label: 'Gérer les promotions', description: 'Créer et appliquer les offres promotionnelles' },
      { key: 'canAccessVouchers', label: 'Gérer les bons d\'achat', description: 'Émettre ou scanner des coupons et bons de réduction' },
    ]
  },
  {
    id: 'inventory_procurement',
    title: '2. Stocks, Catalogue & Réceptions',
    badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    permissions: [
      { key: 'canAccessInventory', label: 'Consulter le catalogue produits', description: 'Visualiser les articles, fiches, codes-barres et niveaux de stock' },
      { key: 'canAccessPurchases', label: 'Bons d\'achats & Commandes', description: 'Créer des bons de commande auprès des fournisseurs' },
      { key: 'canAccessSuppliers', label: 'Fichier des Fournisseurs', description: 'Gérer les coordonnées, conditions et historiques fournisseurs' },
    ]
  },
  {
    id: 'customers_relations',
    title: '3. Clients & Crédits',
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    permissions: [
      { key: 'canAccessCustomers', label: 'Fichier Clients & Fidélité', description: 'Créer de nouveaux clients, consulter soldes et points' },
      { key: 'canAccessOnlineOrders', label: 'Commandes en Ligne & Web', description: 'Valider et préparer les commandes Click & Collect et livraisons' },
    ]
  },
  {
    id: 'cash_finances',
    title: '4. Sessions Caisse, Clôture & Dépenses',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    permissions: [
      { key: 'canAccessShifts', label: 'Gestion des sessions de caisse (X/Z)', description: 'Ouvrir la journée de caisse, compter le fond et clôturer' },
      { key: 'canAccessExpenses', label: 'Enregistrer des dépenses directes', description: 'Saisir les sorties de caisse pour frais et charges courantes' },
      { key: 'canAccessAnalytics', label: 'Rapports financiers & Chiffre d\'Affaires', description: 'Consulter les bénéfices, marges, ventilation TVA et totaux' },
    ]
  },
  {
    id: 'admin_security',
    title: '5. Administration, Équipe & Système',
    badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
    permissions: [
      { key: 'canAccessEmployees', label: 'Gestion du Personnel & Salaires', description: 'Créer des employés, pointages horaires et avances sur salaire' },
      { key: 'canManageUsers', label: 'Gestion des comptes d\'accès', description: 'Attribuer les rôles et identifiants de connexion' },
      { key: 'canAccessAuditLogs', label: 'Journaux d\'audit de sécurité', description: 'Pister les ouvertures de tiroir, annulations et modifications sensibles' },
      { key: 'canAccessSettings', label: 'Paramètres généraux du magasin', description: 'Modifier les coordonnées légales, tickets, imprimantes et LAN' },
    ]
  }
];

export const ROLE_LABELS: Record<string, { label: string; badge: string; desc: string }> = {
  manager: { label: 'Gérant / Manager', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', desc: 'Gestion opérationnelle, stock et encaissements autorisés' },
  cashier: { label: 'Caissier / Vendeur', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', desc: 'Ventes au comptoir, scans et encaissements de tickets' },
  delivery: { label: 'Livreur', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', desc: 'Consultation des tournées de livraison et réceptions' },
  picker: { label: 'Préparateur de commandes', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', desc: 'Préparation et colisage des commandes en ligne' },
  camera_agent: { label: 'Agent Audit & Sécurité', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30', desc: 'Consultation des rapports de surveillance et audit' },
};
