import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal, Button } from '../ui';

interface QuickSelectCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickSelectGroups: Array<{ id: string; name: string; productIds: string[] }>;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  handleCreateGroup: () => void;
  handleDeleteGroup: (groupId: string) => void;
}

export const QuickSelectCategoryModal: React.FC<QuickSelectCategoryModalProps> = ({
  isOpen,
  onClose,
  quickSelectGroups = [],
  newGroupName,
  setNewGroupName,
  handleCreateGroup,
  handleDeleteGroup
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Gérer les Catégories Favorites"
    >
      <div className="space-y-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Créez vos propres catégories favorites personnalisées pour y organiser vos articles.
        </p>
        
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
          {quickSelectGroups.length > 0 ? (
            quickSelectGroups.map((group) => (
              <div
                key={group.id}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {group.name}
                </span>
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
            <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aucune catégorie créée.
            </div>
          )}
        </div>
        <Button onClick={onClose} variant="secondary" className="w-full">
          Fermer
        </Button>
      </div>
    </Modal>
  );
};
