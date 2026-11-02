import React from 'react';
import { Modal } from '../ui';
import { UserProfile } from '../../types';

interface UserDetailsModalProps {
  viewedUser: UserProfile | null;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  viewedUser,
  onClose
}) => {
  if (!viewedUser) return null;

  return (
    <Modal isOpen={!!viewedUser} onClose={onClose} title="Détails du Compte Utilisateur">
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
          <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-black">
            {(viewedUser.displayName || 'U').charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{viewedUser.displayName}</h3>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {viewedUser.role}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
            <p className="text-slate-400 uppercase font-bold mb-1">Email</p>
            <p className="font-bold text-slate-900 dark:text-white truncate">{viewedUser.email || 'Non renseigné'}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
            <p className="text-slate-400 uppercase font-bold mb-1">Téléphone</p>
            <p className="font-bold text-slate-900 dark:text-white">{viewedUser.phone || 'Non renseigné'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
        >
          Fermer
        </button>
      </div>
    </Modal>
  );
};
