import React, { useRef, useState, useMemo } from 'react';
import { FolderTree, Plus, Download, Upload, Search } from 'lucide-react';
import { Category, Product } from '../types';
import { Button } from './ui';
import { toast } from 'sonner';
import { CategoryTreeItem } from './categories/CategoryTreeItem';
import { exportCategoriesToCsv, importCategoriesFromCsv } from './categories/categoriesCsvService';

interface CategoriesProps {
  categories: Category[];
  products?: Product[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAdd: (parentId?: string) => void;
}

export function Categories({ categories, products = [], onEdit, onDelete, onAdd }: CategoriesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  // Comptage des produits par catégorie (directs + sous-catégories)
  const productCounts = useMemo(() => {
    const directMap: Record<string, number> = {};
    for (const cat of categories) {
      const catNameLower = (cat.name || '').trim().toLowerCase();
      directMap[cat.id] = products.filter(
        (p) =>
          p.categoryId === cat.id ||
          ((p as any).category && String((p as any).category).trim().toLowerCase() === catNameLower)
      ).length;
    }

    const totalMap: Record<string, number> = {};
    const computeTotal = (catId: string, visited = new Set<string>()): number => {
      if (visited.has(catId)) return 0;
      visited.add(catId);
      let count = directMap[catId] || 0;
      for (const sub of categories.filter((c: any) => c.parentId === catId)) {
        count += computeTotal(sub.id, visited);
      }
      totalMap[catId] = count;
      return count;
    };

    for (const cat of categories) {
      computeTotal(cat.id);
    }
    return { directMap, totalMap };
  }, [categories, products]);

  const filteredRootCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return categories.filter((c: any) => !c.parentId);
    }
    // Si recherche active, afficher toutes les catégories correspondant au filtre
    return categories.filter((c: any) => (c.name || '').toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExport = () => {
    exportCategoriesToCsv(categories, productCounts.totalMap);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportSummary(null);

    try {
      const res = await importCategoriesFromCsv(file, categories);
      setImportSummary(res.message);
    } catch (error: any) {
      console.error("Erreur d'importation:", error);
      toast.error("Erreur lors de l'importation: " + (error?.message || error));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils supérieure */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Arborescence des Catégories
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Créez, organisez et hiérarchisez vos familles de produits pour un accès rapide en caisse.
          </p>
          {importSummary && (
            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              {importSummary}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload size={17} className={isImporting ? 'animate-bounce' : ''} />
            <span>{isImporting ? 'Import...' : 'Importer CSV'}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={categories.length === 0}
          >
            <Download size={17} />
            <span>Exporter CSV</span>
          </Button>
          <Button onClick={() => onAdd()}>
            <Plus size={18} />
            <span>Nouvelle Catégorie</span>
          </Button>
        </div>
      </div>

      {/* Barre de recherche rapide */}
      {categories.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une catégorie ou un rayon..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => setCollapsedIds({})}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Tout déplier
            </button>
            <button
              type="button"
              onClick={() => {
                const all: Record<string, boolean> = {};
                categories.forEach((c) => {
                  all[c.id] = true;
                });
                setCollapsedIds(all);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Tout replier
            </button>
          </div>
        </div>
      )}

      {/* Liste hiérarchique des catégories */}
      <div className="space-y-3">
        {filteredRootCategories.map((category: any) => (
          <CategoryTreeItem
            key={category.id}
            category={category}
            categories={categories}
            totalMap={productCounts.totalMap}
            collapsedIds={collapsedIds}
            toggleCollapse={toggleCollapse}
            searchQuery={searchQuery}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {filteredRootCategories.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 space-y-3">
            <FolderTree size={36} className="mx-auto text-slate-400 dark:text-zinc-500" />
            <div>
              <p className="font-bold text-slate-800 dark:text-zinc-200 text-base">
                {searchQuery
                  ? `Aucune catégorie ne correspond à "${searchQuery}"`
                  : "Aucune catégorie n'a encore été créée."}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Cliquez sur « Nouvelle Catégorie » pour structurer votre catalogue.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
