import { EnhancementOptions, EnhancementResult } from './types';
import { applyUnsharpMask, applyLaplacianSharpen } from './convolutionFilters';
import { applyOtsuBinarization } from './otsuBinarizer';
import { removeBackgroundCanvas } from './backgroundKnockout';
import { traceContoursToSVG } from './vectorTrace';

/**
 * Loads an image from a URL, Blob or File into an HTMLImageElement
 */
function loadImage(source: string | Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl = '';
    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Erreur lors du chargement de l\'image'));
    };
  });
}

/**
 * Main offline-first processing pipeline
 */
export async function enhanceImagePipeline(
  source: string | Blob | File,
  options: EnhancementOptions
): Promise<EnhancementResult> {
  const startTime = performance.now();
  const img = await loadImage(source);

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  const scale = options.scaleFactor || (options.preset === 'hd-photo' ? 2 : 1);
  const targetWidth = Math.round(origWidth * scale);
  const targetHeight = Math.round(origHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Impossible d\'initialiser le contexte Canvas 2D');
  }

  // High quality anti-aliased scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  // 1. Optional background removal
  if (options.removeBackground || options.preset === 'knockout-bg') {
    imageData = removeBackgroundCanvas(imageData, options.backgroundTolerance ?? 25);
  }

  let svgString: string | undefined;

  // 2. Preset specific processing
  switch (options.preset) {
    case 'hd-photo': {
      const radius = options.unsharpRadius ?? 2;
      const amount = options.unsharpAmount ?? 1.6;
      imageData = applyUnsharpMask(imageData, radius, amount, 2);
      imageData = applyLaplacianSharpen(imageData, 0.25);
      ctx.putImageData(imageData, 0, 0);
      break;
    }

    case 'thermal-escpos': {
      const threshold = typeof options.binaryThreshold === 'number' ? options.binaryThreshold : undefined;
      const { binarizedImageData } = applyOtsuBinarization(imageData, threshold, options.invertMonochrome ?? false);
      imageData = binarizedImageData;
      ctx.putImageData(imageData, 0, 0);
      break;
    }

    case 'vector-trace': {
      const threshold = typeof options.binaryThreshold === 'number' ? options.binaryThreshold : 128;
      svgString = traceContoursToSVG(imageData, threshold);
      // For canvas preview:
      const { binarizedImageData } = applyOtsuBinarization(imageData, threshold, options.invertMonochrome ?? false);
      ctx.putImageData(binarizedImageData, 0, 0);
      break;
    }

    case 'knockout-bg': {
      ctx.putImageData(imageData, 0, 0);
      break;
    }
  }

  const outputFormat = options.outputFormat || (options.removeBackground ? 'image/png' : 'image/webp');
  const dataUrl = canvas.toDataURL(outputFormat, 0.92);

  const blob: Blob | undefined = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || undefined), outputFormat, 0.92);
  });

  const previewUrl = svgString
    ? `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
    : dataUrl;

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    previewUrl,
    dataUrl,
    blob,
    svgString,
    originalWidth: origWidth,
    originalHeight: origHeight,
    enhancedWidth: targetWidth,
    enhancedHeight: targetHeight,
    executionTimeMs
  };
}
