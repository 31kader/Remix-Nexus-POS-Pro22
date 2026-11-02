import { useState, useEffect } from 'react';
import { Product } from '../../types';
import { useSearchWorker } from '../../hooks/useSearchWorker';

interface UseCheckoutProductsSearchProps {
  products: Product[];
  deferredSearch: string;
}

export function useCheckoutProductsSearch({ products, deferredSearch }: UseCheckoutProductsSearchProps) {
  // ⚡ Worker de recherche hors thread principal : 0 saccade sur 11 700 articles
  const { searchProducts } = useSearchWorker(products);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    return safeProducts.filter(p => p && p.status === 'active').slice(0, 100);
  });

  useEffect(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    if (!deferredSearch || !deferredSearch.trim()) {
      setFilteredProducts(safeProducts.filter(p => p && p.status === 'active').slice(0, 100));
      return;
    }

    let isMounted = true;
    searchProducts(deferredSearch, 80).then((matches) => {
      if (isMounted) {
        setFilteredProducts(matches || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [deferredSearch, products, searchProducts]);

  return {
    filteredProducts,
  };
}
