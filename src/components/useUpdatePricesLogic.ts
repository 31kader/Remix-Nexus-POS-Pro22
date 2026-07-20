import { useState, useEffect } from 'react';
import { localDb } from '../services/LocalDatabase';
import { Product } from '../types';

export function useUpdatePricesLogic(items: any[], products: Product[], onComplete: () => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  const [updates, setUpdates] = useState<Record<string, { price: number; active: boolean }>>(() => {
    const initial: Record<string, { price: number; active: boolean }> = {};
    items.forEach(item => {
      if (item.productId) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const currentMargin = prod.price - (prod.costPrice || 0);
          const newPrice = item.costPrice + (currentMargin > 0 ? currentMargin : item.costPrice * 0.3);
          initial[item.productId] = { price: parseFloat(newPrice.toFixed(2)), active: true };
        }
      }
    });
    return initial;
  });

  const activeCount = Object.values(updates).filter(u => u.active).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'TEXTAREA') {
          return;
        }
        if (!isProcessing && activeCount > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleUpdate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isProcessing, activeCount, updates]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  const handleUpdate = async () => {
    setIsProcessing(true);
    try {
      for (const productId of Object.keys(updates)) {
        if (updates[productId].active) {
          if (!productId || productId === 'undefined') continue;
          await localDb.update('products/' + productId, { price: updates[productId].price });
        }
      }
      handleClose();
    } catch (error) {
      console.error("Error updating prices:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    isOpen,
    updates,
    setUpdates,
    activeCount,
    handleClose,
    handleUpdate
  };
}
