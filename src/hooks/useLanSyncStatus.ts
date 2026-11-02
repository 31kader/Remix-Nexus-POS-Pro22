import { useState, useEffect } from 'react';
import { lanSyncService } from '../services/lanSyncService';
import { LanSyncState } from '../types/lanSync';

export function useLanSyncStatus(): LanSyncState & {
  setRole: (role: LanSyncState['role']) => void;
  setMasterIp: (ip: string) => void;
  setMasterPort: (port: number) => void;
  setLanToken: (token: string) => void;
  testConnection: (ip?: string, port?: number) => Promise<{ success: boolean; latencyMs?: number; message?: string; info?: any }>;
  reconnect: () => void;
} {
  const [state, setState] = useState<LanSyncState>(() => lanSyncService.getState());

  useEffect(() => {
    const unsubscribe = lanSyncService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    setRole: (role) => lanSyncService.setRole(role),
    setMasterIp: (ip) => lanSyncService.setMasterIp(ip),
    setMasterPort: (port) => lanSyncService.setMasterPort(port),
    setLanToken: (token) => lanSyncService.setLanToken(token),
    testConnection: (ip, port) => lanSyncService.testConnection(ip, port),
    reconnect: () => lanSyncService.connect()
  };
}
