import { Product, normalizeBatches } from '../../types';

export interface ProductFormData {
  name: string;
  price: string;
  costPrice: string;
  taxRate: string;
  stock: string;
  minStock: string;
  categoryId: string;
  brandId: string;
  supplier: string;
  unit: string;
  sku: string;
  barcode: string;
  status: string;
  imageUrl: string;
  imageUrls: string[];
  description: string;
  isBundle: boolean;
  wholesalePrice: string;
  onlinePrice: string;
  tags: string;
  location: string;
  reference: string;
  expirationDate: string;
  batchNumber: string;
  showInPos: boolean;
  isQuickSelect: boolean;
  bundleItems: { productId: string; quantity: number }[];
  parentId: string;
  unitsPerParent: string;
  autoUnpack: boolean;
  quantityDiscounts: { minQuantity: number; discountPrice: number }[];
  operationalCosts: { packaging: string; shipping: string; other: string };
  batches: { id: string; batchNumber: string; expirationDate: string; stock: number }[];
  useMultiExpiry: boolean;
  damagedStock: string;
}

export function buildInitialFormData(
  editingProduct: Product | null,
  defaultTaxRate: string | number = '0'
): ProductFormData {
  if (editingProduct) {
    return {
      name: editingProduct.name || '',
      price: (editingProduct.price ?? '').toString(),
      costPrice: (editingProduct.costPrice ?? 0).toString(),
      taxRate: (editingProduct.taxRate ?? defaultTaxRate ?? 0).toString(),
      stock: (editingProduct.stock ?? 0).toString(),
      minStock: (editingProduct.minStock ?? 5).toString(),
      categoryId: editingProduct.categoryId || '',
      brandId: editingProduct.brandId || '',
      supplier: editingProduct.supplier || '',
      unit: editingProduct.unit || 'unité',
      sku: editingProduct.sku || '',
      barcode: (!editingProduct.id ? '' : (editingProduct as any).barcode) || '',
      status: editingProduct.status || 'active',
      imageUrl: editingProduct.imageUrl || '',
      imageUrls: editingProduct.imageUrls || (editingProduct.imageUrl ? [editingProduct.imageUrl] : []),
      description: editingProduct.description || '',
      isBundle: editingProduct.isBundle || false,
      wholesalePrice: (editingProduct.wholesalePrice ?? '').toString(),
      onlinePrice: (editingProduct.onlinePrice ?? '').toString(),
      tags: (editingProduct.tags || []).join(', '),
      location: editingProduct.location || '',
      reference: editingProduct.reference || '',
      batchNumber: editingProduct.batchNumber || '',
      parentId: editingProduct.parentId || '',
      unitsPerParent: editingProduct.unitsPerParent?.toString() || '',
      autoUnpack: editingProduct.autoUnpack || false,
      expirationDate: editingProduct.expirationDate || '',
      showInPos: editingProduct.showInPos !== false,
      isQuickSelect: editingProduct.isQuickSelect || false,
      bundleItems: editingProduct.bundleItems || [],
      quantityDiscounts: editingProduct.quantityDiscounts || [],
      operationalCosts: {
        packaging: editingProduct.operationalCosts?.packaging?.toString() || '',
        shipping: editingProduct.operationalCosts?.shipping?.toString() || '',
        other: editingProduct.operationalCosts?.other?.toString() || ''
      },
      batches: normalizeBatches(editingProduct.batches),
      useMultiExpiry: editingProduct.useMultiExpiry || false,
      damagedStock: (editingProduct.damagedStock ?? 0).toString()
    };
  }

  return { 
    name: '', price: '', costPrice: '', taxRate: defaultTaxRate.toString() || '0', 
    stock: '', minStock: '5', categoryId: '', brandId: '', supplier: '', 
    unit: 'unité', sku: '', barcode: '', status: 'active', imageUrl: '', description: '',
    imageUrls: [],
    isBundle: false, wholesalePrice: '', onlinePrice: '', tags: '', location: '', reference: '', expirationDate: '', batchNumber: '', showInPos: true, isQuickSelect: false, bundleItems: [], quantityDiscounts: [],
    operationalCosts: { packaging: '', shipping: '', other: '' },
    parentId: '', unitsPerParent: '1', autoUnpack: false,
    batches: [],
    useMultiExpiry: false,
    damagedStock: '0'
  };
}
