import { describe, it, expect } from 'vitest';
import { 
  applyUnsharpMask, 
  applyLaplacianSharpen,
  calculateOtsuThreshold,
  applyOtsuBinarization,
  removeBackgroundCanvas,
  traceContoursToSVG,
  createSafeImageData
} from '../src/lib/image-enhancer';

describe('🎨 Studio de Dépixélisation & Vectorisation (Algorithmes 100% Hors-Ligne)', () => {
  it('1. Otsu Binarizer : calcule un seuil optimal sur une distribution bimodale', () => {
    // Créer une image 4x4 avec fond clair (200) et premier plan sombre (50)
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
      const isForeground = i < data.length / 2;
      const val = isForeground ? 50 : 200;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }

    const threshold = calculateOtsuThreshold(data);
    expect(threshold).toBeGreaterThanOrEqual(50);
    expect(threshold).toBeLessThanOrEqual(200);

    const imgData = createSafeImageData(data, 4, 4);
    const { binarizedImageData, usedThreshold } = applyOtsuBinarization(imgData, threshold);
    expect(usedThreshold).toBe(threshold);
    // Première moitié doit être noire (0), seconde moitié blanche (255)
    expect(binarizedImageData.data[0]).toBe(0);
    expect(binarizedImageData.data[binarizedImageData.data.length - 4]).toBe(255);
  });

  it('2. Unsharp Masking : accentue le contraste des bordures', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    // Initialiser une image avec un dégradé
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100;
      data[i + 1] = 100;
      data[i + 2] = 100;
      data[i + 3] = 255;
    }
    // Pixel central plus lumineux
    data[(1 * width + 1) * 4] = 220;

    const imgData = createSafeImageData(data, width, height);
    const sharpened = applyUnsharpMask(imgData, 1, 1.5, 0);

    expect(sharpened.width).toBe(4);
    expect(sharpened.height).toBe(4);
    expect(sharpened.data[3]).toBe(255); // Alpha préservé
  });

  it('3. Laplacian Sharpening : filtre convolutif de netteté', () => {
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(128);

    const imgData = createSafeImageData(data, width, height);
    const laplacian = applyLaplacianSharpen(imgData, 0.5);

    expect(laplacian.data.length).toBe(data.length);
  });

  it('4. Background Knockout : détoure un fond blanc uniforme', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fond blanc 255 sur toute l'image
    data.fill(255);

    // Pixel central noir (produit)
    const centerIdx = (1 * width + 1) * 4;
    data[centerIdx] = 10;
    data[centerIdx + 1] = 10;
    data[centerIdx + 2] = 10;
    data[centerIdx + 3] = 255;

    const imgData = createSafeImageData(data, width, height);
    const transparentBg = removeBackgroundCanvas(imgData, 20);

    // Le coin doit être devenu transparent (alpha < 50)
    expect(transparentBg.data[3]).toBeLessThan(50);
    // Le centre sombre doit rester opaque
    expect(transparentBg.data[centerIdx + 3]).toBe(255);
  });

  it('5. Vector Trace (Illustrator-like) : génère un SVG vectoriel valide', () => {
    const width = 6;
    const height = 6;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255); // Fond blanc

    // Rectangle noir au milieu
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }

    const imgData = createSafeImageData(data, width, height);
    const svg = traceContoursToSVG(imgData, 128);

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 6 6"');
    expect(svg).toContain('<path d=');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('</svg>');
  });
});
