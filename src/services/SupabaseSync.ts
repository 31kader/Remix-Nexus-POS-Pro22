import { supabase, isSupabaseConfigured, removeChannelByName } from '../supabase';
import { 
  TABLE_COLUMNS, 
  convertKeysToCamel 
} from '../lib/db-converters';
import { 
  dbState, 
  triggerObservers, 
  saveStateToStorage 
} from '../lib/local-db';
import { isRecordPendingSync } from './SyncService';

export const syncStatus = {
  active: false,
  progress: 0,
  totalTables: Object.keys(TABLE_COLUMNS).length,
  completedTables: 0,
  currentTable: '',
  observers: [] as ((status: any) => void)[]
};

function triggerSyncUpdate() {
  syncStatus.observers.forEach(cb => cb({ ...syncStatus }));
}

export function onSyncUpdate(callback: (status: any) => void) {
  syncStatus.observers.push(callback);
  callback({ ...syncStatus });
  return () => {
    syncStatus.observers = syncStatus.observers.filter(cb => cb !== callback);
  };
}

let isTurboSubscriptionActive = false;

export function enableTurboSync() {
  if (!isSupabaseConfigured || isTurboSubscriptionActive) return;
  
  const tablesToSync = Array.from(new Set(
    Object.keys(TABLE_COLUMNS).map(table => table === 'shifts' ? 'cash_shifts' : table)
  ));
  
  tablesToSync.forEach(mappedTable => {
    removeChannelByName(`public:${mappedTable}`);
    supabase
      .channel(`public:${mappedTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: mappedTable }, (payload: any) => {
        const tableMappings = Object.keys(TABLE_COLUMNS).filter(t => (t === 'shifts' ? 'cash_shifts' : t) === mappedTable);

        tableMappings.forEach(table => {
          if (payload.eventType === 'DELETE') {
            const oldData = convertKeysToCamel(payload.old);
            if (oldData.id && dbState[table]) {
              delete dbState[table][oldData.id];
              triggerObservers(table);
              triggerObservers(`${table}/${oldData.id}`);
            }
          } else {
            const row = payload.new;
            const jsonFields = ['items', 'status_history', 'metadata', 'details', 'documents', 'bundle_items', 'quantity_discounts', 'usage_logs', 'batches', 'alerts', 'favorite_items', 'conditions', 'discrepancies', 'notifications', 'role_kpis'];
            jsonFields.forEach(field => {
              if (row[field] && typeof row[field] === 'string') {
                try { row[field] = JSON.parse(row[field]); } catch (e) {}
              }
            });

            const newData = convertKeysToCamel(row);
            if (newData.id) {
              const id = String(newData.id);
              newData.id = id;
              if (!dbState[table]) dbState[table] = {};
              dbState[table][id] = newData;
              triggerObservers(table);
              triggerObservers(`${table}/${id}`);
            }
          }
        });
        saveStateToStorage();
      })
      .subscribe();
  });
  
  isTurboSubscriptionActive = true;
}

export async function initAndSyncSupabase() {
  if (!isSupabaseConfigured) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const hasSession = !!sessionData?.session;

  // Ensure standard 'uncategorized' category exists to prevent foreign key violations on products
  if (hasSession) {
    try {
      await supabase.from('categories').upsert(
        { id: 'uncategorized', name: 'Sans catégorie', level: 1 },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.warn('[Sync] Failed to ensure default uncategorized category:', err);
    }
  }
  
  syncStatus.active = true;
  syncStatus.progress = 0;
  syncStatus.completedTables = 0;
  triggerSyncUpdate();

  enableTurboSync();
  
  const tables = Object.keys(TABLE_COLUMNS);
  
  for (const table of tables) {
    syncStatus.currentTable = table;
    triggerSyncUpdate();
    
    try {
      if (!hasSession) {
        syncStatus.completedTables++;
        syncStatus.progress = Math.round((syncStatus.completedTables / syncStatus.totalTables) * 100);
        triggerSyncUpdate();
        continue;
      }

      let success = false;
      let attempt = 0;
      const maxAttempts = 3;
      let allData: any[] = [];

      while (!success && attempt < maxAttempts) {
        try {
          allData = [];
          const mappedTable = table === 'shifts' ? 'cash_shifts' : table;
          let lastId: any = null;
          let hasMore = true;

          while (hasMore) {
            let query = supabase
              .from(mappedTable)
              .select(TABLE_COLUMNS[table] ? TABLE_COLUMNS[table].join(',') : '*')
              .order('id', { ascending: true })
              .limit(200);

            if (lastId !== null) query = query.gt('id', lastId);

            const { data, error } = await query;

            if (error) {
              throw new Error(error.message);
            } else if (data && data.length > 0) {
              allData = allData.concat(data);
              lastId = data[data.length - 1].id;
              if (data.length < 200) hasMore = false;
            } else {
              hasMore = false;
            }
          }
          success = true;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw err;
          }
          console.warn(`[Sync] Attempt ${attempt} failed to sync ${table}. Retrying in ${attempt * 1000}ms...`, err);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      if (allData.length > 0) {
        if (!dbState[table]) dbState[table] = {};
        allData.forEach(row => {
          const jsonFields = ['items', 'status_history', 'metadata', 'details', 'documents', 'bundle_items', 'quantity_discounts', 'usage_logs', 'batches', 'alerts', 'favorite_items', 'conditions', 'discrepancies', 'notifications', 'role_kpis'];
          jsonFields.forEach(field => {
            if (row[field] && typeof row[field] === 'string') {
              try { row[field] = JSON.parse(row[field]); } catch (e) {}
            }
          });
          const camelRow = convertKeysToCamel(row);
          if (camelRow.id) {
            camelRow.id = String(camelRow.id);
            if (!isRecordPendingSync(table, camelRow.id)) {
              dbState[table][camelRow.id] = camelRow;
            }
          }
        });
        triggerObservers(table);
      }
    } catch (e) {
      console.warn(`[Sync] Failed to sync ${table}`, e);
    } finally {
      syncStatus.completedTables++;
      syncStatus.progress = Math.round((syncStatus.completedTables / syncStatus.totalTables) * 100);
      triggerSyncUpdate();
    }
  }
  
  syncStatus.active = false;
  triggerSyncUpdate();
}
