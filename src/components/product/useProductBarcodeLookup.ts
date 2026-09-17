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
      const cleanBc = (barcode || '').trim().toLowerCase();
      if (!cleanBc || cleanBc.length < 3) return;

      // 1. Recherche locale 0ms (RAM) si le produit existe déjà localement
      const existingProduct = products.find(p => 
        p && (
          (p.barcode && String(p.barcode).trim().toLowerCase() === cleanBc) ||
          (p.sku && String(p.sku).trim().toLowerCase() === cleanBc)
        )
      );

      if (existingProduct) {
        setFormData((prev: any) => ({
          ...prev,
          name: prev.name || existingProduct.name || '',
          price: prev.price || (existingProduct.price ?? '').toString(),
          costPrice: prev.costPrice || (existingProduct.costPrice ?? '').toString(),
          wholesalePrice: prev.wholesalePrice || (existingProduct.wholesalePrice ?? '').toString(),
          categoryId: prev.categoryId || existingProduct.categoryId || '',
          brandId: prev.brandId || existingProduct.brandId || '',
          unit: prev.unit || existingProduct.unit || 'unité',
          imageUrl: prev.imageUrl || existingProduct.imageUrl || '',
          description: prev.description || existingProduct.description || ''
        }));
        return;
      }

      if (cleanBc.length < 8 || name) return;

      // 2. Recherche externe OpenFoodFacts avec timeout strict de 1.2s
      setIsGlobalLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanBc}.json`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === 1 && data.product) {
          const product = data.product;
          
          setFormData((prev: any) => ({
            ...prev,
            name: prev.name || product.product_name || product.product_name_fr || '',
            description: prev.description || product.generic_name || product.generic_name_fr || '',
            imageUrl: prev.imageUrl || product.image_url || product.image_front_url || '',
            imageUrls: (product.image_url || product.image_front_url) 
              ? [product.image_url || product.image_front_url, ...(prev.imageUrls || [])].slice(0, 5) 
              : prev.imageUrls
          }));

          // Trouve la catégorie correspondante si possible
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
        // Ignorer les erreurs d'API externe ou de timeout
      } finally {
        clearTimeout(timeoutId);
        setIsGlobalLoading(false);
      }
    };

    const timer = setTimeout(() => {
      lookupBarcode(sku);
    }, 400);

    return () => clearTimeout(timer);
  }, [sku, categories, products]);

  return { isGlobalLoading };
}
