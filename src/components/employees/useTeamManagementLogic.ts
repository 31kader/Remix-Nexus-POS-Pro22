import { useState, useCallback } from 'react';
import { supabase } from '../../supabase';
import { CompanySettings, UserProfile, RolePermissions } from '../../types';
import { DEFAULT_PERMISSIONS } from '../../constants';
import { localDb } from '../../services/LocalDatabase';

const OWNER_EMAIL = (import.meta as any).env?.VITE_OWNER_EMAIL || 'hrskader305@gmail.com';

export const permissionKeys: (keyof RolePermissions)[] = [
  'canAccessInventory',
  'canAccessSales',
  'canAccessCustomers',
  'canAccessEmployees',
  'canAccessSuppliers',
  'canAccessSettings',
  'canAccessOnlineOrders',
  'canAccessExpenses',
  'canAccessReturns',
  'canAccessPurchases',
  'canAccessPromotions',
  'canAccessVouchers',
  'canAccessAnalytics',
  'canAccessShifts',
  'canAccessAuditLogs',
  'canModifyPrices',
  'canApplyDiscount',
  'canVoidTransaction',
  'canManageUsers'
];

export const permissionLabels: Record<keyof RolePermissions, string> = {
  canAccessInventory: 'Inventaire',
  canAccessSales: 'Ventes / Caisse',
  canAccessCustomers: 'Clients',
  canAccessEmployees: 'Employés & Équipe',
  canAccessSuppliers: 'Fournisseurs',
  canAccessSettings: 'Paramètres Système',
  canAccessOnlineOrders: 'Commandes en Ligne',
  canAccessExpenses: 'Dépenses',
  canAccessReturns: 'Retours Produits',
  canAccessPurchases: 'Achats / Entrées Stock',
  canAccessPromotions: 'Promotions',
  canAccessVouchers: 'Bons d\'Achat',
  canAccessAnalytics: 'Analytique & Rapports',
  canAccessShifts: 'Sessions de Caisse',
  canAccessAuditLogs: 'Journaux d\'Audit',
  canModifyPrices: 'Modifier les Prix',
  canApplyDiscount: 'Appliquer des Remises',
  canVoidTransaction: 'Annuler des Transactions',
  canManageUsers: 'Gérer les Utilisateurs'
};

export const roles: ('admin' | 'manager' | 'cashier' | 'delivery' | 'picker')[] = ['admin', 'manager', 'cashier', 'delivery', 'picker'];

