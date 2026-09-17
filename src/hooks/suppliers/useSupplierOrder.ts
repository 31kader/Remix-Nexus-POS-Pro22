import { useState, useMemo } from 'react';
import { Supplier, Product, PurchaseOrder } from '../../types';

export const useSupplierOrder = (supplier: Supplier, handleCreatePurchaseOrder: any, products: Product[], purchaseOrders: PurchaseOrder[]) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; price: number; vat?: number; discount?: number; }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const filteredProducts = useMemo(() => {
    const availableProducts = supplier.hasFullInventoryAccess 
      ? products 
      : products.filter(p => {
          const pSupp = (p.supplier || '').toLowerCase().trim();
          const sName = (supplier.name || '').toLowerCase().trim();
          const sId = (supplier.id || '').toLowerCase().trim();
          return pSupp === sName || pSupp === sId;
        });
        
    if (!searchQuery.trim()) return availableProducts.slice(0, 50);
    const q = searchQuery.toLowerCase().trim();
    return availableProducts.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.sku || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [products, searchQuery, supplier.name, supplier.id, supplier.hasFullInventoryAccess]);

  const myOrders = useMemo(() => {
    return purchaseOrders.filter(o => o.supplierId === supplier.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchaseOrders, supplier.id]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCostPrice(product.costPrice || 0);
    setSearchQuery('');
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;
    setItems([...items, { 
      productId: selectedProduct.id, 
      productName: selectedProduct.name, 
      quantity, 
      price: costPrice 
    }]);
    setSelectedProduct(null);
    setQuantity(1);
    setCostPrice(0);
    setSearchQuery('');
  };

  const handleSubmit = async () => {
    if (!supplier || !orderNumber || items.length === 0) return;
    setIsSubmitting(true);
    try {
      await handleCreatePurchaseOrder({
        supplierId: supplier.id,
        orderNumber,
        items,
        total,
        status: 'pending'
      });
      setOrderNumber('');
      setItems([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    orderNumber, setOrderNumber,
    items, setItems,
    selectedProduct, setSelectedProduct,
    quantity, setQuantity,
    costPrice, setCostPrice,
    isSubmitting,
    total,
    searchQuery, setSearchQuery,
    isSearchFocused, setIsSearchFocused,
    filteredProducts,
    myOrders,
    handleSelectProduct,
    handleAddItem,
    handleSubmit
  };
};
