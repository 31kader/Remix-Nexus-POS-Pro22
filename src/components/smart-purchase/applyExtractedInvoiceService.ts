import { Product, Supplier, InvoicePattern, PurchaseCartItem } from '../../types';
import { generateUniqueId, logAction } from '../../lib/utils';
import { parseSmartAlgerianNumber } from '../../utils/ocrUtils';
import { matchProductInCatalog } from './invoiceParser';
import { toast } from 'sonner';

export interface ApplyExtractedInvoiceParams {
  results: any;
  imageOverrideUrl?: string;
  scannedImageUrl: string;
  suppliers: Supplier[];
  products: Product[];
  patterns: InvoicePattern[];
  selectedSupplierId: string;
  invoiceNumber: string;
  user: any;
  setExtractedData: (data: any) => void;
  setDetectedOcrType: (type: 'pos' | 'standard') => void;
  setSelectedSupplierId: (id: string) => void;
  setInvoiceNumber: (num: string) => void;
  setReceptionDate: (date: string) => void;
  setCart: React.Dispatch<React.SetStateAction<PurchaseCartItem[]>>;
  setMode: (mode: 'manual' | 'scan') => void;
}

export function applyExtractedInvoiceService({
  results,
  imageOverrideUrl,
  scannedImageUrl,
  suppliers,
  products,
  patterns,
  selectedSupplierId,
  invoiceNumber,
  user,
  setExtractedData,
  setDetectedOcrType,
  setSelectedSupplierId,
  setInvoiceNumber,
  setReceptionDate,
  setCart,
  setMode,
}: ApplyExtractedInvoiceParams): void {
  const finalScannedImage = imageOverrideUrl || scannedImageUrl || results?.scannedImageUrl || '';
  setExtractedData({ ...results, scannedImageUrl: finalScannedImage });
  setDetectedOcrType(results.isPosScreenshot ? 'pos' : 'standard');

  if (results.supplierName && !selectedSupplierId) {
    const matchedSupplier = suppliers.find(s =>
      Boolean(s?.name && s.name.toLowerCase().includes((results.supplierName || '').toLowerCase()))
    );
    if (matchedSupplier) {
      setSelectedSupplierId(matchedSupplier.id);
    }
  }

  if (results.invoiceNumber && !invoiceNumber) {
    setInvoiceNumber(results.invoiceNumber);
  }

  if (results.date || results.receptionDate) {
    const dateStr = results.date || results.receptionDate;
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      setReceptionDate(dateStr.split('T')[0]);
    }
  }

  if (results.previousBalance !== undefined && results.previousBalance !== null) {
    toast.info(`Ancien solde détecté : ${results.previousBalance} DA`, { icon: '💰' });
  }

  if (results.items && Array.isArray(results.items)) {
    let mappedCount = 0;
    let unmappedCount = 0;

    // Récupérer aussi les patterns enregistrés en base (invoice_patterns) pour ce fournisseur
    const supplierPatterns = (patterns || []).filter(p => !selectedSupplierId || (p as any).supplierId === selectedSupplierId || (p as any).supplier_id === selectedSupplierId);
    const patternMappings: Record<string, string> = {};
    supplierPatterns.forEach(pat => {
      const mappings = (pat as any).itemMappings || (pat as any).item_mappings;
      if (mappings && typeof mappings === 'object') {
        Object.entries(mappings).forEach(([k, v]) => {
          if (k && v) patternMappings[k.trim().toLowerCase()] = String(v);
        });
      }
    });

    const newItems: PurchaseCartItem[] = results.items
      .map((item: any) => {
        const cleanQty = Math.max(1, parseSmartAlgerianNumber(item.qty ?? item.quantity ?? 1) || 1);
        const rawPrice = parseSmartAlgerianNumber(item.price);
        const rawTotal = parseSmartAlgerianNumber(item.total);
        const cleanDiscount = parseSmartAlgerianNumber(item.discount);
        const cleanPrice = rawPrice > 0 ? rawPrice : (rawTotal > 0 && cleanQty > 0 ? Math.round((rawTotal / cleanQty) * 100) / 100 : 0);

        const rawNameKey = String(item.name || '').trim().toLowerCase();
        const patternProductId = patternMappings[rawNameKey];

        const matchedProduct = item.productId
          ? products.find(p => p.id === item.productId)
          : patternProductId
            ? products.find(p => p.id === patternProductId)
            : matchProductInCatalog(
                {
                  name: item.name || '',
                  barcode: item.barcode || item.code || '',
                  sku: item.sku || ''
                },
                products
              );

        if (matchedProduct) {
          mappedCount++;
          return {
            lineId: generateUniqueId(),
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            quantity: cleanQty,
            costPrice: cleanPrice > 0 ? cleanPrice : matchedProduct.costPrice || matchedProduct.price || 0,
            taxRate: matchedProduct.taxRate || 0,
            discount: cleanDiscount,
            imageUrl: matchedProduct.imageUrl,
            isDraft: false
          };
        }

        unmappedCount++;

        return {
          lineId: generateUniqueId(),
          productId: '',
          productName: item.name || 'Article Importé',
          quantity: cleanQty,
          costPrice: cleanPrice > 0 ? cleanPrice : 0,
          taxRate: 0,
          discount: cleanDiscount,
          isDraft: true
        };
      })
      .filter((item: any): item is PurchaseCartItem => item !== null && !!item.productName);

    setCart(newItems);

    if (mappedCount > 0 && unmappedCount > 0) {
      toast.success(`${mappedCount} articles reconnus dans le catalogue, ${unmappedCount} nouveaux à créer.`);
    } else if (mappedCount > 0) {
      toast.success(`${mappedCount} articles reconnus automatiquement parmi vos ${products.length} produits !`);
    } else if (unmappedCount > 0) {
      toast.info(`${unmappedCount} articles extraits (prêts à être associés ou ajoutés au catalogue).`);
    }
  }

  setMode('manual');
  logAction(
    user?.uid || user?.id || 'system',
    user?.displayName || 'Utilisateur',
    'File Import',
    'SmartPurchase',
    `Import réussi`
  );
}
