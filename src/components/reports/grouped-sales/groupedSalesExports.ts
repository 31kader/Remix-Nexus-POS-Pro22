import { formatPrice, formatSafe, exportToExcel, exportToCSV } from '../../../lib/utils';

export function exportGroupedSalesData(activeSubTab: 'grouped_products' | 'basket_profits', groupedProductsData: any[], basketProfitsData: any[]) {
  if (activeSubTab === 'grouped_products') {
    const data = groupedProductsData.map(p => ({
      'Code-barres': p.barcode || '—',
      'Nom de l\'article': p.productName,
      'SKU': p.sku,
      'Catégorie': p.categoryName,
      'Quantité Vendue': p.totalQuantity,
      'Prix Moyen (DA)': formatPrice(p.averagePrice),
      'Chiffre Affaires (DA)': formatPrice(p.totalRevenue),
      'Coût Total (DA)': formatPrice(p.totalCost),
      'Bénéfice Net (DA)': formatPrice(p.totalProfit),
      'Marge (%)': `${p.marginPercent.toFixed(1)}%`,
      'Nombre Transactions': p.transactionCount
    }));
    exportToExcel(data, 'produits_groupes_ventes');
  } else {
    const data = basketProfitsData.map(b => ({
      'N° Ticket': b.id,
      'Date': formatSafe(b.timestamp, 'yyyy-MM-dd HH:mm'),
      'Client': b.customerName,
      'Vendeur': b.employeeName,
      'Nombre Articles': b.itemsCount,
      'Total Vente (DA)': formatPrice(b.basketTotal),
      'Coût Marchandises (DA)': formatPrice(b.basketCost),
      'Bénéfice Net (DA)': formatPrice(b.basketProfit),
      'Marge Panier (%)': `${b.marginPercent.toFixed(1)}%`
    }));
    exportToExcel(data, 'benefices_par_panier');
  }
}

export function exportGroupedSalesCSV(activeSubTab: 'grouped_products' | 'basket_profits', groupedProductsData: any[], basketProfitsData: any[]) {
  if (activeSubTab === 'grouped_products') {
    const data = groupedProductsData.map(p => ({
      code_barre: p.barcode || '—',
      nom_article: p.productName,
      sku: p.sku,
      quantite_vendue: p.totalQuantity,
      chiffre_affaires: p.totalRevenue,
      benefice_net: p.totalProfit,
      marge_pourcent: p.marginPercent.toFixed(1)
    }));
    exportToCSV(data, 'produits_groupes');
  } else {
    const data = basketProfitsData.map(b => ({
      id: b.id,
      date: b.timestamp,
      client: b.customerName,
      articles: b.itemsCount,
      total: b.basketTotal,
      benefice: b.basketProfit,
      marge: b.marginPercent.toFixed(1)
    }));
    exportToCSV(data, 'benefice_panier');
  }
}
