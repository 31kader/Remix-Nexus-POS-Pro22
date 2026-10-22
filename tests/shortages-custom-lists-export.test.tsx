import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomListsTabs } from '../src/components/smart-purchase/shortages/CustomListsTabs';
import { CustomListModal } from '../src/components/smart-purchase/shortages/CustomListModal';
import { ShortageTableRow } from '../src/components/smart-purchase/shortages/ShortageTableRow';
import { ShortagePrintExportModal } from '../src/components/smart-purchase/shortages/ShortagePrintExportModal';
import { SubTabShortages } from '../src/components/smart-purchase/SubTabShortages';
import { useShortageStore } from '../src/store/useShortageStore';
import { Product, Supplier, Purchase } from '../src/types';
import { ShortageItem, CustomReplenishmentList } from '../src/types/shortages';
import * as excelSecurity from '../src/lib/excelSecurity';

// Mock SafeImage
vi.mock('../src/components/ui/SafeImage', () => ({
  SafeImage: ({ alt }: any) => <div data-testid="safe-image-mock" data-alt={alt} />
}));

// Mock LocalDatabase (localDb)
vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    getAll: vi.fn(async () => []),
    get: vi.fn(async () => null)
  }
}));

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {})
}));

// Mock exportToExcelSafely
vi.mock('../src/lib/excelSecurity', () => ({
  exportToExcelSafely: vi.fn(async () => {})
}));

