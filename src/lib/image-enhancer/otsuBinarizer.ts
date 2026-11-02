/**
 * Otsu's Adaptive Thresholding & 1-bit Monochrome Binarizer
 * Tailored for ESC/POS Thermal Receipt Printers (203 DPI) and High-Contrast Stamps.
 */

import { createSafeImageData } from './types';

/**
 * Calculates the optimal binarization threshold using Otsu's algorithm
 */
export function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 30) continue; // Skip near-transparent pixels

    // Rec. 709 Luminance weights
    const gray = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    histogram[gray]++;
    totalPixels++;
  }

  if (totalPixels === 0) return 128;

  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Binarizes an ImageData object using Otsu's threshold or a custom threshold.
 * Returns pure 1-bit black/white (0 or 255) suitable for thermal printer printheads.
 */
export function applyOtsuBinarization(
  imageData: ImageData,
  customThreshold?: number,
  invert: boolean = false
): { binarizedImageData: ImageData; usedThreshold: number } {
  const { width, height, data } = imageData;
  const threshold = customThreshold ?? calculateOtsuThreshold(data);
  const outputData = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 30) {
      outputData[i] = 255;
      outputData[i + 1] = 255;
      outputData[i + 2] = 255;
      outputData[i + 3] = 0; // Transparent
      continue;
    }

    const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    let isWhite = gray > threshold;
    if (invert) isWhite = !isWhite;

    const val = isWhite ? 255 : 0;
    outputData[i] = val;
    outputData[i + 1] = val;
    outputData[i + 2] = val;
    outputData[i + 3] = 255;
  }

  return {
    binarizedImageData: createSafeImageData(outputData, width, height),
    usedThreshold: threshold
  };
}
