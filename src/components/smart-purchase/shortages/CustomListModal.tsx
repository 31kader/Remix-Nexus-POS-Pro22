import React, { useState } from 'react';
import { X, Layers } from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { CustomReplenishmentList } from '../../../types/shortages';
import { Button } from '../../ui';
import { CreateCustomListSection, PRESET_COLORS } from './modal/CreateCustomListSection';
import { CustomListsListSection } from './modal/CustomListsListSection';

interface CustomListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
          <CreateCustomListSection
            newName={newName}
            setNewName={setNewName}
            newDescription={newDescription}
            setNewDescription={setNewDescription}
            newColor={newColor}
            setNewColor={setNewColor}
            isCreating={isCreating}
            onSubmit={handleCreateSubmit}
          />

          {/* Section 2 : Liste des Listes Existantes */}
          <CustomListsListSection
            customLists={customLists}
            getArticleCountForList={getArticleCountForList}
            editingListId={editingListId}
            editName={editName}
            setEditName={setEditName}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editColor={editColor}
            setEditColor={setEditColor}
            handleStartEdit={handleStartEdit}
            handleCancelEdit={handleCancelEdit}
            handleSaveEdit={handleSaveEdit}
            handleDelete={handleDelete}
          />
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
