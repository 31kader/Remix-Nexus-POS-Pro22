/**
 * Nexus POS Pro — Détecteur d'Alertes de Marge (SmartPurchase / Réceptions)
 * 
 * Analyse en temps réel la marge commerciale entre le prix d'achat fournisseur (HT)
 * et le prix de vente en caisse (TTC) pour prévenir les ventes à perte et l'érosion des marges.
 */

export type MarginAlertLevel = 'CRITICAL_NEGATIVE' | 'WARNING_LOW' | 'SAFE' | 'MISSING_PRICE';

export interface MarginStats {
  costPrice: number;
  sellingPrice: number;
  marginAmount: number;
  marginRate: number; // en % (ex: 25 pour 25%)
  level: MarginAlertLevel;
  badgeLabel: string;
  badgeColor: string;
}

/**
 * Calcule les indicateurs de marge et le niveau de criticité
 */
export function computeMarginStats(
  costPrice: number,
  sellingPrice: number,
  taxRate: number = 19
): MarginStats {
  const safeCost = Math.max(0, Number(costPrice) || 0);
  const safeSelling = Math.max(0, Number(sellingPrice) || 0);

  if (safeSelling <= 0 && safeCost > 0) {
    return {
      costPrice: safeCost,
      sellingPrice: 0,
      marginAmount: -safeCost,
      marginRate: -100,
      level: 'MISSING_PRICE',
      badgeLabel: 'Prix vente non défini',
      badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700'
    };
  }

  // Marge brute simple : Prix Vente - Prix Achat
  const marginAmount = safeSelling - safeCost;
  const marginRate = safeSelling > 0 ? (marginAmount / safeSelling) * 100 : 0;

  if (safeCost > 0 && marginAmount <= 0) {
    return {
      costPrice: safeCost,
      sellingPrice: safeSelling,
      marginAmount,
      marginRate,
      level: 'CRITICAL_NEGATIVE',
      badgeLabel: `⚠️ Vente à perte (${marginRate.toFixed(1)}%)`,
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
    };
  }

  // Alerte marge faible (< 8%)
  if (safeCost > 0 && marginRate < 8) {
    return {
      costPrice: safeCost,
      sellingPrice: safeSelling,
      marginAmount,
      marginRate,
      level: 'WARNING_LOW',
      badgeLabel: `⚠️ Marge faible (${marginRate.toFixed(1)}%)`,
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    };
  }

  return {
    costPrice: safeCost,
    sellingPrice: safeSelling,
    marginAmount,
    marginRate,
    level: 'SAFE',
    badgeLabel: `Marge +${marginRate.toFixed(1)}%`,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };
}

/**
 * Suggère un nouveau prix de vente TTC basé sur le prix d'achat HT et un taux de marge cible
 * @param costPrice Prix d'achat unitaire
 * @param targetMarginRate Taux de marge cible en pourcentage (par défaut 25%)
 * @param roundStep Pas d'arrondi monétaire en DA (par défaut 1 DA ou 5 DA)
 */
export function suggestSellingPrice(
  costPrice: number,
  targetMarginRate: number = 25,
  roundStep: number = 1
): number {
  const safeCost = Math.max(0, Number(costPrice) || 0);
  if (safeCost <= 0) return 0;

  const targetRatio = Math.min(0.9, Math.max(0.01, targetMarginRate / 100));
  // PrixVente = PrixAchat / (1 - Marge)
  const rawPrice = safeCost / (1 - targetRatio);

  if (roundStep <= 0) return Math.round(rawPrice * 100) / 100;
  return Math.ceil(rawPrice / roundStep) * roundStep;
}
