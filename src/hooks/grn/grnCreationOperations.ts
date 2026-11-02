import { Product, GRNItem, GoodsReceiptNote, CompanySettings } from '../../types';
import { generateUniqueId } from '../../lib/utils';
import { toast } from 'sonner';
import { printPurchaseVoucher } from '../../services/documentPrintService';
import { 
  applyGrnStockAndCostUpdates, 
  saveGrnRecord, 
  validateGrnRecord 
} from './index';

interface CreateGrnParams {
  supplierId: string;
  items: GRNItem[];
  validateImmediately: boolean;
  globalDiscount: number;
  globalVat: number;
  shouldPrint: any;
  products: Product[];
  suppliers: any[];
  settings: CompanySettings;
}

export async function executeCreateGrn({
  supplierId,
  items,
  validateImmediately,
  globalDiscount,
  globalVat,
  shouldPrint,
  products,
  suppliers,
  settings
}: CreateGrnParams): Promise<GoodsReceiptNote> {
  const grnId = generateUniqueId();
  const status = validateImmediately ? 'validated' : 'draft';
  const nowIso = new Date().toISOString();

  if (validateImmediately) {
    applyGrnStockAndCostUpdates(
      items, 
      products, 
      suppliers, 
      nowIso, 
      supplierId, 
      Number(globalDiscount) || 0, 
      Number(globalVat) || 0
    );
  }

  const grnRecord: GoodsReceiptNote = {
    id: grnId,
    supplierId: supplierId || '',
    date: nowIso,
    items: items || [],
    globalDiscount: Number(globalDiscount) || 0,
    globalVat: Number(globalVat) || 0,
    status: status || 'draft'
  };

  await saveGrnRecord(grnRecord, nowIso);

  if (validateImmediately) {
    toast.success("Bon de réception créé et stock mis à jour avec succès !");
  } else {
    toast.success("Bon de réception créé en brouillon.");
  }

  const actualShouldPrint = shouldPrint === true;
  if (actualShouldPrint && grnId) {
    const total = items.reduce((sum, item) => {
      const subtotal = item.quantity * item.newCostPrice;
      const discounted = subtotal * (1 - item.discount / 100);
      const totalWithVat = discounted * (1 + item.vatRate / 100);
      return sum + totalWithVat;
    }, 0) * (1 - globalDiscount / 100) * (1 + globalVat / 100);

    printPurchaseVoucher({
      id: grnId,
      items: items.map(item => ({
        name: products.find(p => p.id === item.productId)?.name || 'Article',
        quantity: item.quantity,
        costPrice: item.newCostPrice
      })),
      total: total
    }, settings);
  }

  return grnRecord;
}

export async function executeValidateGrn(
  grn: GoodsReceiptNote,
  products: Product[],
  suppliers: any[],
  refreshGrns: () => Promise<void>
) {
  const nowIso = new Date().toISOString();
  applyGrnStockAndCostUpdates(
    grn.items || [],
    products,
    suppliers,
    nowIso,
    grn.supplierId,
    Number(grn.globalDiscount) || 0,
    Number(grn.globalVat) || 0
  );
  
  await validateGrnRecord(grn.id);
  await refreshGrns();
  toast.success("Bon de réception validé et stock mis à jour avec succès !");
}
