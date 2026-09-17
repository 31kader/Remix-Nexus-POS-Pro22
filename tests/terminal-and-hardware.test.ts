import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTerminalId, getTerminalName, setTerminalInfo } from '../src/services/terminalService';
import { isAutoDrawerEnabled, setAutoDrawerEnabled, triggerCashDrawer } from '../src/services/hardwareService';
import { flushSyncQueueImmediate, enqueueSync, loadPendingSyncQueue } from '../src/services/SyncService';

describe('Multi-Postes Terminal & Hardware Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devrait initialiser et persister les informations du terminal de caisse', () => {
    expect(getTerminalId()).toBe('POS-01');
    expect(getTerminalName()).toBe('Caisse Principale');

    setTerminalInfo('POS-02', 'Caisse Étage');
    expect(getTerminalId()).toBe('POS-02');
    expect(getTerminalName()).toBe('Caisse Étage');
  });

  it('devrait gérer le tiroir-caisse et son activation automatique', async () => {
    expect(isAutoDrawerEnabled()).toBe(true);

    setAutoDrawerEnabled(false);
    expect(isAutoDrawerEnabled()).toBe(false);

    const resDisabled = await triggerCashDrawer();
    expect(resDisabled.success).toBe(true);
    expect(resDisabled.message).toContain('désactivée');

    setAutoDrawerEnabled(true);
    const resActive = await triggerCashDrawer();
    expect(resActive.success).toBe(true);
  });

  it('devrait exécuter un flush synchrone anti-crash d\'urgence', () => {
    enqueueSync('transactions', 'test-tx-1', 'UPSERT', { id: 'test-tx-1', total: 1200 });
    flushSyncQueueImmediate();

    const emergencyBackup = localStorage.getItem('nexus_emergency_sync_queue');
    expect(emergencyBackup).toBeTruthy();
    expect(emergencyBackup).toContain('test-tx-1');
  });
});
