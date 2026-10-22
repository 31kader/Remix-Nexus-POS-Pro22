import React, { useState, useMemo } from 'react';
import { 
  Package, ShoppingCart, TrendingUp, DollarSign, Calendar, Search, 
  ArrowUpDown, FileSpreadsheet, Database, ChevronLeft, ChevronRight,
  Layers, Percent, Award, Sparkles, Filter, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  startOfDay, endOfDay, subDays, startOfMonth, parseISO, isWithinInterval, isYesterday, isToday 
} from 'date-fns';
import { Card, Button } from '../ui';
import { Transaction, Product, Category, CompanySettings, Employee, isTopUpTransaction } from '../../types';
import { formatPrice, formatSafe, exportToExcel, exportToCSV, cn, calculateItemPrice } from '../../lib/utils';

// Helper ultra-sécurisé pour désérialiser les items stockés en JSON string ou Array
function parseTransactionItems(itemsField: any): any[] {
  if (!itemsField) return [];
  if (Array.isArray(itemsField)) return itemsField;
  if (typeof itemsField === 'string') {
    try {
      const parsed = JSON.parse(itemsField);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface GroupedSalesAndBasketsReportProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  employees?: Employee[];
}

export function GroupedSalesAndBasketsReport({
  transactions = [],
  products = [],
  categories = [],
  settings,
  employees = []
}: GroupedSalesAndBasketsReportProps) {
  const [activeSubTab, setActiveSubTab] = useState<'grouped_products' | 'basket_profits'>('grouped_products');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'this_month' | 'all' | 'custom'>('this_month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'qty' | 'revenue' | 'profit'>('qty');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBasketId, setExpandedBasketId] = useState<string | null>(null);

  // Indexation multi-critères O(1) pour une résolution rapide et exacte du catalogue
  const { productsById, productsBySku, productsByBarcode, productsByName } = useMemo(() => {
    const byId = new Map<string, Product>();
    const bySku = new Map<string, Product>();
    const byBarcode = new Map<string, Product>();
    const byName = new Map<string, Product>();

    (products || []).forEach(p => {
      if (p.id) byId.set(p.id, p);
      if (p.sku) bySku.set(p.sku.toLowerCase().trim(), p);
      if (p.barcode) byBarcode.set(p.barcode.toLowerCase().trim(), p);
      if (p.name) byName.set(p.name.toLowerCase().trim(), p);
    });

    return { productsById: byId, productsBySku: bySku, productsByBarcode: byBarcode, productsByName: byName };
  }, [products]);

  // Résolution multi-niveaux d'un article vers son produit de catalogue
  const resolveProduct = (item: any): Product | undefined => {
    if (!item) return undefined;
    const idKey = (item as any).productId || item.id;
    if (idKey && productsById.has(idKey)) return productsById.get(idKey);

    const skuKey = String(item.sku || '').toLowerCase().trim();
    if (skuKey && productsBySku.has(skuKey)) return productsBySku.get(skuKey);

    const barcodeKey = String(item.barcode || '').toLowerCase().trim();
    if (barcodeKey && productsByBarcode.has(barcodeKey)) return productsByBarcode.get(barcodeKey);

    const nameKey = String(item.name || '').toLowerCase().trim();
    if (nameKey && productsByName.has(nameKey)) return productsByName.get(nameKey);

    return undefined;
  };

  // Résolution fiable du coût unitaire d'achat (costPrice)
  const resolveCostPerUnit = (item: any, matchedProduct?: Product): number => {
    // 1. Coût unitaire enregistré dans l'article au moment de la vente
    const itemCost = Number((item as any).costPrice ?? (item as any).cost_price);
    if (!isNaN(itemCost) && itemCost > 0) return itemCost;

    // 2. Coût unitaire du produit dans le catalogue actuel
    const p = matchedProduct || resolveProduct(item);
    const catalogCost = Number(p?.costPrice ?? (p as any)?.cost_price);
    if (!isNaN(catalogCost) && catalogCost > 0) return catalogCost;

    return 0;
  };

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [categories]);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return (transactions || []).filter(t => {
      if (t.status === 'returned' || t.status === 'cancelled' || isTopUpTransaction(t)) return false;
      const dateVal = t.timestamp || (t as any).date || (t as any).created_at;
      if (!dateVal) return true;
      const tDate = new Date(dateVal);

      if (dateFilter === 'today') {
        return isToday(tDate);
      } else if (dateFilter === 'yesterday') {
        return isYesterday(tDate);
      } else if (dateFilter === 'last7days') {
        return isWithinInterval(tDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
      } else if (dateFilter === 'last30days') {
        return isWithinInterval(tDate, { start: startOfDay(subDays(now, 30)), end: endOfDay(now) });
      } else if (dateFilter === 'this_month') {
        return isWithinInterval(tDate, { start: startOfMonth(now), end: endOfDay(now) });
      } else if (dateFilter === 'custom') {
        if (!customRange.start || !customRange.end) return true;
        const start = startOfDay(parseISO(customRange.start));
        const end = endOfDay(parseISO(customRange.end));
        return isWithinInterval(tDate, { start, end });
      }
      return true;
    });
  }, [transactions, dateFilter, customRange]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Calcul des PRODUITS GROUPÉS (Quantités cumulées, CA, Bénéfice)
  // ─────────────────────────────────────────────────────────────────────────────
  const groupedProductsData = useMemo(() => {
    const map = new Map<string, {
      productId: string;
      productName: string;
      sku: string;
      categoryName: string;
      totalQuantity: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      averagePrice: number;
      marginPercent: number;
      transactionCount: number;
    }>();

    filteredTransactions.forEach(t => {
      const items = parseTransactionItems(t.items);
      // 🛡️ P1-BIZ-15 : Prise en compte du ratio de remise globale du panier (remises directes, bons, points fidélité)
      const txSubtotal = items.reduce((s, it) => s + (Number(it.quantity) || 1) * calculateItemPrice(it, t.isWholesale), 0);
      const discountRatio = txSubtotal > 0 ? Math.max(0, Math.min(1, (Number(t.total) || 0) / txSubtotal)) : 1;

      items.forEach(item => {
        const matchedProduct = resolveProduct(item);
        const prodId = matchedProduct?.id || (item as any).productId || item.id || item.name;
        const qty = Number(item.quantity) || 1;
        const itemPrice = calculateItemPrice(item, t.isWholesale);
        const revenue = qty * itemPrice * discountRatio;
        
        // Coût unitaire certifié
        const costPerUnit = resolveCostPerUnit(item, matchedProduct);
        const cost = qty * costPerUnit;
        const profit = revenue - cost;

        const catName = matchedProduct?.categoryId ? (categoriesMap.get(matchedProduct.categoryId) || 'Non classé') : 'Non classé';

        if (!map.has(prodId)) {
          map.set(prodId, {
            productId: prodId,
            productName: item.name || matchedProduct?.name || 'Article',
            sku: item.sku || matchedProduct?.sku || '—',
            categoryName: catName,
            totalQuantity: qty,
            totalRevenue: revenue,
            totalCost: cost,
            totalProfit: profit,
            averagePrice: itemPrice,
            marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
            transactionCount: 1
          });
        } else {
          const existing = map.get(prodId)!;
          existing.totalQuantity += qty;
          existing.totalRevenue += revenue;
          existing.totalCost += cost;
          existing.totalProfit += profit;
          existing.averagePrice = existing.totalQuantity > 0 ? existing.totalRevenue / existing.totalQuantity : itemPrice;
          existing.marginPercent = existing.totalRevenue > 0 ? (existing.totalProfit / existing.totalRevenue) * 100 : 0;
          existing.transactionCount += 1;
        }
      });
    });

    let list = Array.from(map.values());

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.productName.toLowerCase().includes(term) || 
        item.sku.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter(item => item.categoryName === categoryFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'qty') diff = b.totalQuantity - a.totalQuantity;
      else if (sortBy === 'revenue') diff = b.totalRevenue - a.totalRevenue;
      else if (sortBy === 'profit') diff = b.totalProfit - a.totalProfit;
      return sortDirection === 'desc' ? diff : -diff;
    });

    return list;
  }, [filteredTransactions, productsById, productsBySku, productsByBarcode, productsByName, categoriesMap, searchTerm, categoryFilter, sortBy, sortDirection]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Calcul du BÉNÉFICE PAR PANIER (Rentabilité par transaction)
  // ─────────────────────────────────────────────────────────────────────────────
  const basketProfitsData = useMemo(() => {
    let list = filteredTransactions.map(t => {
      const items = parseTransactionItems(t.items);
      let basketCost = 0;
      let totalItemsCount = 0;
      let itemsTotalRevenue = 0;

      items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        totalItemsCount += qty;
        const itemPrice = calculateItemPrice(item, t.isWholesale);
        itemsTotalRevenue += (itemPrice * qty);

        const matchedProduct = resolveProduct(item);
        const costPerUnit = resolveCostPerUnit(item, matchedProduct);
        basketCost += (costPerUnit * qty);
      });

      // Le total net du panier
      const basketTotal = Number(t.total) || itemsTotalRevenue || 0;
      const basketProfit = basketTotal - basketCost;
      const marginPercent = basketTotal > 0 ? (basketProfit / basketTotal) * 100 : 0;

      return {
        id: t.id,
        timestamp: t.timestamp || (t as any).date || (t as any).created_at,
        customerName: t.customerName || (t.customerId ? 'Client #' + t.customerId.slice(-4) : 'Client Comptoir'),
        employeeName: t.employeeName || 'Caisse',
        itemsCount: totalItemsCount,
        basketTotal,
        basketCost,
        basketProfit,
        marginPercent,
        items
      };
    });

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(term) || 
        b.customerName.toLowerCase().includes(term) ||
        b.employeeName.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'profit') diff = b.basketProfit - a.basketProfit;
      else if (sortBy === 'revenue') diff = b.basketTotal - a.basketTotal;
      else if (sortBy === 'qty') diff = b.itemsCount - a.itemsCount;
      return sortDirection === 'desc' ? diff : -diff;
    });

    return list;
  }, [filteredTransactions, productsById, productsBySku, productsByBarcode, productsByName, searchTerm, sortBy, sortDirection]);


  // Global KPIs for Grouped Products
  const groupedTotals = useMemo(() => {
    const totalQty = groupedProductsData.reduce((sum, p) => sum + p.totalQuantity, 0);
    const totalRev = groupedProductsData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalProf = groupedProductsData.reduce((sum, p) => sum + p.totalProfit, 0);
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    return { totalQty, totalRev, totalProf, avgMargin, uniqueProducts: groupedProductsData.length };
  }, [groupedProductsData]);

  // Global KPIs for Baskets
  const basketTotals = useMemo(() => {
    const totalBaskets = basketProfitsData.length;
    const totalRev = basketProfitsData.reduce((sum, b) => sum + b.basketTotal, 0);
    const totalProf = basketProfitsData.reduce((sum, b) => sum + b.basketProfit, 0);
    const avgBasketRevenue = totalBaskets > 0 ? totalRev / totalBaskets : 0;
    const avgBasketProfit = totalBaskets > 0 ? totalProf / totalBaskets : 0;
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    const maxProfitBasket = basketProfitsData.length > 0 ? Math.max(...basketProfitsData.map(b => b.basketProfit)) : 0;
    return { totalBaskets, totalRev, totalProf, avgBasketRevenue, avgBasketProfit, avgMargin, maxProfitBasket };
  }, [basketProfitsData]);

  // Pagination
  const currentList = activeSubTab === 'grouped_products' ? groupedProductsData : basketProfitsData;
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const pagedList = useMemo(() => {
    const from = (validPage - 1) * pageSize;
    return currentList.slice(from, from + pageSize);
  }, [currentList, validPage, pageSize]);

  // Exports
  const handleExportExcel = () => {
    if (activeSubTab === 'grouped_products') {
      const data = groupedProductsData.map(p => ({
        'Produit': p.productName,
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
  };

  const handleExportCSV = () => {
    if (activeSubTab === 'grouped_products') {
      const data = groupedProductsData.map(p => ({
        produit: p.productName,
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
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Sub-tab switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Layers className="text-indigo-400" size={28} />
            Analyse Avancée : Ventes Groupées & Bénéfice Panier
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visualisez les volumes cumulés par produit et la rentabilité nette de chaque panier client.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={() => { setActiveSubTab('grouped_products'); setCurrentPage(1); }}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'grouped_products'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package size={15} /> Produits Groupés
            </button>
            <button
              onClick={() => { setActiveSubTab('basket_profits'); setCurrentPage(1); }}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'basket_profits'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart size={15} /> Bénéfice par Panier
            </button>
          </div>

          <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold">
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 text-xs font-bold">
            <Database size={15} /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {activeSubTab === 'grouped_products' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Articles Cumulés</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Package size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-white mt-2 font-mono">{groupedTotals.totalQty}</p>
            <p className="text-[10px] text-slate-500 mt-1">sur {groupedTotals.uniqueProducts} références uniques</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chiffre d'Affaires</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-blue-400 mt-2 font-mono">{formatPrice(groupedTotals.totalRev)} <span className="text-sm font-sans">{settings.currency}</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Total des ventes consolidées</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bénéfice Net Produit</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">+{formatPrice(groupedTotals.totalProf)} <span className="text-sm font-sans">{settings.currency}</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Marge brute dégagée</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux de Marge Moyen</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Percent size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{groupedTotals.avgMargin.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500 mt-1">Rentabilité globale des articles</p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Panier Moyen (CA)</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShoppingCart size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-white mt-2 font-mono">{formatPrice(basketTotals.avgBasketRevenue)} <span className="text-sm font-sans">{settings.currency}</span></p>
            <p className="text-[10px] text-slate-500 mt-1">sur {basketTotals.totalBaskets} paniers validés</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bénéfice Moyen / Panier</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">+{formatPrice(basketTotals.avgBasketProfit)} <span className="text-sm font-sans">{settings.currency}</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Profit net moyen par client</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Marge Moyenne Panier</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Percent size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{basketTotals.avgMargin.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500 mt-1">Taux de rentabilité par ticket</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border border-slate-800 ">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Panier Record Profit</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Award size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-purple-400 mt-2 font-mono">+{formatPrice(basketTotals.maxProfitBasket)} <span className="text-sm font-sans">{settings.currency}</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Gain max sur une seule commande</p>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <Card className="p-4 bg-slate-900/60 border border-slate-800  space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: 'last7days', label: '7 jours' },
              { id: 'last30days', label: '30 jours' },
              { id: 'this_month', label: 'Ce mois' },
              { id: 'all', label: 'Tout' },
              { id: 'custom', label: 'Période...' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setDateFilter(f.id as any); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dateFilter === f.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={activeSubTab === 'grouped_products' ? "Rechercher un produit, SKU..." : "Rechercher un ticket, client..."}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Custom Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Du :</label>
              <input
                type="date"
                value={customRange.start}
                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Au :</label>
              <input
                type="date"
                value={customRange.end}
                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Sub-Filters & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/60">
          {activeSubTab === 'grouped_products' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Catégorie :</span>
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">Trier par :</span>
            <button
              onClick={() => {
                if (sortBy === 'qty') setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
                else { setSortBy('qty'); setSortDirection('desc'); }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sortBy === 'qty' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Quantité {sortBy === 'qty' && (sortDirection === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'revenue') setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
                else { setSortBy('revenue'); setSortDirection('desc'); }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sortBy === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Chiffre d'Affaires {sortBy === 'revenue' && (sortDirection === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'profit') setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
                else { setSortBy('profit'); setSortDirection('desc'); }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sortBy === 'profit' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Bénéfice Net {sortBy === 'profit' && (sortDirection === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden bg-slate-900/60 border border-slate-800 ">
        <div className="w-full overflow-x-auto">
          {activeSubTab === 'grouped_products' ? (
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Désignation du Produit</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4 text-center">Quantité Totale Vendue</th>
                  <th className="p-4 text-right">Prix Moyen</th>
                  <th className="p-4 text-right">CA Réalisé</th>
                  <th className="p-4 text-right">Bénéfice Net</th>
                  <th className="p-4 text-right">Marge %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {pagedList.map((item: any) => (
                  <tr key={item.productId} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.sku} • {item.transactionCount} transactions</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {item.categoryName}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-3 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl font-black font-mono text-sm">
                        {item.totalQuantity} unités
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-300 font-bold">
                      {formatPrice(item.averagePrice)} {settings.currency}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-blue-400">
                      {formatPrice(item.totalRevenue)} {settings.currency}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-400">
                      +{formatPrice(item.totalProfit)} {settings.currency}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-black font-mono text-xs border ${
                        item.marginPercent >= 25 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : item.marginPercent >= 10 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {item.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {pagedList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 font-mono ">
                      AUCUN PRODUIT VENDU SUR CETTE PÉRIODE
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">N° Ticket / Panier</th>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Client / Caissier</th>
                  <th className="p-4 text-center">Nombre Articles</th>
                  <th className="p-4 text-right">Total CA Panier</th>
                  <th className="p-4 text-right">Coût Marchandises</th>
                  <th className="p-4 text-right">Bénéfice Net Panier</th>
                  <th className="p-4 text-right">Rentabilité Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {pagedList.map((basket: any) => {
                  const isExpanded = expandedBasketId === basket.id;
                  return (
                    <React.Fragment key={basket.id}>
                      <tr 
                        onClick={() => setExpandedBasketId(isExpanded ? null : basket.id)}
                        className={cn(
                          "transition-colors cursor-pointer select-none",
                          isExpanded ? "bg-indigo-950/40 hover:bg-indigo-950/50" : "hover:bg-white/5"
                        )}
                        title="Cliquer pour afficher/masquer le détail des articles de ce panier"
                      >
                        <td className="p-4 font-mono font-bold text-indigo-400">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={14} className="text-indigo-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
                            <span>#{basket.id.slice(-8).toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-xs">
                          {formatSafe(basket.timestamp, 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-white text-xs">{basket.customerName}</p>
                          <p className="text-[10px] text-slate-500">Caissier : {basket.employeeName}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold">
                            {basket.itemsCount} art.
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-white">
                          {formatPrice(basket.basketTotal)} {settings.currency}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400 text-xs">
                          {formatPrice(basket.basketCost)} {settings.currency}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-emerald-400 text-sm">
                          +{formatPrice(basket.basketProfit)} {settings.currency}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`px-2.5 py-1 rounded-lg font-black font-mono text-xs border ${
                            basket.marginPercent >= 25 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : basket.marginPercent >= 10 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {basket.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>

                      {/* Ligne accordéon : Détail des articles du panier */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-indigo-500/20">
                          <td colSpan={8} className="p-3 pl-8">
                            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                                  Détail des articles du Ticket #{basket.id.slice(-8).toUpperCase()} ({basket.items?.length || 0} référence(s))
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  Total : {formatPrice(basket.basketTotal)} {settings.currency}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-[9px] uppercase font-black text-slate-500 border-b border-slate-800 pb-1">
                                      <th className="pb-1.5">Article</th>
                                      <th className="pb-1.5 text-center">Quantité</th>
                                      <th className="pb-1.5 text-right">Prix Vente</th>
                                      <th className="pb-1.5 text-right">Sous-Total</th>
                                      <th className="pb-1.5 text-right">Coût Est.</th>
                                      <th className="pb-1.5 text-right">Bénéfice</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {(basket.items || []).map((item: any, idx: number) => {
                                      const qty = Number(item.quantity) || 1;
                                      const price = Number(item.price) || 0;
                                      const itemRev = qty * price;
                                      const unitCost = resolveCostPerUnit(item);
                                      const itemCost = qty * unitCost;
                                      const itemProfit = itemRev - itemCost;
                                      return (
                                        <tr key={idx} className="hover:bg-white/5">
                                          <td className="py-1.5 text-white font-medium">
                                            {item.name || 'Article'}
                                            {item.sku && <span className="text-[9px] text-slate-400 font-mono ml-2">({item.sku})</span>}
                                          </td>
                                          <td className="py-1.5 text-center font-mono font-bold text-slate-300">{qty}</td>
                                          <td className="py-1.5 text-right font-mono text-slate-400">{formatPrice(price)} {settings.currency}</td>
                                          <td className="py-1.5 text-right font-mono font-bold text-white">{formatPrice(itemRev)} {settings.currency}</td>
                                          <td className="py-1.5 text-right font-mono text-slate-400">{formatPrice(itemCost)} {settings.currency}</td>
                                          <td className="py-1.5 text-right font-mono font-bold text-emerald-400">+{formatPrice(itemProfit)} {settings.currency}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {pagedList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 font-mono ">
                      AUCUN PANIER TROUVÉ SUR CETTE PÉRIODE
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Lignes par page :</span>
            {[50, 100, 200].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => { setPageSize(size); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  pageSize === size
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {currentList.length > 0
                ? `${(validPage - 1) * pageSize + 1}-${Math.min(validPage * pageSize, currentList.length)} sur ${currentList.length}`
                : '0 sur 0'}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold"
                >
                  <ChevronLeft size={16} /> Précédent
                </button>
                <span className="text-xs font-bold text-indigo-400 px-2">
                  Page {validPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold"
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
