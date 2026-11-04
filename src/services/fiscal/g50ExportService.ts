/**
 * 📊 Service d'Export et Agrégation de Déclaration Fiscale G50 (Algérie)
 * Calcule pour un mois donné les bases imposables, TVA collectée (19% & 9%),
 * TVA déductible sur réceptions fournisseurs et droits de timbre.
 */

import { Transaction } from '../../types';
import { computeTaxBreakdown } from './algerianTaxCalculations';

export interface G50MonthlySummary {
  periodMonth: number;
  periodYear: number;
  totalSalesTTC: number;
  baseImposable19: number;
  tvaCollectee19: number;
  baseImposable9: number;
  tvaCollectee9: number;
  baseExoneree: number;
  droitsTimbrePerçus: number;
  totalVenteHT: number;
  totalTvaCollectee: number;
  tvaDeductibleAchats: number;
  tvaNetteDue: number;
  transactionCount: number;
}

export function computeG50SummaryForPeriod(
  transactions: Transaction[],
  purchases: Array<{ total: number; timestamp?: string }> = [],
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): G50MonthlySummary {
  const filteredSales = transactions.filter(t => {
    if (!t.timestamp) return false;
    const d = new Date(t.timestamp);
    return d.getFullYear() === year && (d.getMonth() + 1) === month && t.status !== 'cancelled';
  });

  let totalSalesTTC = 0;
  let baseImposable19 = 0;
  let tvaCollectee19 = 0;
  let baseImposable9 = 0;
  let tvaCollectee9 = 0;
  let baseExoneree = 0;
  let droitsTimbrePerçus = 0;

  for (const tx of filteredSales) {
    const breakdown = computeTaxBreakdown(
      (tx.items || []).map(i => ({
        price: i.price,
        quantity: i.quantity,
        taxRate: (i as any).taxRate ?? 19
      })),
      tx.paymentMethod,
      tx.discountAmount || 0
    );

    totalSalesTTC += breakdown.totalTTC;
    baseImposable19 += breakdown.base19;
    tvaCollectee19 += breakdown.vat19;
    baseImposable9 += breakdown.base9;
    tvaCollectee9 += breakdown.vat9;
    baseExoneree += breakdown.baseExempt;
    droitsTimbrePerçus += breakdown.stampDuty;
  }

  // Calcul TVA déductible sur les achats de la même période
  const filteredPurchases = purchases.filter(p => {
    if (!p.timestamp) return false;
    const d = new Date(p.timestamp);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });

  const totalPurchasesTTC = filteredPurchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const tvaDeductibleAchats = Math.round((totalPurchasesTTC - (totalPurchasesTTC / 1.19)) * 100) / 100;

  const totalVenteHT = Math.round((baseImposable19 + baseImposable9 + baseExoneree) * 100) / 100;
  const totalTvaCollectee = Math.round((tvaCollectee19 + tvaCollectee9) * 100) / 100;
  const tvaNetteDue = Math.max(0, Math.round((totalTvaCollectee - tvaDeductibleAchats) * 100) / 100);

  return {
    periodMonth: month,
    periodYear: year,
    totalSalesTTC: Math.round(totalSalesTTC * 100) / 100,
    baseImposable19: Math.round(baseImposable19 * 100) / 100,
    tvaCollectee19: Math.round(tvaCollectee19 * 100) / 100,
    baseImposable9: Math.round(baseImposable9 * 100) / 100,
    tvaCollectee9: Math.round(tvaCollectee9 * 100) / 100,
    baseExoneree: Math.round(baseExoneree * 100) / 100,
    droitsTimbrePerçus: Math.round(droitsTimbrePerçus * 100) / 100,
    totalVenteHT,
    totalTvaCollectee,
    tvaDeductibleAchats,
    tvaNetteDue,
    transactionCount: filteredSales.length
  };
}

/**
 * Génère le fichier CSV pour le comptable / expert fiscal
 */
export function generateG50Csv(summary: G50MonthlySummary): string {
  const lines = [
    'Rubrique G50;Base Imposable (DA);Taux (%);Montant Dû (DA)',
    `Chiffre d'Affaires Brut TTC;${summary.totalSalesTTC.toFixed(2)};-;${summary.totalSalesTTC.toFixed(2)}`,
    `Ventes soumises au taux normal;${summary.baseImposable19.toFixed(2)};19%;${summary.tvaCollectee19.toFixed(2)}`,
    `Ventes soumises au taux reduit;${summary.baseImposable9.toFixed(2)};9%;${summary.tvaCollectee9.toFixed(2)}`,
    `Operations exonerees ou franchise;${summary.baseExoneree.toFixed(2)};0%;0.00`,
    `TOTAL TVA COLLECTEE;${(summary.baseImposable19 + summary.baseImposable9).toFixed(2)};-;${summary.totalTvaCollectee.toFixed(2)}`,
    `TVA Deductible sur Achats de Biens/Services;${summary.tvaDeductibleAchats.toFixed(2)};-;${summary.tvaDeductibleAchats.toFixed(2)}`,
    `TVA NETTE A PAYER (Cadre Impots);-;-;${summary.tvaNetteDue.toFixed(2)}`,
    `Droits de Timbre percus (Reglements Especes);${summary.droitsTimbrePerçus.toFixed(2)};1%;${summary.droitsTimbrePerçus.toFixed(2)}`
  ];
  return lines.join('\n');
}
