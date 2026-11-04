/**
 * 🇩🇿 Calculs Fiscaux Algériens & Conversion en Toutes Lettres
 * Conforme au Code des Impôts Directs et du Timbre (TVA 19% & 9%, Droit de timbre).
 */

export interface TaxBreakdownResult {
  base19: number;
  vat19: number;
  base9: number;
  vat9: number;
  baseExempt: number;
  totalHT: number;
  totalVAT: number;
  stampDuty: number;
  totalTTC: number;
}

/**
 * Calcule le Droit de Timbre fiscal algérien pour les règlements en espèces.
 * Barème officiel : 1% de la somme totale à payer (arrondi),
 * avec un minimum légal de 5 DA et un plafond de 2 500 DA.
 */
export function computeAlgerianStampDuty(amountTTC: number, paymentMethod: string): number {
  if (paymentMethod !== 'cash' || amountTTC <= 0) return 0;
  const rawDuty = Math.ceil(amountTTC * 0.01);
  return Math.min(2500, Math.max(5, rawDuty));
}

/**
 * Ventile un panier ou une facture selon les taux de TVA algériens (19% et 9%)
 */
export function computeTaxBreakdown(
  items: Array<{ price: number; quantity: number; taxRate?: number }>,
  paymentMethod: string = 'cash',
  discountAmount: number = 0,
  defaultTaxRate: number = 0
): TaxBreakdownResult {
  let base19 = 0;
  let vat19 = 0;
  let base9 = 0;
  let vat9 = 0;
  let baseExempt = 0;

  for (const item of items) {
    const lineTotalTTC = (item.price || 0) * (item.quantity || 1);
    const rate = Number(item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : defaultTaxRate);

    if (rate === 19) {
      const lineHT = lineTotalTTC / 1.19;
      base19 += lineHT;
      vat19 += (lineTotalTTC - lineHT);
    } else if (rate === 9) {
      const lineHT = lineTotalTTC / 1.09;
      base9 += lineHT;
      vat9 += (lineTotalTTC - lineHT);
    } else if (rate > 0) {
      const lineHT = lineTotalTTC / (1 + rate / 100);
      base19 += lineHT;
      vat19 += (lineTotalTTC - lineHT);
    } else {
      baseExempt += lineTotalTTC;
    }
  }

  // Application de la remise globale proportionnellement
  const subtotalTTC = (base19 + vat19) + (base9 + vat9) + baseExempt;
  if (discountAmount > 0 && subtotalTTC > 0) {
    const ratio = Math.max(0, (subtotalTTC - discountAmount)) / subtotalTTC;
    base19 *= ratio;
    vat19 *= ratio;
    base9 *= ratio;
    vat9 *= ratio;
    baseExempt *= ratio;
  }

  const totalHT = base19 + base9 + baseExempt;
  const totalVAT = vat19 + vat9;
  const netTTC = totalHT + totalVAT;
  const stampDuty = computeAlgerianStampDuty(netTTC, paymentMethod);
  const totalTTC = netTTC + stampDuty;

  return {
    base19: Math.round(base19 * 100) / 100,
    vat19: Math.round(vat19 * 100) / 100,
    base9: Math.round(base9 * 100) / 100,
    vat9: Math.round(vat9 * 100) / 100,
    baseExempt: Math.round(baseExempt * 100) / 100,
    totalHT: Math.round(totalHT * 100) / 100,
    totalVAT: Math.round(totalVAT * 100) / 100,
    stampDuty,
    totalTTC: Math.round(totalTTC * 100) / 100
  };
}

/**
 * Convertit un nombre en toutes lettres en français (Dinars Algériens)
 */
export function numberToWordsAlgerianDZD(amount: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    let str = '';
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;

    if (hundreds > 0) {
      if (hundreds === 1) {
        str += 'cent ';
      } else {
        str += units[hundreds] + (rem === 0 ? ' cents ' : ' cent ');
      }
    }

    if (rem > 0) {
      if (rem < 10) {
        str += units[rem];
      } else if (rem < 20) {
        str += teens[rem - 10];
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        if (t === 7) {
          str += 'soixante-' + (u === 1 ? 'et-onze' : teens[u]);
        } else if (t === 9) {
          str += 'quatre-vingt-' + teens[u];
        } else {
          str += tens[t] + (u === 1 ? ' et un' : (u > 1 ? '-' + units[u] : ''));
        }
      }
    }
    return str.trim();
  }

  const rounded = Math.floor(Math.abs(amount));
  if (rounded === 0) return 'Zéro Dinar Algérien';

  let result = '';
  const millions = Math.floor(rounded / 1000000);
  const thousands = Math.floor((rounded % 1000000) / 1000);
  const remainder = rounded % 1000;

  if (millions > 0) {
    result += (millions === 1 ? 'un million ' : convertGroup(millions) + ' millions ');
  }
  if (thousands > 0) {
    result += (thousands === 1 ? 'mille ' : convertGroup(thousands) + ' mille ');
  }
  if (remainder > 0) {
    result += convertGroup(remainder);
  }

  const capitalized = result.trim().charAt(0).toUpperCase() + result.trim().slice(1);
  return `${capitalized} Dinars Algériens`;
}
