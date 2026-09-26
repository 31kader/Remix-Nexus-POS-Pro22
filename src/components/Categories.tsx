import React, { useRef, useState, useMemo } from 'react';
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Search,
  Package,
  FolderOpen
} from 'lucide-react';
import { Category, Product } from '../types';
import { cn, exportToCSV } from '../lib/utils';
import { Button, Card, SafeImage } from './ui';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { localDb } from '../services/LocalDatabase';

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

  const getSubcategories = (parentId: string) =>
    categories.filter((c: any) => c.parentId === parentId);

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
    const dataToExport = categories.map((cat) => {
      const parent = categories.find((c) => c.id === cat.parentId);
      return {
        id: cat.id,
        Nom: cat.name,
        Niveau: cat.level || 0,
        Parent_Id: cat.parentId || '',
        Parent_Nom: parent ? parent.name : '',
        Nb_Produits: productCounts.totalMap[cat.id] || 0
      };
    });
    exportToCSV(dataToExport, 'categories_export');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const data = results.data as any[];
          let successCount = 0;
          let failCount = 0;

          for (const row of data) {
            const nom = row['Nom']?.trim();
            if (!nom) {
              failCount++;
              continue;
            }

            const parentId = row['Parent_Id']?.trim();
            const parentNom = row['Parent_Nom']?.trim();

            const existing = categories.find(
              (c) => (c.name || '').toLowerCase() === nom.toLowerCase()
            );
            if (existing) {
              failCount++;
              continue;
            }

            let resolvedParentId = parentId || null;
            if (!resolvedParentId && parentNom) {
              const pData = categories.find(
                (c) => (c.name || '').toLowerCase() === parentNom.toLowerCase()
              );
              if (pData) {
                resolvedParentId = pData.id;
              }
            }

            const newId = Math.random().toString(36).substring(2, 10);
            try {
              await localDb.insert(`categories/${newId}`, {
                id: newId,
                name: nom,
                parentId: resolvedParentId || undefined
              });
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          setImportSummary(
            successCount +
              ' catégorie(s) importée(s) avec succès. ' +
              (failCount > 0 ? failCount + ' ignorée(s) (doublons ou erreurs).' : '')
          );
        } catch (error) {
          console.error("Erreur d'importation:", error);
          toast.error("Une erreur s'est produite lors de l'importation.");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error: any) => {
        setIsImporting(false);
        toast.error('Erreur de lecture du fichier CSV: ' + error.message);
      }
    });
  };

  const renderCategory = (category: any, level: number = 0) => {
    const isSearching = searchQuery.trim().length > 0;
    const subcategories = isSearching ? [] : getSubcategories(category.id);
    const isCollapsed = Boolean(collapsedIds[category.id]);
    const totalProd = productCounts.totalMap[category.id] || 0;
    const parentCat = category.parentId
      ? categories.find((c) => c.id === category.parentId)
      : null;

    return (
      <div key={category.id} className="space-y-2">
        <Card
          className={cn(
            'p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all border border-slate-200 dark:border-zinc-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 bg-slate-50/70 dark:bg-zinc-800/50',
            level > 0 && 'ml-4 sm:ml-8 border-l-4 border-l-indigo-500 dark:border-l-indigo-400'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {subcategories.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleCollapse(category.id)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700/70 transition-colors shrink-0 cursor-pointer"
                title={isCollapsed ? 'Déplier les sous-catégories' : 'Replier les sous-catégories'}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              </button>
            ) : (
              <div className="w-7 shrink-0 hidden sm:block" />
            )}

            {category.imageUrl ? (
              <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <SafeImage
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  fallback={<FolderTree size={22} className="text-indigo-600 dark:text-indigo-400" />}
                />
              </div>
            ) : (
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border',
                  level === 0
                    ? 'bg-indigo-600/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : 'bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                )}
              >
                {level === 0 ? <FolderTree size={20} /> : <FolderOpen size={18} />}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base truncate">
                  {category.name}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30">
                  <Package size={11} />
                  {totalProd} produit{totalProd > 1 ? 's' : ''}
                </span>
                {subcategories.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/80 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                    {subcategories.length} sous-catégorie{subcategories.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                {parentCat
                  ? `Sous-catégorie de : ${parentCat.name}`
                  : subcategories.length > 0
                  ? `Rayon principal contenant ${subcategories.length} sous-rayon(s)`
                  : 'Rayon principal'}
              </p>
            </div>
          </div>

          {/* Boutons d'action toujours visibles (compatibles écran tactile POS & souris) */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => onAdd(category.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
              title="Ajouter une sous-catégorie"
            >
              <Plus size={14} />
              <span className="hidden md:inline">Sous-catégorie</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
              title="Modifier la catégorie"
            >
              <Edit2 size={14} />
              <span className="hidden md:inline">Modifier</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(category)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
              title="Supprimer la catégorie"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </Card>

        {subcategories.length > 0 && !isCollapsed && (
          <div className="space-y-2 mt-2">
            {subcategories.map((sub: any) => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    );
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
        {filteredRootCategories.map((category: any) => renderCategory(category))}

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