export function useTeamManagementLogic({
  settings,
  users
}: {
  settings: CompanySettings;
  users: UserProfile[];
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUserDeleteConfirmOpen, setIsUserDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [viewedUser, setViewedUser] = useState<UserProfile | null>(null);

  const deactivateUserAccount = useCallback(async (userKey: string, userData: any) => {
    const safeName = String(userData?.displayName || userData?.email || 'Utilisateur').replace(/\s*\(ARCHIVE\)$/i, '');
    const archivedUid = userData?.uid ? String(userData.uid) : `archived_${userKey}`;

    await localDb.update(`users/${userKey}`, {
      uid: archivedUid,
      displayName: `${safeName} (ARCHIVE)`,
      email: '',
      phone: '',
      password: null,
      passwordHash: '',
      role: 'delivery',
      employeeId: null,
      deactivatedAt: new Date().toISOString()
    });
  }, []);

  const handleTogglePermission = useCallback(async (role: 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker', permission: keyof RolePermissions) => {
    if (role === 'admin') return; // Admin always has all permissions
    
    setIsProcessing(true);
    try {
      const currentPermissions = settings.rolePermissions?.[role] || DEFAULT_PERMISSIONS[role];
      const newPermissions = {
        ...currentPermissions,
        [permission]: !currentPermissions[permission]
      };

      const updatedRolePermissions = {
        ...(settings.rolePermissions || {}),
        [role]: newPermissions
      };

      const settingsId = settings.id || 'company';
      await localDb.update(`settings/${settingsId}`, { rolePermissions: updatedRolePermissions });
    } catch (error: any) {
      alert("Erreur: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [settings]);

  const handleUpdateUserRole = useCallback(async (userId: string, newRole: 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker') => {
    setIsProcessing(true);
    try {
      await localDb.update(`users/${userId}`, { role: newRole });
    } catch (error: any) {
      alert("Erreur: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    setUserToDelete(userId);
    setIsUserDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try {
      const usersSnap = await localDb.get('users');
      const usersData = usersSnap.val() || {};
      const entries = Object.entries(usersData) as [string, any][];
      const selected = entries.find(([key, value]) => key === userToDelete || value?.id === userToDelete || value?.uid === userToDelete);

      const selectedUser = selected?.[1] || null;
      const candidateKeys = entries
        .filter(([key, value]) => {
          if (key === userToDelete) return true;
          if (!selectedUser) return value?.id === userToDelete || value?.uid === userToDelete;

          const sameId = value?.id && selectedUser?.id && value.id === selectedUser.id;
          const sameUid = value?.uid && selectedUser?.uid && value.uid === selectedUser.uid;
          const sameEmail = value?.email && selectedUser?.email && value.email.toLowerCase() === selectedUser.email.toLowerCase();
          return !!(sameId || sameUid || sameEmail);
        })
        .map(([key]) => key);

      const txsSnap = await localDb.get('transactions');
      const transactions = Object.values(txsSnap.val() || {});
      const hasTransactions = transactions.some((t: any) => {
        const txUser = String(t.userId || '');
        return txUser === String(userToDelete) || candidateKeys.includes(txUser);
      });
      
      if (hasTransactions) {
        const keysToDeactivate = candidateKeys.length > 0 ? candidateKeys : [userToDelete];
        for (const key of keysToDeactivate) {
          const userRecord = usersData[key] || {};
          await deactivateUserAccount(key, userRecord);
        }

        alert("Compte lie a des historiques detecte. Le compte a ete archive et desactive (acces coupe), sans supprimer l'historique des ventes.");
        setIsUserDeleteConfirmOpen(false);
        setUserToDelete(null);
        return;
      }

      if (candidateKeys.length === 0) {
        await localDb.delete(`users/${userToDelete}`);
      } else {
        for (const key of candidateKeys) {
          await localDb.delete(`users/${key}`);
        }
      }
      setIsUserDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Delete user error:", error);
      alert(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [deactivateUserAccount, userToDelete]);

  const handlePurgeAll = useCallback(async () => {
    const confirmation = window.confirm("⚠️ ZONE DE DANGER : Voulez-vous vraiment supprimer TOUS les comptes d'accès (sauf le vôtre) ? Cette action est irréversible.");
    if (!confirmation) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserUid = user?.id;
      const ownerEmail = OWNER_EMAIL;

      const userVictims = users.filter(u => u.uid !== currentUserUid && u.email !== ownerEmail);
      if (userVictims.length === 0) {
        alert("Aucun compte a purger.");
        return;
      }

      const txsSnap = await localDb.get('transactions');
      const transactions = Object.values(txsSnap.val() || {});
      const referencedUserIds = new Set<string>();
      transactions.forEach((tx: any) => {
        const txUserId = String(tx?.userId || tx?.user_id || '').trim();
        if (txUserId) referencedUserIds.add(txUserId);
      });

      let deletedCount = 0;
      let blockedCount = 0;
      for (const u of userVictims) {
        const candidateIds = [u.id, u.uid].filter(Boolean).map(v => String(v));
        const isReferenced = candidateIds.some(id => referencedUserIds.has(id));

        if (isReferenced) {
          blockedCount++;
          continue;
        }

        const userKey = u.id || u.uid;
        if (userKey) {
          await localDb.delete(`users/${userKey}`);
          deletedCount++;
        }
      }

      if (blockedCount > 0) {
        alert(`Purge terminee. ${deletedCount} compte(s) supprime(s), ${blockedCount} compte(s) conserve(s) car lies a des transactions.`);
      } else {
        alert(`Purge terminee avec succes. ${deletedCount} compte(s) supprime(s).`);
      }
    } catch (error: any) {
      alert("Erreur lors de la purge: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [users]);

  return {
    isProcessing,
    isUserDeleteConfirmOpen,
    setIsUserDeleteConfirmOpen,
    userToDelete,
    viewedUser,
    setViewedUser,
    handleTogglePermission,
    handleUpdateUserRole,
    handleDeleteUser,
    confirmDeleteUser,
    handlePurgeAll
  };
}
