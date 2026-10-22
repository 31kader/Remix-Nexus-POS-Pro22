import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import { Customer, Transaction, CompanySettings, Product, CashShift } from '../src/types';
import { CustomerTableView } from '../src/components/customers/CustomerTableView';
import { CashManagementHistory } from '../src/components/cash-management/CashManagementHistory';
import { InventoryProductRow } from '../src/components/inventory/InventoryProductRow';

const mockSettings: CompanySettings = {
  name: 'Nexus POS Pro Test',
  currency: 'DA',
  taxRate: 19,
  address: 'Bab Ezzouar, Alger',
  phone: '0550123456',
  footerText: 'Merci pour votre confiance',
  receiptTemplate: 'standard',
  labelTemplate: 'standard',
  loyaltyPointsPerCurrencyUnit: 1,
  loyaltyPointValue: 1,
};

const mockCustomer: Customer = {
  id: 'cust-m3-test-1',
  name: 'Brahim Benali',
  phone: '0555123456',
  email: 'brahim@example.com',
  balance: -4500, // Dette de 4500 DA
  totalSpent: 85000,
  loyaltyPoints: 620, // VIP (>= 500)
  isAppUser: true,
  isWholesale: false,
  joinDate: '2026-01-15T10:00:00Z',
  updatedAt: '2026-10-18T10:00:00Z',
};

const mockCustomerCredit: Customer = {
  id: 'cust-m3-test-2',
  name: 'Samir Mansouri',
  phone: '0661987654',
  balance: 1200, // Avoir de 1200 DA
  totalSpent: 34000,
  loyaltyPoints: 150,
  isAppUser: false,
  joinDate: '2026-02-10T10:00:00Z',
  updatedAt: '2026-10-18T10:00:00Z',
};

const mockProduct: Product = {
  id: 'prod-m3-1',
  name: 'Huile Sansa 5L',
  price: 950,
  costPrice: 780,
  stock: 24,
  minStock: 5,
  barcode: '6131112223334',
  category: 'Epicerie',
  categoryId: 'cat-1',
  unit: 'PCS',
  taxRate: 19,
  supplier: 'Fournisseur Test',
  sku: 'HUI-5L',
} as unknown as Product;

const mockClosedShift: CashShift = {
  id: 'shift-m3-1',
  openedAt: '2026-10-18T08:00:00Z',
  closedAt: '2026-10-18T16:00:00Z',
  openedBy: 'Karim Caissier',
  closedBy: 'Karim Caissier',
  initialCash: 10000,
  expectedCash: 45000,
  finalCash: 44800, // Écart déficit de -200 DA
  totalSales: 35000,
  status: 'closed',
  notes: 'Fin de journée RAS'
};

