import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EscPosBuilder, buildReceiptEscPos, printViaNetworkEscPos, sendEscPosToPrinter } from '../src/services/escposPrintService';
import { buildDiagnosticSelfTestTicket } from '../src/services/escposDiagnosticService';
import {
  getPrinterHardwareConfig,
  savePrinterHardwareConfig,
  testNetworkPrinterConnection,
  printDirectTicket,
  triggerCashDrawer
} from '../src/services/hardwareService';
import { Transaction, CompanySettings } from '../src/types';

describe('🖨️ Pilote Matériel Direct ESC/POS & Tiroir-Caisse RJ11', () => {
  const dummySettings: CompanySettings = {
    name: 'SUPERETTE EL BAHIA',
    address: '12 Rue Larbi Ben Mhidi, Alger',
    phone: '0555 12 34 56',
    taxNumber: '123456789000123',
    currency: 'DA',
    taxRate: 19,
    labelTemplate: 'standard',
    loyaltyPointsPerCurrencyUnit: 1,
    loyaltyPointValue: 1,
    paperFormat: '80mm',
    footerText: 'Merci pour votre confiance !',
    receiptTemplate: 'standard'
  };

  const dummyTransaction: Transaction = {
    id: 'tx-2026-escpos-001',
    timestamp: '2026-11-04T10:00:00.000Z',
    userId: 'user-amina',
    employeeName: 'Amina',
    items: [
      { id: 'item-1', name: 'Lait Soummam 1L', price: 120, quantity: 2 },
      { id: 'item-2', name: 'Huile Elio 5L', price: 650, quantity: 1 }
    ] as any,
    total: 890,
    amountReceived: 1000,
    amountReturned: 110,
    paymentMethod: 'cash',
    status: 'completed'
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Générateur d\'Opcodes ESC/POS (EscPosBuilder)', () => {
    it('initialise correctement l\'imprimante avec ESC @ (0x1B 0x40)', () => {
      const builder = new EscPosBuilder('80mm');
      const bytes = builder.getBytes();
      expect(bytes[0]).toBe(0x1b);
      expect(bytes[1]).toBe(0x40);
    });

    it('génère les commandes d\'alignement gauche, centre, droite', () => {
      const builder = new EscPosBuilder('80mm');
      builder.align('center');
      const bytes = builder.getBytes();
      // ESC @ puis ESC a 1
      expect(Array.from(bytes.slice(2, 5))).toEqual([0x1b, 0x61, 0x01]);
    });

    it('génère la commande d\'impulsion tiroir-caisse RJ11 (ESC p 0 25 250)', () => {
      const builder = new EscPosBuilder('80mm');
      builder.openDrawer();
      const bytes = builder.getBytes();
      expect(Array.from(bytes.slice(2, 7))).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    });

    it('génère la commande de découpe papier automatique (GS V 1)', () => {
      const builder = new EscPosBuilder('80mm');
      builder.cut();
      const bytes = builder.getBytes();
      // Feed puis GS V 1
      const cutSeq = [0x1d, 0x56, 0x01];
      const strBytes = Array.from(bytes);
      const index = strBytes.findIndex((_, i) =>
        strBytes[i] === cutSeq[0] && strBytes[i + 1] === cutSeq[1] && strBytes[i + 2] === cutSeq[2]
      );
      expect(index).toBeGreaterThanOrEqual(0);
    });

    it('génère les octets d\'un code-barres Code39 et d\'un QR Code standard ESC/POS', () => {
      const builder = new EscPosBuilder('80mm');
      builder.barcode('123456');
      builder.qrCode('https://nexuspos.dz');
      const bytes = builder.getBytes();

      // GS k 4 (Code 39)
      expect(Array.from(bytes)).toEqual(expect.arrayContaining([0x1d, 0x6b, 0x04]));
      // Modèle 2 QR Code : GS ( k 4 0 49 65 50 0
      expect(Array.from(bytes)).toEqual(expect.arrayContaining([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));
    });
  });

  describe('2. Construction de Ticket de Vente (buildReceiptEscPos)', () => {
    it('construit un flux binaire complet pour un ticket 80mm', () => {
      const ticketBytes = buildReceiptEscPos(dummyTransaction, dummySettings, {
        paperWidth: '80mm',
        openDrawer: true,
        cutPaper: true
      });

      expect(ticketBytes.length).toBeGreaterThan(100);
      const text = new TextDecoder('latin1').decode(ticketBytes);
      expect(text).toContain('SUPERETTE EL BAHIA');
      expect(text).toContain('Lait Soummam 1L');
      expect(text).toContain('TOTAL:');
      expect(text).toContain('890.00 DA');
    });

    it('adapte correctement la mise en page pour le format 58mm', () => {
      const settings58mm = { ...dummySettings, paperFormat: '60mm' as const };
      const ticketBytes = buildReceiptEscPos(dummyTransaction, settings58mm);
      expect(ticketBytes.length).toBeGreaterThan(100);
      const text = new TextDecoder('latin1').decode(ticketBytes);
      expect(text).toContain('Lait Soummam 1L');
    });
  });

  describe('3. Ticket de Diagnostic et d\'Auto-Test (buildDiagnosticSelfTestTicket)', () => {
    it('génère le ticket complet de contrôle technique avec versions et styles', () => {
      const diagBytes = buildDiagnosticSelfTestTicket(dummySettings, {
        terminalId: 'POS-01',
        terminalName: 'Caisse Principale',
        ipAddress: '192.168.1.150',
        port: 9100,
        openDrawer: true,
        cutPaper: true
      });

      expect(diagBytes.length).toBeGreaterThan(200);
      const text = new TextDecoder('latin1').decode(diagBytes);
      expect(text).toContain('AUTO-TEST MATERIEL');
      expect(text).toContain('POS-01');
      expect(text).toContain('192.168.1.150:9100');
      expect(text).toContain('TEST STYLES & POLICES');
      expect(text).toContain('CONTROLE TECHNIQUE REUSSI');
    });
  });

  describe('4. Gestion de la Configuration Matérielle (hardwareService)', () => {
    it('charge la configuration par défaut puis sauvegarde les mises à jour', () => {
      const initial = getPrinterHardwareConfig();
      expect(initial.mode).toBe('system');
      expect(initial.networkPort).toBe(9100);

      const updated = savePrinterHardwareConfig({
        mode: 'network',
        networkIp: '192.168.1.250',
        networkPort: 9100
      });

      expect(updated.mode).toBe('network');
      expect(updated.networkIp).toBe('192.168.1.250');

      const reloaded = getPrinterHardwareConfig();
      expect(reloaded.mode).toBe('network');
      expect(reloaded.networkIp).toBe('192.168.1.250');
    });

    it('déclenche le tiroir physique avec succès sans erreur', async () => {
      const res = await triggerCashDrawer({ force: true });
      expect(res.success).toBe(true);
      expect(res.message).toBeDefined();
    });
  });

  describe('5. Communication Réseau ESC/POS (Mocks API)', () => {
    it('gère le succès de l\'impression réseau via /api/hardware/print-escpos', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Données ESC/POS transmises avec succès à l\'imprimante thermique',
          bytesSent: 150
        })
      });

      const res = await printViaNetworkEscPos(new Uint8Array([0x1b, 0x40]), '192.168.1.200', 9100);
      expect(res.success).toBe(true);
      expect(res.message).toContain('Données ESC/POS transmises');
    });

    it('gère les erreurs et timeouts de connexion réseau', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
        json: async () => ({
          success: false,
          error: 'Délai d\'attente dépassé (2500ms)'
        })
      });

      const res = await testNetworkPrinterConnection('192.168.1.240', 9100);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Délai d\'attente dépassé');
    });

    it('route correctement selon le mode d\'impression configuré', async () => {
      savePrinterHardwareConfig({ mode: 'network', networkIp: '192.168.1.200' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Imprimé sur le réseau' })
      });

      const res = await printDirectTicket(new Uint8Array([0x1b, 0x40]));
      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
