import { Product } from '../types';

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

// Normalizer to remove accents, punctuation and lowercase words
export const normalizeTextForOcr = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’°+/#&-\[\]_:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const getLevenshteinDistance = (s1: string, s2: string): number => {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
};

export const areWordsSimilar = (w1: string, w2: string): boolean => {
  if (w1 === w2) return true;
  if (Math.abs(w1.length - w2.length) > 2) return false;
  
  const dist = getLevenshteinDistance(w1, w2);
  if (w1.length <= 4) return dist <= 1;
  if (w1.length <= 7) return dist <= 1;
  return dist <= 2;
};

export const isFuzzyNameMatch = (productName: string, lineText: string): boolean => {
  const normProg = normalizeTextForOcr(productName);
  const normLine = normalizeTextForOcr(lineText);
  
  if (normProg.length < 3) return false;
  
  if (normLine.includes(normProg)) return true;
  
  const progWords = normProg.split(" ").filter(w => w.length >= 3);
  const lineWords = normLine.split(" ").filter(w => w.length >= 2);
  
  if (progWords.length === 0) return false;
  
  let matchedCount = 0;
  for (const pW of progWords) {
    const hasSimilar = lineWords.some(lW => {
      if (lW.includes(pW) || pW.includes(lW)) return true;
      return areWordsSimilar(pW, lW);
    });
    
    if (hasSimilar) {
      matchedCount++;
    }
  }
  
  const matchRatio = matchedCount / progWords.length;
  return matchRatio >= 0.75;
};

export const preprocessImageForOcr = (file: File): Promise<string | File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        let width = img.width;
        let height = img.height;
        const maxDim = 1800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let minLuma = 255;
        let maxLuma = 0;
        const lumaArray = new Uint8Array(data.length / 4);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          lumaArray[i / 4] = luma;
          if (luma < minLuma) minLuma = luma;
          if (luma > maxLuma) maxLuma = luma;
        }

        const range = maxLuma - minLuma || 1;
        
        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          const origLuma = lumaArray[idx];
          const stretched = Math.round(((origLuma - minLuma) / range) * 255);
          const finalVal = stretched < 140 ? 0 : 255;

          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const cleanAndExtractOcrNumbers = (lineText: string): number[] => {
  let cleaned = lineText;
  
  cleaned = cleaned.replace(/(\d)[oO]/g, '$10');
  cleaned = cleaned.replace(/[oO](\d)/g, '0$1');
  
  cleaned = cleaned.replace(/(\d)[lIi]/g, '$11');
  cleaned = cleaned.replace(/[lIi](\d)/g, '1$1');
  
  cleaned = cleaned.replace(/\b(\d+)\s*[,.·/\-|]\s*(\d{2})\b/g, '$1.$2');
  
  cleaned = cleaned.replace(/(\d+)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/g, '$1 $2');

  cleaned = cleaned.replace(/(\d)\s+(\d{3}(?:[.,]\d+)?)\b/g, '$1$2');
  
  const numberMatches = cleaned.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
  
  return numberMatches
    .map(n => parseFloat(n.replace(',', '.')))
    .filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
};
