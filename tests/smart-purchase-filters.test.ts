import { describe, it, expect } from 'vitest';
import { 
  filterPurchases, 
  calculatePurchasesSummary,
  PurchaseFilterOptions 
} from '../src/components/smart-purchase/purchaseHelpers';
import { Purchase } from '../src/types';

describe('🔍 Système de Filtres Avancés & Statistiques des Approvisionnements (SmartPurchase)', () => {
  const mockPurchases: Purchase[] = [
    {
      id: 'pur-001',
      supplierId: 'sup-cevital',
      supplierName: 'CEVITAL AGRO',
      invoiceNumber: 'FAC-CEV-2026-01',
      date: '2026-10-01T10:00:00.000Z',
      total: 50000,
      paidAmount: 50000, // Soldé (reste 0)
      paymentStatus: 'paid',
      status: 'completed',
      notes: 'Livraison huile et sucre',
      items: [
        { productId: 'p1', name: 'Huile Elio 5L', quantity: 20, costPrice: 650 },
        { productId: 'p2', name: 'Sucre Blanc 1kg', quantity: 50, costPrice: 90 }
      ],
      updatedAt: '2026-10-01T10:00:00.000Z'
    },
    {
      id: 'pur-002',
      supplierId: 'sup-cevital',
      supplierName: 'CEVITAL AGRO',
      invoiceNumber: 'FAC-CEV-2026-02',
      date: '2026-10-05T14:30:00.000Z',
      total: 30000,
      paidAmount: 10000, // Partiel (reste 20 000 DA)
      paymentStatus: 'partial',
      status: 'completed',
      notes: 'Acompte versé en espèces',
      items: [
        { productId: 'p1', name: 'Huile Elio 5L', quantity: 15, costPrice: 650 }
      ],
      updatedAt: '2026-10-05T14:30:00.000Z'
    },
    {
      id: 'pur-003',
      supplierId: 'sup-danone',
      supplierName: 'DANONE DJURDJURA',
      invoiceNumber: 'FAC-DAN-99',
      date: '2026-10-08T09:15:00.000Z',
      total: 12000,
      paidAmount: 0, // Impayé (reste 12 000 DA)
      paymentStatus: 'unpaid',
      status: 'completed',
      notes: 'Paiement à 30 jours',
      items: [
        { productId: 'p3', name: 'Yaourt Danino Fraise', quantity: 100, costPrice: 35 }
      ],
      updatedAt: '2026-10-08T09:15:00.000Z'
    },
    {
      id: 'pur-004',
      supplierId: 'sup-ifri',
      supplierName: 'GROUPE IFRI',
      invoiceNumber: 'BR-IFRI-100',
      date: '2026-10-10T11:00:00.000Z',
      total: 25000,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      status: 'ordered', // En commande
      notes: 'Commande en cours de préparation',
      items: [
        { productId: 'p4', name: 'Eau Minérale Ifri 1.5L', quantity: 200, costPrice: 32 }
      ],
      updatedAt: '2026-10-10T11:00:00.000Z'
    },
    {
      id: 'pur-005',
      supplierId: 'sup-ifri',
      supplierName: 'GROUPE IFRI',
      invoiceNumber: 'BR-IFRI-DRAFT',
      date: '2026-10-10T16:00:00.000Z',
      total: 5000,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      status: 'draft', // Brouillon
      items: [],
      updatedAt: '2026-10-10T16:00:00.000Z'
    }
  ];

  it('1. Filtre par Fournisseur spécifique', () => {
    const resCevital = filterPurchases(mockPurchases, { supplierId: 'sup-cevital' });
    expect(resCevital.length).toBe(2);
    expect(resCevital.every(p => p.supplierId === 'sup-cevital')).toBe(true);

    const resDanone = filterPurchases(mockPurchases, { supplierId: 'sup-danone' });
    expect(resDanone.length).toBe(1);
    expect(resDanone[0].invoiceNumber).toBe('FAC-DAN-99');

    const resAll = filterPurchases(mockPurchases, { supplierId: 'all' });
    expect(resAll.length).toBe(5);
  });

  it('2. Filtre par Statut de Paiement (paid, partial, unpaid, debt)', () => {
    // Payé intégralement (Soldé)
    const resPaid = filterPurchases(mockPurchases, { paymentStatus: 'paid' });
    expect(resPaid.length).toBe(1);
    expect(resPaid[0].id).toBe('pur-001');

    // Paiement partiel
    const resPartial = filterPurchases(mockPurchases, { paymentStatus: 'partial' });
    expect(resPartial.length).toBe(1);
    expect(resPartial[0].id).toBe('pur-002');

    // Impayé (0 versé)
    const resUnpaid = filterPurchases(mockPurchases, { paymentStatus: 'unpaid' });
    expect(resUnpaid.length).toBe(3); // pur-003, pur-004, pur-005

    // Avec Dette / Reste à payer (partial + unpaid)
    const resDebt = filterPurchases(mockPurchases, { paymentStatus: 'debt' });
    expect(resDebt.length).toBe(4); // pur-002, pur-003, pur-004, pur-005
    expect(resDebt.some(p => p.id === 'pur-001')).toBe(false);
  });

  it('3. Filtre par Statut de Bon (completed, ordered, draft)', () => {
    const resCompleted = filterPurchases(mockPurchases, { receiptStatus: 'completed' });
    expect(resCompleted.length).toBe(3);

    const resOrdered = filterPurchases(mockPurchases, { receiptStatus: 'ordered' });
    expect(resOrdered.length).toBe(1);
    expect(resOrdered[0].id).toBe('pur-004');

    const resDraft = filterPurchases(mockPurchases, { receiptStatus: 'draft' });
    expect(resDraft.length).toBe(1);
    expect(resDraft[0].id).toBe('pur-005');
  });

  it('4. Filtre par Intervalle de Dates', () => {
    const resOct1to5 = filterPurchases(mockPurchases, {
      startDate: '2026-10-01',
      endDate: '2026-10-05'
    });
    expect(resOct1to5.length).toBe(2);
    expect(resOct1to5.map(p => p.id)).toEqual(['pur-002', 'pur-001']);
  });

  it('5. Filtre par Tranche de Montant (Min / Max DA)', () => {
    const resMin20k = filterPurchases(mockPurchases, { minAmount: 25000 });
    expect(resMin20k.length).toBe(3); // 50k, 30k, 25k

    const resBetween10kAnd30k = filterPurchases(mockPurchases, {
      minAmount: 10000,
      maxAmount: 30000
    });
    expect(resBetween10kAnd30k.length).toBe(3); // 30k, 12k, 25k
  });

  it('6. Recherche textuelle étendue (Fournisseur, Facture, Produits, Notes)', () => {
    // Par nom de produit contenu dans les lignes
    const resYaourt = filterPurchases(mockPurchases, { search: 'Yaourt' });
    expect(resYaourt.length).toBe(1);
    expect(resYaourt[0].id).toBe('pur-003');

    // Par N° de facture
    const resFacture = filterPurchases(mockPurchases, { search: 'FAC-CEV-2026-02' });
    expect(resFacture.length).toBe(1);
    expect(resFacture[0].id).toBe('pur-002');

    // Par notes
    const resNote = filterPurchases(mockPurchases, { search: 'Acompte' });
    expect(resNote.length).toBe(1);
    expect(resNote[0].id).toBe('pur-002');
  });

  it('7. Tris paramétrables (Montant, Reste à payer, Fournisseur A-Z, Date)', () => {
    // Tri par montant décroissant
    const resMontantDesc = filterPurchases(mockPurchases, { sortBy: 'amount-desc' });
    expect(resMontantDesc[0].total).toBe(50000);
    expect(resMontantDesc[resMontantDesc.length - 1].total).toBe(5000);

    // Tri par dette / reste décroissant
    const resDetteDesc = filterPurchases(mockPurchases, { sortBy: 'debt-desc' });
    expect(resDetteDesc[0].id).toBe('pur-004'); // 25 000 DA de dette
    expect(resDetteDesc[1].id).toBe('pur-002'); // 20 000 DA de dette

    // Tri par fournisseur A-Z
    const resSupplierAsc = filterPurchases(mockPurchases, { sortBy: 'supplier-asc' });
    expect(resSupplierAsc[0].supplierName).toBe('CEVITAL AGRO');
    expect(resSupplierAsc[resSupplierAsc.length - 1].supplierName).toBe('GROUPE IFRI');
  });

  it('8. Calcul exact des indicateurs KPI (calculatePurchasesSummary)', () => {
    const summary = calculatePurchasesSummary(mockPurchases);
    expect(summary.count).toBe(5);
    // Totaux : 50000 + 30000 + 12000 + 25000 + 5000 = 122 000 DA
    expect(summary.totalAmount).toBe(122000);
    // Payé : 50000 + 10000 = 60 000 DA
    expect(summary.totalPaid).toBe(60000);
    // Dettes : 0 + 20000 + 12000 + 25000 + 5000 = 62 000 DA
    expect(summary.totalDebt).toBe(62000);
  });

  it('9. Rétrocompatibilité avec l\'ancienne signature à 4 arguments', () => {
    const res = filterPurchases(mockPurchases, 'CEVITAL', '2026-10-01', '2026-10-31');
    expect(res.length).toBe(2);
    expect(res.every(p => p.supplierName.includes('CEVITAL'))).toBe(true);
  });
});
