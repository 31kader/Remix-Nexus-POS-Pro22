import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Calendar, Award, ArrowUpDown, Truck, ChevronDown } from 'lucide-react';
import { Category, Brand, Product } from '../../types';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

export interface InventoryFiltersProps {
  showFilters: boolean;
  selectedSupplier: string;
  setSelectedSupplier: (val: string) => void;
  sortKey: string;
  onSortChange: (key: any) => void;
  selectedBrand: string;
  setSelectedBrand: (val: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  categories: Category[];
  selectedCategories: string[];
  toggleCategory: (categoryId: string) => void;
  setSelectedCategories: (cats: string[]) => void;
  categoryProductCounts: Record<string, number>;
  productSuppliers: string[];
  brands: Brand[];
  stockLevelFilter: 'all' | 'low' | 'out';
  setStockLevelFilter: (val: 'all' | 'low' | 'out') => void;
  statusFilter: 'all' | 'active' | 'inactive' | 'discontinued';
  setStatusFilter: (val: 'all' | 'active' | 'inactive' | 'discontinued') => void;
  onResetAll: () => void;
}

export function InventoryFilters({
  showFilters,
  selectedSupplier,
  setSelectedSupplier,
  sortKey,
  onSortChange,
  selectedBrand,
  setSelectedBrand,
  dateRange,
  setDateRange,
  categories,
  selectedCategories,
  toggleCategory,
  setSelectedCategories,
  categoryProductCounts,
  productSuppliers,
  brands,
  stockLevelFilter,
  setStockLevelFilter,
  statusFilter,
  setStatusFilter,
  onResetAll
}: InventoryFiltersProps) {
  return (
    <AnimatePresence>
      {showFilters && (
        <motion.div 
          initial={{ height: 0, opacity: 0, scale: 0.98 }}
          animate={{ height: 'auto', opacity: 1, scale: 1 }}
          exit={{ height: 0, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="overflow-hidden"
        >
          <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-10 mt-6 text-left ring-1 ring-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Truck size={16} className="text-indigo-400 shadow-neon-indigo" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">SOURCE / FOURNISSEUR</span>
                </div>
                <div className="relative group">
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all cursor-pointer appearance-none shadow-inner group-hover:border-white/20"
                  >
                    <option value="all" className="bg-[#0a0c10] text-white font-black">TOUTES LES SOURCES</option>
                    {productSuppliers.map(s => (
                      <option key={s} value={s} className="bg-[#0a0c10] text-white">{s.toUpperCase()}</option>
                    ))}
                    <option value="Sans fournisseur" className="bg-[#0a0c10] text-white">SANS RÉFÉRENCE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ArrowUpDown size={16} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">ALGORITHME DE TRI</span>
                </div>
                <div className="relative group">
                  <select
                    value={sortKey}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="" className="bg-[#0a0c10] text-white">CRITÈRE PAR DÉFAUT</option>
                    <option value="name" className="bg-[#0a0c10] text-white">DÉSIGNATION (A-Z)</option>
                    <option value="price" className="bg-[#0a0c10] text-white">VALEUR CROISSANTE</option>
                    <option value="margin" className="bg-[#0a0c10] text-white">RENTABILITÉ (MARGE)</option>
                    <option value="stock" className="bg-[#0a0c10] text-white">VOLUME DE STOCK</option>
                    <option value="updatedAt" className="bg-[#0a0c10] text-white">DERNIÈRE MAJ</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Award size={16} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">BRANDING / MARQUE</span>
                </div>
                <div className="relative group">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="all" className="bg-[#0a0c10] text-white italic">TOUTES LES MARQUES</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id} className="bg-[#0a0c10] text-white">{b.name.toUpperCase()}</option>
                    ))}
                    <option value="none" className="bg-[#0a0c10] text-white">GÉNÉRIQUE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">FENÊTRE TEMPORELLE</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="date"
                    className="flex-1 px-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <div className="w-4 h-px bg-white/10" />
                  <input 
                    type="date"
                    className="flex-1 px-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5 shadow-inner" />

            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FolderTree size={20} className="text-indigo-400" />
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic">Architecture des Catégories</span>
                  </div>
                  <button onClick={() => setSelectedCategories([])} className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] hover:text-rose-400 transition-all active:scale-95 italic">RESET CATEGORIES</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categories.filter(c => !c.parentId).map((parent: Category) => {
                    const subs = categories.filter(c => c.parentId === parent.id);
                    const isParentSelected = selectedCategories.includes(parent.id);
                    const parentCount = categoryProductCounts[parent.id] || 0;
                    
                    return (
                      <div 
                        key={parent.id} 
                        className={cn(
                          "p-6 rounded-[2rem] border transition-all duration-500 flex flex-col justify-between space-y-5 group/card ring-1 ring-white/5 shadow-2xl relative overflow-hidden",
                          isParentSelected 
                            ? "bg-indigo-600/10 border-indigo-500/50 shadow-neon-indigo italic"
                            : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/40"
                        )}
                      >
                        <div className="flex items-start justify-between relative z-10">
                          <button
                            type="button"
                            onClick={() => toggleCategory(parent.id)}
                            className="flex items-center gap-4 text-left"
                          >
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner border",
                              isParentSelected ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo scale-110" : "bg-black/60 text-slate-700 border-white/5"
                            )}>
                              <FolderTree size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-[12px] font-black uppercase tracking-widest transition-colors leading-tight italic",
                                isParentSelected ? "text-white" : "text-slate-400 group-hover/card:text-white"
                              )}>
                                {parent.name}
                              </span>
                              <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] mt-1 italic">
                                {parentCount} ARTICLES
                              </span>
                            </div>
                          </button>
                          
                          <input 
                            type="checkbox"
                            checked={isParentSelected}
                            onChange={() => toggleCategory(parent.id)}
                            className="w-5 h-5 rounded-lg text-indigo-600 bg-black/60 border-white/10 focus:ring-8 focus:ring-indigo-500/20 cursor-pointer transition-all"
                          />
                        </div>

                        {subs.length > 0 && (
                          <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2 relative z-10">
                            {subs.map((sub: Category) => {
                              const isSubSelected = selectedCategories.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => toggleCategory(sub.id)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-inner italic",
                                    isSubSelected
                                      ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo"
                                      : "bg-black/40 text-slate-600 border-white/5 hover:border-white/10 hover:text-slate-400"
                                  )}
                                >
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    );
                  })}
                  
                  <div
                    className={cn(
                      "p-6 rounded-[2rem] border transition-all duration-500 flex items-center justify-between group/uncat ring-1 ring-white/5 shadow-2xl relative overflow-hidden",
                      selectedCategories.includes('uncategorized')
                        ? "bg-rose-600/10 border-rose-500/50 shadow-neon-rose italic"
                        : "bg-black/20 border-white/5 hover:border-white/20"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory('uncategorized')}
                      className="flex items-center gap-4 text-left relative z-10"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner border",
                        selectedCategories.includes('uncategorized') ? "bg-rose-600 text-white border-rose-400 shadow-neon-rose scale-110" : "bg-black/60 text-slate-800 border-white/5"
                      )}>
                        <AlertCircle size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-[12px] font-black uppercase tracking-widest leading-tight italic",
                          selectedCategories.includes('uncategorized') ? "text-white" : "text-slate-400 group-hover/uncat:text-white"
                        )}>
                          SANS CLASSE
                        </span>
                        <span className="text-[9px] font-black text-rose-500/50 uppercase tracking-[0.2em] mt-1 italic">
                          DÉCOUVERTES
                        </span>
                      </div>
                    </button>
                    <input 
                      type="checkbox"
                      checked={selectedCategories.includes('uncategorized')}
                      onChange={() => toggleCategory('uncategorized')}
                      className="w-5 h-5 rounded-lg text-rose-600 bg-black/60 border-white/10 focus:ring-8 focus:ring-rose-500/20 cursor-pointer transition-all relative z-10"
                    />
                    <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover/uncat:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">VÉRIFICATION STOCKS</span>
                  </div>
                  <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    {(['all', 'low', 'out'] as const).map((level) => (
                      <button 
                        key={level}
                        onClick={() => setStockLevelFilter(level)}
                        className={cn(
                          "flex-1 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer active:scale-95 italic",
                          stockLevelFilter === level
                            ? "bg-indigo-600 text-white shadow-neon-indigo border border-indigo-400"
                            : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
                        )}
                      >
                        {level === 'all' ? 'NOMINAL' : level === 'low' ? 'CRITIQUE' : 'RUPTURE'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">STATUT SYSTÈME</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {(['all', 'active', 'inactive', 'discontinued'] as const).map((status) => (
                      <button 
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                          "whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border cursor-pointer active:scale-95 shadow-2xl italic",
                          statusFilter === status
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo ring-1 ring-white/20"
                            : "bg-black/40 text-slate-600 border-white/5 hover:border-white/10 hover:text-white"
                        )}
                      >
                        {status === 'all' ? 'GLOBAL' : status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-end xl:col-start-4">
                  <button
                    className="w-full text-[11px] font-black uppercase tracking-[0.3em] bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600 hover:text-white py-6 rounded-[1.75rem] cursor-pointer transition-all active:scale-95 shadow-2xl ring-1 ring-white/5 italic"
                    onClick={onResetAll}
                  >
                    <RotateCcw size={18} className="inline-block mr-3 animate-reverse-spin" /> RÉINITIALISER TERMINAL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
