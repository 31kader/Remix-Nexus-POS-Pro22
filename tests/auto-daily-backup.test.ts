import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  shouldRunDailyBackup, 
  runDailyAutoBackup, 
  getLastAutoBackupInfo, 
  getRollingBackupsList,
  STORAGE_LAST_BACKUP_DATE_KEY,
  MAX_ROLLING_DAYS
} from '../src/services/backup/autoDailyBackupService';
import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useInventoryStore } from '../src/store/useInventoryStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { useTransactionStore } from '../src/store/useTransactionStore';

// Mock idb-keyval in memory
const inMemoryIdb = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(inMemoryIdb.get(key))),
  set: vi.fn((key: string, val: any) => {
    inMemoryIdb.set(key, val);
    return Promise.resolve();
  })
}));

describe('📦 Sauvegarde Automatique Quotidienne & Rotation 7 Jours', () => {
  beforeEach(() => {
    localStorage.clear();
    inMemoryIdb.clear();

    useCoreStore.getState().setProducts([
      { id: 'p1', name: 'Produit 1', price: 100, costPrice: 80, stock: 10 } as any,
      { id: 'p2', name: 'Produit 2', price: 200, costPrice: 150, stock: 25 } as any
    ]);
    useTransactionStore.getState().setTransactions([
      { id: 'tx1', total: 300, createdAt: new Date().toISOString() } as any
    ]);
  });

  it('1. shouldRunDailyBackup retourne true si aucun backup n\'a été fait aujourd\'hui', () => {
    expect(shouldRunDailyBackup()).toBe(true);
  });

  it('2. runDailyAutoBackup génère un snapshot complet et met à jour localStorage et IndexedDB', async () => {
    const res = await runDailyAutoBackup();
    expect(res.executed).toBe(true);
    expect(res.info).toBeDefined();
    expect(res.info?.productCount).toBe(2);
    expect(res.info?.txCount).toBe(1);

    const todayStr = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(STORAGE_LAST_BACKUP_DATE_KEY)).toBe(todayStr);

    const savedInfo = getLastAutoBackupInfo();
    expect(savedInfo?.date).toBe(todayStr);
    expect(savedInfo?.productCount).toBe(2);

    const rolling = await getRollingBackupsList();
    expect(rolling.length).toBe(1);
    expect(rolling[0].date).toBe(todayStr);
  });

  it('3. Un second appel sans force est ignoré pour éviter les doublons dans la même journée', async () => {
    await runDailyAutoBackup();
    const secondRun = await runDailyAutoBackup();
    expect(secondRun.executed).toBe(false);
    expect(secondRun.reason).toBe('ALREADY_COMPLETED_TODAY');
  });

  it('4. Un appel avec force: true ré-exécute et met à jour le snapshot du jour', async () => {
    await runDailyAutoBackup();
    // Ajouter un produit
    useCoreStore.getState().setProducts([
      { id: 'p1', name: 'Produit 1', price: 100, costPrice: 80, stock: 10 } as any,
      { id: 'p2', name: 'Produit 2', price: 200, costPrice: 150, stock: 25 } as any,
      { id: 'p3', name: 'Produit 3', price: 300, costPrice: 220, stock: 50 } as any
    ]);

    const forcedRun = await runDailyAutoBackup({ force: true });
    expect(forcedRun.executed).toBe(true);
    expect(forcedRun.info?.productCount).toBe(3);

    const rolling = await getRollingBackupsList();
    expect(rolling.length).toBe(1);
    expect(rolling[0].productCount).toBe(3);
  });

  it('5. La rotation tronque automatiquement au-delà de 7 jours glissants', async () => {
    for (let i = 10; i >= 1; i--) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - i);
      await runDailyAutoBackup({ force: true, dateOverride: pastDate });
    }

    const rolling = await getRollingBackupsList();
    expect(rolling.length).toBe(MAX_ROLLING_DAYS); // Strictement 7
  });
});
