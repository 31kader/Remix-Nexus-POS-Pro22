import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { CartItemRow } from '../src/components/checkout/CartItemRow';
import { CartItemsList } from '../src/components/checkout/CartItemsList';
import { CartItem, Product, CompanySettings, RolePermissions } from '../src/types';

const mockProduct: any = {
  id: 'prod-m2-test-1',
  name: 'Produit Test Ergonomie Tactile',
  price: 250,
  costPrice: 180,
  stock: 45,
  minStock: 5,
  barcode: '6131234567890',
  category: 'Alimentation',
  unit: 'PCS'
};

const mockCartItem: CartItem = {
  ...mockProduct,
  cartItemId: 'cart-item-1',
  quantity: 2,
  price: 250,
  productName: mockProduct.name,
};

const mockPermissions: any = {
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
  canVoidTransaction: false,
  canManageUsers: true,
};

const mockSettings: any = {
  name: 'Nexus POS Test',
  currency: 'DA',
  taxRate: 19,
  address: 'Alger',
  phone: '0555000000',
  footerText: 'Merci pour votre visite',
  receiptTemplate: 'standard',
  labelTemplate: 'standard',
  loyaltyPointsPerCurrencyUnit: 1,
  loyaltyPointValue: 1,
};

describe('Empirical Challenger M2 Suite — Caisse Mobile, Safe Areas & Ergonomie Tactile', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('1. Cibles Tactiles Panier de Caisse (Standard Fitts Law >= 38x38px)', () => {
    it('CartItemRow : tous les boutons interactifs du panier mesurent au moins 38x38px', () => {
      render(
        <CartItemRow
          item={mockCartItem}
          idx={0}
          isSelected={true}
          isLast={true}
          onSelect={vi.fn()}
          onRemove={vi.fn()}
          onSetQuantity={vi.fn()}
          onOpenProductModal={vi.fn()}
          onOpenDiscountModal={vi.fn()}
          onSetPrice={vi.fn()}
          isWholesale={false}
          permissions={mockPermissions}
          settings={mockSettings}
          products={[mockProduct]}
          inputRef={React.createRef()}
        />
      );

      // Bouton Diminuer (-)
      const minusBtn = screen.getByTitle('Diminuer quantité');
      expect(minusBtn.className).toContain('w-10');
      expect(minusBtn.className).toContain('h-10'); // 40x40px >= 38x38px

      // Bouton Augmenter (+)
      const plusBtn = screen.getByTitle('Augmenter quantité');
      expect(plusBtn.className).toContain('w-10');
      expect(plusBtn.className).toContain('h-10'); // 40x40px >= 38x38px

      // Bouton Supprimer (poubelle)
      const trashBtns = document.querySelectorAll('button');
      const deleteRowBtn = Array.from(trashBtns).find(b => b.querySelector('svg.lucide-trash-2'));
      expect(deleteRowBtn).toBeDefined();
      expect(deleteRowBtn?.className).toContain('min-w-[38px]');
      expect(deleteRowBtn?.className).toContain('min-h-[38px]'); // >= 38x38px

      // Bouton Détails Produit
      const detailsBtn = screen.getByTitle('DÉTAILS PRODUIT');
      expect(detailsBtn.className).toContain('min-w-[38px]');
      expect(detailsBtn.className).toContain('min-h-[38px]'); // >= 38x38px

      // Bouton Remise
      const discountBtn = screen.getByTitle(/APPLIQUER.*REMISE/i);
      expect(discountBtn.className).toContain('min-w-[38px]');
      expect(discountBtn.className).toContain('min-h-[38px]'); // >= 38x38px
    });

    it('CartItemsList : la barre de quantité rapide intègre des cibles tactiles >= 38px', () => {
      const qInputRefs = { current: {} };

      render(
        <CartItemsList
          cart={[mockCartItem]}
          cartEndRef={React.createRef()}
          selectedItemId={mockCartItem.cartItemId!}
          setSelectedItemId={vi.fn()}
          removeFromCart={vi.fn()}
          setQuantity={vi.fn()}
          setEditingProduct={vi.fn()}
          setIsProductModalOpen={vi.fn()}
          setDiscountingItemId={vi.fn()}
          setPrice={vi.fn()}
          isWholesale={false}
          permissions={mockPermissions}
          settings={mockSettings}
          products={[mockProduct]}
          quantityInputRefs={qInputRefs as any}
        />
      );

      // Bouton -1
      const minusOneBtn = screen.getByTitle('Diminuer de 1');
      expect(minusOneBtn.className).toContain('w-10');
      expect(minusOneBtn.className).toContain('h-10'); // 40x40px

      // Bouton +1
      const plusOneBtn = screen.getByTitle('Augmenter de 1');
      expect(plusOneBtn.className).toContain('w-10');
      expect(plusOneBtn.className).toContain('h-10'); // 40x40px

      // Boutons presets 1, 2, 3, 5, 10, 20
      const presets = [1, 2, 3, 5, 10, 20];
      for (const val of presets) {
        const presetBtn = screen.getByTitle(`Définir la quantité à ${val}`);
        expect(presetBtn.className).toContain('min-w-[38px]');
        expect(presetBtn.className).toContain('h-10'); // Hauteur 40px >= 38px
      }
    });

    it('CHALLENGE ERGONOMIE : identification des boutons secondaires de panier compacts (< 38px)', () => {
      const cartItemsListContent = fs.readFileSync(path.join(rootDir, 'src/components/checkout/CartItemsList.tsx'), 'utf-8');

      // Le bouton Vider [F2] utilise px-2 py-0.5 text-[10px] (zone compacte)
      expect(cartItemsListContent).toContain('py-0.5 rounded-md bg-rose-500/10');

      // Le bouton Suppr de la barre rapide utilise px-2 py-1 text-[10px]
      expect(cartItemsListContent).toContain('px-2 py-1 bg-rose-50 dark:bg-rose-950/40');
    });
  });

  describe('2. Absence de Scroll Horizontal Forcé sur Largeurs Critiques (320px, 360px, 375px)', () => {
    it('CheckoutHeader : élimine le débordement horizontal sur 320px (largeur minimale supportée)', () => {
      const headerContent = fs.readFileSync(path.join(rootDir, 'src/components/checkout/CheckoutHeader.tsx'), 'utf-8');

      // Le bandeau TOTAL bascule en pleine largeur mobile (w-full sm:w-auto)
      expect(headerContent).toContain('w-full sm:w-auto flex-shrink-0');

      // Le champ code-barre direct est masqué sur petit écran (hidden sm:block)
      expect(headerContent).toContain('hidden sm:block relative group sm:w-52 lg:w-60 flex-shrink-0');

      // La barre de recherche textuelle possède un min-w raisonnable (min-w-[180px]) qui rentre dans 304px (320px - p-2)
      expect(headerContent).toContain('min-w-[180px]');
    });

    it('Checkout.tsx : la barre d action mobile s adapte sans débordement sur 320px', () => {
      const checkoutContent = fs.readFileSync(path.join(rootDir, 'src/components/Checkout.tsx'), 'utf-8');

      // Vérifier que la barre mobile utilise px-2.5 et flex items-center justify-between
      expect(checkoutContent).toContain('px-2.5 py-2 pb-[max(env(safe-area-inset-bottom,0px),10px)] flex items-center justify-between gap-2.5');
    });

    it('CHALLENGE ADVERSAIRE : analyse géométrique de CheckoutSuccessModal (w-full max-w-sm mx-4 sous left-1/2 -translate-x-1/2)', () => {
      const modalContent = fs.readFileSync(path.join(rootDir, 'src/components/checkout/CheckoutSuccessModal.tsx'), 'utf-8');

      // 1. Confirmer l élimination de min-w-[380px]
      expect(modalContent).not.toContain('min-w-[380px]');

      // 2. Analyser la combinaison w-full max-w-sm mx-4 sous translate-x
      expect(modalContent).toContain('w-full max-w-sm mx-4');
      expect(modalContent).toContain('left-1/2 -translate-x-1/2');

      // Calcul théorique de la boîte de rendu :
      // Sur écran 320px :
      // viewport = 320px
      // width = min(320px, 384px) = 320px
      // margin-left = 16px, margin-right = 16px
      // left = 50% = 160px
      // position avant transform = 160px + 16px = 176px
      // translateX(-50%) = -160px
      // bord gauche = 16px
      // bord droit = 16px + 320px = 336px
      // Dépassement géométrique du bord droit d écran = 336 - 320 = 16px
      const viewport320 = 320;
      const margin = 16;
      const modalWidth320 = Math.min(viewport320, 384);
      const leftEdge320 = (viewport320 / 2) + margin - (modalWidth320 / 2);
      const rightEdge320 = leftEdge320 + modalWidth320;
      const overflow320 = rightEdge320 - viewport320;

      expect(overflow320).toBe(16); // Démontre empiriquement le débordement théorique de 16px à droite dû au cumul w-full + mx-4

      // Sur écran 360px (Samsung Galaxy A/S) :
      const viewport360 = 360;
      const modalWidth360 = Math.min(viewport360, 384);
      const leftEdge360 = (viewport360 / 2) + margin - (modalWidth360 / 2);
      const rightEdge360 = leftEdge360 + modalWidth360;
      const overflow360 = rightEdge360 - viewport360;
      expect(overflow360).toBe(16);

      // Sur écran 375px (iPhone SE) :
      const viewport375 = 375;
      const modalWidth375 = Math.min(viewport375, 384);
      const leftEdge375 = (viewport375 / 2) + margin - (modalWidth375 / 2);
      const rightEdge375 = leftEdge375 + modalWidth375;
      const overflow375 = rightEdge375 - viewport375;
      expect(overflow375).toBe(16);
    });
  });

  describe('3. Safe Area Insets iOS / Android & Viewport Meta', () => {
    it('index.html configure viewport-fit=cover pour autoriser l extension dans les zones sécurisées', () => {
      const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
      expect(indexContent).toContain('viewport-fit=cover');
    });

    it('Checkout.tsx protège contre les gestes système inférieurs (barre mobile & volet paiement)', () => {
      const checkoutContent = fs.readFileSync(path.join(rootDir, 'src/components/Checkout.tsx'), 'utf-8');
      expect(checkoutContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),10px)]');
      expect(checkoutContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');
    });

    it('PinLockModal.tsx intègre la protection encoche et barre de gestes', () => {
      const pinLockContent = fs.readFileSync(path.join(rootDir, 'src/components/PinLockModal.tsx'), 'utf-8');
      expect(pinLockContent).toContain('pt-[max(env(safe-area-inset-top,0px),12px)]');
      expect(pinLockContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');
    });

    it('BarcodeScanner.tsx protège le bouton fermer contre la caméra frontale poinçon', () => {
      const barcodeContent = fs.readFileSync(path.join(rootDir, 'src/components/BarcodeScanner.tsx'), 'utf-8');
      expect(barcodeContent).toContain('pt-[max(env(safe-area-inset-top,0px),16px)]');
    });

    it('AddStaffModal et ShortageSuggestionsDrawer intègrent le padding bas sécurisé', () => {
      const addStaffContent = fs.readFileSync(path.join(rootDir, 'src/components/AddStaffModal.tsx'), 'utf-8');
      expect(addStaffContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');

      const drawerContent = fs.readFileSync(path.join(rootDir, 'src/components/smart-purchase/shortages/ShortageSuggestionsDrawer.tsx'), 'utf-8');
      expect(drawerContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');
    });
  });
});
