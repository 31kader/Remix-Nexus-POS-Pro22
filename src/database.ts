import bcrypt from 'bcryptjs';
import { dbState } from './lib/local-db';

// 🟢 Ré-exports des utilitaires et services
export { convertKeysToSnake, convertKeysToCamel } from './lib/db-converters';
export { enqueueStockAdjustment } from './services/SyncService';

// 🟢 Ré-export de l'instance complète de localDb (résout toutes les erreurs de méthodes manquantes)
export { localDb } from './services/LocalDatabase';

/**
 * 👤 Interface Utilisateur
 */
export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  fullName?: string;
}

/**
 * 🛡️ Authentification Hors-Ligne
 * Vérifie les identifiants d'un utilisateur par rapport aux données locales.
 */
export async function verifyOfflineAuth(
  usernameInput: string,
  passwordInput: string
): Promise<UserAccount | null> {
  try {
    const users = Object.values(dbState['users'] || {}) as UserAccount[];
    const user = users.find(
      (u) => u.username?.toLowerCase() === usernameInput.trim().toLowerCase()
    );

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(
      passwordInput,
      user.passwordHash
    );

    if (isPasswordValid) {
      return user;
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de la vérification auth hors-ligne :', error);
    return null;
  }
}