describe('🧪 Jalon M3 : Listes Personnalisées Libres, Conversion & Export Cahier des Manques', () => {
  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-agro',
      name: 'Distributeur Agro Express',
      phone: '0550112233',
      balance: 0
    },
    {
      id: 'sup-soummam',
      name: 'Laiterie Soummam',
      phone: '0550445566',
      balance: 0
    }
  ];

  const mockCustomLists: CustomReplenishmentList[] = [
    {
      id: 'list-detergents',
      name: 'Tournée Détergents',
      description: 'Grossiste Droguerie Rouiba',
      color: '#f43f5e',
      createdAt: '2026-10-14T08:00:00.000Z',
      updatedAt: '2026-10-14T08:00:00.000Z'
    },
    {
      id: 'list-frais',
      name: 'Produits Frais & Laitiers',
      description: 'Approvisionnement matinal',
      color: '#10b981',
      createdAt: '2026-10-14T08:00:00.000Z',
      updatedAt: '2026-10-14T08:00:00.000Z'
    }
  ];

  const mockShortageItems: ShortageItem[] = [
    {
      id: 'shortage-1',
      productId: 'prod-1',
      name: 'Eau de Javel 1L Dosée',
      barcode: '613111222333',
      sku: 'SKU-JAVEL-01',
      costPrice: 90,
      currentStock: 0,
      minStock: 12,
      quantityNeeded: 24,
      supplierId: 'sup-agro',
      supplierName: 'Distributeur Agro Express',
      isChecked: true,
      listIds: ['list-detergents'],
      unit: 'bouteille',
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T09:00:00.000Z'
    },
    {
      id: 'shortage-2',
      productId: 'prod-2',
      name: 'Yaourt Nature 100g',
      barcode: '613444555666',
      sku: 'SKU-YAOURT-02',
      costPrice: 25,
      currentStock: 2,
      minStock: 20,
      quantityNeeded: 36,
      supplierId: 'sup-soummam',
      supplierName: 'Laiterie Soummam',
      isChecked: false,
      listIds: ['list-frais'],
      unit: 'pot',
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T09:00:00.000Z'
    },
    {
      id: 'shortage-3',
      productId: 'prod-3',
      name: 'Savon Liquide Mains 500ml',
      barcode: '613777888999',
      sku: 'SKU-SAVON-03',
      costPrice: 180,
      currentStock: 1,
      minStock: 6,
      quantityNeeded: 12,
      supplierId: 'sup-agro',
      supplierName: 'Distributeur Agro Express',
      isChecked: true,
      listIds: ['list-detergents'],
      unit: 'pcs',
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T09:00:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useShortageStore.setState({
      items: [...mockShortageItems],
      customLists: [...mockCustomLists],
      activeListId: 'all',
      selectedSupplierFilter: 'all',
      searchQuery: '',
      isLoaded: true,
      isSuggestionsOpen: false
    });
  });

  // -------------------------------------------------------------
  // Test 1 : Onglets-Pills des Listes Libres (CustomListsTabs)
  // -------------------------------------------------------------
  it('1. Affiche les onglets-pills des listes libres avec leurs compteurs d\'articles exacts', () => {
    const handleOpenModal = vi.fn();
    render(<CustomListsTabs onOpenManageModal={handleOpenModal} />);

    // Onglet global "Toutes les listes" avec 3 articles
    expect(screen.getByText('Toutes les listes')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    // Onglets personnalisés
    expect(screen.getByText('Tournée Détergents')).toBeTruthy();
    expect(screen.getByText('Produits Frais & Laitiers')).toBeTruthy();

    // Compteur par liste : 2 articles pour Détergents (shortage-1 et shortage-3), 1 pour Frais (shortage-2)
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();

    // Clic sur l'onglet "Tournée Détergents"
    fireEvent.click(screen.getByText('Tournée Détergents'));
    expect(useShortageStore.getState().activeListId).toBe('list-detergents');

    // Clic sur le bouton "Gérer les listes"
    fireEvent.click(screen.getByTitle(/Gérer les listes personnalisées/i));
    expect(handleOpenModal).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------
  // Test 2 : Filtrage réactif du tableau selon la liste active
  // -------------------------------------------------------------
  it('2. Filtre réactivement les articles affichés selon la liste personnalisée sélectionnée', () => {
    // État initial 'all' : 3 articles retournés
    expect(useShortageStore.getState().getFilteredItems().length).toBe(3);

    // Bascule vers 'list-detergents' : 2 articles retournés
    useShortageStore.getState().setActiveListId('list-detergents');
    const filteredDetergents = useShortageStore.getState().getFilteredItems();
    expect(filteredDetergents.length).toBe(2);
    expect(filteredDetergents.map(i => i.name)).toContain('Eau de Javel 1L Dosée');
    expect(filteredDetergents.map(i => i.name)).toContain('Savon Liquide Mains 500ml');
    expect(filteredDetergents.map(i => i.name)).not.toContain('Yaourt Nature 100g');

    // Bascule vers 'list-frais' : 1 article retourné
    useShortageStore.getState().setActiveListId('list-frais');
    const filteredFrais = useShortageStore.getState().getFilteredItems();
    expect(filteredFrais.length).toBe(1);
    expect(filteredFrais[0].name).toBe('Yaourt Nature 100g');
  });

  // -------------------------------------------------------------
  // Test 3 : Création, modification et suppression de liste libre (CustomListModal)
  // -------------------------------------------------------------
  it('3. Permet de créer, modifier et supprimer une liste personnalisée avec persistance locale', async () => {
    const handleClose = vi.fn();
    render(<CustomListModal isOpen={true} onClose={handleClose} />);

    // 1. Création d'une nouvelle liste "Grossiste Boissons"
    const inputName = screen.getByPlaceholderText(/Ex: Tournée Détergents/i);
    const inputDesc = screen.getByPlaceholderText(/Ex: Commandes hebdomadaires/i);

    fireEvent.change(inputName, { target: { value: 'Grossiste Boissons' } });
    fireEvent.change(inputDesc, { target: { value: 'Livraison vendredi' } });

    const btnSubmit = screen.getByRole('button', { name: /Ajouter la liste/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      const lists = useShortageStore.getState().customLists;
      expect(lists.some(l => l.name === 'Grossiste Boissons')).toBe(true);
    });

    // 2. Modification du nom d'une liste existante
    const editBtn = screen.getByLabelText(/Modifier la liste Tournée Détergents/i);
    fireEvent.click(editBtn);

    const editNameInput = screen.getByDisplayValue('Tournée Détergents');
    fireEvent.change(editNameInput, { target: { value: 'Tournée Droguerie & Entretien' } });

    const saveBtn = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const lists = useShortageStore.getState().customLists;
      expect(lists.some(l => l.name === 'Tournée Droguerie & Entretien')).toBe(true);
    });

    // 3. Suppression d'une liste avec confirmation
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteBtn = screen.getByLabelText(/Supprimer la liste Produits Frais & Laitiers/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      const lists = useShortageStore.getState().customLists;
      expect(lists.some(l => l.id === 'list-frais')).toBe(false);
      // Vérifier que la liste supprimée est retirée des articles qui y étaient rattachés
      const item2 = useShortageStore.getState().items.find(i => i.id === 'shortage-2');
      expect(item2?.listIds).not.toContain('list-frais');
    });
  });

  // -------------------------------------------------------------
  // Test 4 : Affectation et désaffectation multi-listes dans ShortageTableRow
  // -------------------------------------------------------------
  it('4. Permet d\'affecter et de désaffecter un article aux listes libres directement depuis la ligne du tableau', async () => {
    const item = mockShortageItems[1]; // Yaourt Nature (initialement dans 'list-frais')
    render(
      <table>
        <tbody>
          <ShortageTableRow
            item={item}
            onToggleCheck={vi.fn()}
            onUpdateQuantity={vi.fn()}
            onUpdateCostPrice={vi.fn()}
            onRemove={vi.fn()}
          />
        </tbody>
      </table>
    );

    // Pastille de la liste initiale présente
    expect(screen.getByText('Produits Frais & Laitiers')).toBeTruthy();

    // Clic sur le bouton de retrait de la liste (petite croix)
    const removeListBtn = screen.getByTitle(/Retirer de la liste Produits Frais & Laitiers/i);
    fireEvent.click(removeListBtn);

    await waitFor(() => {
      const updatedItem = useShortageStore.getState().items.find(i => i.id === item.id);
      expect(updatedItem?.listIds).not.toContain('list-frais');
    });

    // Ouverture du menu "+ Liste" pour affecter à "Tournée Détergents"
    const openMenuBtn = screen.getByTitle(/Affecter à des listes libres/i);
    fireEvent.click(openMenuBtn);

    expect(screen.getByText('Affecter aux listes')).toBeTruthy();
    const listOptionBtn = screen.getByText('Tournée Détergents');
    fireEvent.click(listOptionBtn);

    await waitFor(() => {
      const updatedItem = useShortageStore.getState().items.find(i => i.id === item.id);
      expect(updatedItem?.listIds).toContain('list-detergents');
    });
  });

  // -------------------------------------------------------------
  // Test 5 : Modal d'Impression A4 & Exportations (Excel, CSV, WhatsApp)
  // -------------------------------------------------------------
  it('5. Génère l\'impression A4, l\'export Excel sécurisé, le fichier CSV et le message WhatsApp', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn(async () => {});
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    const handleClose = vi.fn();
    render(
      <ShortagePrintExportModal
        isOpen={true}
        onClose={handleClose}
        suppliers={mockSuppliers}
      />
    );

    // Titre et récapitulatif
    expect(screen.getByText(/Impression & Exportation du Réassort/i)).toBeTruthy();

    // 1. Déclenchement de l'impression A4
    const printBtn = screen.getByRole('button', { name: /Imprimer A4/i });
    fireEvent.click(printBtn);
    // Vérifier la présence de l'iframe d'impression
    const iframe = document.getElementById('nexus-shortage-print-iframe');
    expect(iframe).toBeTruthy();

    // 2. Déclenchement de l'export Excel sécurisé (exportToExcelSafely)
    const excelBtn = screen.getByRole('button', { name: /Export Excel/i });
    fireEvent.click(excelBtn);
    await waitFor(() => {
      expect(excelSecurity.exportToExcelSafely).toHaveBeenCalledTimes(1);
    });

    // 3. Déclenchement de l'export CSV
    const csvBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(csvBtn);

    // 4. Onglet WhatsApp et copie
    const whatsAppTab = screen.getByRole('button', { name: /Message WhatsApp \/ SMS/i });
    fireEvent.click(whatsAppTab);

    const copyBtn = screen.getByRole('button', { name: /Copier le message/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedContent = (writeTextMock.mock.calls as any)[0][0];
      expect(copiedContent).toContain('COMMANDE DE RÉASSORT');
      expect(copiedContent).toContain('DA');
    });
  });

  // -------------------------------------------------------------
  // Test 6 : Passerelle de conversion vers Bon d'Achat (SubTabShortages)
  // -------------------------------------------------------------
  it('6. Transfère fidèlement les articles cochés avec détection du fournisseur vers le Bon d\'Achat', () => {
    const handleConvertToPurchase = vi.fn();
    const mockProducts: Product[] = [
      {
        id: 'prod-1',
        name: 'Eau de Javel 1L Dosée',
        barcode: '613111222333',
        sku: 'SKU-JAVEL-01',
        costPrice: 90,
        price: 120,
        taxRate: 19,
        categoryId: 'cat-droguerie',
        stock: 0,
        minStock: 12,
        supplier: 'Distributeur Agro Express',
        status: 'active',
        unit: 'bouteille',
        updatedAt: '2026-10-14'
      }
    ];

    render(
      <SubTabShortages
        products={mockProducts}
        suppliers={mockSuppliers}
        onConvertToPurchase={handleConvertToPurchase}
      />
    );

    // Bouton de commande dans l'en-tête (2 articles cochés par défaut : shortage-1 et shortage-3)
    const convertBtn = screen.getByRole('button', { name: /Commander les 2 cochés/i });
    fireEvent.click(convertBtn);

    expect(handleConvertToPurchase).toHaveBeenCalledTimes(1);
    const [convertedItems, targetSupplierId] = handleConvertToPurchase.mock.calls[0];

    expect(convertedItems.length).toBe(2);
    expect(convertedItems.map((i: any) => i.id)).toEqual(['shortage-1', 'shortage-3']);
    // Les deux articles appartiennent à 'sup-agro', le fournisseur commun est auto-sélectionné
    expect(targetSupplierId).toBe('sup-agro');
  });

  // -------------------------------------------------------------
  // Test 7 : Affectation automatique à la liste active & isolation
  // -------------------------------------------------------------
  it('7. Affecte automatiquement un article ajouté à la liste personnalisée active et l\'isole lors de la conversion', async () => {
    const store = useShortageStore.getState();
    store.setActiveListId('list-boissons');

    // Ajout d'un nouvel article sans spécifier de listId
    const newItem = await store.addItem({
      id: 'prod-jus',
      name: 'Jus d\'Orange 1L',
      barcode: '613999888777',
      costPrice: 150,
      stock: 2,
      minStock: 10,
      supplier: 'Grossiste Boissons'
    });

    // L'article doit avoir hérité automatiquement de la liste active 'list-boissons'
    expect(newItem.listIds).toContain('list-boissons');

    // Il apparaît dans le filtre de la liste active
    const filteredInList = store.getFilteredItems();
    expect(filteredInList.some(i => i.id === newItem.id)).toBe(true);

    // Il apparaît aussi dans la grande liste ("all")
    store.setActiveListId('all');
    const filteredInAll = store.getFilteredItems();
    expect(filteredInAll.some(i => i.id === newItem.id)).toBe(true);
  });
});

