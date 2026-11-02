/**
 * Convolution & Sharpening Filters (100% Offline Canvas / TypedArray)
 * Implements Unsharp Masking and Laplacian sharpening to eliminate compression blur.
 */

import { createSafeImageData } from './types';

/**
 * Fast 2-pass Box Blur approximation for Gaussian Blur
 */
export function fastBoxBlur(
  srcData: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(srcData.length);
  const temp = new Uint8ClampedArray(srcData.length);
  const r = Math.max(1, Math.floor(radius));

  // Horizontal Pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      const minX = Math.max(0, x - r);
      const maxX = Math.min(width - 1, x + r);

      for (let ix = minX; ix <= maxX; ix++) {
        const idx = rowOffset + ix * 4;
        rSum += srcData[idx];
        gSum += srcData[idx + 1];
        bSum += srcData[idx + 2];
        count++;
      }

      const outIdx = rowOffset + x * 4;
      temp[outIdx] = rSum / count;
      temp[outIdx + 1] = gSum / count;
      temp[outIdx + 2] = bSum / count;
      temp[outIdx + 3] = srcData[outIdx + 3]; // Preserve alpha
    }
  }

  // Vertical Pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      const minY = Math.max(0, y - r);
      const maxY = Math.min(height - 1, y + r);

      for (let iy = minY; iy <= maxY; iy++) {
        const idx = (iy * width + x) * 4;
        rSum += temp[idx];
        gSum += temp[idx + 1];
        bSum += temp[idx + 2];
        count++;
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = rSum / count;
      output[outIdx + 1] = gSum / count;
      output[outIdx + 2] = bSum / count;
      output[outIdx + 3] = temp[outIdx + 3];
    }
  }

  return output;
}

/**
 * Unsharp Mask Filter: sharp = original + amount * (original - blur)
 * Produces crisp high-definition edges without pixelation.
 */
export function applyUnsharpMask(
  imageData: ImageData,
  radius: number = 2,
  amount: number = 1.5,
  threshold: number = 0
): ImageData {
  const { width, height, data } = imageData;
  const blurred = fastBoxBlur(data, width, height, radius);
  const outputData = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = data[i + c];
      const blur = blurred[i + c];
      const diff = orig - blur;

      if (Math.abs(diff) >= threshold) {
        const value = orig + diff * amount;
        outputData[i + c] = Math.min(255, Math.max(0, Math.round(value)));
      } else {
        outputData[i + c] = orig;
      }
    }
    outputData[i + 3] = data[i + 3]; // Alpha
  }

  return createSafeImageData(outputData, width, height);
}

/**
 * 3x3 Laplacian Sharpening Matrix
 */
export function applyLaplacianSharpen(imageData: ImageData, strength: number = 0.5): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);

  // Kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0] scaled by strength
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = data[idx + c];
        const up = data[((y - 1) * width + x) * 4 + c];
        const down = data[((y + 1) * width + x) * 4 + c];
        const left = data[(y * width + (x - 1)) * 4 + c];
        const right = data[(y * width + (x + 1)) * 4 + c];

        const laplacian = 4 * center - up - down - left - right;
        const res = center + laplacian * strength;
        output[idx + c] = Math.min(255, Math.max(0, Math.round(res)));
      }
      output[idx + 3] = data[idx + 3];
    }
  }

  // Copy borders
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    for (let c = 0; c < 4; c++) {
      output[topIdx + c] = data[topIdx + c];
      output[botIdx + c] = data[botIdx + c];
    }
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = (y * width) * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    for (let c = 0; c < 4; c++) {
      output[leftIdx + c] = data[leftIdx + c];
      output[rightIdx + c] = data[rightIdx + c];
    }
  }

  return createSafeImageData(output, width, height);
}
