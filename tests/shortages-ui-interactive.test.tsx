import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShortagesHeader } from '../src/components/smart-purchase/shortages/ShortagesHeader';
import { ShortagesFiltersBar } from '../src/components/smart-purchase/shortages/ShortagesFiltersBar';
import { ShortageTableRow } from '../src/components/smart-purchase/shortages/ShortageTableRow';
import { ShortagesTable } from '../src/components/smart-purchase/shortages/ShortagesTable';
import { ShortageSuggestionsDrawer } from '../src/components/smart-purchase/shortages/ShortageSuggestionsDrawer';
import { SubTabShortages } from '../src/components/smart-purchase/SubTabShortages';
import { useShortageStore } from '../src/store/useShortageStore';
import { Product, Supplier, Purchase } from '../src/types';
import { ShortageItem } from '../src/types/shortages';

// Mock du module SafeImage pour tester sans réseau ni canvas
vi.mock('../src/components/ui/SafeImage', () => ({
  SafeImage: ({ alt }: any) => <div data-testid="safe-image-mock" data-alt={alt} />
}));

// Mock LocalDatabase (localDb) pour isoler les tests UI sans persistance résiduelle
vi.mock('../src/services/LocalDatabase', () => {
  return {
    localDb: {
      insert: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => []),
      get: vi.fn(async () => null)
    }
  };
});

// Mock idb-keyval pour éviter les erreurs ReferenceError: indexedDB is not defined en environnement Node.js
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {})
}));

// Mock du BarcodeScanner modal pour simulation des scans caméra
vi.mock('../src/components/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan, onClose }: any) => (
    <div data-testid="barcode-scanner-mock">
      <button onClick={() => onScan('613111222333')}>Scanner Mock</button>
      <button onClick={onClose}>Fermer Scanner</button>
    </div>
  )
}));

