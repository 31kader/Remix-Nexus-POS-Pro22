import { get as getIDB, set as setIDB } from 'idb-keyval';

/**
 * ⚡ OPTIMISATION MÉMOIRE : Décharge les transactions >90 jours de la RAM vers un stockage IndexedDB archivé
 */
let isPartitioning = false;

export async function partitionOldTransactions(dbState: Record<string, Record<string, any>>) {
  if (isPartitioning) return;
  isPartitioning = true;
  try {
    const rawTxs = dbState['transactions'];
    if (!rawTxs || typeof rawTxs !== 'object') return;
    
    const txList = Object.values(rawTxs);
    if (txList.length < 200) return;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const activeTxs: Record<string, any> = {};
    const archiveTxs: Record<string, any> = (await getIDB('nexus_archived_transactions')) || {};
    let movedCount = 0;

    for (const tx of txList) {
      if (!tx || !tx.id) continue;
      const txTime = new Date(tx.timestamp || tx.created_at || tx.date || 0).getTime();
      if (txTime > 0 && txTime < ninetyDaysAgo) {
        archiveTxs[tx.id] = tx;
        movedCount++;
      } else {
        activeTxs[tx.id] = tx;
      }
    }

    if (movedCount > 0) {
      dbState['transactions'] = activeTxs;
      await setIDB('nexus_archived_transactions', archiveTxs);
      await setIDB('nexus_db_transactions', activeTxs);
      console.log(`[MemoryOptimizer] ${movedCount} transaction(s) anciennes (>90j) déchargées de la RAM vers le stockage archive.`);
    }
  } catch (err) {
    console.warn('[MemoryOptimizer] Erreur partitionnement des transactions:', err);
  } finally {
    isPartitioning = false;
  }
}

/**
 * 🔍 Récupère à la demande les transactions archivées depuis IndexedDB
 */
export async function getArchivedTransactionsFromStorage(): Promise<any[]> {
  try {
    const archived = await getIDB<Record<string, any>>('nexus_archived_transactions');
    return archived ? Object.values(archived) : [];
  } catch {
    return [];
  }
}
