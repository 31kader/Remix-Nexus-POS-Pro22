import { describe, it, expect } from 'vitest';
import { G50OfficialPdfTemplate } from '../src/services/fiscal/g50OfficialPdfTemplate';
import { ScfExportService } from '../src/services/accounting/scfExportService';
import { G50MonthlySummary } from '../src/services/fiscal/g50ExportService';

describe('Vague 3 : Passerelles Comptables (PC Compta / DLG) & G50 PDF Officiel', () => {
  const mockG50Summary: G50MonthlySummary = {
    year: 2026,
    month: 11,
    periodYear: 2026,
    periodMonth: 11,
    transactionCount: 45,
    salesNormalRateHt: 500000,
    tvaNormalRate: 95000,
    salesReducedRateHt: 100000,
    tvaReducedRate: 9000,
    salesExemptHt: 20000,
    totalSalesHt: 620000,
    totalTvaCollected: 104000,
    totalTvaCollectee: 104000,
    purchasesNormalRateHt: 300000,
    totalTvaDeductible: 57000,
    tvaDeductibleAchats: 57000,
    totalStampDuty: 1450,
    totalSalesTTC: 725450,
    tvaNetToPay: 47000, // 104000 - 57000 = 47000
    // Aliases rétrocompatibles
    baseImposable19: 500000,
    tvaCollectee19: 95000,
    baseImposable9: 100000,
    tvaCollectee9: 9000,
    baseExoneree: 20000,
    totalVenteHT: 620000,
    totalTvaDue: 104000,
    totalAchatHT: 300000,
    tvaDeductible: 57000,
    droitsTimbrePerçus: 1450,
    tvaNetteDue: 47000
  };

  describe('G50OfficialPdfTemplate', () => {
    it('génère un imprimé fiscal officiel conforme avec les en-têtes de la DGI', () => {
      const html = G50OfficialPdfTemplate.generateOfficialG50Html(mockG50Summary, {
        companyName: 'ETS BENALI ET FRERES',
        nif: '001234567890123',
        nis: '19876543210',
        rc: '16/00-123456B20',
        ai: '16012345678',
        wilaya: 'Alger Centre',
        taxInspection: 'Inspection Didouche',
        taxReceiptOffice: 'Recette Didouche Mourad'
      });

      expect(html).toContain('MINISTÈRE DES FINANCES — DIRECTION GÉNÉRALE DES IMPÔTS');
      expect(html).toContain('DÉCLARATION SÉRIE G N° 50 (RÉGIME RÉEL)');
      expect(html).toContain('Novembre 2026');
      expect(html).toContain('ETS BENALI ET FRERES');
      expect(html).toContain('001234567890123');
      expect(html).toContain('500000.00'); // Base 19%
      expect(html).toContain('95000.00'); // TVA 19%
      expect(html).toContain('57000.00'); // TVA Déductible
      expect(html).toContain('47000.00 DA'); // Net à payer
    });
  });

  describe('ScfExportService (Écritures Comptables Algériennes)', () => {
    it('génère des écritures de ventes parfaitement équilibrées (Débit = Crédit)', () => {
      const mockTransactions: any[] = [
        {
          id: 'tx-001',
          date: '2026-11-04T10:00:00.000Z',
          total: 1190, // 1000 HT + 190 TVA
          tax: 190,
          paymentMethod: 'cash',
          status: 'completed'
        },
        {
          id: 'tx-002',
          date: '2026-11-04T11:00:00.000Z',
          total: 2380, // 2000 HT + 380 TVA
          tax: 380,
          paymentMethod: 'card',
          status: 'completed'
        }
      ];

      const entries = ScfExportService.generateSalesJournalEntries(mockTransactions);
      expect(entries.length).toBe(6); // 3 lignes par vente (Débit Trésorerie, Crédit 707, Crédit 4457)

      const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
      const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(3570); // 1190 + 2380

      // Vérifier les comptes utilisés
      expect(entries.some(e => e.accountNumber === '530000')).toBe(true); // Caisse
      expect(entries.some(e => e.accountNumber === '512000')).toBe(true); // Carte
      expect(entries.some(e => e.accountNumber === '707000')).toBe(true); // Vente marchandises
      expect(entries.some(e => e.accountNumber === '445700')).toBe(true); // TVA collectée
    });

    it('génère des écritures d\'achats équilibrées', () => {
      const mockPurchases: any[] = [
        {
          id: 'po-101',
          supplierName: 'Grossiste Laitier',
          total: 59500, // 50000 HT + 9500 TVA
          tax: 9500,
          status: 'completed',
          created_at: '2026-11-02T09:00:00.000Z'
        }
      ];

      const entries = ScfExportService.generatePurchasesJournalEntries(mockPurchases);
      expect(entries.length).toBe(3); // Débit 380, Débit 4456, Crédit 401

      const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
      const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(59500);

      expect(entries.some(e => e.accountNumber === '380000')).toBe(true);
      expect(entries.some(e => e.accountNumber === '445600')).toBe(true);
      expect(entries.some(e => e.accountNumber === '401000')).toBe(true);
    });

    it('formate correctement le fichier d\'export au format standard PC Compta', () => {
      const entries = [
        {
          date: '2026-11-04',
          journalCode: 'VE',
          pieceNumber: 'TX-001',
          accountNumber: '530000',
          label: 'Vente Caisse',
          debit: 1190,
          credit: 0
        },
        {
          date: '2026-11-04',
          journalCode: 'VE',
          pieceNumber: 'TX-001',
          accountNumber: '707000',
          label: 'Vente Marchandises',
          debit: 0,
          credit: 1000
        }
      ];

      const pcComptaTxt = ScfExportService.exportPcComptaFormat(entries);
      expect(pcComptaTxt).toContain('20261104;VE;530000;Vente Caisse;1190.00;;TX-001');
      expect(pcComptaTxt).toContain('20261104;VE;707000;Vente Marchandises;;1000.00;TX-001');
    });
  });
});
