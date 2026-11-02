import { Product } from '../../types';
import { CartonTemplate, BarcodeResolutionResult } from './cartonTypes';

/**
 * Résout n'importe quel code-barres scanné ou saisi (code carton, SKU carton, code produit, référence)
 * avec support des préfixes multiplicateurs (ex: "2*6132524550885" ou "12xREF01").
 */
export function resolveBarcodeOrCarton(
  rawInput: string,
  products: Product[],
  templates: CartonTemplate[] = []
): BarcodeResolutionResult {
  if (!rawInput || typeof rawInput !== 'string') return null;
  let clean = rawInput.trim();
  if (!clean) return null;

  let multiplier = 1;
  const prefixMatch = clean.match(/^(\d+)\s*[*xX]\s*(.+)$/);
  if (prefixMatch) {
    const parsedQty = parseInt(prefixMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      multiplier = parsedQty;
      clean = prefixMatch[2].trim();
    }
  }

  const cleanLower = clean.toLowerCase();
  const cleanNorm = cleanLower.replace(/[^a-z0-9]/g, '');

  // 1. Recherche prioritaire dans les Cartons (CartonTemplate)
  const matchedTemplate = templates.find(t => {
    if (!t) return false;
    const tb = (t.barcode || '').trim().toLowerCase();
    const tbNorm = tb.replace(/[^a-z0-9]/g, '');
    const tSku = (t.sku || '').trim().toLowerCase();
    const tSkuNorm = tSku.replace(/[^a-z0-9]/g, '');

    if (tb && (tb === cleanLower || (cleanNorm && tbNorm === cleanNorm))) return true;
    if (tSku && (tSku === cleanLower || (cleanNorm && tSkuNorm === cleanNorm))) return true;

    return false;
  });

  if (matchedTemplate) {
    const linkedProduct = products.find(p => p.id === matchedTemplate.productId) || {
      id: matchedTemplate.productId,
      name: matchedTemplate.productName,
      price: matchedTemplate.retailPrice || (matchedTemplate.cartonCostPrice * 1.2),
      costPrice: matchedTemplate.unitCostPrice || 0,
      stock: 0,
      barcode: matchedTemplate.productBarcode || matchedTemplate.barcode || '',
      sku: matchedTemplate.sku || ''
    } as Product;

    const unitsPerCarton = Number(matchedTemplate.unitsPerCarton) || Number(linkedProduct.unitsPerParent) || 12;
    const unitCostPrice = Number(matchedTemplate.unitCostPrice) || Number(linkedProduct.costPrice) || 0;
    const cartonCostPrice = Number(matchedTemplate.cartonCostPrice) || Number((unitCostPrice * unitsPerCarton).toFixed(2));
    const photoUrl = matchedTemplate.cartonPhotoUrl || (linkedProduct as any).cartonPhotoUrl || linkedProduct.imageUrl || '';

    return {
      type: 'carton',
      template: matchedTemplate,
      product: linkedProduct,
      multiplier,
      cartonCount: multiplier,
      unitsPerCarton,
      cartonCostPrice,
      unitCostPrice,
      cartonPhotoUrl: photoUrl,
      imageUrl: photoUrl || linkedProduct.imageUrl || ''
    };
  }

  // 2. Recherche dans les Produits (code-barres, SKU, référence, id)
  const matchedProduct = products.find(p => {
    if (!p) return false;
    const b = (p.barcode || '').trim().toLowerCase();
    const bNorm = b.replace(/[^a-z0-9]/g, '');
    const s = (p.sku || '').trim().toLowerCase();
    const sNorm = s.replace(/[^a-z0-9]/g, '');
    const r = (p.reference || '').trim().toLowerCase();
    const rNorm = r.replace(/[^a-z0-9]/g, '');
    const id = (p.id || '').trim().toLowerCase();

    return (
      (b && (b === cleanLower || (cleanNorm && bNorm === cleanNorm))) ||
      (s && (s === cleanLower || (cleanNorm && sNorm === cleanNorm))) ||
      (r && (r === cleanLower || (cleanNorm && rNorm === cleanNorm))) ||
      (id && id === cleanLower)
    );
  });

  if (matchedProduct) {
    const productCartonTemplate = templates.find(t => t.productId === matchedProduct.id);
    if (productCartonTemplate && cleanLower.startsWith('cart-')) {
      const unitsPerCarton = Number(productCartonTemplate.unitsPerCarton) || 12;
      return {
        type: 'carton',
        template: productCartonTemplate,
        product: matchedProduct,
        multiplier,
        cartonCount: multiplier,
        unitsPerCarton,
        cartonCostPrice: Number(productCartonTemplate.cartonCostPrice) || Number((matchedProduct.costPrice * unitsPerCarton).toFixed(2)),
        unitCostPrice: Number(productCartonTemplate.unitCostPrice) || Number(matchedProduct.costPrice) || 0,
        cartonPhotoUrl: productCartonTemplate.cartonPhotoUrl || matchedProduct.imageUrl || '',
        imageUrl: productCartonTemplate.cartonPhotoUrl || matchedProduct.imageUrl || ''
      };
    }

    return {
      type: 'product',
      product: matchedProduct,
      multiplier
    };
  }

  return null;
}
