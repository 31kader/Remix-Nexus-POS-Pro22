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
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-3xl p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 mt-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Truck size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">SOURCE / FOURNISSEUR</span>
                </div>
                <div className="relative group">
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-bold uppercase text-slate-900 dark:text-white transition-all cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">TOUTES LES SOURCES</option>
                    {productSuppliers.map(s => (
                      <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.toUpperCase()}</option>
                    ))}
                    <option value="Sans fournisseur" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">SANS RÉFÉRENCE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <ArrowUpDown size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">ALGORITHME DE TRI</span>
                </div>
                <div className="relative group">
                  <select
                    value={sortKey}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-bold uppercase text-slate-900 dark:text-white transition-all cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">CRITÈRE PAR DÉFAUT</option>
                    <option value="name" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">DÉSIGNATION (A-Z)</option>
                    <option value="price" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">VALEUR CROISSANTE</option>
                    <option value="margin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">RENTABILITÉ (MARGE)</option>
                    <option value="stock" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">VOLUME DE STOCK</option>
                    <option value="updatedAt" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">DERNIÈRE MAJ</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Award size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">BRANDING / MARQUE</span>
                </div>
                <div className="relative group">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-bold uppercase text-slate-900 dark:text-white transition-all cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white italic">TOUTES LES MARQUES</option>
                    {(brands || []).filter(Boolean).map(b => (
                      <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{String(b.name || 'MARQUE').toUpperCase()}</option>
                    ))}
                    <option value="none" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">GÉNÉRIQUE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">FENÊTRE TEMPORELLE</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <div className="w-2 h-px bg-slate-300 dark:bg-slate-700" />
                  <input 
                    type="date"
                    className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderTree size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Architecture des Catégories</span>
                  </div>
                  <button onClick={() => setSelectedCategories([])} className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider hover:underline cursor-pointer">RÉINITIALISER CATÉGORIES</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.filter(c => !c.parentId).map((parent: Category) => {
                    const subs = categories.filter(c => c.parentId === parent.id);
                    const isParentSelected = selectedCategories.includes(parent.id);
                    const parentCount = categoryProductCounts[parent.id] || 0;
                    
                    return (
                      <div 
                        key={parent.id} 
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm",
                          isParentSelected 
                            ? "bg-indigo-50 dark:bg-indigo-600/10 border-indigo-300 dark:border-indigo-500/50" 
                            : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <button
                            type="button"
                            onClick={() => toggleCategory(parent.id)}
                            className="flex items-center gap-3 text-left cursor-pointer"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                              isParentSelected ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            )}>
                              <FolderTree size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wider leading-tight",
                                isParentSelected ? "text-indigo-900 dark:text-white" : "text-slate-900 dark:text-slate-300"
                              )}>
                                {parent.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                                {parentCount} ARTICLES
                              </span>
                            </div>
                          </button>
                          
                          <input 
                            type="checkbox"
                            checked={isParentSelected}
                            onChange={() => toggleCategory(parent.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>

                        {subs.length > 0 && (
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
                            {subs.map((sub: Category) => {
                              const isSubSelected = selectedCategories.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => toggleCategory(sub.id)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer",
                                    isSubSelected
                                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center justify-between shadow-sm",
                      selectedCategories.includes('uncategorized')
                        ? "bg-rose-50 dark:bg-rose-600/10 border-rose-300 dark:border-rose-500/50"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory('uncategorized')}
                      className="flex items-center gap-3 text-left cursor-pointer"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                        selectedCategories.includes('uncategorized') ? "bg-rose-600 text-white border-rose-500 shadow-sm" : "bg-white dark:bg-slate-800 text-rose-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      )}>
                        <AlertCircle size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wider leading-tight",
                          selectedCategories.includes('uncategorized') ? "text-rose-900 dark:text-white" : "text-slate-900 dark:text-slate-300"
                        )}>
                          SANS CLASSE
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mt-0.5">
                          DÉCOUVERTES
                        </span>
                      </div>
                    </button>
                    <input 
                      type="checkbox"
                      checked={selectedCategories.includes('uncategorized')}
                      onChange={() => toggleCategory('uncategorized')}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <TrendingDown size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">VÉRIFICATION STOCKS</span>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-950/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {(['all', 'low', 'out'] as const).map((level) => (
                      <button 
                        key={level}
                        onClick={() => setStockLevelFilter(level)}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          stockLevelFilter === level
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
                        )}
                      >
                        {level === 'all' ? 'NOMINAL' : level === 'low' ? 'CRITIQUE' : 'RUPTURE'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">STATUT SYSTÈME</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {(['all', 'active', 'inactive', 'discontinued'] as const).map((status) => (
                      <button 
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                          "whitespace-nowrap px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer shadow-sm",
                          statusFilter === status
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {status === 'all' ? 'GLOBAL' : status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-end xl:col-start-4">
                  <button
                    className="w-full text-xs font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-600/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-500/20 py-3 rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
                    onClick={onResetAll}
                  >
                    <RotateCcw size={15} /> 
                    <span>RÉINITIALISER FILTRES</span>
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
