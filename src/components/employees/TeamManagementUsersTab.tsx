import React from 'react';
import { ShieldCheck, Eye, Trash2, Key, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Employee, UserProfile } from '../../types';
import { Card, ConfirmDialog, Modal } from '../ui';
import { cn } from '../../lib/utils';
import { roles } from './useTeamManagementLogic';
import { auth } from '../../services/AuthService';
import { localDb } from '../../services/LocalDatabase';
import { toast } from 'sonner';

interface TeamManagementUsersTabProps {
  users: UserProfile[];
  employees: Employee[];
  isProcessing: boolean;
  handleUpdateUserRole: (userId: string, newRole: 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker') => void;
  handleDeleteUser: (userId: string) => void;
  setViewedUser: (user: UserProfile | null) => void;
  viewedUser: UserProfile | null;
  isUserDeleteConfirmOpen: boolean;
  setIsUserDeleteConfirmOpen: (open: boolean) => void;
  confirmDeleteUser: () => void;
}

export function TeamManagementUsersTab({
  users,
  employees,
  isProcessing,
  handleUpdateUserRole,
  handleDeleteUser,
  setViewedUser,
  viewedUser,
  isUserDeleteConfirmOpen,
  setIsUserDeleteConfirmOpen,
  confirmDeleteUser
}: TeamManagementUsersTabProps) {
  const [pinEditorUser, setPinEditorUser] = React.useState<UserProfile | null>(null);
  const [pinValue, setPinValue] = React.useState('');
  const [pinError, setPinError] = React.useState('');
  const [isSavingPin, setIsSavingPin] = React.useState(false);

  // Merge `users` AND `employees` so the table is NEVER empty even if accounts were added via Employees
  const uniqueUsers = React.useMemo(() => {
    const seen = new Set<string>();
    const combined: UserProfile[] = [];

    for (const u of users) {
      const key = String(u.id || u.uid || u.email || u.phone || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(u);
    }

    for (const emp of employees) {
      const key = String(emp.id || emp.email || emp.phone || emp.name || '').toLowerCase();
      const alreadyById = combined.some(
        u =>
          u.employeeId === emp.id ||
          u.id === emp.id ||
          (u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()) ||
          (u.displayName && emp.name && u.displayName.toLowerCase() === emp.name.toLowerCase())
      );
      if (alreadyById || !key || seen.has(key)) continue;
      seen.add(key);
      combined.push({
        id: emp.id,
        uid: emp.id,
        displayName: emp.name,
        email: emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@nexus.local`,
        phone: emp.phone || '',
        role: (emp.role as any) || 'cashier',
        employeeId: emp.id
      } as UserProfile);
    }

    return combined;
  }, [users, employees]);

  const openPinEditor = (user: UserProfile) => {
    setPinEditorUser(user);
    setPinValue('');
    setPinError('');
  };

  const closePinEditor = () => {
    if (isSavingPin) return;
    setPinEditorUser(null);
    setPinValue('');
    setPinError('');
  };

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

      setPinEditorUser(null);
      setPinValue('');
      toast.success('Mot de passe / PIN Caisse mis à jour avec succès !');
    } catch (e: any) {
      setPinError(`Erreur : ${e.message}`);
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="text-xs">
          <p className="font-black text-indigo-700 dark:text-indigo-300 uppercase">Comptes d'Authentification & PIN Caisse</p>
          <p className="text-slate-600 dark:text-zinc-300 mt-0.5">
            Définissez le rôle (<strong className="text-slate-900 dark:text-white">Admin, Gérant, Caissier, Livreur</strong>) et le code PIN de connexion rapide pour chaque membre de votre équipe.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 uppercase border-b border-slate-200 dark:border-zinc-800">
                <th className="p-4 text-[11px] font-black">Membre / Utilisateur</th>
                <th className="p-4 text-[11px] font-black">Identifiants (Email / Tél)</th>
                <th className="p-4 text-[11px] font-black">PIN / Mot de Passe</th>
                <th className="p-4 text-[11px] font-black">Rôle & Niveau d'Accès</th>
                <th className="p-4 text-[11px] font-black">Statut</th>
                <th className="p-4 text-[11px] font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {uniqueUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                    Aucun membre enregistré. Cliquez sur « + Ajouter Membre » en haut à droite.
                  </td>
                </tr>
              ) : uniqueUsers.map((u, idx) => {
                const userKey = u.id || u.uid;
                const employee = employees.find(e => e.id === u.employeeId || e.id === u.id);
                const hasPin = Boolean((u as any).passwordHash || (u as any).pinHash || (employee as any)?.pinHash);
                return (
                  <tr
                    key={userKey ? `user-row-${userKey}` : `user-idx-${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-sm">
                          {(u.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 dark:text-white text-sm">{u.displayName || 'Utilisateur'}</p>
                            {u.uid === auth.currentUser?.uid && (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-md">VOUS</span>
                            )}
                          </div>
                          {employee && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                              <UserCheck size={11} /> Lié à la fiche RH ({employee.role})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-xs">
                      <p className="font-bold text-slate-800 dark:text-zinc-200">{u.email || 'Non défini'}</p>
                      <p className="text-slate-500 dark:text-zinc-400 mt-0.5">{u.phone || employee?.phone || 'Sans téléphone'}</p>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold border",
                          hasPin
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}>
                          {hasPin ? '🔒 PIN Actif' : '⚠️ À définir'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPinEditor(u)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                          title="Définir ou modifier le code PIN Caisse"
                        >
                          <Key size={14} />
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <select
                        value={u.role || 'cashier'}
                        disabled={isProcessing}
                        onChange={(e) => handleUpdateUserRole(userKey, e.target.value as any)}
                        className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="admin">Administrateur</option>
                        <option value="manager">Gérant (Manager)</option>
                        <option value="cashier">Caissier (POS)</option>
                        <option value="delivery">Livreur</option>
                        <option value="picker">Préparateur</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Autorisé
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewedUser(u)}
                          className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-600 text-slate-600 dark:text-zinc-300 hover:text-white rounded-xl transition-colors"
                          title="Voir la fiche"
                        >
                          <Eye size={15} />
                        </button>
                        {u.uid !== auth.currentUser?.uid && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleDeleteUser(userKey)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-xl transition-colors"
                            title="Révoquer ce compte"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {viewedUser && (
        <Modal isOpen={!!viewedUser} onClose={() => setViewedUser(null)} title="Détails du Compte Utilisateur">
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
              onClick={() => setViewedUser(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
            >
              Fermer
            </button>
          </div>
        </Modal>
      )}

      {pinEditorUser && (
        <Modal
          isOpen={!!pinEditorUser}
          onClose={closePinEditor}
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
                onClick={closePinEditor}
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
      )}

      <ConfirmDialog
        isOpen={isUserDeleteConfirmOpen}
        onClose={() => setIsUserDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Révoquer le Compte"
        message="Êtes-vous sûr de vouloir révoquer l'accès de cet utilisateur ?"
      />
    </div>
  );
}