import React, { useState } from 'react';
import { 
  X, Plus, Edit2, Trash2, Check, Palette, 
  Layers, AlertCircle, FileText 
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { CustomReplenishmentList } from '../../../types/shortages';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';

interface CustomListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#64748b', // Slate
];

export const CustomListModal: React.FC<CustomListModalProps> = ({
  isOpen,
  onClose
}) => {
  const customLists = useShortageStore(s => s.customLists);
  const items = useShortageStore(s => s.items);
  const createCustomList = useShortageStore(s => s.createCustomList);
  const updateCustomList = useShortageStore(s => s.updateCustomList);
  const deleteCustomList = useShortageStore(s => s.deleteCustomList);

  // États pour la création d'une nouvelle liste
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // États pour la modification en ligne d'une liste existante
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!isOpen) return null;

  // Calcul du nombre d'articles associés par liste
  const getArticleCountForList = (listId: string) => {
    return items.filter(it => Array.isArray(it.listIds) && it.listIds.includes(listId)).length;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await createCustomList(newName.trim(), newDescription.trim(), newColor);
      setNewName('');
      setNewDescription('');
      setNewColor(PRESET_COLORS[0]);
    } catch (err) {
      console.error('Erreur lors de la création de la liste:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (list: CustomReplenishmentList) => {
    setEditingListId(list.id);
    setEditName(list.name);
    setEditDescription(list.description || '');
    setEditColor(list.color || PRESET_COLORS[0]);
  };

  const handleCancelEdit = () => {
    setEditingListId(null);
    setEditName('');
    setEditDescription('');
    setEditColor('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateCustomList(id, {
        name: editName.trim(),
        description: editDescription.trim(),
        color: editColor
      });
      setEditingListId(null);
    } catch (err) {
      console.error('Erreur lors de la modification de la liste:', err);
    }
  };

  const handleDelete = async (list: CustomReplenishmentList) => {
    const articleCount = getArticleCountForList(list.id);
    const confirmMessage = articleCount > 0
      ? `Supprimer la liste "${list.name}" ?\n${articleCount} article(s) y sont actuellement rattaché(s) (ils resteront dans le cahier des manques mais ne seront plus étiquetés dans cette liste).`
      : `Confirmez-vous la suppression définitive de la liste "${list.name}" ?`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteCustomList(list.id);
        if (editingListId === list.id) {
          handleCancelEdit();
        }
      } catch (err) {
        console.error('Erreur lors de la suppression de la liste:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-industrial-950 border border-industrial-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-custom-lists-title"
      >
        {/* En-tête de la Modale */}
        <div className="flex items-center justify-between p-5 border-b border-industrial-800 bg-industrial-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <h2 id="modal-custom-lists-title" className="text-lg font-black text-white uppercase tracking-tight">
                Listes d'Approvisionnement Libres
              </h2>
              <p className="text-xs text-industrial-400 font-mono">
                Créez et organisez vos tournées ou familles d'achats indépendantes des catégories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="Fermer la modale"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps Défilant */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1 : Formulaire de Création */}
          <div className="bg-industrial-900/40 p-4 rounded-2xl border border-industrial-800/80">
            <h3 className="text-xs font-black uppercase text-indigo-300 font-mono tracking-wider flex items-center gap-2 mb-3">
              <Plus size={14} /> Créer une nouvelle liste libre
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nom */}
                <div>
                  <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
                    Nom de la liste <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Tournée Détergents, Frais, Boissons..."
                    className="w-full bg-industrial-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-industrial-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
                    Note / Description (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex: Commandes hebdomadaires mardi"
                    className="w-full bg-industrial-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-industrial-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Sélection de la couleur */}
              <div>
                <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Palette size={12} /> Pastille de couleur
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all border",
                        newColor === c
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-industrial-950 scale-110 border-white/40"
                          : "border-transparent opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                      title={`Couleur ${c}`}
                      aria-label={`Sélectionner couleur ${c}`}
                    >
                      {newColor === c && <Check size={13} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={!newName.trim() || isCreating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Ajouter la liste</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2 : Liste des Listes Existantes */}
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
        </div>

        {/* Pied de la Modale */}
        <div className="p-4 border-t border-industrial-800 bg-industrial-900/60 flex items-center justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="bg-industrial-900 border-industrial-700 text-white font-mono text-xs px-5 py-2 rounded-xl"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
