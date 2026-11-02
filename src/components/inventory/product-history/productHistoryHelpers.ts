import { Product } from '../../../types';
import { safeGetItems } from '../../../lib/utils';

export const getRecordItems = (record: any): any[] => safeGetItems(record);

// Vérifie si un item de facture/vente/BR correspond au produit inspecté (par ID, SKU, code-barres ou Nom normalisé)
export const isMatchingProductItem = (item: any, product: Product): boolean => {
  if (!item || !product) return false;
  if (item.productId && item.productId === product.id) return true;
  if (item.id && item.id === product.id) return true;
  if (product.sku && item.sku && String(item.sku).trim().toLowerCase() === String(product.sku).trim().toLowerCase()) return true;
  if (product.barcode && item.barcode && String(item.barcode).trim().toLowerCase() === String(product.barcode).trim().toLowerCase()) return true;
  const itemName = String(item.name || item.productName || '').trim().toLowerCase();
  const prodName = String(product.name || '').trim().toLowerCase();
  if (itemName && prodName && itemName === prodName) return true;
  return false;
};

// Récupère l'URL de la photo scannée du bon d'achat (depuis documents, invoiceImageUrl ou cache local)
export const getPurchaseScannedImage = (p: any): string => {
  if (!p) return '';
  if (p.invoiceImageUrl) return p.invoiceImageUrl;
  if (Array.isArray(p.documents) && p.documents.length > 0) {
    const imgDoc = p.documents.find((d: any) => d?.url);
    if (imgDoc?.url) return imgDoc.url;
  }
  try {
    const rawCache = localStorage.getItem('nexus_scanned_vouchers_v1');
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (p.id && parsed[p.id]) return parsed[p.id];
      if (p.invoiceNumber && parsed[p.invoiceNumber]) return parsed[p.invoiceNumber];
    }
  } catch (_) {}
  return '';
};
