import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { ExpiryProductCard } from './ExpiryProductCard';
import { ExpiryPaginationBar } from './ExpiryPaginationBar';
import { ExpiryLightboxModal } from './ExpiryLightboxModal';
import { ExpiryQuickDateModal } from './ExpiryQuickDateModal';

interface ExpiryListViewProps {
  paginatedProducts: any[];
  allProducts: Product[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleApplyPromo: (product: any, percent: number) => void;
  handleRestorePrice: (product: any) => void;
  onEditProduct: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  handleSaveQuickDate: (product: any, date: string, batchNumber?: string) => Promise<void>;
  previewImage: { url: string; title: string; sku?: string } | null;
  setPreviewImage: (img: { url: string; title: string; sku?: string } | null) => void;
  quickDateProduct: any | null;
  setQuickDateProduct: (p: any | null) => void;
}

export function ExpiryListView({
  paginatedProducts,
  allProducts,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  setPageSize,
  handleApplyPromo,
  handleRestorePrice,
  onEditProduct,
  onAdjustStock,
  handleSaveQuickDate,
  previewImage,
  setPreviewImage,
  quickDateProduct,
  setQuickDateProduct
}: ExpiryListViewProps) {
  const [modalDate, setModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalBatch, setModalBatch] = useState('');

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6">
      {/* 📦 Grille des Produits par Page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {paginatedProducts.map((product) => (
            <ExpiryProductCard
              key={product.id}
              product={product}
              allProducts={allProducts}
              setPreviewImage={setPreviewImage}
              setQuickDateProduct={setQuickDateProduct}
              setModalDate={setModalDate}
              setModalBatch={setModalBatch}
              handleApplyPromo={handleApplyPromo}
              onEditProduct={onEditProduct}
              onAdjustStock={onAdjustStock}
            />
          ))}
        </AnimatePresence>

        {paginatedProducts.length === 0 && (
          <div className="lg:col-span-2 py-20 flex flex-col items-center justify-center text-white/30 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <CheckCircle2 size={48} className="mb-4 text-emerald-500/50" />
            <p className="font-black uppercase tracking-widest text-sm text-white/60">Aucun produit ne correspond aux filtres</p>
            <p className="text-xs text-white/30 mt-1">Modifiez vos critères de recherche ou sélectionnez un autre statut.</p>
          </div>
        )}
      </div>

      {/* 📄 Barre de Pagination Complète */}
      <ExpiryPaginationBar
        totalCount={totalCount}
        startIndex={startIndex}
        endIndex={endIndex}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setCurrentPage={setCurrentPage}
        setPageSize={setPageSize}
      />

      {/* 🔍 LIGHTBOX MODAL : Image Agrandie Plein Écran */}
      <ExpiryLightboxModal
        previewImage={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* 📅 MODAL RAPIDE : Définir / Modifier Date de Péremption */}
      <ExpiryQuickDateModal
        quickDateProduct={quickDateProduct}
        onClose={() => setQuickDateProduct(null)}
        modalDate={modalDate}
        setModalDate={setModalDate}
        modalBatch={modalBatch}
        setModalBatch={setModalBatch}
        onSaveQuickDate={handleSaveQuickDate}
      />
    </div>
  );
}
