import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { CartItemsList } from '../src/components/checkout/CartItemsList';
import { useCheckoutShortcuts } from '../src/components/checkout/useCheckoutShortcuts';
import { CartItem, Product, CompanySettings, RolePermissions } from '../src/types';
import { calculateItemPrice } from '../src/lib/utils';

describe('⚔️ Challenger M2 — Épreuve Contradictoire Caisse, Non-Régression & Ergonomie', () => {
  const defaultSettings: CompanySettings = {
    name: 'Nexus Store',
    currency: 'DA',
    taxRate: 19,
    address: 'Alger',
    phone: '0555000000',
    email: 'contact@nexus.dz',
    footerText: 'Merci de votre visite',
    receiptTemplate: 'standard',
    labelTemplate: 'standard',
    loyaltyPointsPerCurrencyUnit: 1,
    loyaltyPointValue: 1
  };

  const defaultPermissions: RolePermissions = {
    canAccessInventory: true,
    canAccessSales: true,
    canAccessCustomers: true,
    canAccessEmployees: true,
    canAccessSuppliers: true,
    canAccessSettings: true,
    canAccessOnlineOrders: true,
    canAccessExpenses: true,
    canAccessReturns: true,
    canAccessPurchases: true,
    canAccessPromotions: true,
    canAccessVouchers: true,
    canAccessAnalytics: true,
    canAccessShifts: true,
    canAccessAuditLogs: true,
    canModifyPrices: true,
    canApplyDiscount: true,
    canVoidTransaction: true,
    canManageUsers: true
  };

  const sampleProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Café Espresso 250g',
      price: 500,
      wholesalePrice: 420,
      costPrice: 350,
      stock: 20,
      minStock: 3,
      unit: 'pcs',
      categoryId: 'cat-cafe',
      supplier: 'Fournisseur A',
      status: 'active',
      sku: 'SKU-CAF-01',
      barcode: '613000001001',
      taxRate: 19,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-2',
      name: 'Lait Entier 1L',
      price: 120,
      wholesalePrice: 105,
      costPrice: 90,
      stock: 50,
      minStock: 10,
      unit: 'pcs',
      categoryId: 'cat-lait',
      supplier: 'Fournisseur B',
      status: 'active',
      sku: 'SKU-LAI-01',
      barcode: '613000001002',
      taxRate: 0,
      updatedAt: new Date().toISOString()
    }
  ];

  const sampleCart: CartItem[] = [
    {
      ...sampleProducts[0],
      cartItemId: 'item-c1',
      quantity: 3
    },
    {
      ...sampleProducts[1],
      cartItemId: 'item-c2',
      quantity: 5,
      lineDiscount: {
        type: 'fixed',
        value: 20 // 20 DA de remise unitaire => 100 DA au lieu de 120 DA
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Vérification des Calculs de Caisse & Remises (Zéro Régression Métier)', () => {
    it('calcule exactement les sous-totaux, remises à la ligne et totaux en prix détail', () => {
      // Produit 1 : 3 * 500 = 1500 DA
      const p1 = sampleCart[0];
      const p1Price = calculateItemPrice(p1, false);
      expect(p1Price).toBe(500);
      const p1Total = p1Price * p1.quantity;
      expect(p1Total).toBe(1500);

      // Produit 2 : 5 * (120 - 20) = 5 * 100 = 500 DA
      const p2 = sampleCart[1];
      const p2Price = calculateItemPrice(p2, false);
      expect(p2Price).toBe(100);
      const p2Total = p2Price * p2.quantity;
      expect(p2Total).toBe(500);

      const cartTotal = p1Total + p2Total;
      expect(cartTotal).toBe(2000);
    });

    it('applique rigoureusement le tarif de gros (Wholesale) avec ou sans remise', () => {
      // Produit 1 en gros : 420 DA (au lieu de 500)
      const p1Wholesale = calculateItemPrice(sampleCart[0], true);
      expect(p1Wholesale).toBe(420);

      // Produit 2 en gros : 105 DA avec remise fixe de 20 = 85 DA
      const p2Wholesale = calculateItemPrice(sampleCart[1], true);
      expect(p2Wholesale).toBe(85);

      const wholesaleTotal = (p1Wholesale * 3) + (p2Wholesale * 5);
      expect(wholesaleTotal).toBe(420 * 3 + 85 * 5); // 1260 + 425 = 1685 DA
    });

    it('gère correctement les articles en retour (quantités négatives)', () => {
      const returnItem: CartItem = {
        ...sampleProducts[0],
        cartItemId: 'ret-1',
        quantity: -2
      };

      const unitPrice = calculateItemPrice(returnItem, false);
      expect(unitPrice).toBe(500);
      const returnLineTotal = unitPrice * returnItem.quantity;
      expect(returnLineTotal).toBe(-1000);
    });
  });

  describe('2. Analyse du Bouton "Vider [F2]" et Comportement de Confirmation (Empirical Challenger)', () => {
    it('détecte si le bouton Vider déclenche un double window.confirm lors du clic', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const setCartMock = vi.fn();
      const handleCheckoutMock = vi.fn();
      const searchRef = { current: null };

      // 1. Montage du hook des raccourcis clavier de la caisse
      renderHook(() =>
        useCheckoutShortcuts({
          cart: sampleCart,
          searchRef,
          handleCheckout: handleCheckoutMock,
          setCart: setCartMock
        })
      );

      // 2. Montage du composant CartItemsList
      const cartEndRef = { current: null };
      const quantityInputRefs = { current: {} };

      render(
        <CartItemsList
          cart={sampleCart}
          cartEndRef={cartEndRef}
          selectedItemId="item-c1"
          setSelectedItemId={vi.fn()}
          removeFromCart={vi.fn()}
          setQuantity={vi.fn()}
          setEditingProduct={vi.fn()}
          setIsProductModalOpen={vi.fn()}
          setDiscountingItemId={vi.fn()}
          setPrice={vi.fn()}
          isWholesale={false}
          permissions={defaultPermissions}
          settings={defaultSettings}
          products={sampleProducts}
          quantityInputRefs={quantityInputRefs}
        />
      );

      // Recherche du bouton "Vider [F2]"
      const viderButton = screen.getByRole('button', { name: /Vider \[F2\]/i });
      expect(viderButton).toBeDefined();

      // Clic sur le bouton
      fireEvent.click(viderButton);

      // CONSTAT EMPIRIQUE :
      // 1er confirm : déclenché par l'onClick du bouton dans CartItemsList.tsx:54
      // 2e confirm : déclenché par le listener F2 dans useCheckoutShortcuts.ts:41 via window.dispatchEvent
      expect(confirmSpy.mock.calls.length).toBe(2);
      expect(setCartMock).toHaveBeenCalledWith([]);
    });
  });

  describe('3. Ergonomie Tactile & Non-Régression Desktop (>= 1024px)', () => {
    it('vérifie que les boutons de quantité -1 et +1 ont la taille tactile w-10 h-10', () => {
      const cartEndRef = { current: null };
      const quantityInputRefs = { current: {} };

      render(
        <CartItemsList
          cart={sampleCart}
          cartEndRef={cartEndRef}
          selectedItemId="item-c1"
          setSelectedItemId={vi.fn()}
          removeFromCart={vi.fn()}
          setQuantity={vi.fn()}
          setEditingProduct={vi.fn()}
          setIsProductModalOpen={vi.fn()}
          setDiscountingItemId={vi.fn()}
          setPrice={vi.fn()}
          isWholesale={false}
          permissions={defaultPermissions}
          settings={defaultSettings}
          products={sampleProducts}
          quantityInputRefs={quantityInputRefs}
        />
      );

      // Bouton -1 et +1 dans la mini-barre
      const minusBtn = screen.getByTitle('Diminuer de 1');
      const plusBtn = screen.getByTitle('Augmenter de 1');

      expect(minusBtn.className).toContain('w-10 h-10');
      expect(plusBtn.className).toContain('w-10 h-10');

      // Touches rapides 1, 2, 3, 5, 10, 20
      const preset2 = screen.getByTitle('Définir la quantité à 2');
      expect(preset2.className).toContain('min-w-[38px]');
      expect(preset2.className).toContain('h-10');
    });
  });
});
