import React, { useState, useMemo } from 'react';
import {
  Search,
  Tag,
  Boxes,
  TrendingUp,
  Wallet,
  Package,
  Download,
  Edit,
  ArrowUpDown,
  Layers
} from 'lucide-react';
import { Card, SafeImage } from '../ui';
import { Product, Category, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface StockValueReportProps {
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  onEditProduct?: (product: Product) => void;
}

export const StockValueReport = React.memo(function StockValueReport({
  products = [],
  categories = [],
  settings,
  onEditProduct,
}: StockValueReportProps) {
  const [stockFilterCategory, setStockFilterCategory] = useState<string>('all');
  const [stockFilterStatus, setStockFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [stockFilterSearch, setStockFilterSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'sale_val_desc' | 'cost_val_desc' | 'profit_desc' | 'qty_desc' | 'name_asc'>('sale_val_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 50;

  const deferredStockFilterSearch = React.useDeferredValue(stockFilterSearch);

  // Dictionnaire intelligent pour relier chaque produit à sa catégorie (par ID ou par Nom)
  const categoryLookup = useMemo(() => {
    const byId = new Map<string, Category>();
    const byName = new Map<string, Category>();
    (categories || []).forEach(cat => {
      if (cat?.id) byId.set(String(cat.id).trim(), cat);
      if (cat?.name) byName.set(cat.name.toLowerCase().trim(), cat);
    });

    const resolveCategoryId = (p: Product): { id: string; name: string } => {
      const rawId = String(p.categoryId || '').trim();
      const rawCat = String((p as any).category || '').trim();

      if (rawId && byId.has(rawId)) {
        const c = byId.get(rawId)!;
        return { id: c.id, name: c.name };
      }
      if (rawCat && byId.has(rawCat)) {
        const c = byId.get(rawCat)!;
        return { id: c.id, name: c.name };
      }
      if (rawCat && byName.has(rawCat.toLowerCase())) {
        const c = byName.get(rawCat.toLowerCase())!;
        return { id: c.id, name: c.name };
      }
      if (rawId && byName.has(rawId.toLowerCase())) {
        const c = byName.get(rawId.toLowerCase())!;
        return { id: c.id, name: c.name };
      }
      if (rawCat && rawCat !== 'none' && rawCat !== 'undefined') {
        return { id: `custom:${rawCat.toLowerCase()}`, name: rawCat };
      }
      return { id: 'uncategorized', name: 'Sans Catégorie' };
    };

    return { resolveCategoryId };
  }, [categories]);

  const filteredStockProducts = useMemo(() => {
    const query = deferredStockFilterSearch ? deferredStockFilterSearch.toLowerCase().trim() : '';

    return (products || []).filter(p => {
      const resolvedCat = categoryLookup.resolveCategoryId(p);
      if (stockFilterCategory !== 'all' && resolvedCat.id !== stockFilterCategory) {
        return false;
      }

      const stock = Number(p.stock || 0);
      const minStock = Number(p.minStock || 5);
      if (stockFilterStatus === 'in_stock' && stock <= 0) return false;
      if (stockFilterStatus === 'low_stock' && (stock <= 0 || stock > minStock)) return false;
      if (stockFilterStatus === 'out_of_stock' && stock > 0) return false;

      if (query) {
        return (
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.barcode && p.barcode.toLowerCase().includes(query)) ||
          resolvedCat.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [products, stockFilterCategory, stockFilterStatus, deferredStockFilterSearch, categoryLookup]);

  // Calcul agrégé en une seule passe O(N) sur les 11 177 produits
  const stockSummary = useMemo(() => {
    let totalSaleVal = 0;
    let totalCostVal = 0;
    let totalWholesaleVal = 0;
    let totalQty = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const byCategory: Record<
      string,
      { id: string; name: string; productCount: number; qty: number; cost: number; wholesale: number; retail: number; profit: number }
    > = {};

    const enrichedProducts = filteredStockProducts.map(p => {
      const rawStock = Number(p.stock || 0);
      const positiveStock = Math.max(0, rawStock);
      const minStock = Number(p.minStock || 5);
      const price = Number(p.price || 0);
      const cost = Number(p.costPrice || 0);
      const wholesale = Number(p.wholesalePrice || price);
      const resolvedCat = categoryLookup.resolveCategoryId(p);
      const isBundle = Boolean(p.isBundle);

      if (rawStock <= 0) outOfStockCount++;
      else if (rawStock <= minStock) {
        lowStockCount++;
        inStockCount++;
      } else {
        inStockCount++;
      }

      // 🛡️ BUG-07 : Les bundles sont des packs virtuels dont la valeur réside
      // dans leurs composants physiques individuels. Leurs lignes financières sont donc à 0 pour éviter le double comptage comptable.
      const lineCostVal = isBundle ? 0 : positiveStock * cost;
      const lineWholesaleVal = isBundle ? 0 : positiveStock * wholesale;
      const lineSaleVal = isBundle ? 0 : positiveStock * price;
      const lineProfitVal = isBundle ? 0 : positiveStock * (price - cost);

      if (!isBundle) {
        totalQty += positiveStock;
        totalCostVal += lineCostVal;
        totalWholesaleVal += lineWholesaleVal;
        totalSaleVal += lineSaleVal;
      }

      if (!byCategory[resolvedCat.id]) {
        byCategory[resolvedCat.id] = {
          id: resolvedCat.id,
          name: resolvedCat.name,
          productCount: 0,
          qty: 0,
          cost: 0,
          wholesale: 0,
          retail: 0,
          profit: 0
        };
      }
      byCategory[resolvedCat.id].productCount += 1;
      if (!isBundle) {
        byCategory[resolvedCat.id].qty += positiveStock;
      }
      byCategory[resolvedCat.id].cost += lineCostVal;
      byCategory[resolvedCat.id].wholesale += lineWholesaleVal;
      byCategory[resolvedCat.id].retail += lineSaleVal;
      byCategory[resolvedCat.id].profit += lineProfitVal;

      return {
        product: p,
        catId: resolvedCat.id,
        catName: resolvedCat.name,
        rawStock,
        positiveStock,
        price,
        cost,
        lineCostVal,
        lineSaleVal,
        lineProfitVal,
        isBundle
      };
    });

    // Tri des produits valorisés
    enrichedProducts.sort((a, b) => {
      if (sortBy === 'sale_val_desc') return b.lineSaleVal - a.lineSaleVal || b.positiveStock - a.positiveStock;
      if (sortBy === 'cost_val_desc') return b.lineCostVal - a.lineCostVal || b.positiveStock - a.positiveStock;
      if (sortBy === 'profit_desc') return b.lineProfitVal - a.lineProfitVal;
      if (sortBy === 'qty_desc') return b.rawStock - a.rawStock;
      return (a.product.name || '').localeCompare(b.product.name || '');
    });

    const categoryRows = Object.values(byCategory).sort((a, b) => b.retail - a.retail || b.productCount - a.productCount);

    return {
      totalSaleVal,
      totalCostVal,
      totalWholesaleVal,
      totalProfitVal: totalSaleVal - totalCostVal,
      marginPercent: totalSaleVal > 0 ? ((totalSaleVal - totalCostVal) / totalSaleVal) * 100 : 0,
      totalQty,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      categoryRows,
      enrichedProducts
    };
  }, [filteredStockProducts, categoryLookup, sortBy]);

  const totalPages = Math.max(1, Math.ceil(stockSummary.enrichedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return stockSummary.enrichedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [stockSummary.enrichedProducts, currentPage]);

  const exportStockValuationCSV = () => {
    const headers = [
      'Code-Barres / SKU',
      'Designation Produit',
      'Categorie',
      'Quantite Stock',
      'Prix Achat Unitaire (DA)',
      'Prix Vente Unitaire (DA)',
      'Valeur Totale Achat (DA)',
      'Valeur Totale Vente (DA)',
      'Marge Potentielle (DA)'
    ];
    const rows = stockSummary.enrichedProducts.map(item => [
      `"${item.product.barcode || item.product.sku || ''}"`,
      `"${(item.product.name || '').replace(/"/g, '""')}"`,
      `"${item.catName}"`,
      item.rawStock,
      item.cost.toFixed(2),
      item.price.toFixed(2),
      item.lineCostVal.toFixed(2),
      item.lineSaleVal.toFixed(2),
      item.lineProfitVal.toFixed(2)
    ]);
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Valorisation_Stock_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Valorisation complète du stock exportée en CSV !');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barre de Filtres & Recherche Haute Visibilité */}
      <Card id="card-stock-filters" className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher produit, code-barres, SKU ou catégorie..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 text-xs font-medium"
              value={stockFilterSearch}
              onChange={e => {
                setStockFilterSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
            value={stockFilterCategory}
            onChange={e => {
              setStockFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all" className="bg-zinc-900 text-white">Toutes les catégories ({categories.length})</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                {cat.name}
              </option>
            ))}
            <option value="uncategorized" className="bg-zinc-900 text-white">Sans Catégorie</option>
          </select>

          <select
            className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
            value={stockFilterStatus}
            onChange={e => {
              setStockFilterStatus(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all" className="bg-zinc-900 text-white">Tous les stocks ({products.length})</option>
            <option value="in_stock" className="bg-zinc-900 text-white">En stock (&gt; 0)</option>
            <option value="low_stock" className="bg-zinc-900 text-white">Stock faible (Alerte)</option>
            <option value="out_of_stock" className="bg-zinc-900 text-white">En rupture (≤ 0)</option>
          </select>

          <div className="flex items-center justify-between gap-2">
            <select
              className="flex-1 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              title="Trier la liste des produits"
            >
              <option value="sale_val_desc" className="bg-zinc-900 text-white">Tri: Valeur Vente ↓</option>
              <option value="cost_val_desc" className="bg-zinc-900 text-white">Tri: Valeur Achat ↓</option>
              <option value="profit_desc" className="bg-zinc-900 text-white">Tri: Marge Brute ↓</option>
              <option value="qty_desc" className="bg-zinc-900 text-white">Tri: Quantité Stock ↓</option>
              <option value="name_asc" className="bg-zinc-900 text-white">Tri: Nom A → Z</option>
            </select>

            <button
              type="button"
              onClick={exportStockValuationCSV}
              className="px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
              title="Exporter toute la valorisation du stock en CSV"
            >
              <Download size={15} /> CSV
            </button>
          </div>
        </div>
      </Card>

      {/* 4 Cartes KPIs Valorisation Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card id="card-stock-total-sale-val" className="p-5 border-l-4 border-l-indigo-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Valeur de Vente Totale</p>
            <Boxes size={18} className="text-indigo-400" />
          </div>
          <h4 className="text-2xl font-black text-white">
            {stockSummary.totalSaleVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs text-indigo-400">{settings.currency}</span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            Chiffre d&apos;affaires potentiel TTC en rayon
          </p>
        </Card>

        <Card id="card-stock-total-cost-val" className="p-5 border-l-4 border-l-amber-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Valeur d&apos;Achat (Coût)</p>
            <Wallet size={18} className="text-amber-400" />
          </div>
          <h4 className="text-2xl font-black text-amber-300">
            {stockSummary.totalCostVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs text-zinc-400">{settings.currency}</span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            Capital financier immobilisé en stock
          </p>
        </Card>

        <Card id="card-stock-total-profit-val" className="p-5 border-l-4 border-l-emerald-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Marge Brute Potentielle</p>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <h4 className="text-2xl font-black text-emerald-400">
            +{stockSummary.totalProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs text-emerald-300">{settings.currency}</span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            Taux de marge moyen : <strong className="text-emerald-300">{stockSummary.marginPercent.toFixed(1)}%</strong>
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-violet-500 bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Volume Physique</p>
            <Package size={18} className="text-violet-400" />
          </div>
          <h4 className="text-2xl font-black text-white">
            {stockSummary.totalQty.toLocaleString()} <span className="text-xs text-zinc-400">Unités</span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1">
            <span className="text-emerald-400 font-bold">{stockSummary.inStockCount} en stock</span> •{' '}
            <span className="text-rose-400 font-bold">{stockSummary.outOfStockCount} ruptures</span>
          </p>
        </Card>
      </div>

      {/* Tableau 1 : Valorisation Synthétique par Catégorie */}
      <Card id="card-stock-category-table" className="p-0 overflow-hidden bg-zinc-900/90 border border-zinc-800">
        <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-indigo-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight">
              Répartition de la Valeur du Stock par Catégorie
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {stockFilterCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setStockFilterCategory('all')}
                className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider cursor-pointer"
              >
                Afficher toutes les catégories
              </button>
            )}
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {stockSummary.categoryRows.length} Catégorie(s)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800">
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Catégorie</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Références</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Quantité Totale</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Achat</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Vente</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Marge Potentielle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {stockSummary.categoryRows.map(catData => {
                const sharePercent =
                  stockSummary.totalSaleVal > 0 ? (catData.retail / stockSummary.totalSaleVal) * 100 : 0;
                const isSelected = stockFilterCategory === catData.id;

                return (
                  <tr
                    key={catData.id}
                    onClick={() => {
                      setStockFilterCategory(isSelected ? 'all' : catData.id);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'hover:bg-zinc-800/50 transition-colors cursor-pointer',
                      isSelected && 'bg-indigo-500/10'
                    )}
                    title="Cliquez pour filtrer les produits de cette catégorie"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <Tag size={14} className={catData.id === 'uncategorized' ? 'text-zinc-500' : 'text-indigo-400'} />
                        <div>
                          <span className="font-bold text-white text-sm">{catData.name}</span>
                          <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(2, sharePercent))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center text-xs font-bold text-zinc-300">
                      {catData.productCount} art.
                    </td>
                    <td className="p-4 text-center text-sm font-black text-white">
                      {catData.qty.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-sm font-mono text-amber-300">
                      {catData.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                    </td>
                    <td className="p-4 text-right text-sm font-black text-indigo-300">
                      {catData.retail.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-emerald-400">
                      +{catData.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-zinc-950 text-white border-t border-zinc-800">
              <tr>
                <td className="p-4 font-black uppercase tracking-widest text-xs">Total Général</td>
                <td className="p-4 text-center font-black text-xs text-zinc-400">{filteredStockProducts.length} art.</td>
                <td className="p-4 text-center font-black text-sm">{stockSummary.totalQty.toLocaleString()}</td>
                <td className="p-4 text-right font-black text-sm text-amber-300">
                  {stockSummary.totalCostVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                </td>
                <td className="p-4 text-right font-black text-sm text-indigo-400">
                  {stockSummary.totalSaleVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                </td>
                <td className="p-4 text-right font-black text-sm text-emerald-400">
                  +{stockSummary.totalProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Tableau 2 : Liste Détaillée des Produits Valorisés (50 produits / page) */}
      <Card className="p-0 overflow-hidden bg-zinc-900/90 border border-zinc-800">
        <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <ArrowUpDown size={18} className="text-emerald-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight">
              Détail des Produits Valorisés ({stockSummary.enrichedProducts.length.toLocaleString()} articles)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Page {currentPage} sur {totalPages} (50 par page)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800">
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produit & Code-Barres</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Catégorie</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Stock Actuel</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">P.U Achat / Vente</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Stock Achat</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Stock Vente</th>
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Marge Totale</th>
                {onEditProduct && (
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {paginatedProducts.map(item => {
                const { product, catName, rawStock, cost, price, lineCostVal, lineSaleVal, lineProfitVal } = item;
                const minStock = Number(product.minStock || 5);
                const stockBadgeColor =
                  rawStock <= 0
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : rawStock <= minStock
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

                return (
                  <tr key={product.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {product.imageUrl ? (
                            <SafeImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs sm:text-sm line-clamp-1">{product.name}</p>
                          <p className="text-[10px] font-mono text-zinc-400">
                            {product.barcode || product.sku || 'Sans code'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                        {catName}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-black border', stockBadgeColor)}>
                        {rawStock} {product.unit || 'u'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right text-xs">
                      <div className="text-zinc-400">Achat: <span className="text-amber-300 font-mono">{cost.toFixed(2)}</span></div>
                      <div className="text-zinc-300 font-bold">Vente: <span className="text-white font-mono">{price.toFixed(2)}</span></div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs sm:text-sm text-amber-300 font-bold">
                      {lineCostVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs sm:text-sm text-indigo-300 font-black">
                      {lineSaleVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs sm:text-sm text-emerald-400 font-bold">
                      +{lineProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}
                    </td>
                    {onEditProduct && (
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Modifier le stock ou le prix de ce produit"
                        >
                          <Edit size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={onEditProduct ? 8 : 7} className="p-8 text-center text-zinc-400">
                    <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold">Aucun produit ne correspond à vos filtres.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination 50 produits par page */}
        {stockSummary.enrichedProducts.length > ITEMS_PER_PAGE && (
          <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-3 text-xs">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              Affichage {(currentPage - 1) * ITEMS_PER_PAGE + 1} à{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, stockSummary.enrichedProducts.length)} sur{' '}
              {stockSummary.enrichedProducts.length.toLocaleString()} produits
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Précédent
              </button>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black border border-indigo-500/30">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});
