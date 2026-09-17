import { useState } from 'react';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { localDb } from '../services/LocalDatabase';
import { generateLocalId } from '../lib/db-converters';
import { usePeopleStore } from '../store/usePeopleStore';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

export function useStaffManagement() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);

  const handleAddStaffManual = async (name: string, email: string, role: string, phone?: string, password?: string) => {
    try {
      const trimmedName = name.trim();
      const cleanEmail = email.toLowerCase().trim();
      const cleanPhone = phone?.trim() || '';
      const cleanPassword = password?.trim() || '';

      if (!trimmedName) {
        toast.error('Le nom complet est obligatoire.');
        return;
      }
      if (!cleanEmail && !cleanPhone) {
        toast.error('Ajoutez un email ou un numéro de téléphone comme identifiant.');
        return;
      }
      if (cleanPassword && cleanPassword.length < 4) {
        toast.error('Le mot de passe doit contenir au moins 4 caractères.');
        return;
      }
      if (cleanEmail) {
        const { val: valEmail } = await localDb.get('users');
        const users = valEmail() || {};
        const exists = Object.values(users).some((u: any) => u && u.email && u.email.toLowerCase() === cleanEmail);
        if (exists) {
          toast.error("Un utilisateur avec cet email existe déjà dans les comptes.");
          return;
        }
      }

      if (cleanPhone) {
        const { val: valPhone } = await localDb.get('users');
        const users = valPhone() || {};
        const exists = Object.values(users).some((u: any) => u && u.phone && u.phone === cleanPhone);
        if (exists) {
          toast.error("Un utilisateur avec ce numéro de téléphone existe déjà.");
          return;
        }
      }

      const newId = generateLocalId();
      const passwordHash = cleanPassword ? bcrypt.hashSync(cleanPassword, 10) : '';
      const uid = `auth-${Date.now()}`;

      const newUser: any = {
        id: newId,
        uid: uid,
        displayName: trimmedName,
        email: cleanEmail,
        phone: cleanPhone,
        role: role as any,
        passwordHash,
        createdAt: new Date().toISOString()
      };

      await localDb.insert(`users/${newId}`, newUser);
      
      // Update store immediately so it displays instantly on screen
      usePeopleStore.getState().setUsers(prev => {
        const safe = Array.isArray(prev) ? prev : [];
        return [...safe.filter(u => u.id !== newId), newUser];
      });

      toast.success(`Membre "${trimmedName}" ajouté avec succès.`);
      setIsAddUserModalOpen(false);
    } catch (error) {
      handleDatabaseError(error, OperationType.CREATE, 'users');
    }
  };

  return {
    isAddUserModalOpen, setIsAddUserModalOpen,
    activeStaffId, setActiveStaffId,
    handleAddStaffManual
  };
}
