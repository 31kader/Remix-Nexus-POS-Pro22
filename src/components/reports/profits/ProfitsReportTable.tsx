import React, { useState, useMemo, memo } from 'react';
import { ShoppingBag, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Category, Product, Transaction, CompanySettings } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCoreStore } from '../../../store/useCoreStore';
import { useTransactionStore } from '../../../store/useTransactionStore';
import { localDb } from '../../../services/LocalDatabase';
import { toast } from 'sonner';
import { ProductSalesEditModal } from './ProductSalesEditModal';
import { AdminProfitAdjustModal } from './AdminProfitAdjustModal';
import { ProfitTableRow } from './ProfitTableRow';

interface ProfitsReportTableProps {
  productProfitData: any[];
  categories: Category[];
  handleProfitSort: (key: 'revenue' | 'profit' | 'margin' | 'qty') => void;
  profitSortFormat: string;
  onEditProduct?: (product: Product) => void;
  transactions?: Transaction[];
  settings?: CompanySettings;
}

export const ProfitsReportTable = memo(function ProfitsReportTable({
  productProfitData,
  categories,
  handleProfitSort,
  profitSortFormat,
  onEditProduct,
  transactions = [],
  settings
}: ProfitsReportTableProps) {
  const profile = useAuthStore(s => s.profile);
  const userRole = useAuthStore(s => (s as any).role) || profile?.role || 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'owner' || profile?.role === 'admin';
  const currency = useCoreStore(s => s.settings?.currency || settings?.currency || 'DA');

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [salesEditProduct, setSalesEditProduct] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCostPrice, setEditCostPrice] = useState<string>('');
  const [desiredProfit, setDesiredProfit] = useState<string>('');
  const [desiredMargin, setDesiredMargin] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Pagination (Règle GEMINI.md : 50 items/page obligatoire)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil((productProfitData?.length || 0) / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return (productProfitData || []).slice(start, start + ITEMS_PER_PAGE);
  }, [productProfitData, currentPage]);

  // Indexation O(1) des catégories pour éviter .find() dans le tableau
  const categoriesMap = useMemo(() => {
    return new Map((categories || []).map(c => [c.id, c.name]));
  }, [categories]);

  const handleOpenProfitModal = (p: any) => {
    setSelectedProduct(p);
    setEditPrice((p.price ?? 0).toString());
    setEditCostPrice((p.costPrice ?? 0).toString());
    setDesiredProfit('');
    setDesiredMargin('');
  };

  const currentPrice = parseFloat(editPrice || '0');
  const currentCost = parseFloat(editCostPrice || '0');
  const currentProfitVal = currentPrice - currentCost;
  const currentMarginVal = currentCost > 0 ? ((currentProfitVal / currentCost) * 100).toFixed(1) : '0';

  const handleDesiredProfitChange = (valStr: string) => {
    setDesiredProfit(valStr);
    setDesiredMargin('');
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setEditPrice(Math.max(0, currentCost + val).toFixed(2));
    }
  };

  const handleDesiredMarginChange = (valStr: string) => {
    setDesiredMargin(valStr);
    setDesiredProfit('');
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setEditPrice(Math.max(0, currentCost * (1 + val / 100)).toFixed(2));
    }
  };

  const handleApplyPresetMargin = (marginPct: number) => {
    setDesiredMargin(marginPct.toString());
    setDesiredProfit('');
    setEditPrice(Math.max(0, currentCost * (1 + marginPct / 100)).toFixed(2));
  };

  const handleApplyPresetProfit = (profitAmount: number) => {
    setDesiredProfit(profitAmount.toString());
    setDesiredMargin('');
    setEditPrice(Math.max(0, currentCost + profitAmount).toFixed(2));
  };

  const handleSaveProfit = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);

    try {
      const newPrice = parseFloat(editPrice || '0');
      const newCost = parseFloat(editCostPrice || '0');

      const rawProducts = useCoreStore.getState().products;
      const existingProd = rawProducts.find(p => p.id === selectedProduct.id) || selectedProduct;

      const { stats, profit, margin, ...cleanProd } = existingProd;

      const updatedProduct: Product = {
        ...cleanProd,
        price: newPrice,
        costPrice: newCost,
        updatedAt: new Date().toISOString()
      };

      await localDb.update(`products/${selectedProduct.id}`, updatedProduct);
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProduct }));
      useCoreStore.getState().setProducts(
        rawProducts.map(prod => prod.id === selectedProduct.id ? updatedProduct : prod)
      );

      toast.success(`Bénéfice de "${updatedProduct.name}" mis à jour avec succès ! (${newPrice.toFixed(2)} ${currency})`);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du bénéfice:", error);
      toast.error("Erreur lors de l'enregistrement du bénéfice.");
    } finally {
      setIsSaving(false);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    const isCurrent = profitSortFormat.startsWith(column);
    const isAsc = profitSortFormat.endsWith('asc');
    
    if (!isCurrent) return <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />;
    return isAsc 
      ? <ChevronUp size={12} className="text-indigo-400" /> 
      : <ChevronDown size={12} className="text-indigo-400" />;
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            <th className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest">Produit</th>
            <th className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest">Catégorie</th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('qty')}
            >
              <div className="flex items-center justify-end gap-1">Qté <SortIcon column="qty" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('revenue')}
            >
              <div className="flex items-center justify-end gap-1">Chiffre Aff. <SortIcon column="revenue" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('profit')}
            >
              <div className="flex items-center justify-end gap-1">Bénéfice <SortIcon column="profit" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('margin')}
            >
              <div className="flex items-center justify-end gap-1">Marge % <SortIcon column="margin" /></div>
            </th>
            {isAdmin && (
              <th className="p-4 font-black uppercase text-[10px] text-indigo-400/60 tracking-widest text-right">
                Réglage Profit & Marge
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {paginatedData.map(p => (
            <ProfitTableRow
              key={p.id}
              product={p}
              categoryName={categoriesMap.get(p.categoryId) || 'N/A'}
              isAdmin={isAdmin}
              currency={currency}
              onEditProduct={onEditProduct}
              onOpenSalesEdit={setSalesEditProduct}
              onOpenProfitModal={handleOpenProfitModal}
            />
          ))}
          {productProfitData.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 7 : 6} className="p-6 text-center text-white/20 border-t border-white/5">
                <ShoppingBag className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">Aucun résultat</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination (50 items/page — Règle GEMINI.md) */}
      {productProfitData && productProfitData.length > ITEMS_PER_PAGE && (
        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/40 font-bold uppercase tracking-wider">
            Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, productProfitData.length)} sur {productProfitData.length} produits
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Précédent
            </button>
            <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-black">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal d'ajustement du Bénéfice Admin découpée */}
      <AdminProfitAdjustModal
        selectedProduct={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        currency={currency}
        editPrice={editPrice}
        setEditPrice={setEditPrice}
        editCostPrice={editCostPrice}
        setEditCostPrice={setEditCostPrice}
        desiredProfit={desiredProfit}
        desiredMargin={desiredMargin}
        currentProfitVal={currentProfitVal}
        currentMarginVal={currentMarginVal}
        isSaving={isSaving}
        handleDesiredProfitChange={handleDesiredProfitChange}
        handleDesiredMarginChange={handleDesiredMarginChange}
        handleApplyPresetMargin={handleApplyPresetMargin}
        handleApplyPresetProfit={handleApplyPresetProfit}
        handleSaveProfit={handleSaveProfit}
      />

      {/* Product Sales Inspection and Edit Modal */}
      {salesEditProduct && (
        <ProductSalesEditModal
          isOpen={!!salesEditProduct}
          onClose={() => setSalesEditProduct(null)}
          product={salesEditProduct}
          transactions={(transactions && transactions.length > 0) ? transactions : useTransactionStore.getState().transactions}
          settings={settings || ({} as any)}
        />
      )}
    </div>
  );
});
