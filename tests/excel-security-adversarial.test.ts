import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isExcelFileSafe,
  sanitizeRowObject,
  readWorkbookSafely,
  readExcelObjectsSafely,
  MAX_EXCEL_FILE_SIZE,
  MAX_EXCEL_ROWS,
  MAX_EXCEL_COLS
} from '../src/lib/excelSecurity';
import * as XLSX from 'xlsx';

describe('Adversarial & Empirical Security Suite — excelSecurity.ts', () => {
  // Snapshot de Object.prototype pour vérifier qu'aucune pollution ne persiste
  beforeEach(() => {
    // S'assurer qu'aucune pollution résiduelle n'existe
    delete (Object.prototype as any).polluted;
    delete (Object.prototype as any).isAdmin;
    delete (Object.prototype as any).role;
    delete (Object.prototype as any).authenticated;
    delete (Object.prototype as any).accessLevel;
    delete (Object.prototype as any).injected;
  });

  afterEach(() => {
    delete (Object.prototype as any).polluted;
    delete (Object.prototype as any).isAdmin;
    delete (Object.prototype as any).role;
    delete (Object.prototype as any).authenticated;
    delete (Object.prototype as any).accessLevel;
    delete (Object.prototype as any).injected;
  });

  describe('1. Adversarial Prototype Pollution Attacks (CWE-1321)', () => {
    it('bloque une tentative de pollution directe via JSON.parse __proto__', () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true, "isAdmin": true}, "normal": "ok"}');

      const sanitized = sanitizeRowObject(maliciousPayload);

      expect(sanitized).toBeDefined();
      expect(sanitized.normal).toBe('ok');
      expect((sanitized as any).__proto__).not.toHaveProperty('polluted');
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });

    it('bloque les injections via constructor et prototype', () => {
      const maliciousPayload = JSON.parse('{"constructor": {"prototype": {"polluted": true}}, "product": "Pain"}');

      const sanitized = sanitizeRowObject(maliciousPayload);

      expect(sanitized.product).toBe('Pain');
      expect((sanitized as any).constructor).toBe(Object); // Standard constructor intact
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });

    it('bloque les clés combinées comme __proto__.admin ou prototype.role', () => {
      const maliciousPayload = {
        '__proto__.isAdmin': true,
        'prototype.role': 'admin',
        'valid_key': 'test'
      };

      const sanitized = sanitizeRowObject(maliciousPayload);

      expect(sanitized.valid_key).toBe('test');
      expect(sanitized).not.toHaveProperty('__proto__.isAdmin');
      expect(sanitized).not.toHaveProperty('prototype.role');
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect((Object.prototype as any).role).toBeUndefined();
    });

    it('bloque les attaques de pollution imbriquées en profondeur', () => {
      const nestedMalicious = JSON.parse(`{
        "store": {
          "section": {
            "__proto__": { "polluted": "deep" },
            "items": [
              {
                "id": 1,
                "constructor": { "prototype": { "polluted": "in_array" } },
                "name": "Pomme"
              }
            ]
          }
        }
      }`);

      const sanitized = sanitizeRowObject(nestedMalicious);

      expect(sanitized.store.section.items[0].name).toBe('Pomme');
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });

    it('bloque les propriétés définies via Object.defineProperty', () => {
      const hostileObj: Record<string, any> = { item: 'Eau Minérale' };
      Object.defineProperty(hostileObj, '__proto__', {
        value: { polluted: true },
        enumerable: true,
        configurable: true
      });

      const sanitized = sanitizeRowObject(hostileObj);

      expect(sanitized.item).toBe('Eau Minérale');
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });

    it('maintient Object.prototype intègre sans aucune altération', () => {
      const testProbes = [
        'polluted', 'isAdmin', 'role', 'authenticated', 'accessLevel', 'injected'
      ];
      for (const probe of testProbes) {
        expect((Object.prototype as any)[probe]).toBeUndefined();
        expect(({} as any)[probe]).toBeUndefined();
      }
    });
  });

  describe('2. Stress-Testing des Entrées Hostiles et Malformées', () => {
    it('gère les valeurs primitives sans lever d exception', () => {
      expect(sanitizeRowObject(null as any)).toBeNull();
      expect(sanitizeRowObject(undefined as any)).toBeUndefined();
      expect(sanitizeRowObject(123 as any)).toBe(123);
      expect(sanitizeRowObject('string' as any)).toBe('string');
      expect(sanitizeRowObject(true as any)).toBe(true);
      expect(sanitizeRowObject(false as any)).toBe(false);
      expect(sanitizeRowObject([] as any)).toEqual([]);
    });

    it('gère les objets contenant des valeurs null, undefined, booléennes, 0 et chaînes vides', () => {
      const row = {
        name: 'Produit Test',
        price: 0,
        discount: null,
        description: undefined,
        inStock: false,
        barcode: '',
        meta: {
          tag: null,
          note: undefined,
          flags: [false, true, null, 0, '']
        }
      };

      const sanitized = sanitizeRowObject(row);

      expect(sanitized.name).toBe('Produit Test');
      expect(sanitized.price).toBe(0);
      expect(sanitized.discount).toBeNull();
      expect(sanitized.description).toBeUndefined();
      expect(sanitized.inStock).toBe(false);
      expect(sanitized.barcode).toBe('');
      expect(sanitized.meta.tag).toBeNull();
      expect(sanitized.meta.note).toBeUndefined();
      expect(sanitized.meta.flags).toEqual([false, true, null, 0, '']);
    });

    it('gère une récursion profonde (50 niveaux imbriqués)', () => {
      let deepObj: any = { value: 'leaf' };
      for (let i = 0; i < 50; i++) {
        deepObj = { nested: deepObj };
      }

      const sanitized = sanitizeRowObject(deepObj);
      expect(sanitized).toBeDefined();

      let current = sanitized;
      for (let i = 0; i < 50; i++) {
        current = current.nested;
      }
      expect(current.value).toBe('leaf');
    });

    it('gère les tableaux hétérogènes et tableaux d objets', () => {
      const mixedArrayObj = {
        title: 'Catalogue',
        entries: [
          'simple_string',
          42,
          null,
          undefined,
          { id: 101, valid: true },
          JSON.parse('{"__proto__": {"evil": true}, "id": 102}')
        ]
      };

      const sanitized = sanitizeRowObject(mixedArrayObj);

      expect(sanitized.entries[0]).toBe('simple_string');
      expect(sanitized.entries[1]).toBe(42);
      expect(sanitized.entries[2]).toBeNull();
      expect(sanitized.entries[3]).toBeUndefined();
      expect(sanitized.entries[4]).toEqual({ id: 101, valid: true });
      expect(sanitized.entries[5].id).toBe(102);
      expect((Object.prototype as any).evil).toBeUndefined();
    });
  });

  describe('3. Validation des Contraintes de Fichiers & Limites Anti-DoS', () => {
    it('isExcelFileSafe accepte les extensions valides (.xlsx, .xls, .csv) insensible à la casse', () => {
      const validFiles = [
        new File([''], 'clients.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        new File([''], 'produits.XLSX', { type: 'application/octet-stream' }),
        new File([''], 'inventaire.xls', { type: 'application/vnd.ms-excel' }),
        new File([''], 'export.XLS', { type: 'application/vnd.ms-excel' }),
        new File([''], 'ventes.csv', { type: 'text/csv' }),
        new File([''], 'DATA.CSV', { type: 'text/csv' })
      ];

      for (const file of validFiles) {
        const result = isExcelFileSafe(file);
        expect(result.safe).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('isExcelFileSafe rejette les extensions non autorisées', () => {
      const invalidFiles = [
        new File([''], 'malware.exe'),
        new File([''], 'script.js'),
        new File([''], 'page.html'),
        new File([''], 'archive.zip'),
        new File([''], 'payload.json'),
        new File([''], 'facture.pdf')
      ];

      for (const file of invalidFiles) {
        const result = isExcelFileSafe(file);
        expect(result.safe).toBe(false);
        expect(result.error).toContain('Format de fichier non pris en charge');
      }
    });

    it('isExcelFileSafe rejette les fichiers dépassant 10 Mo', () => {
      // Simule un gros fichier via un faux objet File
      const oversizedFile = {
        name: 'huge_inventory.xlsx',
        size: MAX_EXCEL_FILE_SIZE + 1024
      } as File;

      const result = isExcelFileSafe(oversizedFile);
      expect(result.safe).toBe(false);
      expect(result.error).toContain('Le fichier dépasse la taille maximale autorisée (10 Mo)');
    });

    it('readWorkbookSafely rejette les buffers dépassant 10 Mo', async () => {
      const oversizedBuffer = new Uint8Array(MAX_EXCEL_FILE_SIZE + 100);

      await expect(readWorkbookSafely(oversizedBuffer)).rejects.toThrow(
        /Buffer Excel trop volumineux/
      );
    });

    it('readWorkbookSafely plafonne le nombre de lignes et colonnes', async () => {
      // Création d'un classeur avec 50 lignes et 20 colonnes
      const headers = Array.from({ length: 20 }, (_, i) => `Col_${i}`);
      const rows = Array.from({ length: 50 }, (_, r) =>
        headers.reduce((acc, h, c) => ({ ...acc, [h]: `Val_${r}_${c}` }), {})
      );

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TestLimits');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Lecture avec restriction drastique : maxRows = 10, maxCols = 5
      const result = await readWorkbookSafely(buffer, { maxRows: 10, maxCols: 5 });

      expect(result.rawRows.length).toBeLessThanOrEqual(10);
      for (const row of result.rawRows) {
        expect(row.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('4. Données Métier de Caisse et Inventaire (Fidélité & Non-Régression)', () => {
    it('conserve rigoureusement les données d inventaire et de produits POS', async () => {
      const sampleProducts = [
        {
          id: 'prod_001',
          name: 'Café Moulu 250g Arabica',
          category: 'Épicerie',
          barcode: '6131234567890',
          buy_price: 250.00,
          sell_price: 350.00,
          stock: 42,
          min_stock: 10,
          vat_rate: 19,
          unit: 'pièce',
          is_active: true
        },
        {
          id: 'prod_002',
          name: 'حليب مبستر 1 لتر', // Caractères arabes
          category: 'Produits Laitiers',
          barcode: '6139876543210',
          buy_price: 90.00,
          sell_price: 110.00,
          stock: 100,
          min_stock: 20,
          vat_rate: 0,
          unit: 'litre',
          is_active: true
        },
        {
          id: 'prod_003',
          name: 'Croissant au Beurre d\'Isigny', // Apostrophes et accents
          category: 'Viennoiserie',
          barcode: '6135555555555',
          buy_price: 45.50,
          sell_price: 70.00,
          stock: 0,
          min_stock: 5,
          vat_rate: 19,
          unit: 'pièce',
          is_active: false
        }
      ];

      // Génération du classeur Excel SheetJS
      const ws = XLSX.utils.json_to_sheet(sampleProducts);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produits');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Lecture sécurisée via readExcelObjectsSafely
      const importedProducts = await readExcelObjectsSafely<any>(buffer);

      expect(importedProducts).toHaveLength(3);

      // Produit 1
      expect(importedProducts[0].name).toBe('Café Moulu 250g Arabica');
      expect(importedProducts[0].barcode).toBe('6131234567890');
      expect(importedProducts[0].sell_price).toBe(350);
      expect(importedProducts[0].vat_rate).toBe(19);

      // Produit 2 (Arabe & TVA 0)
      expect(importedProducts[1].name).toBe('حليب مبستر 1 لتر');
      expect(importedProducts[1].sell_price).toBe(110);
      expect(importedProducts[1].vat_rate).toBe(0);

      // Produit 3 (Accents & Stock 0)
      expect(importedProducts[2].name).toBe("Croissant au Beurre d'Isigny");
      expect(importedProducts[2].stock).toBe(0);
      expect(importedProducts[2].buy_price).toBe(45.5);
    });

    it('conserve rigoureusement les données clients et points de fidélité', async () => {
      const sampleCustomers = [
        {
          id: 'cust_101',
          name: 'Amine Benali',
          phone: '0555123456',
          email: 'amine@example.dz',
          loyalty_points: 250,
          total_spent: 125000.75,
          debt: 0.00,
          created_at: '2026-03-15T10:30:00Z'
        },
        {
          id: 'cust_102',
          name: 'فاطمة الزهراء', // Nom arabe
          phone: '0661987654',
          email: '',
          loyalty_points: 0,
          total_spent: 4500.00,
          debt: 1200.50,
          created_at: '2026-03-20T14:15:00Z'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleCustomers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const importedCustomers = await readExcelObjectsSafely<any>(buffer);

      expect(importedCustomers).toHaveLength(2);
      expect(importedCustomers[0].name).toBe('Amine Benali');
      expect(importedCustomers[0].total_spent).toBe(125000.75);
      expect(importedCustomers[0].loyalty_points).toBe(250);
      expect(importedCustomers[0].debt).toBe(0);

      expect(importedCustomers[1].name).toBe('فاطمة الزهراء');
      expect(importedCustomers[1].debt).toBe(1200.5);
      expect(importedCustomers[1].loyalty_points).toBe(0);
    });

    it('nettoie un fichier Excel contenant des colonnes hostiles injectées par un tiers', async () => {
      // Scénario hostile : un fichier Excel généré avec des colonnes malveillantes
      const hostileSheetData = [
        {
          'id': 'prod_999',
          'name': 'Produit Suspect',
          '__proto__': 'malicious_prototype',
          'constructor': 'malicious_constructor',
          'prototype': 'malicious_proto',
          '__proto__.isAdmin': true,
          'price': 100
        }
      ];

      const ws = XLSX.utils.json_to_sheet(hostileSheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hostile');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const results = await readExcelObjectsSafely<any>(buffer);

      expect(results).toHaveLength(1);
      const item = results[0];
      expect(item.id).toBe('prod_999');
      expect(item.name).toBe('Produit Suspect');
      expect(item.price).toBe(100);

      // Vérification que les colonnes interdites ont été éliminées
      expect(item).not.toHaveProperty('__proto__');
      expect(item).not.toHaveProperty('__proto__.isAdmin');
      expect(item.constructor).toBe(Object);
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect(({} as any).isAdmin).toBeUndefined();
    });
  });
});
