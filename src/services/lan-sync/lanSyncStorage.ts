import { LanRole, LanSyncMessage } from '../../types/lanSync';
import {
  STORAGE_KEY_ROLE,
  STORAGE_KEY_MASTER_IP,
  STORAGE_KEY_MASTER_PORT,
  STORAGE_KEY_LAN_TOKEN,
  STORAGE_KEY_PENDING_QUEUE,
  DEFAULT_LAN_TOKEN,
  DEFAULT_PORT,
} from './lanSyncConstants';

export interface StoredLanConfig {
  currentRole: LanRole;
  masterIp: string;
  masterPort: number;
  lanToken: string;
}

export function loadStoredConfig(): StoredLanConfig {
  let currentRole: LanRole = 'STANDALONE';
  let masterIp = '';
  let masterPort = DEFAULT_PORT;
  let lanToken = DEFAULT_LAN_TOKEN;

  if (typeof window === 'undefined') {
    return { currentRole, masterIp, masterPort, lanToken };
  }

  try {
    const storedRole = localStorage.getItem(STORAGE_KEY_ROLE) as LanRole | null;
    if (storedRole && (storedRole === 'STANDALONE' || storedRole === 'MASTER' || storedRole === 'SECONDARY')) {
      currentRole = storedRole;
    }

    masterIp = (localStorage.getItem(STORAGE_KEY_MASTER_IP) || '').trim();
    const storedPort = parseInt(localStorage.getItem(STORAGE_KEY_MASTER_PORT) || '', 10);
    masterPort = Number.isFinite(storedPort) && storedPort > 0 ? storedPort : DEFAULT_PORT;
    lanToken = localStorage.getItem(STORAGE_KEY_LAN_TOKEN) || DEFAULT_LAN_TOKEN;
  } catch (e) {
    console.warn('[LanSyncStorage] Impossible de charger la configuration:', e);
  }

  return { currentRole, masterIp, masterPort, lanToken };
}

export function saveStoredRole(role: LanRole): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  } catch (_) {}
}

export function saveStoredMasterIp(ip: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_MASTER_IP, ip);
  } catch (_) {}
}

export function saveStoredMasterPort(port: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_MASTER_PORT, String(port));
  } catch (_) {}
}

export function saveStoredLanToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAN_TOKEN, token);
  } catch (_) {}
}

export function savePendingQueueToStorage(queue: LanSyncMessage[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PENDING_QUEUE, JSON.stringify(queue));
  } catch (_) {}
}

export function loadPendingQueueFromStorage(): LanSyncMessage[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_QUEUE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (_) {}
  return [];
}
