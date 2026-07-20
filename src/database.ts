import { supabase, isSupabaseConfigured } from './supabase';
import { toast } from 'sonner';

// Re-export Auth logic from AuthService
export {
  auth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  googleProvider,
  GoogleAuthProvider
} from './services/AuthService';
export type { User } from './services/AuthService';

// Re-export Local DB logic from LocalDatabase
export {
  localDb,
  incrementStock
} from './services/LocalDatabase';

// Re-export modular services
export {
  generateLocalId,
  convertKeysToCamel,
  convertKeysToSnake,
} from './lib/db-converters';

export {
  getLocalValue,
  queryLocalState,
  loadInitialState,
  triggerObservers,
  saveStateToStorage
} from './lib/local-db';
export type { QueryOptions } from './lib/local-db';

export {
  enqueueStockAdjustment,
  onBackgroundSyncStatus,
  loadPendingSyncQueue
} from './services/SyncService';

export {
  initAndSyncSupabase,
  onSyncUpdate,
  syncStatus
} from './services/SupabaseSync';

// ----------------- Compatibility Mocks -----------------
export const db = { type: 'database_mock' };
export const rtdb = { type: 'realtime_mock' };

export const ref = (dbInstance: any, path = '') => {
  if (typeof dbInstance === 'string') return dbInstance;
  return path;
};

export const child = (parent: any, path: string) => {
  const parentPath = typeof parent === 'string' ? parent : (parent.path || '');
  return parentPath ? `${parentPath}/${path}` : path;
};

export function rtdbQuery(pathOrRef: any, ..._constraints: any[]) {
  return pathOrRef; 
}

export const orderByChild = (_field: string) => ({ type: 'orderByChild' });
export const equalTo = (_val: any) => ({ type: 'equalTo' });
export const startAt = (_val: any) => ({ type: 'startAt' });
export const endAt = (_val: any) => ({ type: 'endAt' });
export const limitToLast = (_n: number) => ({ type: 'limitToLast' });

export enum OperationType {
  READ = 'READ', WRITE = 'WRITE', DELETE = 'DELETE', CREATE = 'CREATE', UPDATE = 'UPDATE', LIST = 'LIST', GET = 'GET'
}

export const handleDatabaseError = (_err: any, _type: any, _module: any) => {};
