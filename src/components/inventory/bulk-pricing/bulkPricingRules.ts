import { Product } from '../../../types';
import { WholesaleBase, OnlineBase, RoundingMode } from './bulkPricingTypes';

export function applyRounding(val: number, roundingMode: RoundingMode): number {
  if (!isFinite(val) || val < 0) return 0;
  if (roundingMode === '1') return Math.round(val);
  if (roundingMode === '5') return Math.round(val / 5) * 5;
  if (roundingMode === '10') return Math.round(val / 10) * 10;
  return Math.round(val * 100) / 100;
}

export interface PricingRuleConfig {
  enableWholesale: boolean;
  wholesaleBase: WholesaleBase;
  wholesalePercent: string;
  enableOnline: boolean;
  onlineBase: OnlineBase;
  onlinePercent: string;
  roundingMode: RoundingMode;
}

export function computeNewPrices(p: Product, config: PricingRuleConfig): { nextWholesale: number; nextOnline: number } {
  const retail = Number(p.price) || 0;
  const cost = Number(p.costPrice) || 0;
  let nextWholesale = Number(p.wholesalePrice) || 0;
  let nextOnline = Number(p.onlinePrice) || 0;

  if (config.enableWholesale) {
    const pct = parseFloat(config.wholesalePercent) || 0;
    if (config.wholesaleBase === 'retail_discount') {
      nextWholesale = applyRounding(Math.max(0, retail * (1 - pct / 100)), config.roundingMode);
    } else {
      const base = cost > 0 ? cost : retail * 0.8;
      nextWholesale = applyRounding(Math.max(0, base * (1 + pct / 100)), config.roundingMode);
    }
  }

  if (config.enableOnline) {
    const pct = parseFloat(config.onlinePercent) || 0;
    if (config.onlineBase === 'same_as_retail') {
      nextOnline = applyRounding(retail, config.roundingMode);
    } else if (config.onlineBase === 'retail_adjust') {
      nextOnline = applyRounding(Math.max(0, retail * (1 + pct / 100)), config.roundingMode);
    } else {
      const base = cost > 0 ? cost : retail;
      nextOnline = applyRounding(Math.max(0, base * (1 + pct / 100)), config.roundingMode);
    }
  }

  return { nextWholesale, nextOnline };
}
