import React, { useState, useEffect } from 'react';
import * as LocalDBModule from '../lib/local-db';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  stock: number;
  categoryId?: string;
}

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProducts = () => {
      const dbState = LocalDBModule.dbState || {};
      const rawProducts = dbState['products'] || {};
      const productList = Object.values(rawProducts) as Product[];
      setProducts(productList);
    };

    // Chargement initial des produits
    loadProducts();

    // Récupération de la fonction d'écoute disponible dans local-db (onObserver / addObserver / subscribeObservers)
    const subscribe =
      (LocalDBModule as any).onObserver ||
      (LocalDBModule as any).addObserver ||
      (LocalDBModule as any).subscribeObservers;

    let unsubscribe: any = null;

    if (typeof subscribe === 'function') {
      unsubscribe = subscribe('products', () => {
        loadProducts();
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Filtrage rapide en mémoire
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.includes(query)
    );
  });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion du Stock / Inventaire</h1>
          <p className="text-sm text-gray-500">{products.length} articles référencés en base locale</p>
        </div>
        <div className="w-72">
          <input
            type="text"
            placeholder="Rechercher par nom, SKU ou code-barres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="p-4">Article</th>
                <th className="p-4">Code / SKU</th>
                <th className="p-4 text-right">Prix de vente</th>
                <th className="p-4 text-center">Stock disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    {searchQuery ? 'Aucun article ne correspond à votre recherche.' : 'Aucun produit enregistré.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{product.sku || product.barcode || '-'}</td>
                    <td className="p-4 text-right font-semibold text-emerald-600">
                      {Number(product.price || 0).toLocaleString()} DZD
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (product.stock || 0) <= 5
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {product.stock || 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};