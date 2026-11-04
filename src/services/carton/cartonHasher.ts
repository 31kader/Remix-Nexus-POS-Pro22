/**
 * Calcul de l'empreinte visuelle (Difference Hash / dHash 64 bits) et signature couleur RGB
 * 100% Hors-Ligne, ultra-rapide (< 3ms) via Canvas
 */
export async function computeImageDHash(dataUrl: string): Promise<{ dHash: string; avgColor: [number, number, number] } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !dataUrl) {
    return null;
  }

  return new Promise(resolve => {
    let resolved = false;
    const finish = (val: { dHash: string; avgColor: [number, number, number] } | null) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(val);
      }
    };

    // Timeout de secours si l'environnement (ex: test Node/jsdom) ne charge pas l'image
    const timer = setTimeout(() => finish(null), 300);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 9;
        canvas.height = 8;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }

        ctx.drawImage(img, 0, 0, 9, 8);
        const imgData = ctx.getImageData(0, 0, 9, 8).data;

        let hash = '';
        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        const grayscaleMatrix: number[][] = [];

        for (let y = 0; y < 8; y++) {
          grayscaleMatrix[y] = [];
          for (let x = 0; x < 9; x++) {
            const idx = (y * 9 + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];

            totalR += r;
            totalG += g;
            totalB += b;

            // Luminance pondérée standard ITU-R BT.601
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grayscaleMatrix[y][x] = gray;
          }
        }

        // Comparaison pixel par pixel horizontalement (8 colonnes x 8 lignes = 64 bits)
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            hash += grayscaleMatrix[y][x] > grayscaleMatrix[y][x + 1] ? '1' : '0';
          }
        }

        const pixelCount = 9 * 8;
        const avgColor: [number, number, number] = [
          Math.round(totalR / pixelCount),
          Math.round(totalG / pixelCount),
          Math.round(totalB / pixelCount)
        ];

        finish({ dHash: hash, avgColor });
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = dataUrl;
  });
}

/**
 * Calcule la distance de Hamming entre deux empreintes dHash de 64 bits
 * (Nombre de bits différents de 0 à 64)
 */
export function hammingDistance(h1?: string, h2?: string): number {
  if (!h1 || !h2 || h1.length !== h2.length) return 64;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

/**
 * Calcule la distance euclidienne entre deux signatures de couleur RGB
 */
export function colorDistance(c1?: [number, number, number], c2?: [number, number, number]): number {
  if (!c1 || !c2) return 100;
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Tente de détecter un code-barres imprimé sur le carton dans une image
 * (Utilise le BarcodeDetector natif du navigateur si disponible, puis fallback ZXing)
 */
export async function detectBarcodeFromImage(dataUrl: string): Promise<string | null> {
  if (!dataUrl) return null;

  const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 400));

  const detectionPromise = (async () => {
    // 1. Détecteur natif ultra-rapide Chromium / Android WebView
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const img = new Image();
        img.src = dataUrl;
        if (typeof img.decode === 'function') {
          await img.decode();
        }
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'itf', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
        });
        const results = await detector.detect(img);
        if (results && results.length > 0 && results[0].rawValue) {
          return results[0].rawValue.trim();
        }
      } catch {
        // Ignorer et passer au fallback
      }
    }

    // 2. Fallback ZXing multi-formats (chargement dynamique)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageUrl(dataUrl);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch {
      // Pas de code-barres décodable dans l'image
    }

    return null;
  })();

  return Promise.race([detectionPromise, timeoutPromise]);
}

/**
 * Compresse et redimensionne une image via Canvas pour stockage optimisé WebP/JPEG
 */
export async function compressCartonImage(fileOrBlob: Blob | File, maxWidth = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erreur de lecture de l'image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Erreur de décodage de l'image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Essayer WebP d'abord, fallback JPEG
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // ignore
        }

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
