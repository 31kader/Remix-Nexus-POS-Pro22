import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Modules et composants de l'application
import { useShortageStore } from '../src/store/useShortageStore';
import { SubTabShortages } from '../src/components/smart-purchase/SubTabShortages';
import { ShortagesHeader } from '../src/components/smart-purchase/shortages/ShortagesHeader';
import { ShortagesFiltersBar } from '../src/components/smart-purchase/shortages/ShortagesFiltersBar';
import { ShortagesTable } from '../src/components/smart-purchase/shortages/ShortagesTable';
import { ShortageTableRow } from '../src/components/smart-purchase/shortages/ShortageTableRow';
import { ShortageSuggestionsDrawer } from '../src/components/smart-purchase/shortages/ShortageSuggestionsDrawer';
import { CustomListsTabs } from '../src/components/smart-purchase/shortages/CustomListsTabs';
import { CustomListModal } from '../src/components/smart-purchase/shortages/CustomListModal';
import { ShortagePrintExportModal } from '../src/components/smart-purchase/shortages/ShortagePrintExportModal';
import {
  generateShortageA4PrintHtml,
  printShortageHtmlDocument,
  exportShortagesToExcel,
  exportShortagesToCSV,
  generateShortagesWhatsAppText,
  formatDZD
} from '../src/components/smart-purchase/shortages/shortageExportHelpers';
import { localDb } from '../src/services/LocalDatabase';
import { preparePayload, TABLE_COLUMNS, TABLE_NAME_MAPPINGS } from '../src/lib/db-converters';

// Types du domaine métier
import { Product, Supplier, Purchase } from '../src/types';
import { ShortageItem, CustomReplenishmentList } from '../src/types/shortages';
import * as excelSecurity from '../src/lib/excelSecurity';

// Raccourci pour React.createElement compatible pur TypeScript (.ts)
const e = React.createElement;

// ============================================================================
// MOCKS STRUCTURÉS POUR ENVIRONNEMENT DE TEST (JSDOM / NODE)
// ============================================================================

// 1. Mock SafeImage
vi.mock('../src/components/ui/SafeImage', () => ({
  SafeImage: ({ alt, className }: any) =>
    e('div', {
      'data-testid': 'safe-image-mock',
      'data-alt': alt,
      className
    })
}));

// 2. Mock du modal de scanner caméra
vi.mock('../src/components/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan, onClose }: any) =>
    e(
      'div',
      { 'data-testid': 'barcode-scanner-mock' },
      e('button', { onClick: () => onScan('613111222333') }, 'Scanner Code Javel'),
      e('button', { onClick: () => onScan('613444555666') }, 'Scanner Code Yaourt'),
      e('button', { onClick: onClose }, 'Fermer Scanner')
    )
}));

// 3. Mock exportToExcelSafely
vi.mock('../src/lib/excelSecurity', () => ({
  exportToExcelSafely: vi.fn(async () => {})
}));

// 4. Mock LocalDatabase avec mémoire locale et inspection des signatures (path, value)
const localDatabaseMemory = new Map<string, any>();
const localDbInsertSpy = vi.fn(async (path: string, value: any) => {
  localDatabaseMemory.set(path, JSON.parse(JSON.stringify(value)));
});
const localDbUpdateSpy = vi.fn(async (path: string, value: any) => {
  const existing = localDatabaseMemory.get(path) || {};
  localDatabaseMemory.set(path, { ...existing, ...JSON.parse(JSON.stringify(value)) });
});
const localDbDeleteSpy = vi.fn(async (path: string) => {
  localDatabaseMemory.delete(path);
});

vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: (path: string, value: any) => localDbInsertSpy(path, value),
    update: (path: string, value: any) => localDbUpdateSpy(path, value),
    delete: (path: string) => localDbDeleteSpy(path),
    getAll: vi.fn(async () => Array.from(localDatabaseMemory.values())),
    get: vi.fn(async (path: string) => {
      const val = localDatabaseMemory.get(path);
      return {
        exists: () => val !== undefined,
        val: () => (val ? JSON.parse(JSON.stringify(val)) : null)
      };
    })
  }
}));

// 5. Mock idb-keyval pour réhydratation offline-first
const idbMemory = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbMemory.get(key) || null),
  set: vi.fn(async (key: string, value: any) => {
    idbMemory.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    idbMemory.delete(key);
  })
}));

// ============================================================================
// DONNÉES DE TEST REPRÉSENTATIVES DU COMMERCE DE DÉTAIL / DEMI-GROS (DZD)
// ============================================================================

