import { useState } from 'react';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { localDb } from '../services/LocalDatabase';
import { generateLocalId } from '../lib/db-converters';
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
        alert('Le nom complet est obligatoire.');
        return;
      }
      if (!cleanEmail && !cleanPhone) {
        alert('Ajoutez un email ou un numéro de téléphone comme identifiant.');
        return;
      }
      if (cleanPassword && cleanPassword.length < 4) {
        alert('Le mot de passe doit contenir au moins 4 caractères.');
        return;
      }
      if (cleanEmail) {
        const { val: valEmail } = await localDb.get('users');
        const users = valEmail() || {};
        const exists = Object.values(users).some((u: any) => u.email === cleanEmail);
        if (exists) {
          alert("Un utilisateur avec cet email existe déjà dans les comptes.");
          return;
        }
      }

      if (cleanPhone) {
        const { val: valPhone } = await localDb.get('users');
        const users = valPhone() || {};
        const exists = Object.values(users).some((u: any) => u.phone === cleanPhone);
        if (exists) {
          alert("Un utilisateur avec ce numéro de téléphone existe déjà.");
          return;
        }
      }

      const newId = generateLocalId();
      const passwordHash = cleanPassword ? bcrypt.hashSync(cleanPassword, 10) : '';

      const uid = `auth-${Date.now()}`;
      await localDb.insert(`users/${newId}`, {
        id: newId,
        uid: uid,
        displayName: trimmedName,
        email: cleanEmail,
        phone: cleanPhone,
        role: role as any,
        employeeId: null,
        passwordHash,
        createdAt: new Date().toISOString()
      });

      alert(`Membre "${name}" ajouté avec succès.`);
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
