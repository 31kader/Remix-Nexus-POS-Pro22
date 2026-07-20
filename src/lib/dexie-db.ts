import Dexie, { type Table } from 'dexie';
import { get as getIDB, del as delIDB } from 'idb-keyval';
import { encryptLocalData, decryptLocalData } from './security';

// Structure de file d'attente de synchronisation locale unitaire
export interface SyncQueueItem {
  id?: number; // Clé primaire auto-incrémentée
  table: string;
  recordId: string;
  value: any; // Données du document
  isDelete: boolean;
  timestamp: number;
}

// Structure hybride pour le chiffrement sécurisé local
// Les colonnes d'index restent en clair pour les filtres rapides de recherche,
// tandis que tout le reste de l'enregistrement est chiffré en AES-GCM.
export interface EncryptedRecord {
  id: string;
  barcode?: string;
  name?: string;
  category_id?: string;
  brand_id?: string;
  timestamp?: string;
  updated_at?: string;
  encryptedPayload: string; // Payload AES-GCM chiffré contenant l'objet complet
}

export class NexusDexieDatabase extends Dexie {
  products!: Table<EncryptedRecord, string>;
  categories!: Table<EncryptedRecord, string>;
  brands!: Table<EncryptedRecord, string>;
  promotions!: Table<EncryptedRecord, string>;
  transactions!: Table<EncryptedRecord, string>;
  purchase_orders!: Table<EncryptedRecord, string>;
  returns!: Table<EncryptedRecord, string>;
  online_orders!: Table<EncryptedRecord, string>;
  cash_shifts!: Table<EncryptedRecord, string>;
  customers!: Table<EncryptedRecord, string>;
  suppliers!: Table<EncryptedRecord, string>;
  employees!: Table<EncryptedRecord, string>;
  users!: Table<EncryptedRecord, string>;
  stock_adjustments!: Table<EncryptedRecord, string>;
  damaged_items!: Table<EncryptedRecord, string>;
  settings!: Table<EncryptedRecord, string>;
  vouchers!: Table<EncryptedRecord, string>;
  audit_logs!: Table<EncryptedRecord, string>;
  goods_receipt_notes!: Table<EncryptedRecord, string>;
  cart_drafts!: Table<EncryptedRecord, string>;
  external_delivery_requests!: Table<EncryptedRecord, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('NexusPOSProLocalDB');
    
    // Définition du schéma relationnel et des index de recherche (V1)
    this.version(1).stores({
      products: 'id, barcode, name, category_id, brand_id, status, updated_at',
      categories: 'id, name, updated_at',
      brands: 'id, name, updated_at',
      promotions: 'id, name, status, updated_at',
      transactions: 'id, customer_id, cashier_id, status, timestamp, updated_at',
      purchase_orders: 'id, supplier_id, status, created_at, updated_at',
      returns: 'id, transaction_id, timestamp, updated_at',
      online_orders: 'id, customer_id, status, created_at, updated_at',
      cash_shifts: 'id, user_id, status, start_time, updated_at',
      customers: 'id, name, phone, email, updated_at',
      suppliers: 'id, name, phone, email, updated_at',
      employees: 'id, name, role, email, updated_at',
      users: 'id, uid, email, display_name, updated_at',
      stock_adjustments: 'id, product_id, timestamp, updated_at',
      damaged_items: 'id, product_id, timestamp, updated_at',
      settings: 'id, updated_at',
      vouchers: 'id, code, status, updated_at',
      audit_logs: 'id, timestamp, user_id, action, updated_at',
      goods_receipt_notes: 'id, purchase_order_id, supplier_id, updated_at',
      cart_drafts: 'id, updated_at',
      external_delivery_requests: 'id, updated_at'
    });

    // Version 2 : Ajout de la table de file d'attente de synchronisation unitaire
    this.version(2).stores({
      sync_queue: '++id, table, recordId, timestamp'
    });
  }
}

export const dbLocal = new NexusDexieDatabase();

// ----------------- Helpers de Chiffrement/Déchiffrement Hybride -----------------