describe('🧪 Cahier des Manques & Réapprovisionnement Intelligent — Tests d\'Intégration E2E (Jalon M4)', () => {
  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-agro',
      name: 'Distributeur Agro Express',
      phone: '0550112233',
      balance: 15000
    },
    {
      id: 'sup-soummam',
      name: 'Laiterie Soummam',
      phone: '0550445566',
      balance: 4200
    },
    {
      id: 'sup-boissons',
      name: 'Grossiste Boissons Rouiba',
      phone: '0550778899',
      balance: 0
    }
  ];

  const mockProducts: Product[] = [
    {
      id: 'prod-javel',
      name: 'Eau de Javel 1L Dosée',
      barcode: '613111222333',
      sku: 'SKU-JAVEL-01',
      costPrice: 90,
      price: 120,
      taxRate: 19,
      categoryId: 'cat-droguerie',
      stock: 0, // RUPTURE TOTALE (0 <= 12)
      minStock: 12,
      supplier: 'Distributeur Agro Express',
      status: 'active',
      unit: 'bouteille',
      updatedAt: '2026-10-14T10:00:00.000Z'
    },
    {
      id: 'prod-yaourt',
      name: 'Yaourt Nature 100g',
      barcode: '613444555666',
      sku: 'SKU-YAOURT-02',
      costPrice: 25,
      price: 35,
      taxRate: 19,
      categoryId: 'cat-laitiers',
      stock: 3, // STOCK BAS / ALERTE (3 <= 24)
      minStock: 24,
      supplier: 'Laiterie Soummam',
      status: 'active',
      unit: 'pot',
      updatedAt: '2026-10-14T10:00:00.000Z'
    },
    {
      id: 'prod-jus',
      name: 'Jus d\'Orange 1L Rouiba',
      barcode: '613777888999',
      sku: 'SKU-JUS-03',
      costPrice: 130,
      price: 170,
      taxRate: 19,
      categoryId: 'cat-boissons',
      stock: 40, // STOCK NORMAL (40 > 15)
      minStock: 15,
      supplier: 'Grossiste Boissons Rouiba',
      status: 'active',
      unit: 'brique',
      updatedAt: '2026-10-14T10:00:00.000Z'
    },
    {
      id: 'prod-inactive',
      name: 'Article Obsolète Non Suivi',
      barcode: '613000000000',
      sku: 'SKU-OBS-99',
      costPrice: 50,
      price: 70,
      taxRate: 19,
      categoryId: 'cat-divers',
      stock: 0,
      minStock: 10,
      supplier: 'Fournisseur Ancien',
      status: 'inactive', // Ignoré par les suggestions
      unit: 'pcs',
      updatedAt: '2026-10-14T10:00:00.000Z'
    }
  ];

  const mockPurchases: Purchase[] = [
    {
      id: 'purch-001',
      supplierId: 'sup-agro',
      supplierName: 'Distributeur Agro Express',
      date: '2026-10-10T08:30:00.000Z',
      total: 1080,
      status: 'completed',
      paymentStatus: 'paid',
      paidAmount: 1080,
      items: [
        {
          productId: 'prod-javel',
          name: 'Eau de Javel 1L Dosée',
          quantity: 12,
          costPrice: 90
        }
      ]
    },
    {
      id: 'purch-002',
      supplierId: 'sup-soummam',
      supplierName: 'Laiterie Soummam',
      date: '2026-10-12T09:15:00.000Z',
      total: 600,
      status: 'completed',
      paymentStatus: 'paid',
      paidAmount: 600,
      items: [
        {
          productId: 'prod-yaourt',
          name: 'Yaourt Nature 100g',
          quantity: 24,
          costPrice: 25
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localDatabaseMemory.clear();
    idbMemory.clear();

    // Réinitialisation complète du store Zustand
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1 : PERSISTANCE LOCALE OFFLINE-FIRST & RÈGLE DES 2 ARGUMENTS
  // ==========================================================================
  describe('1. Architecture Offline-First & Persistance Locale LocalDatabase', () => {
    it('1.1 respecte rigoureusement la signature à 2 arguments (path, value) sur insert et update', async () => {
      const store = useShortageStore.getState();

      // 1. Ajout d'un article
      const newItem = await store.addItem(
        {
          id: 'prod-javel',
          name: 'Eau de Javel 1L Dosée',
          barcode: '613111222333',
          costPrice: 90,
          stock: 0,
          minStock: 12
        },
        { quantity: 12, supplierId: 'sup-agro', supplierName: 'Distributeur Agro Express' }
      );

      // Vérification du nombre d'arguments sur localDb.insert
      expect(localDbInsertSpy).toHaveBeenCalled();
      const lastInsertCall = localDbInsertSpy.mock.calls[localDbInsertSpy.mock.calls.length - 1];
      expect(lastInsertCall.length).toBe(2);
      expect(lastInsertCall[0]).toBe(`shortage_items/${newItem.id}`);
      expect(typeof lastInsertCall[0]).toBe('string');
      expect(lastInsertCall[1]).toBeDefined();
      expect(lastInsertCall[1].id).toBe(newItem.id);

      // 2. Mise à jour de quantité
      await store.updateItemQuantity(newItem.id, 18);
      expect(localDbUpdateSpy).toHaveBeenCalled();
      const lastUpdateCall = localDbUpdateSpy.mock.calls[localDbUpdateSpy.mock.calls.length - 1];
      expect(lastUpdateCall.length).toBe(2);
      expect(lastUpdateCall[0]).toBe(`shortage_items/${newItem.id}`);
      expect(lastUpdateCall[1].quantityNeeded).toBe(18);

      // 3. Création d'une liste personnalisée libre
      const newList = await store.createCustomList('Tournée Détergents', 'Secteur Ouest', '#f43f5e');
      const listInsertCall = localDbInsertSpy.mock.calls[localDbInsertSpy.mock.calls.length - 1];
      expect(listInsertCall.length).toBe(2);
      expect(listInsertCall[0]).toBe(`custom_replenishment_lists/${newList.id}`);
      expect(listInsertCall[1].name).toBe('Tournée Détergents');

      // 4. Suppression de l'article avec 1 argument sur delete
      await store.removeItem(newItem.id);
      expect(localDbDeleteSpy).toHaveBeenCalledWith(`shortage_items/${newItem.id}`);
    });

    it('1.2 assure la réhydratation locale à froid depuis IndexedDB sans connexion réseau', async () => {
      // Préparer un snapshot de données préexistantes dans le cache IndexedDB
      const cachedItem: ShortageItem = {
        id: 'shortage-cached-001',
        productId: 'prod-javel',
        name: 'Eau de Javel 1L Dosée',
        barcode: '613111222333',
        quantityNeeded: 24,
        costPrice: 90,
        currentStock: 0,
        minStock: 12,
        isChecked: true,
        listIds: ['list-001'],
        createdAt: '2026-10-14T08:00:00.000Z',
        updatedAt: '2026-10-14T08:00:00.000Z'
      };

      const cachedList: CustomReplenishmentList = {
        id: 'list-001',
        name: 'Tournée Hebdomadaire',
        description: 'Livraison lundi matin',
        color: '#10b981',
        createdAt: '2026-10-14T08:00:00.000Z',
        updatedAt: '2026-10-14T08:00:00.000Z'
      };

      idbMemory.set('nexus_db_shortage_items', { [cachedItem.id]: cachedItem });
      idbMemory.set('nexus_db_custom_replenishment_lists', { [cachedList.id]: cachedList });

      // Réinitialiser le store et déclencher loadFromDb()
      useShortageStore.setState({ items: [], customLists: [], isLoaded: false });
      await useShortageStore.getState().loadFromDb();

      const state = useShortageStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.items.length).toBe(1);
      expect(state.items[0].name).toBe('Eau de Javel 1L Dosée');
      expect(state.customLists.length).toBe(1);
      expect(state.customLists[0].name).toBe('Tournée Hebdomadaire');
    });

    it('1.3 est strictement conforme aux colonnes autorisées TABLE_COLUMNS et preparePayload', () => {
      // Vérifier la déclaration des tables dans db-converters
      expect(TABLE_NAME_MAPPINGS.shortageItems).toBe('shortage_items');
      expect(TABLE_NAME_MAPPINGS.customReplenishmentLists).toBe('custom_replenishment_lists');

      const shortageCols = TABLE_COLUMNS['shortage_items'];
      expect(shortageCols).toBeDefined();
      expect(shortageCols.length).toBe(20);
      expect(shortageCols).toContain('id');
      expect(shortageCols).toContain('product_id');
      expect(shortageCols).toContain('name');
      expect(shortageCols).toContain('barcode');
      expect(shortageCols).toContain('quantity_needed');
      expect(shortageCols).toContain('cost_price');
      expect(shortageCols).toContain('supplier_id');
      expect(shortageCols).toContain('supplier_name');
      expect(shortageCols).toContain('current_stock');
      expect(shortageCols).toContain('min_stock');
      expect(shortageCols).toContain('is_checked');
      expect(shortageCols).toContain('list_ids');
      expect(shortageCols).toContain('is_custom_product');
      expect(shortageCols).toContain('notes');
      expect(shortageCols).toContain('priority');

      // Test de preparePayload pour rejeter toute colonne parasite
      const rawPayload = {
        id: 'test-uuid',
        productId: 'prod-1',
        name: 'Produit Test',
        quantityNeeded: '15', // Devrait être converti en nombre
        isChecked: true,
        listIds: ['list-1', 'list-2'],
        unauthorizedFakeCol: 'SHOULD_BE_DROPPED'
      };

      const sanitized = preparePayload('shortage_items', 'test-uuid', rawPayload);
      expect(sanitized.unauthorized_fake_col).toBeUndefined();
      expect(sanitized.id).toBe('test-uuid');
      expect(sanitized.quantity_needed).toBe(15);
      expect(sanitized.is_checked).toBe(true);
      expect(Array.isArray(sanitized.list_ids)).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 2 : NUMÉRISATION CODE-BARRES RÉACTIVE (DOUCHETTE USB & CAMÉRA)
  // ==========================================================================
  describe('2. Numérisation Code-Barres Réactive (Douchette USB & Caméra)', () => {
    it('2.1 détecte le code scanné à la douchette USB, ajoute l\'article et émet le bip sonore', async () => {
      render(
        e(ShortagesFiltersBar, {
          products: mockProducts,
          suppliers: mockSuppliers
        })
      );

      const searchInput = screen.getByPlaceholderText(/Rechercher ou scanner code-barres/i);

      // Simulation de la saisie ultra-rapide au lecteur laser/douchette terminée par Enter
      fireEvent.change(searchInput, { target: { value: '613111222333' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        const storeItems = useShortageStore.getState().items;
        expect(storeItems.length).toBe(1);
        expect(storeItems[0].name).toBe('Eau de Javel 1L Dosée');
        // Quantité scannée par défaut via la douchette USB (1 unité)
        expect(storeItems[0].quantityNeeded).toBe(1);
        expect(storeItems[0].costPrice).toBe(90);
      });

      // Le champ d'entrée doit être automatiquement vidé pour le scan suivant
      expect((searchInput as HTMLInputElement).value).toBe('');
    });

    it('2.2 applique la consolidation arithmétique cumulative lors de scans successifs d\'un même article', async () => {
      render(
        e(ShortagesFiltersBar, {
          products: mockProducts,
          suppliers: mockSuppliers
        })
      );

      const searchInput = screen.getByPlaceholderText(/Rechercher ou scanner code-barres/i);

      // 1er Scan : Javel (quantité initiale = 1)
      fireEvent.change(searchInput, { target: { value: '613111222333' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(useShortageStore.getState().items.length).toBe(1);
        expect(useShortageStore.getState().items[0].quantityNeeded).toBe(1);
      });

      // 2e Scan consécutif du même code-barres : incrémente de +1 sans recréer de ligne
      fireEvent.change(searchInput, { target: { value: '613111222333' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        const items = useShortageStore.getState().items;
        expect(items.length).toBe(1); // Anti-duplication garantie
        expect(items[0].quantityNeeded).toBe(2); // 1 + 1 = 2
      });
    });

    it('2.3 permet le scan caméra mobile et intègre réactivement l\'article scanné', async () => {
      render(
        e(ShortagesFiltersBar, {
          products: mockProducts,
          suppliers: mockSuppliers
        })
      );

      // Clic sur l'icône caméra
      const cameraBtn = screen.getByTitle(/Scanner via la caméra/i);
      fireEvent.click(cameraBtn);

      // Le mock du BarcodeScanner s'affiche
      expect(screen.getByTestId('barcode-scanner-mock')).toBeTruthy();

      // Clic sur le bouton de scan simulé pour le Yaourt
      const scanYaourtBtn = screen.getByText('Scanner Code Yaourt');
      fireEvent.click(scanYaourtBtn);

      await waitFor(() => {
        const items = useShortageStore.getState().items;
        expect(items.some(i => i.name === 'Yaourt Nature 100g')).toBe(true);
      });
    });
  });

  // ==========================================================================
  // SECTION 3 : DÉTECTION INTELLIGENTE & SUGGESTIONS DE RÉASSORT AUTOMATIQUE
  // ==========================================================================
  describe('3. Détection Intelligente & Suggestions Automatiques de Réassort', () => {
    it('3.1 détecte fidèlement les ruptures et alertes de stock en excluant les inactifs', () => {
      const store = useShortageStore.getState();
      const suggestions = store.detectLowStockProducts(mockProducts, mockPurchases, mockSuppliers);

      // Doit remonter Javel (stock 0 <= 12) et Yaourt (stock 3 <= 24)
      // Doit exclure Jus d'Orange (stock 40 > 15) et Article Obsolète (status === 'inactive')
      expect(suggestions.length).toBe(2);

      const javelSuggestion = suggestions.find(s => s.productId === 'prod-javel');
      expect(javelSuggestion).toBeDefined();
      expect(javelSuggestion?.currentStock).toBe(0);
      expect(javelSuggestion?.quantityNeeded).toBe(12); // 12 - 0

      const yaourtSuggestion = suggestions.find(s => s.productId === 'prod-yaourt');
      expect(yaourtSuggestion).toBeDefined();
      expect(yaourtSuggestion?.currentStock).toBe(3);
      expect(yaourtSuggestion?.quantityNeeded).toBe(21); // 24 - 3
    });

    it('3.2 identifie avec précision le dernier fournisseur et coût d\'achat via l\'historique chronologique des bons', () => {
      const store = useShortageStore.getState();
      const suggestions = store.detectLowStockProducts(mockProducts, mockPurchases, mockSuppliers);

      const javel = suggestions.find(s => s.productId === 'prod-javel');
      expect(javel?.supplierId).toBe('sup-agro');
      expect(javel?.supplierName).toBe('Distributeur Agro Express');
      expect(javel?.costPrice).toBe(90);

      const yaourt = suggestions.find(s => s.productId === 'prod-yaourt');
      expect(yaourt?.supplierId).toBe('sup-soummam');
      expect(yaourt?.supplierName).toBe('Laiterie Soummam');
      expect(yaourt?.costPrice).toBe(25);
    });

    it('3.3 permet l\'ajout en lot "Tout ajouter" via le tiroir de suggestions', async () => {
      render(
        e(ShortageSuggestionsDrawer, {
          isOpen: true,
          onClose: vi.fn(),
          products: mockProducts,
          purchases: mockPurchases,
          suppliers: mockSuppliers
        })
      );

      // Vérifier la présence du tiroir et du bouton d'ajout groupé
      const addAllBtn = screen.getByRole('button', { name: /Tout ajouter au Cahier/i });
      expect(addAllBtn).toBeTruthy();

      fireEvent.click(addAllBtn);

      await waitFor(() => {
        const items = useShortageStore.getState().items;
        expect(items.length).toBe(2);
        expect(items.map(i => i.productId)).toContain('prod-javel');
        expect(items.map(i => i.productId)).toContain('prod-yaourt');
      });
    });
  });

  // ==========================================================================
  // SECTION 4 : VALORISATION DA, STEPPERS ET RACCOURCIS DE CONDITIONNEMENT
  // ==========================================================================
  describe('4. Calculs Chiffrés en DA, Steppers & Conditionnements Packs', () => {
    it('4.1 calcule dynamiquement la synthèse financière globale et la sélection cochée', async () => {
      const store = useShortageStore.getState();

      // 1. Ajouter Javel : 10 unités à 90 DA = 900 DA (coché)
      const item1 = await store.addItem(
        { id: 'prod-javel', name: 'Javel', costPrice: 90, stock: 0, minStock: 10 },
        { quantity: 10 }
      );
      await store.toggleItemCheck(item1.id);

      // 2. Ajouter Yaourt : 20 unités à 25 DA = 500 DA (non coché)
      await store.addItem(
        { id: 'prod-yaourt', name: 'Yaourt', costPrice: 25, stock: 5, minStock: 25 },
        { quantity: 20 }
      );

      const summary = store.getSummary();
      expect(summary.totalItems).toBe(2);
      expect(summary.totalQuantity).toBe(30); // 10 + 20
      expect(summary.totalEstimatedCost).toBe(1400); // 900 + 500
      expect(summary.checkedCount).toBe(1);
      expect(summary.checkedEstimatedCost).toBe(900); // Javel cochée
    });

    it('4.2 applique les boutons de conditionnement rapide (+6, +12, +24) et empêche les quantités négatives', async () => {
      const store = useShortageStore.getState();
      const item = await store.addItem(
        { id: 'prod-javel', name: 'Eau de Javel 1L Dosée', costPrice: 90, stock: 0, minStock: 6 },
        { quantity: 6 }
      );

      render(
        e('table', null,
          e('tbody', null,
            e(ShortageTableRow, {
              item: useShortageStore.getState().items[0],
              onToggleCheck: vi.fn(),
              onUpdateQuantity: (id: string, q: number) => store.updateItemQuantity(id, q),
              onUpdateCostPrice: (id: string, cp: number) => store.updateItemCostPrice(id, cp),
              onRemove: vi.fn()
            })
          )
        )
      );

      // Clic sur le raccourci pack "+12"
      const btnPlus12 = screen.getByRole('button', { name: '+12' });
      fireEvent.click(btnPlus12);

      await waitFor(() => {
        expect(useShortageStore.getState().items[0].quantityNeeded).toBe(18); // 6 + 12
      });

      // Tentative de décrémentation sous 1 unité : doit être bornée à 1
      await store.updateItemQuantity(item.id, -5);
      expect(useShortageStore.getState().items[0].quantityNeeded).toBe(1);
    });

    it('4.3 formate fidèlement la devise en Dinars Algériens (DA) selon la locale algérienne', () => {
      const formatted = formatDZD(14500.5);
      // Format fr-DZ : séparateur de milliers et virgule décimale
      expect(formatted).toMatch(/14\s*500,50/);
    });
  });

  // ==========================================================================
  // SECTION 5 : GESTION DES LISTES PERSONNALISÉES LIBRES (HORS CATÉGORIES)
  // ==========================================================================
  describe('5. Listes d\'Approvisionnement Libres (Indépendantes des Catégories)', () => {
    it('5.1 permet de créer, modifier et supprimer des listes avec pastilles de couleurs', async () => {
      const store = useShortageStore.getState();

      // 1. Création de deux listes
      const listDetergents = await store.createCustomList('Tournée Détergents', 'Grossiste Ouest', '#f43f5e');
      const listFrais = await store.createCustomList('Produits Frais', 'Arrivage quotidien', '#10b981');

      expect(useShortageStore.getState().customLists.length).toBe(2);
      expect(useShortageStore.getState().activeListId).toBe(listFrais.id);

      // 2. Modification de nom
      await store.updateCustomList(listDetergents.id, { name: 'Tournée Droguerie Centrale' });
      expect(useShortageStore.getState().customLists.find(l => l.id === listDetergents.id)?.name).toBe(
        'Tournée Droguerie Centrale'
      );

      // 3. Suppression
      await store.deleteCustomList(listFrais.id);
      expect(useShortageStore.getState().customLists.length).toBe(1);
      expect(useShortageStore.getState().customLists[0].id).toBe(listDetergents.id);
    });

    it('5.2 gère l\'affectation multi-listes d\'un article et le filtrage réactif du tableau', async () => {
      const store = useShortageStore.getState();
      const list1 = await store.createCustomList('Tournée A', '', '#6366f1');
      const list2 = await store.createCustomList('Tournée B', '', '#10b981');

      // Ajouter un article
      const item = await store.addItem(
        { id: 'prod-javel', name: 'Javel', costPrice: 90, stock: 0, minStock: 10 },
        { quantity: 10, listId: list1.id }
      );

      // Assigner également à la Tournée B (multi-listes)
      await store.assignItemToList(item.id, list2.id);

      const updated = useShortageStore.getState().items[0];
      expect(updated.listIds).toContain(list1.id);
      expect(updated.listIds).toContain(list2.id);

      // Basculer l'affichage sur la Tournée A : l'article est visible
      store.setActiveListId(list1.id);
      expect(store.getFilteredItems().length).toBe(1);

      // Basculer sur la Tournée B : l'article est également visible
      store.setActiveListId(list2.id);
      expect(store.getFilteredItems().length).toBe(1);

      // Si suppression de la Tournée A, l'article conserve Tournée B
      await store.deleteCustomList(list1.id);
      const afterDelete = useShortageStore.getState().items[0];
      expect(afterDelete.listIds).not.toContain(list1.id);
      expect(afterDelete.listIds).toContain(list2.id);
    });
  });

  // ==========================================================================
  // SECTION 6 : FILTRAGE PAR FOURNISSEUR ET RECHERCHE MULTI-CRITÈRES
  // ==========================================================================
  describe('6. Filtrage par Fournisseur & Recherche Multi-Critères', () => {
    it('6.1 filtre les articles par fournisseur et effectue la recherche textuelle croisée', async () => {
      const store = useShortageStore.getState();

      // Ajouter 2 articles de fournisseurs différents
      await store.addItem(
        { id: 'prod-javel', name: 'Eau de Javel 1L Dosée', barcode: '613111222333', sku: 'SKU-JAVEL-01' },
        { supplierId: 'sup-agro', supplierName: 'Distributeur Agro Express' }
      );
      await store.addItem(
        { id: 'prod-yaourt', name: 'Yaourt Nature 100g', barcode: '613444555666', sku: 'SKU-YAOURT-02' },
        { supplierId: 'sup-soummam', supplierName: 'Laiterie Soummam' }
      );

      // 1. Vue globale 'all'
      expect(store.getFilteredItems().length).toBe(2);

      // 2. Filtre Fournisseur 'sup-agro'
      store.setSelectedSupplierFilter('sup-agro');
      const filteredAgro = store.getFilteredItems();
      expect(filteredAgro.length).toBe(1);
      expect(filteredAgro[0].name).toBe('Eau de Javel 1L Dosée');

      // 3. Recherche textuelle par SKU
      store.setSelectedSupplierFilter('all');
      store.setSearchQuery('YAOURT');
      const filteredSku = store.getFilteredItems();
      expect(filteredSku.length).toBe(1);
      expect(filteredSku[0].name).toBe('Yaourt Nature 100g');
    });
  });

  // ==========================================================================
  // SECTION 7 : PASSERELLE DE CONVERSION EN 1 CLIC VERS LE BON D'ACHAT
  // ==========================================================================
  describe('7. Passerelle de Conversion en 1 Clic vers Bon d\'Achat (SmartPurchase)', () => {
    it('7.1 transfère fidèlement les articles cochés avec détection automatique du fournisseur commun', async () => {
      const store = useShortageStore.getState();
      const convertCallback = vi.fn();

      // Ajouter 2 articles du même fournisseur 'sup-agro'
      const it1 = await store.addItem(
        { id: 'prod-javel', name: 'Eau de Javel 1L Dosée', costPrice: 90, stock: 0, minStock: 12 },
        { quantity: 12, supplierId: 'sup-agro', supplierName: 'Distributeur Agro Express' }
      );
      const it2 = await store.addItem(
        { id: 'prod-savon', name: 'Savon Mains 500ml', costPrice: 150, stock: 1, minStock: 6 },
        { quantity: 6, supplierId: 'sup-agro', supplierName: 'Distributeur Agro Express' }
      );

      // Cocher les deux articles
      await store.toggleItemCheck(it1.id);
      await store.toggleItemCheck(it2.id);

      render(
        e(SubTabShortages, {
          products: mockProducts,
          suppliers: mockSuppliers,
          purchases: mockPurchases,
          onConvertToPurchase: convertCallback
        })
      );

      // Clic sur "Commander les 2 cochés"
      const convertBtn = screen.getByRole('button', { name: /Commander les 2 cochés/i });
      fireEvent.click(convertBtn);

      expect(convertCallback).toHaveBeenCalledTimes(1);
      const [transferredItems, targetSupplierId] = convertCallback.mock.calls[0];

      expect(transferredItems.length).toBe(2);
      const javel = transferredItems.find((i: any) => i.productId === 'prod-javel');
      const savon = transferredItems.find((i: any) => i.productId === 'prod-savon');

      expect(javel).toBeDefined();
      expect(javel?.quantityNeeded).toBe(12);
      expect(javel?.costPrice).toBe(90);

      expect(savon).toBeDefined();
      expect(savon?.quantityNeeded).toBe(6);
      expect(savon?.costPrice).toBe(150);

      // Les 2 articles étant du même fournisseur, le fournisseur commun est automatiquement transmis
      expect(targetSupplierId).toBe('sup-agro');
    });

    it('7.2 ne force aucun fournisseur commun si les articles proviennent de fournisseurs distincts', async () => {
      const store = useShortageStore.getState();
      const convertCallback = vi.fn();

      const it1 = await store.addItem(
        { id: 'prod-javel', name: 'Javel', costPrice: 90 },
        { quantity: 10, supplierId: 'sup-agro' }
      );
      const it2 = await store.addItem(
        { id: 'prod-yaourt', name: 'Yaourt', costPrice: 25 },
        { quantity: 20, supplierId: 'sup-soummam' }
      );

      await store.toggleItemCheck(it1.id);
      await store.toggleItemCheck(it2.id);

      render(
        e(SubTabShortages, {
          products: mockProducts,
          suppliers: mockSuppliers,
          onConvertToPurchase: convertCallback
        })
      );

      const convertBtn = screen.getByRole('button', { name: /Commander les 2 cochés/i });
      fireEvent.click(convertBtn);

      const [, targetSupplierId] = convertCallback.mock.calls[0];
      // Fournisseurs hétérogènes : aucun fournisseur forcé
      expect(targetSupplierId).toBeUndefined();
    });
  });

  // ==========================================================================
  // SECTION 8 : IMPRESSION A4 HAUTE DENSITÉ ET EXPORTS (EXCEL, CSV, WHATSAPP)
  // ==========================================================================
  describe('8. Impression A4 Haute Densité & Exports Sécurisés (Excel, CSV, WhatsApp)', () => {
    const testItems: ShortageItem[] = [
      {
        id: 's-1',
        productId: 'prod-javel',
        name: 'Eau de Javel 1L Dosée',
        barcode: '613111222333',
        sku: 'SKU-JAVEL-01',
        costPrice: 90,
        currentStock: 0,
        minStock: 12,
        quantityNeeded: 12,
        supplierId: 'sup-agro',
        supplierName: 'Distributeur Agro Express',
        isChecked: true,
        listIds: [],
        unit: 'bouteille',
        createdAt: '2026-10-14T10:00:00.000Z',
        updatedAt: '2026-10-14T10:00:00.000Z'
      }
    ];

    it('8.1 génère un gabarit A4 conforme avec en-tête, tableau et zones d\'émargement', () => {
      const html = generateShortageA4PrintHtml({
        items: testItems,
        supplierName: 'Distributeur Agro Express',
        listName: 'Tournée Droguerie',
        companyName: 'Superette El Bahdja',
        companyPhone: '021 50 60 70',
        currency: 'DA'
      });

      expect(html).toContain('Bon de Réassort & Commande');
      expect(html).toContain('Superette El Bahdja');
      expect(html).toContain('Distributeur Agro Express');
      expect(html).toContain('Eau de Javel 1L Dosée');
      expect(html).toContain('Visa & Cachet Magasin');
      expect(html).toContain('Signature & Réception Fournisseur');
      expect(html).toContain('size: A4 portrait');
    });

    it('8.2 exporte les données vers Excel de façon sécurisée via exportToExcelSafely', async () => {
      await exportShortagesToExcel(testItems, 'Test_Export_Shortages', 'Droguerie');
      expect(excelSecurity.exportToExcelSafely).toHaveBeenCalledTimes(1);
      const [rows, fileName, sheetName] = (excelSecurity.exportToExcelSafely as any).mock.calls[0];

      expect(fileName).toBe('Test_Export_Shortages');
      expect(sheetName).toBe('Cahier Manques');
      expect(rows[0]['Désignation']).toBe('Eau de Javel 1L Dosée');
      expect(rows[0]['Quantité Demandée']).toBe(12);
      expect(rows[0]['Prix Unitaire Achat (DA)']).toBe(90);
    });

    it('8.3 génère un fichier CSV francophone avec BOM UTF-8 et point-virgule', () => {
      // Mock de URL.createObjectURL et link.click
      const createObjectURLMock = vi.fn(() => 'blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      expect(() => exportShortagesToCSV(testItems, 'Test_Export')).not.toThrow();
      expect(createObjectURLMock).toHaveBeenCalled();
    });

    it('8.4 formate un message WhatsApp structuré et lisible avec devise DA pour le commercial', () => {
      const text = generateShortagesWhatsAppText({
        items: testItems,
        supplierName: 'Distributeur Agro Express',
        listName: 'Cahier des Manques',
        companyName: 'Superette El Bahdja'
      });

      expect(text).toContain('COMMANDE DE RÉASSORT — SUPERETTE EL BAHDJA');
      expect(text).toContain('Distributeur Agro Express');
      expect(text).toContain('*12x* Eau de Javel 1L Dosée');
      expect(text).toContain('*Total articles :* 1 références (12 unités)');
      expect(text).toContain('DA');
    });

    it('8.5 permet l\'impression isolée sans pollution du DOM React principal via iframe cachée', () => {
      printShortageHtmlDocument('<html><body>Document Test</body></html>');
      const iframe = document.getElementById('nexus-shortage-print-iframe') as HTMLIFrameElement;
      expect(iframe).toBeTruthy();
      expect(iframe.style.position).toBe('fixed');
      expect(iframe.style.width).toBe('0px');
    });
  });
});
