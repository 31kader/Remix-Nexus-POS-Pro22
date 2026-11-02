import { ShortageItem } from '../../types/shortages';
import { Product } from '../../types';
import { generateLocalId } from '../../lib/db-converters';
import {
  persistInsertShortageItem,
  persistUpdateShortageItem,
  persistDeleteShortageItem
} from './shortageDbOperations';

export interface AddItemOptions {
  quantity?: number;
  listId?: string;
  supplierId?: string;
  supplierName?: string;
  costPrice?: number;
  minStock?: number;
  currentStock?: number;
  notes?: string;
  priority?: 'normal' | 'urgent';
}

export interface AddCustomItemData {
  name: string;
  barcode?: string;
  sku?: string;
  quantityNeeded?: number;
  costPrice?: number;
  supplierId?: string;
  supplierName?: string;
  listIds?: string[];
  notes?: string;
  unit?: string;
  priority?: 'normal' | 'urgent';
}

export async function executeAddItem(
  items: ShortageItem[],
  activeListId: string | 'all',
  product: Partial<Product> & { id: string; name: string },
  options?: AddItemOptions
): Promise<{ nextItems: ShortageItem[]; item: ShortageItem }> {
  const existingIndex = items.findIndex(i => i.productId === product.id);
  const now = new Date().toISOString();
  const effectiveListId = options?.listId || (activeListId !== 'all' ? activeListId : undefined);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const addedQty = Math.max(1, Math.round(options?.quantity ?? 1));
    const nextQty = existing.quantityNeeded + addedQty;
    const existingListIds = Array.isArray(existing.listIds) ? existing.listIds : [];
    const nextListIds = effectiveListId && !existingListIds.includes(effectiveListId)
      ? [...existingListIds, effectiveListId]
      : existingListIds;

    const updatedItem: ShortageItem = {
      ...existing,
      quantityNeeded: nextQty,
      listIds: nextListIds,
      costPrice: options?.costPrice !== undefined ? options.costPrice : existing.costPrice,
      currentStock: options?.currentStock !== undefined ? options.currentStock : (product.stock ?? existing.currentStock),
      minStock: options?.minStock !== undefined ? options.minStock : (product.minStock ?? existing.minStock),
      updatedAt: now
    };

    await persistUpdateShortageItem(updatedItem.id, updatedItem);
    const nextItems = [...items];
    nextItems[existingIndex] = updatedItem;
    return { nextItems, item: updatedItem };
  } else {
    const id = generateLocalId();
    const initialQty = Math.max(
      1,
      Math.round(
        options?.quantity ??
        (product.minStock && product.minStock > (product.stock || 0)
          ? product.minStock - (product.stock || 0)
          : 1)
      )
    );

    const newItem: ShortageItem = {
      id,
      productId: product.id,
      name: product.name,
      barcode: product.barcode || '',
      sku: product.sku || '',
      imageUrl: product.imageUrl || (product as any).image || '',
      costPrice: options?.costPrice ?? (product.costPrice || 0),
      currentStock: options?.currentStock ?? (product.stock || 0),
      minStock: options?.minStock ?? (product.minStock || 0),
      quantityNeeded: initialQty,
      supplierId: options?.supplierId || '',
      supplierName: options?.supplierName || product.supplier || '',
      isChecked: false,
      listIds: effectiveListId ? [effectiveListId] : [],
      unit: (product as any).unit || 'pcs',
      notes: options?.notes || '',
      priority: options?.priority || 'normal',
      createdAt: now,
      updatedAt: now
    };

    await persistInsertShortageItem(newItem);
    return { nextItems: [newItem, ...items], item: newItem };
  }
}

export async function executeAddCustomItem(
  items: ShortageItem[],
  activeListId: string | 'all',
  data: AddCustomItemData
): Promise<{ nextItems: ShortageItem[]; item: ShortageItem }> {
  const cleanName = data.name.trim();
  const cleanBarcode = data.barcode?.trim() || '';
  const now = new Date().toISOString();

  const existingIndex = items.findIndex(i => {
    if (cleanBarcode && i.barcode && i.barcode.toLowerCase() === cleanBarcode.toLowerCase()) {
      return true;
    }
    return i.name.toLowerCase() === cleanName.toLowerCase() && i.isCustomProduct;
  });

  const addedQty = Math.max(1, Math.round(data.quantityNeeded ?? 1));

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const nextQty = existing.quantityNeeded + addedQty;
    const targetLists = (data.listIds && data.listIds.length > 0)
      ? data.listIds
      : (activeListId !== 'all' ? [activeListId] : []);
    const combinedLists = Array.from(new Set([...(existing.listIds || []), ...targetLists]));

    const updatedItem: ShortageItem = {
      ...existing,
      quantityNeeded: nextQty,
      listIds: combinedLists,
      costPrice: data.costPrice !== undefined && data.costPrice > 0 ? data.costPrice : existing.costPrice,
      supplierId: data.supplierId || existing.supplierId,
      supplierName: data.supplierName || existing.supplierName,
      barcode: cleanBarcode || existing.barcode,
      notes: data.notes ? (existing.notes ? `${existing.notes} | ${data.notes}` : data.notes) : existing.notes,
      priority: data.priority || existing.priority || 'normal',
      updatedAt: now
    };

    await persistUpdateShortageItem(updatedItem.id, updatedItem);
    const nextItems = [...items];
    nextItems[existingIndex] = updatedItem;
    return { nextItems, item: updatedItem };
  } else {
    const id = generateLocalId();
    const newItem: ShortageItem = {
      id,
      productId: `custom_${generateLocalId()}`,
      name: cleanName,
      barcode: cleanBarcode,
      sku: data.sku?.trim() || '',
      costPrice: Math.max(0, data.costPrice || 0),
      currentStock: 0,
      minStock: 0,
      quantityNeeded: addedQty,
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      isChecked: false,
      listIds: (data.listIds && data.listIds.length > 0)
        ? data.listIds
        : (activeListId !== 'all' ? [activeListId] : []),
      unit: data.unit || 'pcs',
      isCustomProduct: true,
      notes: data.notes?.trim() || '',
      priority: data.priority || 'normal',
      createdAt: now,
      updatedAt: now
    };

    await persistInsertShortageItem(newItem);
    return { nextItems: [newItem, ...items], item: newItem };
  }
}