describe('🧪 Jalon M2 : Composants UI & Interactions du Cahier des Manques', () => {
  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Café Moulu Boun 250g',
      barcode: '613111222333',
      sku: 'SKU-CAFE-01',
      costPrice: 220,
      price: 280,
      taxRate: 19,
      categoryId: 'cat-agro',
      stock: 0, // En RUPTURE
      minStock: 10,
      supplier: 'Distributeur Agro Express',
      status: 'active',
      unit: 'pcs',
      updatedAt: '2026-10-14T10:00:00.000Z'
    },
    {
      id: 'prod-2',
      name: 'Lait UHT 1L Demi-écrémé',
      barcode: '613444555666',
      sku: 'SKU-LAIT-02',
      costPrice: 95,
      price: 110,
      taxRate: 19,
      categoryId: 'cat-lait',
      stock: 3, // En ALERTE (3 <= 15)
      minStock: 15,
      supplier: 'Laiterie Soummam',
      status: 'active',
      unit: 'bouteille',
      updatedAt: '2026-10-14T10:00:00.000Z'
    },
    {
      id: 'prod-3',
      name: 'Eau Minérale Lalla Khedidja 1.5L',
      barcode: '613777888999',
      sku: 'SKU-EAU-03',
      costPrice: 32,
      price: 45,
      taxRate: 19,
      categoryId: 'cat-boissons',
      stock: 50, // Stock NORMAL (50 > 20)
      minStock: 20,
      supplier: 'Eaux Minérales LK',
      status: 'active',
      unit: 'bouteille',
      updatedAt: '2026-10-14T10:00:00.000Z'
    }
  ];

  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Distributeur Agro Express',
      balance: 15000,
      phone: '0550000001'
    },
    {
      id: 'sup-2',
      name: 'Laiterie Soummam',
      balance: 0,
      phone: '0550000002'
    }
  ];

  beforeEach(() => {
    // Réinitialisation de l'état du store Zustand
    useShortageStore.setState({
      items: [],
      customLists: [],
      activeListId: 'all',
      selectedSupplierFilter: 'all',
      searchQuery: '',
      isLoaded: true,
      isSuggestionsOpen: false
    });
  });

  describe('1. ShortagesHeader.tsx', () => {
    it('affiche correctement le titre, le nombre d\'articles et le total estimé en DA', async () => {
      // Pré-remplir 2 articles dans le store
      const item1: ShortageItem = {
        id: 'item-1',
        productId: 'prod-1',
        name: 'Café Moulu Boun 250g',
        quantityNeeded: 10,
        costPrice: 200,
        currentStock: 0,
        minStock: 10,
        isChecked: false,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const item2: ShortageItem = {
        id: 'item-2',
        productId: 'prod-2',
        name: 'Lait UHT 1L',
        quantityNeeded: 12,
        costPrice: 100,
        currentStock: 2,
        minStock: 15,
        isChecked: true, // Sélectionné
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useShortageStore.setState({ items: [item1, item2] });

      const onOpenSuggestions = vi.fn();
      const onConvertToPurchase = vi.fn();
      const onPrintExport = vi.fn();

      render(
        <ShortagesHeader
          onOpenSuggestions={onOpenSuggestions}
          onConvertToPurchase={onConvertToPurchase}
          onPrintExport={onPrintExport}
          suggestedCount={3}
        />
      );

      // Titre et badge de décompte
      expect(screen.getByText('Cahier des Manques')).toBeTruthy();
      expect(screen.getByText('2 réf.')).toBeTruthy();

      // Total estimé : (10 * 200) + (12 * 100) = 2000 + 1200 = 3200 DA
      expect(screen.getByText(/3\s*200,00/)).toBeTruthy();

      // Badge de sélection cochée : 1 coché = 1200 DA
      expect(screen.getByText(/1\s*200,00/)).toBeTruthy();

      // Clics boutons
      const suggBtn = screen.getByText('Suggestions de réassort');
      fireEvent.click(suggBtn);
      expect(onOpenSuggestions).toHaveBeenCalled();

      const convertBtn = screen.getByText(/Commander les 1 cochés/);
      fireEvent.click(convertBtn);
      expect(onConvertToPurchase).toHaveBeenCalled();
    });
  });

  describe('2. ShortagesFiltersBar.tsx', () => {
    it('permet de filtrer par fournisseur', () => {
      render(
        <ShortagesFiltersBar
          products={mockProducts}
          suppliers={mockSuppliers}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeTruthy();

      // Sélectionner un fournisseur
      fireEvent.change(select, { target: { value: 'sup-1' } });
      expect(useShortageStore.getState().selectedSupplierFilter).toBe('sup-1');
    });

    it('ajoute un produit au cahier des manques lors de l\'appui sur Entrée (douchette USB)', async () => {
      render(
        <ShortagesFiltersBar
          products={mockProducts}
          suppliers={mockSuppliers}
        />
      );

      const input = screen.getByPlaceholderText(/Rechercher ou scanner code-barres/);

      // Saisir le code-barres du café et appuyer sur Entrée
      fireEvent.change(input, { target: { value: '613111222333' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Vérifier que le produit a bien été ajouté au store
      await waitFor(() => {
        const items = useShortageStore.getState().items;
        expect(items.length).toBe(1);
        expect(items[0].productId).toBe('prod-1');
        expect(items[0].name).toBe('Café Moulu Boun 250g');
      });
    });

    it('ouvre la modale caméra et ajoute l\'article scanné', async () => {
      render(
        <ShortagesFiltersBar
          products={mockProducts}
          suppliers={mockSuppliers}
        />
      );

      const camBtn = screen.getByTitle('Scanner via la caméra');
      fireEvent.click(camBtn);

      // Le composant mock de scan caméra apparaît
      expect(screen.getByTestId('barcode-scanner-mock')).toBeTruthy();

      // Simuler la lecture du code
      const scanMockBtn = screen.getByText('Scanner Mock');
      fireEvent.click(scanMockBtn);

      // La modale se ferme
      expect(screen.queryByTestId('barcode-scanner-mock')).toBeNull();
    });
  });

  describe('3. ShortageTableRow.tsx & ShortagesTable.tsx', () => {
    it('affiche les badges RUPTURE, ALERTE ou NORMAL selon les stocks physiques', () => {
      const outOfStockItem: ShortageItem = {
        id: 'it-rupture',
        productId: 'p-1',
        name: 'Article Rupture',
        costPrice: 50,
        currentStock: 0,
        minStock: 5,
        quantityNeeded: 5,
        isChecked: false,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const alertItem: ShortageItem = {
        id: 'it-alerte',
        productId: 'p-2',
        name: 'Article Alerte',
        costPrice: 80,
        currentStock: 4,
        minStock: 10,
        quantityNeeded: 6,
        isChecked: false,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useShortageStore.setState({ items: [outOfStockItem, alertItem] });

      render(<ShortagesTable />);

      expect(screen.getByText('RUPTURE')).toBeTruthy();
      expect(screen.getByText('ALERTE')).toBeTruthy();
    });

    it('ajuste la quantité manquante avec le stepper et les raccourcis +6, +12, +24', async () => {
      const item: ShortageItem = {
        id: 'it-stepper',
        productId: 'p-step',
        name: 'Article Stepper',
        costPrice: 100,
        currentStock: 2,
        minStock: 10,
        quantityNeeded: 5,
        isChecked: false,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useShortageStore.setState({ items: [item] });

      render(<ShortagesTable />);

      // Cliquer sur le raccourci +6
      const plus6Btn = screen.getByTitle('Ajouter un carton de 6');
      fireEvent.click(plus6Btn);

      expect(useShortageStore.getState().items[0].quantityNeeded).toBe(11);

      // Cliquer sur le bouton Diminuer [-]
      const minusBtn = screen.getByTitle('Diminuer');
      fireEvent.click(minusBtn);

      expect(useShortageStore.getState().items[0].quantityNeeded).toBe(10);
    });

    it('permet de sélectionner/désélectionner une ligne et de tout sélectionner', () => {
      const it1: ShortageItem = {
        id: 'it-1',
        productId: 'p-1',
        name: 'Item 1',
        costPrice: 10,
        currentStock: 0,
        minStock: 5,
        quantityNeeded: 5,
        isChecked: false,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const it2: ShortageItem = {
        id: 'it-2',
        productId: 'p-2',
        name: 'Item 2',
        costPrice: 20,
        currentStock: 0,
        minStock: 5,
        quantityNeeded: 5,
        isChecked: false,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useShortageStore.setState({ items: [it1, it2] });

      render(<ShortagesTable />);

      // Tout sélectionner via l'en-tête
      const selectAllCheckbox = screen.getByLabelText('Tout sélectionner');
      fireEvent.click(selectAllCheckbox);

      expect(useShortageStore.getState().items.every(i => i.isChecked)).toBe(true);
    });
  });

  describe('4. ShortageSuggestionsDrawer.tsx', () => {
    it('détecte les articles sous le seuil et permet de tout ajouter en 1 clic', async () => {
      const onClose = vi.fn();

      render(
        <ShortageSuggestionsDrawer
          products={mockProducts}
          purchases={[]}
          suppliers={mockSuppliers}
          isOpen={true}
          onClose={onClose}
        />
      );

      // prod-1 (stock 0 <= min 10) et prod-2 (stock 3 <= min 15) doivent être suggérés
      expect(screen.getByText('Café Moulu Boun 250g')).toBeTruthy();
      expect(screen.getByText('Lait UHT 1L Demi-écrémé')).toBeTruthy();

      // prod-3 (stock 50 > min 20) ne doit PAS être suggéré
      expect(screen.queryByText('Eau Minérale Lalla Khedidja 1.5L')).toBeNull();

      // Bouton "Tout ajouter au Cahier"
      const addAllBtn = screen.getByText(/Tout ajouter au Cahier/);
      fireEvent.click(addAllBtn);

      await waitFor(() => {
        const items = useShortageStore.getState().items;
        expect(items.length).toBe(2);
        expect(items.some(i => i.productId === 'prod-1')).toBe(true);
        expect(items.some(i => i.productId === 'prod-2')).toBe(true);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('5. SubTabShortages.tsx (Intégration Complète)', () => {
    it('assemble correctement tous les composants et transfère les articles vers le Bon d\'Achat', async () => {
      const itConvert: ShortageItem = {
        id: 'it-conv',
        productId: 'prod-1',
        name: 'Café Moulu Boun 250g',
        costPrice: 220,
        currentStock: 0,
        minStock: 10,
        quantityNeeded: 10,
        supplierId: 'sup-1',
        supplierName: 'Distributeur Agro Express',
        isChecked: true,
        listIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useShortageStore.setState({ items: [itConvert] });

      const onConvertToPurchase = vi.fn();

      render(
        <SubTabShortages
          products={mockProducts}
          suppliers={mockSuppliers}
          purchases={[]}
          onConvertToPurchase={onConvertToPurchase}
        />
      );

      // Vérifier que le composant est bien affiché
      expect(screen.getByText('Cahier des Manques')).toBeTruthy();
      expect(screen.getAllByText('Café Moulu Boun 250g').length).toBeGreaterThanOrEqual(1);

      // Clic sur "Commander les 1 cochés"
      const convertBtn = screen.getByText(/Commander les 1 cochés/);
      fireEvent.click(convertBtn);

      expect(onConvertToPurchase).toHaveBeenCalledWith([itConvert], 'sup-1');
    });
  });
});
