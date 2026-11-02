import { Product } from '../types';
import { preprocessImageForOcr } from './ocr/ocrImagePreprocessing';
import {
  normalizeTextForOcr,
  getLevenshteinDistance,
  areWordsSimilar,
  isFuzzyNameMatch
} from './ocr/ocrTextMatching';
import {
  parseSmartAlgerianNumber,
  cleanAndExtractOcrNumbers
} from './ocr/algerianNumberParsing';

// Ré-exportations pour compatibilité totale
export {
  preprocessImageForOcr,
  normalizeTextForOcr,
  getLevenshteinDistance,
  areWordsSimilar,
  isFuzzyNameMatch,
  parseSmartAlgerianNumber,
  cleanAndExtractOcrNumbers
};

/**
 * Intelligently determines quantity and unit purchase price for a matched product,
 * using the numbers extracted on the same line as the product designation,
 * with database-assisted heuristics to fallback gracefully and prevent garbage values.
 */
export const extractQtyAndPrice = (values: number[], referencePrice: number): { qty: number; price: number } => {
  const refPrice = referencePrice > 0 ? referencePrice : 50;

  if (values.length === 0) {
    return { qty: 1, price: refPrice };
  }

  // 1. First, look for a standard arithmetic relation (qty * price = total) with 5% tolerance
  let bestTriple: { qty: number; price: number; score: number } | null = null;
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const product = values[i] * values[j];
      for (let k = 0; k < values.length; k++) {
        if (k === i || k === j) continue;
        
        const diff = Math.abs(product - values[k]);
        if (diff <= 0.05 * product || (product > 10 && diff < 3)) {
          const scoreI = Math.abs(values[i] - refPrice) / refPrice;
          const scoreJ = Math.abs(values[j] - refPrice) / refPrice;
          
          if (scoreI < scoreJ && values[i] > 0 && values[j] > 0) {
            if (!bestTriple || scoreI < bestTriple.score) {
              bestTriple = { qty: values[j], price: values[i], score: scoreI };
            }
          } else if (values[j] > 0 && values[i] > 0) {
            if (!bestTriple || scoreJ < bestTriple.score) {
              bestTriple = { qty: values[i], price: values[j], score: scoreJ };
            }
          }
        }
      }
    }
  }

  if (bestTriple && bestTriple.score < 0.8) {
    return { qty: bestTriple.qty, price: bestTriple.price };
  }

  // 2. Look for price matches in the values list
  const closePriceCandidate = values.find(v => Math.abs(v - refPrice) / refPrice <= 0.5);
  const resolvedPrice = closePriceCandidate || null;

  const remainingForQty = values.filter(v => v !== resolvedPrice);
  const qtyCandidate = remainingForQty.find(v => v > 0 && v <= 150) || 1;

  if (resolvedPrice !== null) {
    return { qty: qtyCandidate, price: resolvedPrice };
  }

  // 3. Fallback: Check if all values on the line are extremely small compared to refPrice
  const allValuesAreSmall = values.every(v => v < 0.4 * refPrice);
  if (allValuesAreSmall) {
    const deducedQty = values.find(v => v > 0 && v <= 150) || 1;
    return { qty: deducedQty, price: refPrice };
  }

  // 4. Default sort pair parsing for standard lines
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length >= 2) {
    const minVal = sorted[0];
    const maxVal = sorted[1];
    const isMaxValPlausible = maxVal >= 0.25 * refPrice && maxVal <= 3.5 * refPrice;
    
    if (minVal <= 150 && isMaxValPlausible) {
      return { qty: minVal, price: maxVal };
    } else if (minVal <= 150) {
      return { qty: minVal, price: refPrice };
    }
  } else if (sorted.length === 1) {
    const singleVal = sorted[0];
    if (singleVal >= 0.25 * refPrice && singleVal <= 3.5 * refPrice) {
      return { qty: 1, price: singleVal };
    } else if (singleVal <= 150) {
      return { qty: singleVal, price: refPrice };
    }
  }

  return { qty: 1, price: refPrice };
};

/**
 * Reconciles the extracted quantity, price, and total from an OCR or generative AI result
 */
export const reconcileOcrLine = (
  extractedQty: number,
  extractedPrice: number,
  extractedTotal: number | undefined | null,
  referencePrice: number
): { qty: number; price: number } => {
  const refPrice = referencePrice > 0 ? referencePrice : 50;
  
  let qty = typeof extractedQty === 'number' && extractedQty > 0 ? extractedQty : 1;
  let price = typeof extractedPrice === 'number' && extractedPrice > 0 ? extractedPrice : refPrice;
  const total = typeof extractedTotal === 'number' && extractedTotal > 0 ? extractedTotal : (qty * price);

  if (qty > 1 && Math.abs(price - total) < 0.05 * total) {
    const ratio = price / qty;
    if (Math.abs(ratio - refPrice) / refPrice < 0.4) {
      return { qty, price: Math.round(ratio * 100) / 100 };
    }
  }

  if (qty === 1 && Math.abs(price - total) < 0.05 * total) {
    const calculatedQty = Math.round(total / refPrice);
    if (calculatedQty > 1 && calculatedQty <= 150) {
      const actualUnitPrice = total / calculatedQty;
      if (Math.abs(actualUnitPrice - refPrice) / refPrice < 0.4) {
        return { qty: calculatedQty, price: Math.round(actualUnitPrice * 100) / 100 };
      }
    }
  }

  if (qty === 1 && Math.abs(price - refPrice) / refPrice < 0.4 && total > price * 1.5) {
    const calculatedQty = Math.round(total / price);
    if (calculatedQty > 1 && calculatedQty <= 150) {
      return { qty: calculatedQty, price };
    }
  }

  if (qty > 1 && (price > 4 * refPrice || price < 0.2 * refPrice)) {
    const calculatedPrice = total / qty;
    if (Math.abs(calculatedPrice - refPrice) / refPrice < 0.4) {
      return { qty, price: Math.round(calculatedPrice * 100) / 100 };
    }
    return { qty, price: refPrice };
  }

  if (qty === 1 && price <= 2 && total > 5) {
    const calculatedQty = Math.round(total / refPrice);
    if (calculatedQty > 0) {
      return { qty: calculatedQty, price: refPrice };
    }
  }

  if (price > 4 * refPrice || price < 0.2 * refPrice) {
    price = refPrice;
  }

  return { qty, price };
};