export function executeUpdateItemQuantity(items: ShortageItem[], id: string, quantity: number): ShortageItem[] {
  const validQty = Math.max(1, Math.round(quantity));
  const now = new Date().toISOString();
  persistUpdateShortageItem(id, { quantityNeeded: validQty, updatedAt: now }).catch(() => {});
  return items.map(item => item.id === id ? { ...item, quantityNeeded: validQty, updatedAt: now } : item);
}

export function executeUpdateItemCostPrice(items: ShortageItem[], id: string, costPrice: number): ShortageItem[] {
  const validPrice = Math.max(0, costPrice);
  const now = new Date().toISOString();
  persistUpdateShortageItem(id, { costPrice: validPrice, updatedAt: now }).catch(() => {});
  return items.map(item => item.id === id ? { ...item, costPrice: validPrice, updatedAt: now } : item);
}

export function executeUpdateItemNotes(items: ShortageItem[], id: string, notes: string): ShortageItem[] {
  const now = new Date().toISOString();
  persistUpdateShortageItem(id, { notes: notes.trim(), updatedAt: now }).catch(() => {});
  return items.map(item => item.id === id ? { ...item, notes: notes.trim(), updatedAt: now } : item);
}

export function executeToggleItemPriority(items: ShortageItem[], id: string): ShortageItem[] {
  const target = items.find(i => i.id === id);
  if (!target) return items;
  const nextPriority: 'normal' | 'urgent' = target.priority === 'urgent' ? 'normal' : 'urgent';
  const now = new Date().toISOString();
  persistUpdateShortageItem(id, { priority: nextPriority, updatedAt: now }).catch(() => {});
  return items.map(item => item.id === id ? { ...item, priority: nextPriority, updatedAt: now } : item);
}

export function executeToggleItemCheck(items: ShortageItem[], id: string): ShortageItem[] {
  const target = items.find(i => i.id === id);
  if (!target) return items;
  const nextChecked = !target.isChecked;
  const now = new Date().toISOString();
  persistUpdateShortageItem(id, { isChecked: nextChecked, updatedAt: now }).catch(() => {});
  return items.map(item => item.id === id ? { ...item, isChecked: nextChecked, updatedAt: now } : item);
}

export function executeToggleAllCheck(items: ShortageItem[], filtered: ShortageItem[], checked?: boolean): ShortageItem[] {
  if (filtered.length === 0) return items;
  const targetVal = checked !== undefined ? checked : !filtered.every(i => i.isChecked);
  const idsToUpdate = new Set(filtered.map(i => i.id));
  const now = new Date().toISOString();
  Array.from(idsToUpdate).forEach(id => {
    persistUpdateShortageItem(id, { isChecked: targetVal, updatedAt: now }).catch(() => {});
  });
  return items.map(item => idsToUpdate.has(item.id) ? { ...item, isChecked: targetVal, updatedAt: now } : item);
}

export function executeRemoveItem(items: ShortageItem[], id: string): ShortageItem[] {
  persistDeleteShortageItem(id).catch(() => {});
  return items.filter(item => item.id !== id);
}

export function executeClearCheckedItems(items: ShortageItem[]): ShortageItem[] {
  const checked = items.filter(i => i.isChecked);
  if (checked.length === 0) return items;
  checked.forEach(item => persistDeleteShortageItem(item.id).catch(() => {}));
  return items.filter(item => !item.isChecked);
}

export function executeClearAllItems(items: ShortageItem[], filtered: ShortageItem[]): ShortageItem[] {
  if (filtered.length === 0) return items;
  const idsToDelete = new Set(filtered.map(i => i.id));
  idsToDelete.forEach(id => persistDeleteShortageItem(id).catch(() => {}));
  return items.filter(item => !idsToDelete.has(item.id));
}

