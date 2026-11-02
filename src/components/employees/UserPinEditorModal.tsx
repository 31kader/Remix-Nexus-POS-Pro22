import React, { useState } from 'react';
import { Modal } from '../ui';
import { UserProfile } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { toast } from 'sonner';

interface UserPinEditorModalProps {
  pinEditorUser: UserProfile | null;
  onClose: () => void;
}

export const UserPinEditorModal: React.FC<UserPinEditorModalProps> = ({
  pinEditorUser,
  onClose
}) => {
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  if (!pinEditorUser) return null;

  const savePin = async () => {
    if (!pinEditorUser || isSavingPin) return;

    let userKey = pinEditorUser.id || pinEditorUser.uid;

    try {
      const usersSnap = await localDb.get('users');
      const usersData = usersSnap.val() || {};
      const resolvedEntry = Object.entries(usersData).find(([key, value]: [string, any]) => {
        if (key === userKey) return true;
        if (value?.id && pinEditorUser.id && value.id === pinEditorUser.id) return true;
        if (value?.uid && pinEditorUser.uid && value.uid === pinEditorUser.uid) return true;
        if (value?.email && pinEditorUser.email && value.email.toLowerCase() === pinEditorUser.email.toLowerCase()) return true;
        if (value?.phone && pinEditorUser.phone && value.phone === pinEditorUser.phone) return true;
        return false;
      });
      if (resolvedEntry) {
        userKey = resolvedEntry[0];
      }
    } catch (e) {
      console.warn('Unable to resolve user key for PIN update:', e);
    }

    if (!userKey) {
      setPinError("Impossible de trouver l'identifiant du compte.");
      return;
    }

    const trimmedPin = pinValue.trim();
    if (trimmedPin.length < 4) {
      setPinError('Le mot de passe / PIN doit faire au moins 4 caractères.');
      return;
    }

    setIsSavingPin(true);
    setPinError('');

    try {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = bcrypt.hashSync(trimmedPin, 10);

      await localDb.update(`users/${userKey}`, {
        id: userKey,
        uid: userKey,
        displayName: pinEditorUser.displayName,
        email: pinEditorUser.email,
        role: pinEditorUser.role || 'cashier',
        passwordHash: hash,
        password: null
      });

      if (pinEditorUser.employeeId) {
        await localDb.update(`employees/${pinEditorUser.employeeId}`, {
          pinHash: hash,
          pin: null
        });
      }

      setPinValue('');
      toast.success('Mot de passe / PIN Caisse mis à jour avec succès !');
      onClose();
    } catch (e: any) {
      setPinError(`Erreur : ${e.message}`);
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <Modal
      isOpen={!!pinEditorUser}
      onClose={() => { if (!isSavingPin) onClose(); }}
      title={`Définir le PIN Caisse — ${pinEditorUser.displayName}`}
    >
      <div className="space-y-4 text-left">
        <p className="text-xs text-slate-600 dark:text-zinc-300">
          Saisissez le nouveau code PIN (ex: <code className="font-bold">1234</code>) ou mot de passe pour permettre à <strong>{pinEditorUser.displayName}</strong> de se connecter à la caisse. Le code sera chiffré avec <strong>bcrypt</strong>.
        </p>
        <input
          type="password"
          value={pinValue}
          onChange={(e) => setPinValue(e.target.value)}
          placeholder="Nouveau code PIN (min. 4 caractères)"
          className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-base font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              savePin();
            }
          }}
        />
        {pinError && <p className="text-xs font-bold text-rose-500">{pinError}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingPin}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={savePin}
            disabled={isSavingPin}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            {isSavingPin ? 'Chiffrement...' : 'Enregistrer le PIN'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
