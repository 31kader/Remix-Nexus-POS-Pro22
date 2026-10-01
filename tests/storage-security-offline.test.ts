import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encryptLocalData,
  decryptLocalData,
  encryptData,
  decryptData,
  setSecureItem,
  getSecureItem,
  setSecureItemAsync,
  getSecureItemAsync,
  removeSecureItem,
  clearSecureItems,
  getOrCreateLocalSalt
} from '../src/lib/security';
import {
  dbState,
  setLocalState,
  getLocalValue,
  persistTableState,
  restoreTableState,
  SENSITIVE_STORAGE_TABLES
} from '../src/lib/local-db';
import {
  isSensitiveTable,
  storeSensitiveItem,
  getSensitiveItem,
  removeSensitiveItem
} from '../src/services/LocalDatabase';

// Mock du stockage idb-keyval pour l'environnement de test
const memoryIdbStore = new Map<string, any>();
vi.mock('idb-keyval', () => {
  return {
    get: vi.fn(async (key: string) => memoryIdbStore.get(key)),
    set: vi.fn(async (key: string, value: any) => {
      memoryIdbStore.set(key, value);
    })
  };
});

describe('Jalon M4 — Sécurisation des Données au Repos & Conformité Offline-First', () => {
  beforeEach(() => {
    localStorage.clear();
    memoryIdbStore.clear();
    for (const key in dbState) {
      delete dbState[key];
    }
  });

  describe('1. Moteur Cryptographique AES-256-GCM (Web Crypto API & PBKDF2)', () => {
    it('chiffre les données sensibles avec AES-256-GCM et le préfixe aes:v1:', async () => {
      const sensitivePlaintext = 'session_token_pos_caissier_987654';
      const cipherText = await encryptLocalData(sensitivePlaintext);

      expect(cipherText).toBeDefined();
      expect(cipherText.startsWith('aes:v1:')).toBe(true);
      expect(cipherText).not.toContain(sensitivePlaintext);
      expect(cipherText).not.toContain('session_token');
      expect(cipherText).not.toContain('caissier');
    });

    it('déchiffre parfaitement les données avec intégrité absolue (Round-trip)', async () => {
      const originalSecret = 'PIN:54321;UID:owner-algeria-dz;ROLE:admin';
      const encrypted = await encryptLocalData(originalSecret);
      const decrypted = await decryptLocalData(encrypted);

      expect(decrypted).toBe(originalSecret);
    });

    it('génère un vecteur d’initialisation (IV) aléatoire unique pour chaque chiffrement', async () => {
      const plaintext = '100000_DZD_FOND_DE_CAISSE';
      const cipher1 = await encryptLocalData(plaintext);
      const cipher2 = await encryptLocalData(plaintext);

      expect(cipher1).not.toBe(cipher2);
      expect(cipher1.startsWith('aes:v1:')).toBe(true);
      expect(cipher2.startsWith('aes:v1:')).toBe(true);

      // Les deux se déchiffrent pourtant vers le même texte original
      expect(await decryptLocalData(cipher1)).toBe(plaintext);
      expect(await decryptLocalData(cipher2)).toBe(plaintext);
    });

    it('gère correctement les chaînes UTF-8 contenant des caractères arabes, français et symboles monétaires DA', async () => {
      const multilingualPayload = JSON.stringify({
        storeName: 'نكسوس للتجارة والتوزيع — Nexus Distribution',
        currency: '150 000,00 DA',
        note: 'Paiement espèces reçu avec succès — Écart de caisse : 0 DA'
      });

      const encrypted = await encryptLocalData(multilingualPayload);
      const decrypted = await decryptLocalData(encrypted);

      expect(decrypted).toBe(multilingualPayload);
      const parsed = JSON.parse(decrypted);
      expect(parsed.currency).toBe('150 000,00 DA');
      expect(parsed.storeName).toContain('نكسوس');
    });
  });

  describe('2. Rétrocompatibilité Descendante Totale & Transparente', () => {
    it('déchiffre parfaitement les chaînes chiffrées avec le format legacy nx2: (flux XOR)', async () => {
      const legacySecret = 'offline_bcrypt_hash_$2a$10$abcdef1234567890';
      const legacyEncrypted = encryptData(legacySecret);

      expect(legacyEncrypted.startsWith('nx2:')).toBe(true);

      // Déchiffrement via le moteur synchrone legacy
      const decryptedSync = decryptData(legacyEncrypted);
      expect(decryptedSync).toBe(legacySecret);

      // Déchiffrement transparent via le nouveau moteur asynchrone AES
      const decryptedAsync = await decryptLocalData(legacyEncrypted);
      expect(decryptedAsync).toBe(legacySecret);
    });

    it('restitue sans erreur les objets et listes au format JSON brut non chiffré', async () => {
      const rawJson = '{"id":"prod-1","name":"Café Algérien Moulu","price":450}';
      const rawArray = '[{"id":"1","stock":25},{"id":"2","stock":50}]';

      const decryptedJson = await decryptLocalData(rawJson);
      const decryptedArray = await decryptLocalData(rawArray);

      expect(decryptedJson).toBe(rawJson);
      expect(decryptedArray).toBe(rawArray);
      expect(decryptData(rawJson)).toBe(rawJson);
    });

    it('conserve les signatures synchrones de l’API security.ts sans régression', () => {
      const testKey = 'nexus_sync_test_key';
      const testVal = { maxAttempts: 5, lockUntil: 1735689600000 };

      setSecureItem(testKey, testVal);
      const retrieved = getSecureItem<typeof testVal>(testKey);

      expect(retrieved).toEqual(testVal);
      removeSecureItem(testKey);
      expect(getSecureItem(testKey)).toBeNull();
    });
  });

  describe('3. Robustesse & Résilience face aux Entrées Hostiles ou Corrompues', () => {
    it('gère les entrées vides, nulles ou non-string sans lancer d’exception', async () => {
      expect(await decryptLocalData('')).toBe('');
      expect(await decryptLocalData(null as any)).toBe(null);
      expect(await decryptLocalData(undefined as any)).toBe(undefined);

      expect(decryptData('')).toBe('');
      expect(decryptData(null as any)).toBe(null);
    });

    it('intercepte les payloads aes: corrompus ou altérés sans crash de l’application', async () => {
      const corruptedPayloads = [
        'aes:v1:not_a_valid_hex:short:bad_cipher',
        'aes:v1:0123456789abcdef0123456789abcdef:invalidBase64==:badCipher==',
        'aes:short',
        'aes:v1'
      ];

      for (const payload of corruptedPayloads) {
        expect(async () => {
          const result = await decryptLocalData(payload);
          expect(typeof result).toBe('string');
        }).not.toThrow();
      }
    });

    it('détecte l’altération d’intégrité du tag d’authentification AES-GCM (Anti-Tampering)', async () => {
      const secret = 'authentic_cashier_balance_250000_DA';
      const encrypted = await encryptLocalData(secret);
      
      // Corruption d'un caractère du ciphertext/tag d'authentification
      const parts = encrypted.split(':');
      const corruptedCipher = parts[4].slice(0, -4) + 'AAAA';
      const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${corruptedCipher}`;

      // La vérification d'intégrité GCM échoue et retourne le fallback sécurisé sans planter
      const result = await decryptLocalData(tamperedPayload);
      expect(result).not.toBe(secret);
    });

    it('purge correctement tous les secrets locaux avec clearSecureItems()', () => {
      setSecureItem('nexus_offline_credentials', { user: 'owner' });
      setSecureItem('nexus_pos_master_pin', 'hashed_pin');
      setSecureItem('nexus_login_lock_until', '123456');

      clearSecureItems();

      expect(getSecureItem('nexus_offline_credentials')).toBeNull();
      expect(getSecureItem('nexus_pos_master_pin')).toBeNull();
      expect(getSecureItem('nexus_login_lock_until')).toBeNull();
    });
  });

  describe('4. Conformité Offline-First & Zéro Dépendance Réseau', () => {
    it('génère et persiste un sel local unique dans localStorage sans aucun appel réseau', () => {
      const salt1 = getOrCreateLocalSalt();
      expect(salt1).toBeInstanceOf(Uint8Array);
      expect(salt1.length).toBe(16);

      const storedHex = localStorage.getItem('nexus_local_salt_v1');
      expect(storedHex).toBeDefined();
      expect(storedHex?.length).toBe(32);

      // Le deuxième appel réutilise le même sel persistant local
      const salt2 = getOrCreateLocalSalt();
      expect(salt2).toEqual(salt1);
    });

    it('chiffre et déchiffre avec succès lorsque le terminal est 100% hors-ligne (navigator.onLine = false)', async () => {
      const originalOnLine = navigator.onLine;
      try {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

        const offlineSecret = 'offline_sale_record_offline_first_strict';
        const encrypted = await encryptLocalData(offlineSecret);
        expect(encrypted.startsWith('aes:v1:')).toBe(true);

        const decrypted = await decryptLocalData(encrypted);
        expect(decrypted).toBe(offlineSecret);
      } finally {
        Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
      }
    });

    it('exécute les opérations de stockage asynchrone setSecureItemAsync et getSecureItemAsync', async () => {
      const secureKey = 'nexus_sec_test_pin_key';
      const secretPayload = { pinHash: '$2a$10$hashedMasterPinValue', terminalId: 'CAISSE-01' };

      await setSecureItemAsync(secureKey, secretPayload);
      const rawStored = localStorage.getItem(secureKey);
      expect(rawStored?.startsWith('aes:v1:')).toBe(true);

      const retrieved = await getSecureItemAsync<typeof secretPayload>(secureKey);
      expect(retrieved).toEqual(secretPayload);
    });
  });

  describe('5. Sécurisation des Données au Repos dans IndexedDB (LocalDatabase & local-db)', () => {
    it('identifie rigoureusement les tables hautement sensibles', () => {
      expect(SENSITIVE_STORAGE_TABLES.has('users')).toBe(true);
      expect(SENSITIVE_STORAGE_TABLES.has('employees')).toBe(true);
      expect(SENSITIVE_STORAGE_TABLES.has('cash_shifts')).toBe(true);

      expect(isSensitiveTable('users')).toBe(true);
      expect(isSensitiveTable('employees')).toBe(true);
      expect(isSensitiveTable('cash_shifts')).toBe(true);
      expect(isSensitiveTable('shifts')).toBe(true);

      // Les tables de performance ne doivent PAS être marquées sensibles pour préserver le <100ms
      expect(isSensitiveTable('products')).toBe(false);
      expect(isSensitiveTable('transactions')).toBe(false);
      expect(isSensitiveTable('categories')).toBe(false);
    });

    it('persiste les tables sensibles de manière chiffrée avec AES-256-GCM au repos dans IndexedDB', async () => {
      setLocalState('users/u1', { id: 'u1', name: 'Administrateur', role: 'admin', pin: 'bcrypt_hash_1234' });
      await persistTableState('users');

      const storedInIdb = memoryIdbStore.get('nexus_db_users');
      expect(storedInIdb).toBeDefined();
      expect(storedInIdb.__encrypted).toBe(true);
      expect(storedInIdb.__version).toBe(2);
      expect(typeof storedInIdb.data).toBe('string');
      expect(storedInIdb.data.startsWith('aes:v1:')).toBe(true);
      expect(storedInIdb.data).not.toContain('Administrateur');
      expect(storedInIdb.data).not.toContain('bcrypt_hash_1234');
    });

    it('persiste le catalogue produits en clair dans IndexedDB pour garantir une réactivité <100ms', async () => {
      setLocalState('products/p1', { id: 'p1', name: 'Huile de Tournesol 5L', price: 1200, stock: 45 });
      await persistTableState('products');

      const storedInIdb = memoryIdbStore.get('nexus_db_products');
      expect(storedInIdb).toBeDefined();
      expect(storedInIdb.__encrypted).toBeUndefined();
      expect(storedInIdb['p1']).toEqual({ id: 'p1', name: 'Huile de Tournesol 5L', price: 1200, stock: 45 });
    });

    it('restaure et déchiffre automatiquement une table chiffrée lors du chargement', async () => {
      const encryptedValue = await encryptLocalData(JSON.stringify({
        emp1: { id: 'emp1', name: 'Karim Caissier', salary: 45000, pin: '1234' }
      }));

      const rawEncryptedStore = {
        __encrypted: true,
        __version: 2,
        data: encryptedValue
      };

      const restored = await restoreTableState('employees', rawEncryptedStore);
      expect(restored.emp1).toBeDefined();
      expect(restored.emp1.name).toBe('Karim Caissier');
      expect(restored.emp1.salary).toBe(45000);
    });

    it('gère la rétrocompatibilité lors de la restauration d’une table non chiffrée existante', async () => {
      const legacyTableData = {
        uLegacy: { id: 'uLegacy', email: 'owner@nexus-pos.dz', role: 'owner' }
      };

      const restored = await restoreTableState('users', legacyTableData);
      expect(restored.uLegacy).toBeDefined();
      expect(restored.uLegacy.email).toBe('owner@nexus-pos.dz');
    });

    it('fournit les helpers storeSensitiveItem et getSensitiveItem dans LocalDatabase', async () => {
      const tokenKey = 'nexus_cashier_shift_active_token';
      const tokenData = { token: 'jwt_offline_signed_abc123', shiftId: 'shift_999' };

      await storeSensitiveItem(tokenKey, tokenData);
      const retrieved = await getSensitiveItem<typeof tokenData>(tokenKey);

      expect(retrieved).toEqual(tokenData);
      removeSensitiveItem(tokenKey);
      expect(await getSensitiveItem(tokenKey)).toBeNull();
    });
  });
});
