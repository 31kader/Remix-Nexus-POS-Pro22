import React from 'react';
import { FileText, Edit2, Trash2, Check } from 'lucide-react';
import { CustomReplenishmentList } from '../../../../types/shortages';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { PRESET_COLORS } from './CreateCustomListSection';

interface CustomListsListSectionProps {
  customLists: CustomReplenishmentList[];
  getArticleCountForList: (listId: string) => number;
  editingListId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  editDescription: string;
  setEditDescription: (desc: string) => void;
  editColor: string;
  setEditColor: (color: string) => void;
  handleStartEdit: (list: CustomReplenishmentList) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: (id: string) => void;
  handleDelete: (list: CustomReplenishmentList) => void;
}

export const CustomListsListSection: React.FC<CustomListsListSectionProps> = ({
  customLists,
  getArticleCountForList,
  editingListId,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editColor,
  setEditColor,
  handleStartEdit,
  handleCancelEdit,
  handleSaveEdit,
  handleDelete
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black uppercase text-industrial-400 font-mono tracking-wider flex items-center gap-2">
          <FileText size={14} /> Listes enregistrées ({customLists.length})
        </h3>
      </div>

      {customLists.length === 0 ? (
        <div className="bg-industrial-900/20 border border-dashed border-industrial-800 rounded-2xl p-6 text-center text-xs font-mono text-industrial-500">
          Aucune liste personnalisée pour l'instant. Créez-en une ci-dessus pour regrouper vos commandes par tournée ou type de grossiste !
        </div>
      ) : (
        <div className="space-y-2">
          {customLists.map((list) => {
            const isEditing = editingListId === list.id;
            const articleCount = getArticleCountForList(list.id);

            if (isEditing) {
              return (
                <div
                  key={list.id}
                  className="bg-industrial-900 border border-indigo-500/50 p-3.5 rounded-2xl space-y-3 shadow-lg"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nom de la liste"
                      className="bg-industrial-950 border border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description / note"
                      className="bg-industrial-950 border border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Palette de couleur en mode édition */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                            editColor === c ? "ring-2 ring-white scale-110" : "opacity-70"
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Couleur ${c}`}
                        >
                          {editColor === c && <Check size={10} className="text-white" />}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 rounded-lg bg-industrial-950 border border-industrial-800 text-industrial-400 hover:text-white text-xs font-mono"
                      >
                        Annuler
                      </button>
                      <Button
                        type="button"
                        disabled={!editName.trim()}
                        onClick={() => handleSaveEdit(list.id)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded-lg font-bold"
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={list.id}
                className="bg-industrial-900/60 border border-industrial-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-industrial-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: list.color || '#6366f1' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">
                        {list.name}
                      </span>
                      <span className="px-2 py-0.2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] shrink-0 font-bold">
                        {articleCount} article{articleCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    {list.description && (
                      <p className="text-xs text-industrial-400 font-mono truncate mt-0.5">
                        {list.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(list)}
                    className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
                    title="Modifier cette liste"
                    aria-label={`Modifier la liste ${list.name}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(list)}
                    className="p-1.5 rounded-lg text-industrial-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Supprimer cette liste"
                    aria-label={`Supprimer la liste ${list.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
