import { describe, it, expect, beforeEach } from 'vitest';
import { diagnosticService } from '../src/services/DiagnosticLogService';

describe('DiagnosticLogService & F12 Error Interpreter', () => {
  beforeEach(() => {
    diagnosticService.clearLogs();
  });

  it('correctly interprets a 409 Conflict error on suppliers', () => {
    diagnosticService.captureLog(
      'error',
      'network',
      'POST https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/suppliers?on_conflict=id 409 (Conflict)'
    );

    const logs = diagnosticService.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].code).toBe(409);
    expect(logs[0].title).toContain('suppliers');
    expect(logs[0].significance).toContain('existe déjà');
    expect(logs[0].actionTaken).toContain('UPDATE');
  });

  it('correctly interprets a date format warning (datetime-local)', () => {
    diagnosticService.captureLog(
      'warn',
      'console',
      'The specified value "2026-10-30" does not conform to the required format. The format is "yyyy-MM-ddThh:mm".'
    );

    const logs = diagnosticService.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].code).toBe('DATE_FMT');
    expect(logs[0].title).toContain('date');
    expect(logs[0].significance).toContain('calendrier');
  });

  it('correctly interprets a 401 Unauthorized / JWT Expired error', () => {
    diagnosticService.captureLog(
      'error',
      'network',
      'PGRST301: JWT expired or invalid token'
    );

    const logs = diagnosticService.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].code).toBe(401);
    expect(logs[0].title).toContain('Session expirée');
  });

  it('correctly interprets a network failure (Offline)', () => {
    diagnosticService.captureLog(
      'error',
      'network',
      'TypeError: Failed to fetch'
    );

    const logs = diagnosticService.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].code).toBe('OFFLINE');
    expect(logs[0].title).toContain('Réseau indisponible');
    expect(logs[0].actionTaken).toContain('Offline-First');
  });

  it('generates a clean human-readable text report', () => {
    diagnosticService.captureLog('error', 'network', '409 Conflict test');
    const text = diagnosticService.exportAsText();
    expect(text).toContain('=== RAPPORT DE DIAGNOSTIC NEXUS POS PRO ===');
    expect(text).toContain('• Ce que c\'est');
    expect(text).toContain('• Action Nexus');
  });
});
