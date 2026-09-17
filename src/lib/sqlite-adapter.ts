import { get as getIDB, set as setIDB } from 'idb-keyval';
import { Capacitor } from '@capacitor/core';

interface ElectronAPI {
  sqliteExecute: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
  sqliteQuery: (sql: string, params?: any[]) => Promise<any[]>;
  sqliteBatch: (queries: { sql: string; params?: any[] }[]) => Promise<any[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Détection des environnements
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && Capacitor.isNativePlatform();

let capacitorDb: any = null;

// Initialisation Capacitor
async function initCapacitor() {
  if (capacitorDb) return capacitorDb;
  try {
    const { SQLiteConnection, CapacitorSQLite } = await import('@capacitor-community/sqlite');
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const isConn = (await sqlite.isConnection("nexus_pos", false)).result;
    let db;
    if (isConn) {
      db = await sqlite.retrieveConnection("nexus_pos", false);
    } else {
      db = await sqlite.createConnection("nexus_pos", false, "no-encryption", 1, false);
    }
    await db.open();

    // Initialisation des tables SQLite
    await db.execute(`
      CREATE TABLE IF NOT EXISTS local_records (
        table_name TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (table_name, id)
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    capacitorDb = db;
    return db;
  } catch (error) {
    console.error('Failed to initialize Capacitor SQLite connection:', error);
    throw error;
  }
}

// Simulateur SQLite Web (en mémoire avec sauvegarde IndexedDB)
let webRecords: Record<string, Record<string, string>> = {};
let webSyncQueue: any[] = [];
let webQueueNextId = 1;
let webInitialized = false;

async function initWeb() {
  if (webInitialized) return;
  try {
    const records = await getIDB('nexus_sqlite_sim_records');
    if (records) webRecords = records;
    
    const queue = await getIDB('nexus_sqlite_sim_queue');
    if (queue) {
      webSyncQueue = queue;
      webQueueNextId = queue.length > 0 ? Math.max(...queue.map((q: any) => q.id)) + 1 : 1;
    }
    webInitialized = true;
  } catch (error) {
    console.warn('[SQLite Web Simulator] Failed to load from IndexedDB', error);
    webInitialized = true;
  }
}

async function saveWebRecords() {
  await setIDB('nexus_sqlite_sim_records', webRecords);
}

async function saveWebQueue() {
  await setIDB('nexus_sqlite_sim_queue', webSyncQueue);
}

// Interpréteur de requêtes SQL pour le Web
async function runWebExecute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  await initWeb();
  const cleanSql = sql.trim().toLowerCase();

  // CREATE TABLE
  if (cleanSql.startsWith('create table')) {
    return { changes: 0, lastInsertRowid: 0 };
  }

  // INSERT OR REPLACE INTO local_records
  if (cleanSql.startsWith('insert or replace into local_records')) {
    const [tableName, id, data] = params;
    if (!webRecords[tableName]) {
      webRecords[tableName] = {};
    }
    webRecords[tableName][id] = data;
    await saveWebRecords();
    return { changes: 1, lastInsertRowid: 0 };
  }

  // DELETE FROM local_records WHERE table_name = ? AND id = ?
  if (cleanSql.startsWith('delete from local_records where table_name = ? and id = ?')) {
    const [tableName, id] = params;
    if (webRecords[tableName]) {
      delete webRecords[tableName][id];
      await saveWebRecords();
    }
    return { changes: 1, lastInsertRowid: 0 };
  }

  // DELETE FROM local_records WHERE table_name = ?
  if (cleanSql.startsWith('delete from local_records where table_name = ?')) {
    const [tableName] = params;
    if (webRecords[tableName]) {
      delete webRecords[tableName];
      await saveWebRecords();
    }
    return { changes: 1, lastInsertRowid: 0 };
  }

  // INSERT INTO sync_queue
  if (cleanSql.startsWith('insert into sync_queue')) {
    const [tableName, recordId, action, payload] = params;
    const newId = webQueueNextId++;
    webSyncQueue.push({
      id: newId,
      table_name: tableName,
      record_id: recordId,
      action,
      payload
    });
    await saveWebQueue();
    return { changes: 1, lastInsertRowid: newId };
  }

  // DELETE FROM sync_queue WHERE id = ?
  if (cleanSql.startsWith('delete from sync_queue where id = ?')) {
    const [queueId] = params;
    webSyncQueue = webSyncQueue.filter(item => item.id !== queueId);
    await saveWebQueue();
    return { changes: 1, lastInsertRowid: 0 };
  }

  // DELETE FROM sync_queue WHERE id IN (...)
  if (cleanSql.includes('delete from sync_queue where id in')) {
    const idsToDelete = new Set(params);
    webSyncQueue = webSyncQueue.filter(item => !idsToDelete.has(item.id));
    await saveWebQueue();
    return { changes: params.length, lastInsertRowid: 0 };
  }

  // DELETE FROM sync_queue
  if (cleanSql === 'delete from sync_queue') {
    const count = webSyncQueue.length;
    webSyncQueue = [];
    await saveWebQueue();
    return { changes: count, lastInsertRowid: 0 };
  }

  console.warn(`[SQLite Web Simulator] Query not matched for execute: ${sql}`);
  return { changes: 0, lastInsertRowid: 0 };
}

async function runWebQuery(sql: string, params: any[] = []): Promise<any[]> {
  await initWeb();
  const cleanSql = sql.trim().toLowerCase();

  // PRAGMA
  if (cleanSql.startsWith('pragma')) {
    return [];
  }

  // SELECT FROM local_records
  if (cleanSql.startsWith('select table_name, id, data from local_records')) {
    const rows = [];
    for (const [tableName, records] of Object.entries(webRecords)) {
      for (const [id, data] of Object.entries(records)) {
        rows.push({ table_name: tableName, id, data });
      }
    }
    return rows;
  }

  // SELECT FROM sync_queue
  if (cleanSql.startsWith('select id, table_name, record_id, action, payload from sync_queue')) {
    return [...webSyncQueue];
  }

  console.warn(`[SQLite Web Simulator] Query not matched for query: ${sql}`);
  return [];
}

// API de l'adaptateur SQLite
export const sqliteAdapter = {
  /**
   * Initialise la connexion à la base de données.
   */
  init: async (): Promise<void> => {
    if (isElectron) {
      // Pas d'initialisation nécessaire côté rendu pour Electron
      return;
    } else if (isCapacitor) {
      await initCapacitor();
    } else {
      await initWeb();
    }
  },

  /**
   * Exécute une requête SQL d'écriture (INSERT, UPDATE, DELETE).
   */
  execute: async (sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> => {
    if (isElectron && window.electronAPI) {
      return window.electronAPI.sqliteExecute(sql, params);
    } else if (isCapacitor) {
      const db = await initCapacitor();
      const res = await db.run(sql, params);
      return {
        changes: res.changes?.changes ?? 0,
        lastInsertRowid: res.changes?.lastId ?? 0
      };
    } else {
      return runWebExecute(sql, params);
    }
  },

  /**
   * Exécute une requête de lecture (SELECT).
   */
  query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    if (isElectron && window.electronAPI) {
      return window.electronAPI.sqliteQuery(sql, params) as Promise<T[]>;
    } else if (isCapacitor) {
      const db = await initCapacitor();
      const res = await db.query(sql, params);
      return (res.values || []) as T[];
    } else {
      return runWebQuery(sql, params) as Promise<T[]>;
    }
  },

  /**
   * Exécute une transaction de requêtes en lot.
   */
  batch: async (queries: { sql: string; params?: any[] }[]): Promise<any[]> => {
    if (isElectron && window.electronAPI) {
      return window.electronAPI.sqliteBatch(queries);
    } else if (isCapacitor) {
      const db = await initCapacitor();
      const capQueries = queries.map(q => ({
        statement: q.sql,
        values: q.params || []
      }));
      const res = await db.executeTransaction(capQueries);
      return res as any;
    } else {
      const results = [];
      for (const q of queries) {
        const res = await runWebExecute(q.sql, q.params || []);
        results.push(res);
      }
      return results;
    }
  }
};
