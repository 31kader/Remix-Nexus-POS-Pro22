export const demoCategories = [
  { id: 'cat_boissons', name: 'Boissons', level: 1 },
  { id: 'cat_laitiers', name: 'Produits Laitiers', level: 1 },
  { id: 'cat_epicerie', name: 'Épicerie Fine', level: 1 }
];

export const demoBrands = [
  { id: 'brand_cocacola', name: 'Coca-Cola Company', description: 'Gamme de boissons gazeuses rafraîchissantes' },
  { id: 'brand_central', name: 'Centrale Danone', description: 'Produits laitiers et dérivés' },
  { id: 'brand_sidiali', name: 'Sidi Ali', description: 'Eau minérale naturelle marocaine' }
];

export const demoProducts = [
  { id: 'prod_coca_33', name: 'Coca-Cola Canette 33cl', barcode: '5449000000996', sku: 'COCA-33CL-CAN', price: 6.00, cost_price: 4.20, wholesale_price: 5.50, tax_rate: 20.00, stock: 120.0, min_stock: 20.0, category_id: 'cat_boissons', brand_id: 'brand_cocacola', unit: 'pcs', status: 'active', description: 'Boisson rafraîchissante aux extraits végétaux.', show_in_pos: true },
  { id: 'prod_eau_15', name: 'Sidi Ali Eau Minérale 1.5L', barcode: '6111242100021', sku: 'SIDI-ALI-1.5L', price: 6.50, cost_price: 4.80, wholesale_price: 6.00, tax_rate: 0.00, stock: 200.0, min_stock: 50.0, category_id: 'cat_boissons', brand_id: 'brand_sidiali', unit: 'pcs', status: 'active', description: 'Eau minérale plate naturelle de table.', show_in_pos: true },
  { id: 'prod_yaourt_nat', name: 'Centrale Yaourt Naturel 110g', barcode: '6111003001855', sku: 'YRT-NAT-110G', price: 2.50, cost_price: 1.90, wholesale_price: 2.30, tax_rate: 7.00, stock: 85.0, min_stock: 15.0, category_id: 'cat_laitiers', brand_id: 'brand_central', unit: 'pcs', status: 'active', description: 'Yaourt crémeux nature sans sucre ajouté.', show_in_pos: true }
];

export const demoOnlineOrders = [
  { id: 'ord_demo_1', external_order_id: 'NEX-1001', customer_name: 'Amine Alaoui', customer_phone: '+212612345678', customer_email: 'amine.alaoui@gmail.com', total: 18.50, status: 'pending', payment_status: 'unpaid', payment_method: 'cash', source: 'Online', delivery_method: 'delivery', shipping_address: 'Gauthier, Rue Allal Ben Abdellah, Bureau 3, Casablanca', items: [ { productId: 'prod_coca_33', name: 'Coca-Cola Canette 33cl', quantity: 2, price: 6.00 }, { productId: 'prod_yaourt_nat', name: 'Centrale Yaourt Naturel 110g', quantity: 1, price: 2.50 }, { productId: 'prod_eau_15', name: 'Sidi Ali Eau Minérale 1.5L', quantity: 1, price: 6.50 } ], created_at: new Date().toISOString(), timestamp: new Date().toISOString() },
  { id: 'ord_demo_2', external_order_id: 'NEX-1002', customer_name: 'Sofia Bensouda', customer_phone: '+212698765432', customer_email: 'sofia.b@gmail.com', total: 13.00, status: 'confirmed', payment_status: 'paid', payment_method: 'card', source: 'WhatsApp', delivery_method: 'pickup', pickup_time: '14:30', items: [ { productId: 'prod_eau_15', name: 'Sidi Ali Eau Minérale 1.5L', quantity: 2, price: 6.50 } ], created_at: new Date(Date.now() - 3600000).toISOString(), timestamp: new Date(Date.now() - 3600000).toISOString() }
];