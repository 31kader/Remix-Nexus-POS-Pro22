import React, { memo } from 'react';
import { Search, Plus, ChevronUp } from 'lucide-react';
import { Promotion, Product, Category, Transaction, CompanySettings } from '../types';
import { Button, ConfirmDialog } from './ui';
import { cn } from '../lib/utils';
import { PromotionPerformanceModal } from './promotions/PromotionPerformanceModal';
import { PromotionEditModal } from './promotions/PromotionEditModal';
import { PromotionsStats } from './promotions/PromotionsStats';
import { PromotionsGrid } from './promotions/PromotionsGrid';
import { usePromotionsLogic } from './usePromotionsLogic';

export const Promotions = memo(function Promotions({ 
  promotions, products, categories, transactions, settings 
}: { 
  promotions: Promotion[], products: Product[], categories: Category[], transactions: Transaction[], settings: CompanySettings 
}) {
  const {
    isModalOpen,
    setIsModalOpen,
    isPerformanceModalOpen,
    setIsPerformanceModalOpen,
    viewingPerformancePromo,
    setViewingPerformancePromo,
    editingPromotion,
    setEditingPromotion,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    formData,
    setFormData,
    handleSubmit,
    handleDelete,
    confirmDelete,
    filteredPromotions,
    paginatedPromotions,
    totalPages,
    pageSize,
    stats,
    getPromoStatus
  } = usePromotionsLogic({ promotions, transactions });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestion des Promotions</h3>
          <p className="text-sm text-slate-500">Créez des offres spéciales et des remises automatiques</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher une offre..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-64 text-slate-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => { setEditingPromotion(null); setIsModalOpen(true); }}>
            <Plus size={20} /> Nouvelle Promotion
          </Button>
        </div>
      </div>

      <PromotionsStats stats={stats} settings={settings} />

      <PromotionsGrid 
        paginatedPromotions={paginatedPromotions}
        filteredPromotions={filteredPromotions}
        settings={settings}
        getPromoStatus={getPromoStatus}
        setViewingPerformancePromo={setViewingPerformancePromo}
        setIsPerformanceModalOpen={setIsPerformanceModalOpen}
        setEditingPromotion={setEditingPromotion}
        setIsModalOpen={setIsModalOpen}
        handleDelete={handleDelete}
      />

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6">
          <p className="text-xs text-slate-500 font-medium">
            Affichage de <span className="font-bold text-slate-900">{Math.min(filteredPromotions.length, (currentPage - 1) * pageSize + 1)}</span> à <span className="font-bold text-slate-900">{Math.min(filteredPromotions.length, currentPage * pageSize)}</span> sur <span className="font-bold text-slate-900">{filteredPromotions.length}</span> promotions
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronUp className="-rotate-90" size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                    currentPage === i + 1 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronUp className="rotate-90" size={16} />
            </button>
          </div>
        </div>
      )}

      <PromotionPerformanceModal
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
        viewingPerformancePromo={viewingPerformancePromo}
        transactions={transactions}
        settings={settings}
      />

      <PromotionEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingPromotion={editingPromotion}
        handleSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        products={products}
        settings={settings}
      />

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer la promotion"
        message="Êtes-vous sûr de vouloir supprimer cette promotion ? Cette action est irréversible."
      />
    </div>
  );
});
