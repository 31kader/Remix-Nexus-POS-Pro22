import React, { useState } from 'react';
import { Star, Search, Plus, X, Loader2, Trash2, FolderHeart } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
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
}

export const QuickSelect: React.FC<QuickSelectProps> = ({ onAddProduct, currency }) => {
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

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    const groups = settings.quickSelectGroups || [];
    if (groups.some(g => g.name.toLowerCase() === trimmed.toLowerCase())) {
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

  // Fill grid with empty slots
  const MIN_SLOTS = 12;
  const emptySlots = Math.max(0, MIN_SLOTS - filteredProducts.length);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden select-none">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center border border-amber-300 dark:border-amber-500/30">
              <Star className="text-amber-600 dark:text-amber-400 fill-amber-500" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Favoris</h2>
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">Accès Rapide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <button 
                onClick={() => { if (window.confirm("Voulez-vous vraiment vider tous vos favoris ?")) clearAllFavorites(); }}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 group shadow-sm cursor-pointer"
                title="Vider les favoris"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button 
              onClick={() => setShowCategorySettings(true)}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 group shadow-sm cursor-pointer"
              title="Gérer les catégories favorites"
            >
              <FolderHeart size={15} />
            </button>
            <button 
              onClick={() => setShowPicker(true)}
              className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center border border-amber-600 transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Ajouter un article aux favoris"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Rechercher dans favoris..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar items-center">
          <button
            onClick={() => { setDirection(-1); setSelectedCategoryId('all'); }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer shadow-sm",
              selectedCategoryId === 'all' 
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/25" 
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            Tous
          </button>
          {favoriteCategories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => {
                const currentIndex = favoriteCategories.findIndex(c => c.id === selectedCategoryId);
                setDirection(idx >= currentIndex ? 1 : -1);
                setSelectedCategoryId(cat.id);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer shadow-sm",
                selectedCategoryId === cat.id 
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/25" 
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar relative">
        <div className="relative w-full h-full min-h-[300px]">
          {filteredProducts.length === 0 && searchQuery ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40">
              <Search size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Aucun favori trouvé</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Essayez un autre mot-clé</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onAddProduct(product)}
                  className="group relative bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-amber-500 rounded-2xl transition-all cursor-pointer overflow-hidden aspect-square flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Top Image area */}
                  <div className="relative flex-1 bg-slate-100 dark:bg-slate-950/40 overflow-hidden flex items-center justify-center">
                    <SafeImage 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-200" 
                    />
                    {/* Top Action Row: Unfavorite/X button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }} 
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:scale-110 shadow-md z-10 cursor-pointer"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>

                  {/* Bottom Info Row: Clean high-contrast name & price */}
                  <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between select-none">
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-white leading-tight uppercase truncate">{product.name}</p>
                    <p className="text-[10px] font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">{product.price.toLocaleString()} {currency}</p>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setShowPicker(true)} 
                className="flex flex-col items-center justify-center bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-2 border-dashed border-amber-300 dark:border-amber-500/30 hover:border-amber-500 rounded-2xl aspect-square transition-all group p-2 text-center shadow-sm cursor-pointer"
              >
                <Plus size={22} className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight leading-tight">Chercher&nbsp;&amp;<br/>Ajouter</span>
              </button>
              
              {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
                <button 
                  key={`empty-${i}`} 
                  onClick={() => setShowPicker(true)} 
                  className="bg-white/60 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl aspect-square flex items-center justify-center transition-all group shadow-sm cursor-pointer"
                >
                  <Plus size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </button>
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
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
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

