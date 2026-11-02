import React from 'react';
import {
  FolderTree,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Package,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { Category } from '../../types';
import { cn } from '../../lib/utils';
import { Card, SafeImage } from '../ui';

export interface CategoryTreeItemProps {
  category: Category;
  level?: number;
  categories: Category[];
  totalMap: Record<string, number>;
  collapsedIds: Record<string, boolean>;
  toggleCollapse: (id: string) => void;
  searchQuery: string;
  onAdd: (parentId?: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({
  category,
  level = 0,
  categories,
  totalMap,
  collapsedIds,
  toggleCollapse,
  searchQuery,
  onAdd,
  onEdit,
  onDelete
}) => {
  const isSearching = searchQuery.trim().length > 0;
  const subcategories = isSearching ? [] : categories.filter((c: any) => c.parentId === category.id);
  const isCollapsed = Boolean(collapsedIds[category.id]);
  const totalProd = totalMap[category.id] || 0;
  const parentCat = category.parentId
    ? categories.find((c) => c.id === category.parentId)
    : null;

  return (
    <div className="space-y-2">
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
          {subcategories.map((sub: any) => (
            <CategoryTreeItem
              key={sub.id}
              category={sub}
              level={level + 1}
              categories={categories}
              totalMap={totalMap}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
              searchQuery={searchQuery}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
