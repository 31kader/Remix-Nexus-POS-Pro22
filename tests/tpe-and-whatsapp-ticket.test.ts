import { describe, it, expect, beforeEach } from 'vitest';
import {
  TpeConcertationProtocol,
  TpeTransactionRequest
} from '../src/services/fintech/tpeConcertationProtocol';
import { TpeDriverService } from '../src/services/fintech/tpeDriverService';
import { WhatsappTicketService } from '../src/services/whatsapp/whatsappTicketService';
import { CustomerDebtStatementService } from '../src/services/customers/customerDebtStatementService';

describe('Vague 2 : TPE Bancaire CIB / SATIM & E-Ticket WhatsApp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('TpeConcertationProtocol (CB2A)', () => {
    it('construit une trame de débit valide selon la norme Concertation', () => {
      const req: TpeTransactionRequest = {
        posId: '01',
        amountCentimes: 250000, // 2500.00 DA
        currencyCode: '012' // DZD
      };

      const frame = TpeConcertationProtocol.buildDebitFrame(req);
      expect(frame[0]).toBe(0x02); // STX
      expect(frame[frame.length - 2]).toBe(0x03); // ETX

      // Décodage payload : 01 (posId) + 0 (debit) + 00250000 (amount) + 012 (currency)
      const payloadStr = new TextDecoder('ascii').decode(frame.slice(1, frame.length - 2));
      expect(payloadStr).toBe('01000250000012');

      // Vérification du LRC
      const expectedLrc = TpeConcertationProtocol.calculateLrc(frame.slice(1, frame.length - 1));
      expect(frame[frame.length - 1]).toBe(expectedLrc);
    });

    it('analyse une trame de réponse TPE approuvée (Code 00)', () => {
      // Trame de succès: STX + "0100002500008899001234" + ETX + LRC
      const payload = '0100002500008899001234';
      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(payload);

      const frame = new Uint8Array(1 + payloadBytes.length + 1 + 1);
      frame[0] = 0x02;
      frame.set(payloadBytes, 1);
      frame[frame.length - 2] = 0x03;

      const forLrc = new Uint8Array(payloadBytes.length + 1);
      forLrc.set(payloadBytes, 0);
      forLrc[payloadBytes.length] = 0x03;
      frame[frame.length - 1] = TpeConcertationProtocol.calculateLrc(forLrc);

      const res = TpeConcertationProtocol.parseResponseFrame(frame);
      expect(res.isApproved).toBe(true);
      expect(res.responseCode).toBe('00');
      expect(res.amountCentimes).toBe(250000);
      expect(res.authorizationNumber).toBe('889900');
      expect(res.cardPanMasked).toBe('**** **** **** 1234');
    });

    it('rejette une trame corrompue avec LRC invalide', () => {
      const payload = '0100002500008899001234';
      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(payload);

      const frame = new Uint8Array(1 + payloadBytes.length + 1 + 1);
      frame[0] = 0x02;
      frame.set(payloadBytes, 1);
      frame[frame.length - 2] = 0x03;
      frame[frame.length - 1] = 0xFF; // Faux LRC

      const res = TpeConcertationProtocol.parseResponseFrame(frame);
      expect(res.isApproved).toBe(false);
      expect(res.responseCode).toBe('ERR_LRC');
    });
  });

  describe('TpeDriverService', () => {
    it('exécute une transaction en mode simulation et retourne une réponse valide', async () => {
      TpeDriverService.saveConfig({ mode: 'simulation' });
      const updates: string[] = [];

      const res = await TpeDriverService.requestPayment(1500, (status) => {
        updates.push(status);
      });

      expect(res.isApproved).toBe(true);
      expect(res.responseCode).toBe('00');
      expect(res.amountCentimes).toBe(150000);
      expect(res.authorizationNumber).toBeDefined();
      expect(updates.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('WhatsappTicketService', () => {
    it('formate correctement les numéros de téléphone algériens en +213', () => {
      expect(WhatsappTicketService.formatAlgerianPhone('0550 12 34 56')).toBe('213550123456');
      expect(WhatsappTicketService.formatAlgerianPhone('0661-88-99-00')).toBe('213661889900');
      expect(WhatsappTicketService.formatAlgerianPhone('+213 770 11 22 33')).toBe('213770112233');
      expect(WhatsappTicketService.formatAlgerianPhone('770112233')).toBe('213770112233');
    });

    it('génère un message WhatsApp complet et un lien wa.me valide', () => {
      const msg = WhatsappTicketService.formatTicketMessage({
        transactionId: 'tx-2026-abcdef',
        storeName: 'SUPERETTE EL KHEIR',
        storePhone: '023 50 10 20',
        items: [
          { name: 'Huile Afia 5L', quantity: 1, price: 650 },
          { name: 'Couscous Sim 1kg', quantity: 2, price: 95 }
        ],
        totalAmount: 840,
        paymentMethod: 'card'
      });

      expect(msg).toContain('SUPERETTE EL KHEIR');
      expect(msg).toContain('Carte CIB / Dahabia');
      expect(msg).toContain('Huile Afia 5L');
      expect(msg).toContain('840.00 DA');

      const url = WhatsappTicketService.buildWhatsAppUrl('0550112233', msg);
      expect(url.startsWith('https://wa.me/213550112233?text=')).toBe(true);
      expect(url).toContain(encodeURIComponent('SUPERETTE EL KHEIR'));
    });
  });

  describe('CustomerDebtStatementService', () => {
    it('calcule la dette client et génère un relevé HTML & rappel WhatsApp', () => {
      const mockCustomer: any = {
        id: 'cust-1',
        name: 'Mohamed Grossiste',
        phone: '0555123456',
        balance: 14500,
        creditLimit: 50000
      };

      const mockTransactions: any[] = [
        { id: 'tx-1', customerId: 'cust-1', total: 10000, paymentMethod: 'balance', status: 'completed' },
        { id: 'tx-2', customerId: 'cust-1', total: 4500, paymentMethod: 'balance', status: 'completed' }
      ];

      const summary = CustomerDebtStatementService.computeDebtSummary(mockCustomer, mockTransactions);
      expect(summary.currentBalance).toBe(14500);
      expect(summary.unpaidTransactions).toHaveLength(2);

      const html = CustomerDebtStatementService.generateStatementHtml(summary, 'NEXUS SARL');
      expect(html).toContain('Mohamed Grossiste');
      expect(html).toContain('14500.00 DA');
      expect(html).toContain('RELEVÉ DE DETTES & CRÉDITS');

      const waReminder = CustomerDebtStatementService.formatDebtReminderWhatsApp(summary, 'NEXUS SARL');
      expect(waReminder).toContain('Mohamed Grossiste');
      expect(waReminder).toContain('14500.00 DA');
    });
  });
});
