import React, { useState } from 'react';
import { Star, Search, Plus, X, Trash2, FolderHeart, Edit3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { SafeImage } from './ui/SafeImage';
import { useQuickSelect } from '../hooks/quick-select/useQuickSelect';
import { ProductPicker } from './quick-select/ProductPicker';
import { Product } from '../types';
import { Modal, Button } from './ui';
import { useCoreStore } from '../store/useCoreStore';
import { localDb } from '../database';
import { toast } from 'sonner';

interface QuickSelectProps {
  onAddProduct: (product: Product) => void;
  currency: string;
  onClose?: () => void;
}

export const QuickSelect: React.FC<QuickSelectProps> = ({ onAddProduct, currency, onClose }) => {
  const {
    products,
    categories,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    direction,
    setDirection,
    favoriteCategories,
    filteredProducts,
    toggleFavorite,
    clearAllFavorites,
  } = useQuickSelect();

  const settings = useCoreStore(state => state.settings);
  const [showPicker, setShowPicker] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    const groups = settings.quickSelectGroups || [];
    if (groups.some(g => (g?.name || '').toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Une catégorie favori portant ce nom existe déjà.');
      return;
    }
    const newGroup = {
      id: 'group_' + Math.random().toString(36).substring(2, 9),
      name: trimmed,
      productIds: []
    };
    const updated = [...groups, newGroup];
    await localDb.update('settings/company', { quickSelectGroups: updated });
    setNewGroupName('');
    toast.success('Catégorie favorite créée !');
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
    const groups = settings.quickSelectGroups || [];
    const updated = groups.filter(g => g.id !== groupId);
    await localDb.update('settings/company', { quickSelectGroups: updated });
    if (selectedCategoryId === groupId) {
      setSelectedCategoryId('all');
    }
    toast.success('Catégorie favorite supprimée.');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden select-none">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center border border-amber-300 dark:border-amber-500/30 shrink-0">
              <Star className="text-amber-600 dark:text-amber-400 fill-amber-500" size={16} />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Favoris</h2>
              <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">Accès Rapide</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Toggle Recherche */}
            <button 
              type="button"
              onClick={() => {
                setShowSearch(prev => !prev);
                if (showSearch) setSearchQuery('');
              }}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-95 shadow-xs cursor-pointer",
                showSearch || searchQuery
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900"
              )}
              title={showSearch ? "Masquer la recherche" : "Rechercher dans favoris"}
            >
              <Search size={13} />
            </button>

            {/* Toggle Mode Édition */}
            <button 
              type="button"
              onClick={() => {
                setIsEditMode(prev => {
                  const next = !prev;
                  if (next) toast.info("Mode Édition Favoris activé (cliquez sur ✕ pour retirer)");
                  return next;
                });
              }}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-95 shadow-xs cursor-pointer",
                isEditMode
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900"
              )}
              title={isEditMode ? "Désactiver le mode édition" : "Mode Édition (retirer des articles)"}
            >
              <Edit3 size={13} />
            </button>

            {/* Gérer Catégories */}
            <button 
              type="button"
              onClick={() => setShowCategorySettings(true)}
              className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Gérer les catégories favorites"
            >
              <FolderHeart size={13} />
            </button>

            {/* Bouton d'Ajout Compact dans l'En-tête */}
            <button 
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center border border-amber-600 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Ajouter un article aux favoris"
            >
              <Plus size={15} />
            </button>

            {/* Fermer Panneau */}
            {onClose && (
              <button 
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-xs cursor-pointer"
                title="Fermer le volet des favoris"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Barre de recherche escamotable */}
        {showSearch && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={13} />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher dans favoris..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-500 transition-all outline-none shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Effacer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Filtres par Catégorie */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar items-center">
          <button
            type="button"
            onClick={() => { setDirection(-1); setSelectedCategoryId('all'); }}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer shadow-xs",
              selectedCategoryId === 'all' 
                ? "bg-amber-500 text-white shadow-sm" 
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            Tous
          </button>
          {favoriteCategories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                const currentIndex = favoriteCategories.findIndex(c => c.id === selectedCategoryId);
                setDirection(idx >= currentIndex ? 1 : -1);
                setSelectedCategoryId(cat.id);
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer shadow-xs",
                selectedCategoryId === cat.id 
                  ? "bg-amber-500 text-white shadow-sm" 
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-2.5 overflow-y-auto custom-scrollbar relative">
        {/* Alerte mode édition actif */}
        {isEditMode && (
          <div className="mb-2 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-700 dark:text-rose-300 text-[11px] font-bold animate-in fade-in duration-150">
            <span>Cliquez sur ✕ pour retirer de vos favoris</span>
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-md text-[10px] font-black uppercase cursor-pointer"
            >
              Terminer
            </button>
          </div>
        )}

        <div className="relative w-full h-full min-h-[250px]">
          {filteredProducts.length === 0 ? (
            searchQuery ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40">
                <Search size={24} className="text-slate-300 dark:text-slate-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Aucun favori trouvé</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Essayez un autre mot-clé</p>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-center p-4 border border-dashed border-amber-300/60 dark:border-amber-500/30 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20">
                <Star size={30} className="text-amber-500 mb-2 fill-amber-500/20" />
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Aucun article favori</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Ajoutez vos articles fréquents pour un encaissement direct</p>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  <span>Ajouter des Favoris</span>
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-3 gap-2 w-full">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    if (isEditMode) {
                      toggleFavorite(product);
                    } else {
                      onAddProduct(product);
                    }
                  }}
                  className={cn(
                    "group relative bg-white dark:bg-slate-800/90 border rounded-xl transition-all cursor-pointer overflow-hidden aspect-square flex flex-col shadow-xs hover:shadow-md hover:-translate-y-0.5",
                    isEditMode 
                      ? "border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20" 
                      : "border-slate-200 dark:border-slate-700 hover:border-amber-500"
                  )}
                >
                  {/* Zone Image */}
                  <div className="relative flex-1 bg-slate-100 dark:bg-slate-950/40 overflow-hidden flex items-center justify-center">
                    <SafeImage 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-200" 
                    />
                    
                    {/* Croix de suppression : VISIBLE UNIQUEMENT EN MODE ÉDITION */}
                    {isEditMode && (
                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleFavorite(product); 
                        }} 
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center transition-all hover:bg-rose-700 hover:scale-110 shadow-md z-10 cursor-pointer animate-in zoom-in-75 duration-150"
                        title="Retirer des favoris"
                      >
                        <X size={13} strokeWidth={3} />
                      </button>
                    )}
                  </div>

                  {/* Zone Informations Produit */}
                  <div className="p-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between select-none">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight uppercase truncate">{product.name}</p>
                    <p className="text-[10px] font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">{product.price.toLocaleString()} {currency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductPicker 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)} 
        currency={currency}
        toggleFavorite={toggleFavorite}
        isFav={(p) => {
          if (selectedCategoryId === 'all') {
            return products.some(fav => fav.id === p.id);
          }
          const currentGroup = (settings.quickSelectGroups || []).find(g => g.id === selectedCategoryId);
          return currentGroup ? currentGroup.productIds.includes(p.id) : false;
        }}
      />

      <Modal 
        isOpen={showCategorySettings} 
        onClose={() => setShowCategorySettings(false)} 
        title="Gérer les Catégories Favorites"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">Créez vos propres catégories favorites personnalisées pour y organiser vos articles.</p>
          
          {/* Create Group Form */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nom de la nouvelle catégorie..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/30 transition-all outline-none"
            />
            <Button onClick={handleCreateGroup} className="shrink-0 text-xs px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white">
              Créer
            </Button>
          </div>

          <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {(settings.quickSelectGroups || []).length > 0 ? (
              (settings.quickSelectGroups || []).map((group) => (
                <div
                  key={group.id}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{group.name}</span>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    title="Supprimer la catégorie"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aucune catégorie créée.</div>
            )}
          </div>
          <Button onClick={() => setShowCategorySettings(false)} variant="secondary" className="w-full">
            Fermer
          </Button>
        </div>
      </Modal>
    </div>
  );
};
