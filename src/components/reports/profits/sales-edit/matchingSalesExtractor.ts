import { Product, Transaction } from '../../../../types';
import { calculateItemPrice } from '../../../../lib/utils';
import { EditableSaleRow } from './salesEditTypes';

export function extractMatchingSalesForProduct(
  product: Product,
  effectiveTransactions: Transaction[]
): EditableSaleRow[] {
  if (!product) return [];

  const targetId = String(product.id || '');
  const targetSku = String(product.sku || '').toLowerCase().trim();
  const targetBarcode = String(product.barcode || '').toLowerCase().trim();
  const targetName = String(product.name || '').toLowerCase().trim();

  const sales: EditableSaleRow[] = [];

  effectiveTransactions.forEach(t => {
    if (!t || t.status === 'returned') return;

    let items = t.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (_) {
        items = [];
      }
    }
    if (!Array.isArray(items)) return;

    const txLinesSubtotal = items.reduce((acc, it) => {
      if (!it) return acc;
      return acc + (Number(calculateItemPrice(it, t.isWholesale) ?? it.price ?? 0) * (Number(it.quantity) || 1));
    }, 0);

    const explicitTxDiscount = Number(t.discountAmount ?? (t as any).discount_amount ?? 0);
    const pointsAndVoucher = Number(t.pointsDiscount || 0) + Number(t.voucherDiscount || 0);
    const implicitTxDiscount = Math.max(0, Math.round((txLinesSubtotal - Number(t.total ?? txLinesSubtotal) - pointsAndVoucher) * 100) / 100);
    const effectiveTxGlobalDiscount = explicitTxDiscount > 0 ? explicitTxDiscount : implicitTxDiscount;

    items.forEach((item, idx) => {
      if (!item) return;
      const itemProdId = String((item as any).productId || item.id || '');
      const itemSku = String((item as any).sku || '').toLowerCase().trim();
      const itemBarcode = String((item as any).barcode || '').toLowerCase().trim();
      const itemName = String((item as any).name || '').toLowerCase().trim();

      const isMatch = (targetId && itemProdId === targetId) ||
                      (targetSku && itemSku && itemSku === targetSku) ||
                      (targetBarcode && itemBarcode && itemBarcode === targetBarcode) ||
                      (targetName && itemName && itemName === targetName);

      if (isMatch) {
        const rawCost = (item as any).costPrice ?? (item as any).cost_price;
        const itemCost = rawCost !== undefined && Number(rawCost) >= 0 
          ? Number(rawCost) 
          : Number(product.costPrice || (product as any).cost_price || 0);

        const catalogOrOriginalPrice = Number(item.price ?? 0);
        const effectiveUnitPrice = Number(calculateItemPrice(item, t.isWholesale) ?? item.price ?? 0);
        const itemQty = Number(item.quantity) || 1;
        const lineSubtotalAfterLineDisc = effectiveUnitPrice * itemQty;

        const directLineDiscount = Math.max(0, (catalogOrOriginalPrice - effectiveUnitPrice) * itemQty);
        const allocatedGlobalDiscount = txLinesSubtotal > 0
          ? (lineSubtotalAfterLineDisc / txLinesSubtotal) * effectiveTxGlobalDiscount
          : 0;
        const totalRowDiscount = Math.round((directLineDiscount + allocatedGlobalDiscount) * 100) / 100;

        sales.push({
          transactionId: t.id,
          transaction: t,
          itemIndex: idx,
          item: { ...item },
          currentDate: t.timestamp ? new Date(t.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          quantity: itemQty,
          price: directLineDiscount > 0 ? catalogOrOriginalPrice : effectiveUnitPrice,
          costPrice: itemCost,
          discountAmount: totalRowDiscount,
          ticketDiscountTotal: effectiveTxGlobalDiscount,
          isEditing: false
        });
      }
    });
  });

  return sales.sort((a, b) => new Date(b.transaction.timestamp).getTime() - new Date(a.transaction.timestamp).getTime());
}
