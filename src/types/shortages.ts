/**
 * Types pour le Cahier des Manques & Listes d'Approvisionnement Personnalisées
 * Nexus POS Pro (v1.2.32)
 */

export interface ShortageItem {
  id: string;                      // Identifiant unique (UUID ou généré via generateLocalId())
  productId: string;               // Référence vers le produit du catalogue (products.id)
  name: string;                    // Désignation / Nom du produit
  barcode?: string;                // Code-barres pour recherche et douchette
  quantityNeeded: number;          // Quantité souhaitée / manquante (>= 1)
  costPrice: number;               // Dernier prix d'achat unitaire constaté en DA
  supplierId?: string;             // ID du fournisseur d'origine (ou vide)
  supplierName?: string;           // Nom lisible du fournisseur d'origine
  currentStock: number;            // Stock physique actuel en rayon lors de la détection
  minStock: number;                // Seuil minimal d'alerte configuré
  isChecked: boolean;              // Case à cocher pour sélection / conversion en bon d'achat
  listIds: string[];               // Identifiants des listes personnalisées associées
  createdAt: string;               // Horodatage ISO de création
  updatedAt: string;               // Horodatage ISO de dernière modification
  imageUrl?: string;               // URL de l'image (pour rendu optimisé via <SafeImage />)
  sku?: string;                    // SKU / Référence de l'article
  unit?: string;                   // Unité de vente / conditionnement (ex: pcs, kg, pack)
  isCustomProduct?: boolean;       // Indique si le produit est hors-catalogue (non créé dans l'inventaire)
  notes?: string;                  // Remarque libre (ex: "demandé par un client", conditionnement spécial)
  priority?: 'normal' | 'urgent';  // Degré de priorité du réassort
}

export interface CustomReplenishmentList {
  id: string;                      // Identifiant unique de la liste personnalisée
  name: string;                    // Nom de la liste (ex: "Tournée Détergents", "Produits Frais")
  description?: string;            // Description ou annotations métier libres
  color?: string;                  // Code couleur hexadécimal ou clé visuelle pour badge/pill
  createdAt: string;               // Horodatage ISO de création
  updatedAt: string;               // Horodatage ISO de dernière modification
}

export type ShortageStockStatus = 'out_of_stock' | 'critical' | 'normal';

export interface ShortageSummary {
  totalItems: number;
  totalQuantity: number;
  totalEstimatedCost: number;
  checkedCount: number;
  checkedEstimatedCost: number;
}
