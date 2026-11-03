import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  BanknoteDenominations,
  SimulatedCashShift,
  SimulatedShiftExpense,
  calculateDenominationsTotal,
  openNewCashShift,
  buildShiftTransactions,
  buildShiftExpenses,
  calculateExpectedCash,
  evaluateCashDiscrepancy,
  closeCashShift,
  updateZReportReportStep
} from './cashShiftZReportSimulationHelpers';

describe('🧾 SIMULATION CLÔTURE DE CAISSE (RAPPORT Z), COUPURES & ÉCARTS', () => {
  const reportPath = path.resolve('SIMULATION_RAPPORT_Z_GESTION_CAISSE_RAPPORT.md');

  let activeShift: SimulatedCashShift;
  let initialDenominations: BanknoteDenominations;
  let shiftTransactions: any[] = [];
  let totalSales = 0;
  let totalCashSales = 0;
  let totalCardSales = 0;
  let totalCreditSales = 0;

  let shiftExpenses: SimulatedShiftExpense[] = [];
  let totalExpenses = 0;
  let expectedCash = 0;
  let closedShift: SimulatedCashShift;

  beforeAll(() => {
    // Dotation initiale : 10x2000 + 5x1000 + 8x500 + 5x200 = 30 000 DA
    initialDenominations = {
      b2000: 10,
      b1000: 5,
      b500: 8,
      c200: 5,
      c100: 0,
      c50: 0
    };
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 0 : OUVERTURE DE SHIFT & DOTATION FOND DE CAISSE
  // --------------------------------------------------------------------------
  it('Étape 0 : Ouverture de session de caisse avec dotation initiale de 30 000 DA en coupures DZD', () => {
    const initialFloat = calculateDenominationsTotal(initialDenominations);
    expect(initialFloat).toBe(30000.00);

    activeShift = openNewCashShift('Karim Benali (Caissier Chef)', initialDenominations);

    expect(activeShift.status).toBe('open');
    expect(activeShift.initialCash).toBe(30000.00);
    expect(activeShift.terminalId).toBe('TERM-POS-01');

    updateZReportReportStep(
      reportPath,
      0,
      '✅ Validé',
      `Session de caisse ouverte (#${activeShift.id}) sur le terminal ${activeShift.terminalName}. Fond de caisse initial : 30 000.00 DA (10x2000 DA, 5x1000 DA, 8x500 DA, 5x200 DA).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 1 : VENTES MULTI-MOYENS DE PAIEMENT DU SHIFT
  // --------------------------------------------------------------------------
  it('Étape 1 : Enregistrement de 30 transactions multi-modes pour un CA total de 240 000 DA', () => {
    const txData = buildShiftTransactions();
    shiftTransactions = txData.transactions;
    totalSales = txData.totalSales;
    totalCashSales = txData.totalCashSales;
    totalCardSales = txData.totalCardSales;
    totalCreditSales = txData.totalCreditSales;

    expect(shiftTransactions).toHaveLength(30);
    expect(totalCashSales).toBe(145000.00);
    expect(totalCardSales).toBe(65000.00);
    expect(totalCreditSales).toBe(30000.00);
    expect(totalSales).toBe(240000.00);

    updateZReportReportStep(
      reportPath,
      1,
      '✅ Validé',
      `30 ventes encaissées (CA : ${totalSales.toLocaleString('fr-FR')} DA). Ventilation : Espèces (${totalCashSales.toLocaleString('fr-FR')} DA), Carte CIB (${totalCardSales.toLocaleString('fr-FR')} DA), Crédit Client (${totalCreditSales.toLocaleString('fr-FR')} DA).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 2 : MOUVEMENTS DE TRÉSORERIE SORTANTS (DÉPENSES & COFFRE)
  // --------------------------------------------------------------------------
  it('Étape 2 : Mouvements de trésorerie sortants (dépenses d\'exploitation & transfert coffre)', () => {
    const expData = buildShiftExpenses();
    shiftExpenses = expData.expenses;
    totalExpenses = expData.totalExpenses;

    expect(shiftExpenses).toHaveLength(3);
    expect(totalExpenses).toBe(55000.00);

    // 2 dépenses comptoir (5 000 DA) + 1 transfert sécurité coffre (50 000 DA)
    const directExpenses = shiftExpenses.filter(e => e.category !== 'Transfert Coffre-Fort').reduce((s, e) => s + e.amount, 0);
    const safeTransfer = shiftExpenses.find(e => e.category === 'Transfert Coffre-Fort')!.amount;

    expect(directExpenses).toBe(5000.00);
    expect(safeTransfer).toBe(50000.00);

    updateZReportReportStep(
      reportPath,
      2,
      '✅ Validé',
      `3 sorties d'espèces enregistrées (-${totalExpenses.toLocaleString('fr-FR')} DA) : 2 dépenses d'exploitation (5 000 DA) et 1 écrémage de sécurité vers le coffre-fort central (50 000 DA).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 3 : CALCUL ARITHMÉTIQUE DE L'ATTENDU EN CAISSE
  // --------------------------------------------------------------------------
  it('Étape 3 : Calcul arithmétique de l\'attendu théorique en tiroir-caisse (120 000 DA)', () => {
    expectedCash = calculateExpectedCash(activeShift.initialCash, totalCashSales, totalExpenses);

    // 30 000 + 145 000 - 55 000 = 120 000.00 DA
    expect(expectedCash).toBe(120000.00);

    updateZReportReportStep(
      reportPath,
      3,
      '✅ Validé',
      `Formule Nexus POS validée : Fond (${activeShift.initialCash.toLocaleString('fr-FR')} DA) + Espèces (${totalCashSales.toLocaleString('fr-FR')} DA) - Dépenses (${totalExpenses.toLocaleString('fr-FR')} DA) = ${expectedCash.toLocaleString('fr-FR')} DA attendus en tiroir.`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 4 : COMPTAGE PAR COUPURES & QUALIFICATION DES ÉCARTS
  // --------------------------------------------------------------------------
  it('Étape 4 : Détection de mali (-350 DA), de boni (+200 DA) et réconciliation exacte', () => {
    // 1. Test Mali de Caisse (-350 DA)
    const shortageCheck = evaluateCashDiscrepancy(expectedCash, 119650.00);
    expect(shortageCheck.status).toBe('shortage');
    expect(shortageCheck.diff).toBe(-350.00);

    // 2. Test Boni de Caisse (+200 DA)
    const surplusCheck = evaluateCashDiscrepancy(expectedCash, 120200.00);
    expect(surplusCheck.status).toBe('surplus');
    expect(surplusCheck.diff).toBe(200.00);

    // 3. Comptage Physique Réconcilié par Coupures Exactes
    // 45x2000 (90k) + 20x1000 (20k) + 16x500 (8k) + 10x200 (2k) = 120 000.00 DA
    const closingDenominations: BanknoteDenominations = {
      b2000: 45,
      b1000: 20,
      b500: 16,
      c200: 10,
      c100: 0,
      c50: 0
    };
    const physicalCount = calculateDenominationsTotal(closingDenominations);
    expect(physicalCount).toBe(120000.00);

    const balancedCheck = evaluateCashDiscrepancy(expectedCash, physicalCount);
    expect(balancedCheck.status).toBe('balanced');
    expect(balancedCheck.diff).toBe(0.00);

    updateZReportReportStep(
      reportPath,
      4,
      '✅ Validé',
      `Mali (-350 DA) et Boni (+200 DA) qualifiés. Comptage physique final certifié par coupures réelles : 45x2000 DA, 20x1000 DA, 16x500 DA, 10x200 DA = ${physicalCount.toLocaleString('fr-FR')} DA (Écart : 0.00 DA).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 5 : CLÔTURE DÉFINITIVE DU SHIFT & ÉMISSION RAPPORT Z
  // --------------------------------------------------------------------------
  it('Étape 5 : Clôture définitive du shift, émission du rapport Z et équilibre parfait (0.00 DA)', () => {
    closedShift = closeCashShift(
      activeShift,
      120000.00,
      expectedCash,
      totalSales,
      totalCashSales,
      totalCardSales,
      totalExpenses,
      'Karim Benali (Caissier Chef)',
      'Clôture journalière conforme, transfert coffre-fort vérifié.'
    );

    expect(closedShift.status).toBe('closed');
    expect(closedShift.finalCash).toBe(120000.00);
    expect(closedShift.expectedCash).toBe(120000.00);
    expect(closedShift.closedAt).toBeDefined();

    const finalDiscrepancy = (closedShift.finalCash || 0) - (closedShift.expectedCash || 0);
    expect(finalDiscrepancy).toBe(0.00);

    const extraSummary = `## 📊 Synthèse Finale Officielle du Rapport Z (Clôture de Caisse)

### 1. Données de Session & Terminal
- **Session de Caisse** : **#${closedShift.id}**.
- **Terminal Affecté** : **${closedShift.terminalName}** (\`${closedShift.terminalId}\`).
- **Opérateur de Caisse** : **${closedShift.closedBy}**.
- **Statut de Clôture** : **FERMÉ & VERROUILLÉ (\`status: closed\`)**.

### 2. Répartition du Chiffre d'Affaires Encaissé
| Mode d'Encaissement | Nombre de Ventes | Chiffre d'Affaires | Impact Tiroir-Caisse |
| :--- | :---: | :---: | :--- |
| **Espèces (\`cash\`)** | 18 ventes | **${totalCashSales.toLocaleString('fr-FR')} DA** | Encaissé directement dans le tiroir |
| **Carte CIB / TPE (\`card\`)** | 8 ventes | **${totalCardSales.toLocaleString('fr-FR')} DA** | Transmis au compte bancaire |
| **Vente à Crédit / Solde (\`balance\`)** | 4 ventes | **${totalCreditSales.toLocaleString('fr-FR')} DA** | Imputé sur les comptes clients |
| **CHIFFRE D'AFFAIRES GLOBAL** | **30 ventes** | **${totalSales.toLocaleString('fr-FR')} DA** | **TVA 19% incluse** |

### 3. Mouvements de Trésorerie du Shift (Cash-In / Cash-Out)
- **Fond de Caisse d'Ouverture** : **${activeShift.initialCash.toLocaleString('fr-FR')} DA** (10x2000, 5x1000, 8x500, 5x200 DA).
- **(+) Total Ventes en Espèces** : **+${totalCashSales.toLocaleString('fr-FR')} DA**.
- **(-) Dépenses de Fonctionnement Comptoir** : **-5 000.00 DA** (Entretien 3 500 DA, Coursier 1 500 DA).
- **(-) Écrémage de Sécurité vers Coffre-Fort** : **-50 000.00 DA** (Transfert sécurisé).
- **(=) TOTAL ATTENDU EN TIROIR-CAISSE** : **${expectedCash.toLocaleString('fr-FR')} DA**.

### 4. Bilan du Comptage Physique de Clôture (Dinar Algérien)
| Coupure / Dénomination | Quantité Comptée | Valeur Cumulée |
| :--- | :---: | :---: |
| **Billets de 2 000 DA** | 45 billets | **90 000.00 DA** |
| **Billets de 1 000 DA** | 20 billets | **20 000.00 DA** |
| **Billets de 500 DA** | 16 billets | **8 000.00 DA** |
| **Pièces de 200 DA** | 10 pièces | **2 000.00 DA** |
| **TOTAL PHYSIQUE COMPTÉ** | **91 coupures** | **120 000.00 DA** |

### 5. Rapprochement Final du Rapport Z
- **Solde Théorique Attendu en Caisse** : **${expectedCash.toLocaleString('fr-FR')} DA**
- **Solde Physique Réel Compté** : **${closedShift.finalCash?.toLocaleString('fr-FR')} DA**
- **Écart de Caisse Constaté** : **0.00 DA (Équilibre Absolu)**.`;

    updateZReportReportStep(
      reportPath,
      5,
      '✅ Validé',
      `Session #${closedShift.id} clôturée avec succès. Rapport Z émis et archivé. Écart constaté : 0.00 DA. Rapport officiel généré.`,
      extraSummary
    );
  });
});