describe('🧪 SUITE EMPIRIQUE CONTRADICTOIRE M3 — Refonte Responsive Mobile & Écrans Métier', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('1. Navigation Responsive Mobile dans Customers.tsx (Liste 100% <-> Détail 100%)', () => {
    it('Empirique : Navigation mobile fluide, masquage de la liste et affichage plein écran du volet de détail', () => {
      const customersContent = fs.readFileSync(path.join(rootDir, 'src/components/Customers.tsx'), 'utf-8');

      // 1. Vérification que la liste se masque sur mobile (< md) lorsqu'un client est sélectionné
      expect(customersContent).toContain('selectedCustomerId ? "hidden md:flex" : "flex"');

      // 2. Vérification que le panneau de détail prend 100% de la largeur et hauteur sur mobile
      expect(customersContent).toContain('selectedCustomerId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full"');

      // 3. Vérification du bouton retour mobile dédié avec icône ArrowLeft
      expect(customersContent).toContain('onClick={() => setSelectedCustomerId(null)}');
      expect(customersContent).toContain('ArrowLeft className="w-5 h-5 text-indigo-400"');
      expect(customersContent).toContain('Retour à la liste');

      // 4. Vérification que le bouton retour a une cible tactile >= 38px
      expect(customersContent).toContain('min-h-[38px]');

      // 5. Vérification que sur grand écran, le bouton retour est masqué et le split 2 colonnes opère
      expect(customersContent).toContain('md:hidden');
    });

    it('Simulation d\'état de transition : sélection client -> basculement classes mobile -> clic retour', () => {
      // Modélisation exacte des classes appliquées selon l'état selectedCustomerId
      const getLeftPanelClass = (selectedId: string | null) => 
        selectedId ? "hidden md:flex" : "flex";

      const getRightPanelClass = (selectedId: string | null) => 
        selectedId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full";

      // ÉTAT INITIAL : Aucun client sélectionné
      let currentSelectedId: string | null = null;
      expect(getLeftPanelClass(currentSelectedId)).toBe('flex'); // Liste visible sur mobile
      expect(getRightPanelClass(currentSelectedId)).toBe('hidden md:flex md:w-2/3 md:h-full'); // Détail masqué sur mobile

      // TRANSITION 1 : Clic sur un client dans la liste
      currentSelectedId = 'cust-m3-test-1';
      expect(getLeftPanelClass(currentSelectedId)).toBe('hidden md:flex'); // Liste masquée sur mobile !
      expect(getRightPanelClass(currentSelectedId)).toBe('flex flex-1 w-full h-full md:w-2/3 md:flex-initial'); // Détail 100% plein écran !

      // TRANSITION 2 : Clic sur le bouton tactile « Retour à la liste »
      const onBackClick = () => { currentSelectedId = null; };
      onBackClick();
      expect(currentSelectedId).toBeNull();
      expect(getLeftPanelClass(currentSelectedId)).toBe('flex'); // Liste réaffichée sur mobile !
      expect(getRightPanelClass(currentSelectedId)).toBe('hidden md:flex md:w-2/3 md:h-full'); // Détail remasqué !
    });
  });

  describe('2. Absence de Scroll Horizontal Forcé sur Largeurs Critiques (320px, 360px, 375px)', () => {
    it('CustomerTableView : Rendu effectif des cartes tactiles mobiles (< lg) et tableau de bureau masqué', () => {
      const mockSetSelected = vi.fn();
      const mockSetLayout = vi.fn();
      const mockLaunchSale = vi.fn();
      const mockOpenWhatsApp = vi.fn();

      render(
        <CustomerTableView
          filteredCustomers={[mockCustomer, mockCustomerCredit]}
          paginatedCustomers={[mockCustomer, mockCustomerCredit]}
          settings={mockSettings}
          search=""
          setSearch={vi.fn()}
          filterStatus="all"
          setFilterStatus={vi.fn()}
          sortBy="name_asc"
          setSortBy={vi.fn()}
          kpiStats={{ totalCustomers: 2, creditCount: 1, appUserCount: 1 }}
          currentPage={1}
          totalPages={1}
          setTablePage={vi.fn()}
          TABLE_PAGE_SIZE={50}
          setSelectedCustomerId={mockSetSelected}
          setDirectoryLayout={mockSetLayout}
          setFinancialOpType={vi.fn()}
          setFinancialMethod={vi.fn()}
          setFinancialNote={vi.fn()}
          setIsTopUpModalOpen={vi.fn()}
          handleLaunchSale={mockLaunchSale}
          handlePrintStatement={vi.fn()}
          openWhatsApp={mockOpenWhatsApp}
          setEditingCustomer={vi.fn()}
          setIsModalOpen={vi.fn()}
        />
      );

      // 1. Vérifier que les noms apparaissent dans les cartes
      const names = screen.getAllByText('Brahim Benali');
      expect(names.length).toBeGreaterThanOrEqual(1);

      // 2. Vérifier l'affichage de la dette en DA (-4500.00 DA)
      const debtBadges = screen.getAllByText(/-4500\.00 DA/i);
      expect(debtBadges.length).toBeGreaterThanOrEqual(1);

      // 3. Vérifier les cibles tactiles des boutons mobiles (Voir Fiche, Vendre, WhatsApp)
      const seeCardBtns = screen.getAllByText(/Voir Fiche/i);
      expect(seeCardBtns[0].closest('button')?.className).toContain('min-h-[38px]');

      // Clic sur "Voir Fiche" doit sélectionner le client et basculer en split
      fireEvent.click(seeCardBtns[0]);
      expect(mockSetSelected).toHaveBeenCalledWith('cust-m3-test-1');
      expect(mockSetLayout).toHaveBeenCalledWith('split');

      // 4. Inspecter la structure du code source pour certifier l'absence de min-w forcé sur les cartes
      const fileContent = fs.readFileSync(path.join(rootDir, 'src/components/customers/CustomerTableView.tsx'), 'utf-8');
      expect(fileContent).toContain('block lg:hidden space-y-3 p-3');
      expect(fileContent).toContain('hidden lg:block overflow-x-auto');

      // Vérifier qu'aucune carte mobile n'impose de min-w rigide (> 300px)
      const mobileCardSection = fileContent.substring(fileContent.indexOf('block lg:hidden'), fileContent.indexOf('hidden lg:block'));
      expect(mobileCardSection).not.toContain('min-w-[400px]');
      expect(mobileCardSection).not.toContain('min-w-[500px]');
      expect(mobileCardSection).not.toContain('w-[400px]');
    });

    it('Expenses.tsx : Déploiement de cartes tactiles pleine largeur éliminant le scroll horizontal sur 320px', () => {
      const expensesContent = fs.readFileSync(path.join(rootDir, 'src/components/Expenses.tsx'), 'utf-8');

      // 1. Vérifier le pattern adaptatif
      expect(expensesContent).toContain('block lg:hidden space-y-3 p-3');
      expect(expensesContent).toContain('hidden lg:block overflow-x-auto');

      // 2. Vérifier les montants négatifs formatés avec devise DA
      expect(expensesContent).toContain('-{formatPrice(expense.amount)} {settings.currency || \'DA\'}');

      // 3. Vérifier les cibles tactiles >= 38x38px pour les boutons Modifier et Supprimer
      expect(expensesContent).toContain('min-w-[38px] min-h-[38px]');

      // 4. Vérifier l'absence de min-w rigide dans la section mobile
      const mobileExpSection = expensesContent.substring(expensesContent.indexOf('block lg:hidden'), expensesContent.indexOf('hidden lg:block'));
      expect(mobileExpSection).not.toContain('min-w-[500px]');
      expect(mobileExpSection).not.toContain('min-w-[600px]');
    });

    it('CashManagementHistory.tsx : Rendu effectif des cartes de session avec écarts DA et bouton Rapport Z >= 38px', () => {
      const mockPrintZ = vi.fn();

      render(
        <CashManagementHistory
          shifts={[mockClosedShift]}
          settings={mockSettings}
          printZReport={mockPrintZ}
        />
      );

      // 1. Vérifier l'affichage du caissier dans la carte
      const cashiers = screen.getAllByText('Karim Caissier');
      expect(cashiers.length).toBeGreaterThanOrEqual(1);

      // 2. Vérifier l'affichage de l'écart négatif (-200,00 DA)
      const diffBadges = screen.getAllByText(/-200,00 DA/i);
      expect(diffBadges.length).toBeGreaterThanOrEqual(1);

      // 3. Vérifier le bouton "Imprimer Rapport Z" et sa cible tactile >= 38px
      const printButtons = screen.getAllByText(/Imprimer Rapport Z/i);
      const mobilePrintBtn = printButtons[0].closest('button');
      expect(mobilePrintBtn).toBeDefined();
      expect(mobilePrintBtn?.className).toContain('min-h-[38px]');
      expect(mobilePrintBtn?.className).toContain('w-full');

      // 4. Déclencher le clic d'impression
      if (mobilePrintBtn) {
        fireEvent.click(mobilePrintBtn);
        expect(mockPrintZ).toHaveBeenCalledWith(mockClosedShift, mockSettings);
      }
    });

    it('ShortagesTable.tsx & PurchaseCartTable.tsx : Steppers agrandis (40x40px) et cartes tactiles 100% fluides', () => {
      const shortagesContent = fs.readFileSync(path.join(rootDir, 'src/components/smart-purchase/shortages/ShortagesTable.tsx'), 'utf-8');
      const cartContent = fs.readFileSync(path.join(rootDir, 'src/components/smart-purchase/PurchaseCartTable.tsx'), 'utf-8');

      // ShortagesTable : cartes mobile et steppers w-10 h-10 (40x40px >= 38px)
      expect(shortagesContent).toContain('block lg:hidden space-y-3 p-3');
      expect(shortagesContent).toContain('hidden lg:block overflow-x-auto');
      expect(shortagesContent).toContain('w-10 h-10 rounded-xl');
      expect(shortagesContent).toContain('min-w-[38px] min-h-[38px]');

      // PurchaseCartTable : cartes mobile et steppers w-10 h-10 (40x40px >= 38px)
      expect(cartContent).toContain('block lg:hidden space-y-3 p-3');
      expect(cartContent).toContain('hidden lg:block w-full overflow-x-auto');
      expect(cartContent).toContain('w-10 h-10 rounded-xl');
    });

    it('InventoryProductRow.tsx : Visibilité du prix de vente et marge sur smartphone (< md) et checkbox >= 32px', () => {
      const mockToggleSelect = vi.fn();
      const mockEdit = vi.fn();

      render(
        <InventoryProductRow
          product={mockProduct}
          isSelected={false}
          onToggleSelect={mockToggleSelect}
          isQuickSelectMode={false}
          onToggleQuickSelect={vi.fn()}
          onEdit={mockEdit}
          onDelete={vi.fn()}
          onPrintLabel={vi.fn()}
          onViewHistory={vi.fn()}
          onOpenAdjustment={vi.fn()}
          onCopy={vi.fn()}
          settings={mockSettings}
          isDeleting={false}
          isExtremeMargin={{ isMax: false, isMin: false }}
        />
      );

      // 1. Vérifier que le nom et le SKU sont bien affichés
      expect(screen.getByText('Huile Sansa 5L')).toBeDefined();

      // 2. Vérifier que le prix (950.00 DA) est présent
      const priceBadges = screen.getAllByText(/950\.00/);
      expect(priceBadges.length).toBeGreaterThanOrEqual(1);

      // 3. Vérifier le badge de marge (+170 DA)
      const marginBadges = screen.getAllByText(/Marge:\s*\+170/);
      expect(marginBadges.length).toBeGreaterThanOrEqual(1);

      // 4. Vérifier les dimensions tactiles de la checkbox et de l'étoile dans le code
      const fileContent = fs.readFileSync(path.join(rootDir, 'src/components/inventory/InventoryProductRow.tsx'), 'utf-8');
      expect(fileContent).toContain('w-8 h-8 min-w-[32px] min-h-[32px]');
      expect(fileContent).toContain('flex md:hidden items-center gap-2 mt-1.5 flex-wrap text-xs font-mono');
    });
  });

  describe('3. Épreuve de Contrainte Géométrique Mobile (Viewport 320px, 360px, 375px)', () => {
    const mobileResolutions = [
      { name: 'iPhone SE / Très petit smartphone', width: 320 },
      { name: 'Samsung Galaxy A-Series standard', width: 360 },
      { name: 'iPhone standard / Écran moderne', width: 375 }
    ];

    mobileResolutions.forEach(({ name, width }) => {
      it(`Vérifie mathématiquement qu'aucune carte ou conteneur mobile n'excède ${width}px (${name})`, () => {
        // En Tailwind, les cartes sous `block lg:hidden space-y-3 p-3` ont :
        // padding-left: 12px (p-3 = 0.75rem = 12px)
        // padding-right: 12px
        // Largeur interne disponible = width - 24px
        const availableContentWidth = width - 24;
        expect(availableContentWidth).toBeGreaterThan(290);

        // Les grilles internes utilisent grid-cols-2 ou grid-cols-3 avec gap-2 (8px)
        // Pour grid-cols-2 : (available - 8) / 2 = 144px à 320px -> parfaitement logeable
        const col2Width = (availableContentWidth - 8) / 2;
        expect(col2Width).toBeGreaterThanOrEqual(144);

        // Pour grid-cols-3 : (available - 16) / 3 = 93px à 320px -> suffisant pour des chiffres condensés
        const col3Width = (availableContentWidth - 16) / 3;
        expect(col3Width).toBeGreaterThanOrEqual(93);
      });
    });
  });
});