export async function encryptAndPrepare(record: any, table: string): Promise<EncryptedRecord> {
  const id = record.id || record.uid || '';
  if (!id) {
    throw new Error(`Record must have an id or uid in table ${table}`);
  }

  // Clés à laisser en clair pour l'indexation de recherche
  const indexKeys = ['id', 'barcode', 'name', 'category_id', 'brand_id', 'timestamp', 'updated_at', 'status', 'phone', 'email', 'uid', 'customer_id', 'cashier_id', 'supplier_id', 'purchase_order_id', 'code', 'action', 'user_id'];
  
  const clearRecord: any = { id };
  indexKeys.forEach(k => {
    if (record[k] !== undefined && record[k] !== null) {
      clearRecord[k] = String(record[k]);
    }
  });

  // Chiffrer l'objet complet en AES-GCM
  const jsonStr = JSON.stringify(record);
  const encryptedPayload = await encryptLocalData(jsonStr);

  return {
    ...clearRecord,
    encryptedPayload
  };
}

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export async function decryptAndRestore(encryptedRecord: EncryptedRecord | undefined): Promise<any | null> {
  if (!encryptedRecord) return null;
  try {
    const decryptedJson = await decryptLocalData(encryptedRecord.encryptedPayload);
    return JSON.parse(decryptedJson);
  } catch (err) {
    if (!isTest) {
      console.warn('[Dexie DB] Decryption failed, returning plain indexes', err);
    }
    return { ...encryptedRecord };
  }
}

// ----------------- Script de Migration Transparent depuis l'Ancien Stockage -----------------

export async function migrateFromOldIndexedDB(): Promise<void> {
  const isMigrated = localStorage.getItem('nexus_dexie_db_migrated_v1');
  if (isMigrated === 'true') return;

  if (!isTest) {
    console.log('[Migration] Starting migration from legacy flat IndexedDB files to Dexie.js...');
  }
  
  const tables = [
    'products', 'categories', 'brands', 'promotions',
    'transactions', 'purchase_orders', 'returns', 'online_orders', 'cash_shifts',
    'customers', 'suppliers', 'employees', 'users', 'stock_adjustments',
    'damaged_items', 'settings', 'vouchers', 'audit_logs', 'goods_receipt_notes',
    'cart_drafts', 'external_delivery_requests'
  ];

  try {
    for (const t of tables) {
      const rawVal = await getIDB(`nexus_db_${t}`);
      let parsedData: Record<string, any> = {};

      if (typeof rawVal === 'string') {
        try {
          const decrypted = await decryptLocalData(rawVal);
          parsedData = JSON.parse(decrypted);
        } catch (_) {
          try { parsedData = JSON.parse(rawVal); } catch (_) {}
        }
      } else if (rawVal && typeof rawVal === 'object') {
        parsedData = rawVal;
      }

      const records = Object.values(parsedData);
      if (records.length > 0) {
        if (!isTest) {
          console.log(`[Migration] Migrating ${records.length} records to table "${t}"...`);
        }
        
        // Préparer et insérer en masse dans Dexie
        const prepared = await Promise.all(records.map(r => encryptAndPrepare(r, t)));
        const dexieTable = (dbLocal as any)[t];
        if (dexieTable) {
          await dbLocal.transaction('rw', dexieTable, async () => {
            await dexieTable.bulkPut(prepared);
          });
        }
      }
    }

    // Marquer comme migré
    localStorage.setItem('nexus_dexie_db_migrated_v1', 'true');
    if (!isTest) {
      console.log('[Migration] Migration to Dexie.js completed successfully!');
    }

    // Optionnel : Nettoyer les anciennes clés de l'IndexedDB plate pour libérer de la mémoire sur le disque
    setTimeout(async () => {
      if (!isTest) {
        console.log('[Migration] Cleaning up old flat database files...');
      }
      for (const t of tables) {
        await delIDB(`nexus_db_${t}`).catch(() => {});
      }
      await delIDB('nexus_db_split_v1').catch(() => {});
      if (!isTest) {
        console.log('[Migration] Cleanup done.');
      }
    }, 5000);

  } catch (err) {
    if (!isTest) {
      console.error('[Migration] Critical error during database migration:', err);
    }
  }
}
