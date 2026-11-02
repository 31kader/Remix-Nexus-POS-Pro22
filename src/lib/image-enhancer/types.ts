export type EnhancementPreset = 'hd-photo' | 'thermal-escpos' | 'vector-trace' | 'knockout-bg';

export interface EnhancementOptions {
  preset: EnhancementPreset;
  /** Unsharp mask radius in pixels (1-5) */
  unsharpRadius?: number;
  /** Unsharp mask intensity multiplier (0.5 - 3.0) */
  unsharpAmount?: number;
  /** Scale factor for super-resolution (1x, 2x, 4x) */
  scaleFactor?: 1 | 2 | 4;
  /** Otsu binarization threshold override (0-255) or 'auto' */
  binaryThreshold?: 'auto' | number;
  /** Invert monochrome for dark-mode or white-on-black receipt printing */
  invertMonochrome?: boolean;
  /** Automatic white/gray background removal */
  removeBackground?: boolean;
  /** Background color distance tolerance (0-100) */
  backgroundTolerance?: number;
  /** Output format */
  outputFormat?: 'image/webp' | 'image/png' | 'image/svg+xml';
}

export interface EnhancementResult {
  previewUrl: string;
  dataUrl: string;
  blob?: Blob;
  svgString?: string;
  originalWidth: number;
  originalHeight: number;
  enhancedWidth: number;
  enhancedHeight: number;
  executionTimeMs: number;
}

/**
 * Universal ImageData factory working across Browser, Node.js and Web Workers
 */
export function createSafeImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ImageData {
  if (typeof globalThis.ImageData !== 'undefined') {
    return new globalThis.ImageData(data, width, height);
  }
  return {
    data,
    width,
    height,
    colorSpace: 'srgb'
  } as unknown as ImageData;
}
