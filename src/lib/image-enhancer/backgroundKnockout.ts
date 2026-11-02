import { createSafeImageData } from './types';

/**
 * Background Knockout Utility (Offline-First)
 * Removes white, light gray or solid background from product shots in 1-click.
 */

export function removeBackgroundCanvas(
  imageData: ImageData,
  tolerance: number = 30
): ImageData {
  const { width, height, data } = imageData;
  const outputData = new Uint8ClampedArray(data);

  // Sample corner pixels to determine background reference color
  const sampleIndices = [
    0, // Top-Left
    (width - 1) * 4, // Top-Right
    ((height - 1) * width) * 4, // Bottom-Left
    ((height - 1) * width + (width - 1)) * 4 // Bottom-Right
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const idx of sampleIndices) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR /= sampleIndices.length;
  bgG /= sampleIndices.length;
  bgB /= sampleIndices.length;

  // Maximum allowed Euclidean color distance
  const maxDist = (tolerance / 100) * 441.67; // sqrt(255^2 * 3) ~= 441.67

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

    if (dist <= maxDist) {
      // Soft alpha edge feathering for smooth transitions
      const alphaFactor = Math.max(0, (dist - (maxDist * 0.7)) / (maxDist * 0.3));
      outputData[i + 3] = Math.round(data[i + 3] * alphaFactor);
    }
  }

  return createSafeImageData(outputData, width, height);
}
