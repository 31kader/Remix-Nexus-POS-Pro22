import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useShortageStore } from '../src/store/useShortageStore';
import { 
  formatAlgerianWhatsAppPhone, 
  openWhatsAppDirectShare, 
  generateShortagesWhatsAppText 
} from '../src/components/smart-purchase/shortages/shortageExportHelpers';
import { ShortageItem } from '../src/types/shortages';

// Mock du LocalDatabase pour la persistance locale
vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
  }
}));

// Mock de window.open
const mockWindowOpen = vi.fn();
vi.stubGlobal('open', mockWindowOpen);

describe('🧪 Amélioration Cahier des Manques : Produits Hors-Catalogue, Multi-Listes & WhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useShortageStore.setState({
      items: [],
      customLists: [],
      activeListId: 'all',
      selectedSupplierFilter: 'all',
      searchQuery: '',
      isLoaded: true
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Saisie d'un Produit Non Existant (Hors-Catalogue)
  // ─────────────────────────────────────────────────────────────
  describe('1. Produits Hors-Catalogue (Articles Libres)', () => {
    it('1.1 Ajoute un produit hors-catalogue avec isCustomProduct=true et notes', async () => {
      const store = useShortageStore.getState();

      const item = await store.addCustomItem({
        name: 'Jus Ramy Fraise 1L',
        barcode: '6139998887771',
        quantityNeeded: 6,
        costPrice: 120,
        supplierName: 'Grossiste Boissons Rouiba',
        notes: 'Très demandé par les clients l\'après-midi',
        priority: 'urgent',
        unit: 'pcs'
      });

      expect(item).toBeDefined();
      expect(item.name).toBe('Jus Ramy Fraise 1L');
      expect(item.isCustomProduct).toBe(true);
      expect(item.barcode).toBe('6139998887771');
      expect(item.quantityNeeded).toBe(6);
      expect(item.costPrice).toBe(120);
      expect(item.priority).toBe('urgent');
      expect(item.notes).toContain('Très demandé');

      // Vérification dans l'état global du store
      const itemsInStore = useShortageStore.getState().items;
      expect(itemsInStore).toHaveLength(1);
      expect(itemsInStore[0].isCustomProduct).toBe(true);
    });

    it('1.2 Cumule arithmétiquement la quantité si le même article hors-catalogue est ré-ajouté', async () => {
      const store = useShortageStore.getState();

      await store.addCustomItem({
        name: 'Lessive Skip 3kg',
        barcode: '6131112223334',
        quantityNeeded: 3,
        costPrice: 950
      });

      // Deuxième saisie avec la même référence
      const updated = await store.addCustomItem({
        name: 'Lessive Skip 3kg',
        barcode: '6131112223334',
        quantityNeeded: 5
      });

      expect(updated.quantityNeeded).toBe(8); // 3 + 5
      expect(useShortageStore.getState().items).toHaveLength(1);
    });

    it('1.3 Permet de mettre à jour les notes et de basculer la priorité Normal <-> Urgent', async () => {
      const store = useShortageStore.getState();

      const item = await store.addCustomItem({
        name: 'Biscuits Bimo Chocolat',
        quantityNeeded: 12,
        priority: 'normal'
      });

      expect(item.priority).toBe('normal');

      // Bascule vers Urgent
      await store.toggleItemPriority(item.id);
      expect(useShortageStore.getState().items[0].priority).toBe('urgent');

      // Bascule retour vers Normal
      await store.toggleItemPriority(item.id);
      expect(useShortageStore.getState().items[0].priority).toBe('normal');

      // Mise à jour de la note
      await store.updateItemNotes(item.id, 'Conditionnement par carton de 24');
      expect(useShortageStore.getState().items[0].notes).toBe('Conditionnement par carton de 24');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Gestion Fluide Multi-Listes avec Titres
  // ─────────────────────────────────────────────────────────────
  describe('2. Multi-Listes avec Titres et Création Rapide', () => {
    it('2.1 Crée une nouvelle liste avec titre et couleur en 1 étape via quickCreateList', async () => {
      const store = useShortageStore.getState();

      const list = await store.quickCreateList('Tournée Laitiers & Fromages', '#10b981');

      expect(list).toBeDefined();
      expect(list.name).toBe('Tournée Laitiers & Fromages');
      expect(list.color).toBe('#10b981');

      const customLists = useShortageStore.getState().customLists;
      expect(customLists).toHaveLength(1);
      expect(customLists[0].name).toBe('Tournée Laitiers & Fromages');
      expect(useShortageStore.getState().activeListId).toBe(list.id);
    });

    it('2.2 Affecte un produit hors-catalogue directement à une liste créée', async () => {
      const store = useShortageStore.getState();

      const list = await store.quickCreateList('Droguerie & Nettoyage');

      const customItem = await store.addCustomItem({
        name: 'Javel Amir 1L',
        quantityNeeded: 20,
        listIds: [list.id]
      });

      expect(customItem.listIds).toContain(list.id);

      // Filtrer par cette liste
      store.setActiveListId(list.id);
      const filtered = store.getFilteredItems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Javel Amir 1L');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Formatage & Partage Direct vers WhatsApp
  // ─────────────────────────────────────────────────────────────
  describe('3. Partage Direct vers WhatsApp', () => {
    it('3.1 Formate les numéros de téléphone algériens au standard international pour WhatsApp', () => {
      // Numéro standard commençant par 05, 06, 07
      expect(formatAlgerianWhatsAppPhone('0555 12 34 56')).toBe('213555123456');
      expect(formatAlgerianWhatsAppPhone('0661-22-33-44')).toBe('213661223344');
      expect(formatAlgerianWhatsAppPhone('0770 99 88 77')).toBe('213770998877');

      // Numéro avec indicatif déjà présent
      expect(formatAlgerianWhatsAppPhone('+213 555 12 34 56')).toBe('213555123456');
      expect(formatAlgerianWhatsAppPhone('00213555123456')).toBe('213555123456');

      // Cas vide ou null
      expect(formatAlgerianWhatsAppPhone('')).toBe('');
      expect(formatAlgerianWhatsAppPhone(undefined)).toBe('');
    });

    it('3.2 Génère un message WhatsApp soigné incluant les tags URGENT, Hors-catalogue et Notes', () => {
      const items: ShortageItem[] = [
        {
          id: '1',
          productId: 'prod_1',
          name: 'Lait Candia Silhouette 1L',
          barcode: '6131234567890',
          quantityNeeded: 12,
          costPrice: 135,
          currentStock: 0,
          minStock: 10,
          isChecked: true,
          listIds: [],
          priority: 'urgent',
          notes: 'Prendre date d\'expiration longue',
          createdAt: '',
          updatedAt: ''
        },
        {
          id: '2',
          productId: 'custom_2',
          name: 'Shampoing Garnier Karité 400ml',
          quantityNeeded: 6,
          costPrice: 420,
          currentStock: 0,
          minStock: 0,
          isChecked: true,
          listIds: [],
          isCustomProduct: true,
          createdAt: '',
          updatedAt: ''
        }
      ];

      const text = generateShortagesWhatsAppText({
        items,
        supplierName: 'Distributeur Centre',
        listName: 'Tournée Hebdomadaire',
        companyName: 'Superette El Bahdja'
      });

      expect(text).toContain('COMMANDE DE RÉASSORT — SUPERETTE EL BAHDJA');
      expect(text).toContain('Distributeur Centre');
      expect(text).toContain('Tournée Hebdomadaire');
      expect(text).toContain('🔥 *[URGENT]*');
      expect(text).toContain('⚠️ *[Hors-catalogue]*');
      expect(text).toContain('Note: Prendre date d\'expiration longue');
      expect(text).toContain('Total articles :* 2 références (18 unités)');
      expect(text).toContain('DA');
    });

    it('3.3 Ouvre l\'URL WhatsApp wa.me avec le numéro du fournisseur et le message encodé', () => {
      openWhatsAppDirectShare({
        text: 'Bonjour voici ma commande',
        phoneNumber: '0555 11 22 33'
      });

      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      const calledUrl = mockWindowOpen.mock.calls[0][0];

      expect(calledUrl).toContain('https://wa.me/213555112233');
      expect(calledUrl).toContain('text=Bonjour%20voici%20ma%20commande');
    });

    it('3.4 Ouvre wa.me sans numéro si aucun numéro n\'est renseigné pour laisser le commerçant choisir le contact', () => {
      openWhatsAppDirectShare({
        text: 'Commande générale'
      });

      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      const calledUrl = mockWindowOpen.mock.calls[0][0];

      expect(calledUrl).toContain('https://wa.me/?text=Commande%20g%C3%A9n%C3%A9rale');
    });
  });
});
