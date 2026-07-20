import { useState, useEffect } from 'react';
import { Product, Category } from '../../types';

interface UseProductBarcodeLookupProps {
  sku: string;
  name: string;
  products: Product[];
  categories: Category[];
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function useProductBarcodeLookup({
  sku,
  name,
  products,
  categories,
  setFormData
}: UseProductBarcodeLookupProps) {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  useEffect(() => {
    const lookupBarcode = async (barcode: string) => {
      if (!barcode || barcode.length < 8) return;
      
      // Don't lookup if we already have a name or if it's already in the DB
      if (name && products.find(p => p.sku === barcode)) return;

      setIsGlobalLoading(true);
      try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
          const product = data.product;
          
          setFormData((prev: any) => ({
            ...prev,
            name: prev.name || product.product_name || product.product_name_fr || '',
            description: prev.description || product.generic_name || product.generic_name_fr || '',
            imageUrl: prev.imageUrl || product.image_url || product.image_front_url || '',
            imageUrls: (product.image_url || product.image_front_url) 
              ? [product.image_url || product.image_front_url, ...prev.imageUrls].slice(0, 5) 
              : prev.imageUrls
          }));

          // Try to find matching category
          if (product.categories) {
            const worldCategories = product.categories.split(',');
            for (const worldCat of worldCategories) {
              const matchedCat = categories.find(c => 
                c.name.toLowerCase().includes(worldCat.trim().toLowerCase()) || 
                worldCat.trim().toLowerCase().includes(c.name.toLowerCase())
              );
              if (matchedCat) {
                setFormData((prev: any) => ({ ...prev, categoryId: matchedCat.id }));
                break;
              }
            }
          }
        }
      } catch (error) {
        console.warn("[Barcode Lookup Info] External API lookup bypassed or offline:", error);
      } finally {
        setIsGlobalLoading(false);
      }
    };

    const timer = setTimeout(() => {
      lookupBarcode(sku);
    }, 500);

    return () => clearTimeout(timer);
  }, [sku, categories, products]);

  return { isGlobalLoading };
}
