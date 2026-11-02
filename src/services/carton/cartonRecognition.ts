import { Product } from '../../types';
import { generateUniqueId } from '../../lib/utils';
import { CartonTemplate, CartonRecognitionResult } from './cartonTypes';
import { computeImageDHash, hammingDistance, colorDistance, detectBarcodeFromImage } from './cartonHasher';
import { getCartonTemplates } from './cartonTemplateStorage';

/**
 * Reconnaissance automatique d'un carton à partir de sa photo :
 * 1. Détection de code-barres sur l'emballage
 * 2. Comparaison d'empreinte visuelle dHash (Mémoire Visuelle)
 * 3. Correspondance avec le catalogue de produits
 */
export async function recognizeCarton(
  photoDataUrl: string,
  products: Product[]
): Promise<CartonRecognitionResult | null> {
  if (!photoDataUrl || !products || products.length === 0) {
    return null;
  }

  const templates = await getCartonTemplates();

  // 1. ÉTAPE A : Recherche par code-barres présent sur la photo du carton
  try {
    const detectedBarcode = await detectBarcodeFromImage(photoDataUrl);
    if (detectedBarcode) {
      const cleanBarcode = detectedBarcode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      // A1. Correspondance avec un carton mémorisé
      const matchedTemplate = templates.find(t => {
        const b = (t.barcode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const pb = (t.productBarcode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return (b && b === cleanBarcode) || (pb && pb === cleanBarcode);
      });

      if (matchedTemplate) {
        const product = products.find(p => p.id === matchedTemplate.productId);
        if (product) {
          return {
            template: matchedTemplate,
            product,
            confidence: 99,
            method: 'barcode',
            detectedBarcode
          };
        }
      }

      // A2. Correspondance directe avec le catalogue de produits (code-barres, sku, ref)
      const matchedProd = products.find(p => {
        const b = (p.barcode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const s = (p.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const r = (p.reference || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return (b && b === cleanBarcode) || (s && s === cleanBarcode) || (r && r === cleanBarcode);
      });

      if (matchedProd) {
        const colisage = Number(matchedProd.unitsPerParent) || 12;
        const unitCost = Number(matchedProd.costPrice) || Number(matchedProd.cost_price) || 0;
        const virtualTemplate: CartonTemplate = {
          id: generateUniqueId(),
          productId: matchedProd.id,
          productName: matchedProd.name,
          unitsPerCarton: colisage,
          cartonCostPrice: Number((unitCost * colisage).toFixed(2)),
          unitCostPrice: unitCost,
          cartonPhotoUrl: photoDataUrl,
          barcode: detectedBarcode,
          productBarcode: matchedProd.barcode,
          updatedAt: new Date().toISOString(),
          usageCount: 1
        };

        return {
          template: virtualTemplate,
          product: matchedProd,
          confidence: 98,
          method: 'product_barcode',
          detectedBarcode
        };
      }
    }
  } catch (err) {
    console.warn('[CartonRecognition] Barcode detection error:', err);
  }

  // 2. ÉTAPE B : Reconnaissance par Empreinte Visuelle (Mémoire Visuelle dHash)
  if (templates.length > 0) {
    try {
      const visualSig = await computeImageDHash(photoDataUrl);
      if (visualSig && visualSig.dHash) {
        let bestMatch: CartonTemplate | null = null;
        let lowestDist = 64;
        let highestConfidence = 0;

        for (const t of templates) {
          if (!t.dHash) continue;

          const dist = hammingDistance(visualSig.dHash, t.dHash);
          const cDist = colorDistance(visualSig.avgColor, t.colorSignature);

          // Similitude dHash : 0 diff = 100%, 10 diff = 84.4%, 14 diff = 78.1%
          const hashSim = ((64 - dist) / 64) * 100;
          const colorSim = Math.max(0, 100 - (cDist / 2.5));

          // Score combiné (75% forme macro-visuelle + 25% dominante couleur)
          const confidence = Math.round(hashSim * 0.75 + colorSim * 0.25);

          if (dist <= 14 && confidence >= 70 && confidence > highestConfidence) {
            lowestDist = dist;
            highestConfidence = confidence;
            bestMatch = t;
          }
        }

        if (bestMatch && highestConfidence >= 72) {
          const product = products.find(p => p.id === bestMatch!.productId);
          if (product) {
            return {
              template: bestMatch,
              product,
              confidence: highestConfidence,
              method: 'visual_hash'
            };
          }
        }
      }
    } catch (err) {
      console.warn('[CartonRecognition] Visual hash error:', err);
    }
  }

  return null;
}
