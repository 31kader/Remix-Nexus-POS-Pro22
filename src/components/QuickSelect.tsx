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
  const emptySlots = Math.max(0, MIN_SLOTS - filteredProducts.length - 1);

  return (
    <div className="h-full flex flex-col bg-slate-900/60 backdrop-blur-2xl border-r border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Star className="text-amber-500 fill-amber-500" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Favoris</h2>
              <p className="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter">Accès Rapide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <button 
                onClick={() => { if (window.confirm("Voulez-vous vraiment vider tous vos favoris ?")) clearAllFavorites(); }}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-red-500 hover:text-white text-white/40 flex items-center justify-center border border-white/5 transition-all active:scale-95 group shadow-lg"
                title="Vider les favoris"
              >
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
              </button>
            )}
            <button 
              onClick={() => setShowCategorySettings(true)}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-indigo-500 hover:text-white flex items-center justify-center border border-white/5 transition-all active:scale-95 group shadow-lg"
              title="Gérer les catégories favorites"
            >
              <FolderHeart size={16} className="group-hover:scale-110 transition-transform text-white/40 group-hover:text-white" />
            </button>
            <button 
              onClick={() => setShowPicker(true)}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-amber-500 hover:text-white flex items-center justify-center border border-white/5 transition-all active:scale-95 group shadow-lg"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input
            type="text"
            placeholder="Rechercher dans favoris..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:ring-2 focus:ring-amber-500/30 transition-all outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mask-gradient-r px-4 -mx-4 items-center">
          <button
            onClick={() => { setDirection(-1); setSelectedCategoryId('all'); }}
            className={cn("px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all", selectedCategoryId === 'all' ? "bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-500/20 scale-105" : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/80")}
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
              className={cn("px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all", selectedCategoryId === cat.id ? "bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-500/20 scale-105" : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/80")}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto custom-scrollbar p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Initialisation...</span>
            </div>
          ) : (
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={selectedCategoryId}
                custom={direction}
                initial={{ opacity: 0, x: 50 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 * direction }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-20 w-full"
              >
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    onClick={() => onAddProduct(product)}
                    className="group relative bg-black/40 border border-white/5 hover:border-amber-500/40 rounded-3xl transition-all cursor-pointer overflow-hidden aspect-square flex flex-col"
                  >
                    {/* Full Card background image */}
                    <div className="absolute inset-0 w-full h-full">
                      <SafeImage 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" 
                      />
                    </div>

                    {/* Gradient overlay always visible to ensure text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-200" />

                    {/* Content absolute overlays */}
                    <div className="relative flex-1 p-3 flex flex-col justify-between h-full w-full z-10 select-none">
                      {/* Top Action Row: Unfavorite/X button */}
                      <div className="flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }} 
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 shadow-lg"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Bottom Info Row: Name & Price always showing for usability */}
                      <div className="transform translate-y-0 transition-all duration-200">
                        <p className="text-[10px] sm:text-[11px] font-black text-white leading-tight uppercase truncate">{product.name}</p>
                        <p className="text-[10px] font-mono text-amber-400 mt-0.5">{product.price.toLocaleString()} {currency}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <button onClick={() => setShowPicker(true)} className="flex flex-col items-center justify-center bg-amber-500/5 hover:bg-amber-500/10 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-3xl aspect-square transition-all group p-2 text-center">
                  <Plus size={24} className="text-amber-500 group-hover:scale-110 transition-transform mb-2" />
                  <span className="text-[9px] font-black text-amber-500/60 uppercase group-hover:text-amber-500 transition-colors tracking-widest leading-tight">Chercher&nbsp;&amp;<br/>Ajouter</span>
                </button>
                
                {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
                  <button key={`empty-${i}`} onClick={() => setShowPicker(true)} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl aspect-square flex items-center justify-center transition-all group opacity-50 hover:opacity-100">
                    <Plus size={20} className="text-white/20 group-hover:text-white/50 transition-colors" />
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
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
          <p className="text-xs text-slate-400">Créez vos propres catégories favorites personnalisées pour y organiser vos articles.</p>
          
          {/* Create Group Form */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nom de la nouvelle catégorie..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:ring-2 focus:ring-amber-500/30 transition-all outline-none"
            />
            <Button onClick={handleCreateGroup} className="shrink-0 text-xs px-4 py-2.5">
              Créer
            </Button>
          </div>

          <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {(settings.quickSelectGroups || []).length > 0 ? (
              (settings.quickSelectGroups || []).map((group) => (
                <div
                  key={group.id}
                  className="w-full flex items-center justify-between p-4 rounded-3xl border bg-white/5 border-white/5 text-slate-400"
                >
                  <span className="text-xs font-black uppercase tracking-widest leading-none text-white">{group.name}</span>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all active:scale-95"
                    title="Supprimer la catégorie"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 uppercase tracking-wider">Aucune catégorie créée.</div>
            )}
          </div>
          <Button onClick={() => setShowCategorySettings(false)} className="w-full">
            Fermer
          </Button>
        </div>
      </Modal>
    </div>
  );
};

