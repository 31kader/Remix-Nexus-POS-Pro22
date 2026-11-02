import { get as idbGet, set as idbSet } from 'idb-keyval';
import { collectCurrentBackupData } from './backupDataCollector';
import { BackupData, applyBackupData } from './backupRestoreProcessor';

export const IDB_ROLLING_BACKUPS_KEY = 'nexus_daily_backups_rolling';
export const STORAGE_LAST_BACKUP_DATE_KEY = 'nexus_last_auto_backup_date';
export const STORAGE_LAST_BACKUP_INFO_KEY = 'nexus_last_auto_backup_info';
export const MAX_ROLLING_DAYS = 7;

export interface RollingBackupEntry {
  date: string; // YYYY-MM-DD
  timestamp: number;
  productCount: number;
  txCount: number;
  data: BackupData;
}

export interface LastAutoBackupInfo {
  date: string;
  timestamp: number;
  productCount: number;
  txCount: number;
  environment: 'electron' | 'browser';
}

function getTodayDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shouldRunDailyBackup(now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false;
  const today = getTodayDateString(now);
  const lastDate = localStorage.getItem(STORAGE_LAST_BACKUP_DATE_KEY);
  return lastDate !== today;
}

export function getLastAutoBackupInfo(): LastAutoBackupInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_LAST_BACKUP_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getRollingBackupsList(): Promise<Omit<RollingBackupEntry, 'data'>[]> {
  try {
    const list = await idbGet<RollingBackupEntry[]>(IDB_ROLLING_BACKUPS_KEY);
    if (!Array.isArray(list)) return [];
    return list.map(({ date, timestamp, productCount, txCount }) => ({
      date,
      timestamp,
      productCount,
      txCount
    }));
  } catch {
    return [];
  }
}

/**
 * 🔄 Exécute la sauvegarde automatique quotidienne avec rétention 7 jours glissants
 */
export async function runDailyAutoBackup(options: { force?: boolean; dateOverride?: Date } = {}): Promise<{
  executed: boolean;
  reason?: string;
  info?: LastAutoBackupInfo;
}> {
  const currentDate = options.dateOverride || new Date();
  const today = getTodayDateString(currentDate);

  if (!options.force && !shouldRunDailyBackup(currentDate)) {
    return { executed: false, reason: 'ALREADY_COMPLETED_TODAY' };
  }

  try {
    const backupData = await collectCurrentBackupData();
    const productCount = backupData.products?.length || 0;
    const txCount = backupData.transactions?.length || 0;
    let env: 'electron' | 'browser' = 'browser';

    // 1. Sauvegarde Electron PC si disponible
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveDailyBackup) {
      env = 'electron';
      await (window as any).electronAPI.saveDailyBackup({
        filename: `NexusPOS_AutoBackup_${today}.json`,
        content: JSON.stringify(backupData, null, 2),
        date: today
      });
    }

    // 2. Sauvegarde IndexedDB glissante (7 jours)
    const existingList = (await idbGet<RollingBackupEntry[]>(IDB_ROLLING_BACKUPS_KEY)) || [];
    const filteredList = existingList.filter(item => item.date !== today);
    filteredList.unshift({
      date: today,
      timestamp: currentDate.getTime(),
      productCount,
      txCount,
      data: backupData
    });

    // Conserver strictement les 7 derniers jours
    const trimmedList = filteredList.slice(0, MAX_ROLLING_DAYS);
    await idbSet(IDB_ROLLING_BACKUPS_KEY, trimmedList);

    // 3. Mettre à jour les métadonnées localStorage
    const backupInfo: LastAutoBackupInfo = {
      date: today,
      timestamp: currentDate.getTime(),
      productCount,
      txCount,
      environment: env
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LAST_BACKUP_DATE_KEY, today);
      localStorage.setItem(STORAGE_LAST_BACKUP_INFO_KEY, JSON.stringify(backupInfo));
    }

    return { executed: true, info: backupInfo };
  } catch (err: any) {
    console.error('[AutoBackup] Échec sauvegarde automatique quotidienne:', err);
    return { executed: false, reason: err?.message || 'UNKNOWN_ERROR' };
  }
}

/**
 * 📥 Restaure une sauvegarde automatique spécifique issue du roulement IndexedDB
 */
export async function restoreFromRollingBackup(date: string): Promise<boolean> {
  const existingList = (await idbGet<RollingBackupEntry[]>(IDB_ROLLING_BACKUPS_KEY)) || [];
  const found = existingList.find(b => b.date === date);
  if (!found || !found.data) {
    throw new Error(`Aucune sauvegarde trouvée pour la date ${date}`);
  }
  await applyBackupData(found.data);
  return true;
}
