import { useState } from 'react';
import type { Product } from '../types';

/**
 * Centralise tous les états des modales de l'application principale.
 * Extrait de App.tsx pour alléger le composant racine.
 */
export function useModalState() {
  // Modale de retour produit
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Modale d'édition de transaction
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);

  // Stock faible / expiration
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [isExpirationModalOpen, setIsExpirationModalOpen] = useState(false);

  // Ajustement de stock
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);

  // Vérificateur de prix
  const [isPriceCheckerModalOpen, setIsPriceCheckerModalOpen] = useState(false);

  // Modale client POS (attacher un client à une vente)
  const [isPOSCustomerModalOpen, setIsPOSCustomerModalOpen] = useState(false);

  // Modale produit (ajout / édition)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Bon de commande fournisseur
  const [viewingPurchaseVoucher, setViewingPurchaseVoucher] = useState<any>(null);

  return {
    // Retour
    isReturnModalOpen, setIsReturnModalOpen,
    // Édition transaction
    isEditTransactionModalOpen, setIsEditTransactionModalOpen,
    // Stock
    isLowStockModalOpen, setIsLowStockModalOpen,
    isExpirationModalOpen, setIsExpirationModalOpen,
    isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen,
    // Prix
    isPriceCheckerModalOpen, setIsPriceCheckerModalOpen,
    // Client POS
    isPOSCustomerModalOpen, setIsPOSCustomerModalOpen,
    // Produit
    isProductModalOpen, setIsProductModalOpen,
    editingProduct, setEditingProduct,
    // Bon de commande
    viewingPurchaseVoucher, setViewingPurchaseVoucher,
  };
}
