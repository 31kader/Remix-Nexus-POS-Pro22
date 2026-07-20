import bcrypt from 'bcryptjs';
import { dbState } from './lib/local-db';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  fullName?: string;
}

/**
 * Vérifie l'authentification d'un utilisateur en mode hors ligne.
 * Utilise une promesse asynchrone pour ne pas bloquer l'interface React durant le calcul de l'empreinte bcrypt.
 */
export async function verifyOfflineAuth(usernameInput: string, passwordInput: string): Promise<UserAccount | null> {
  try {
    const usersTable = dbState['users'] || {};
    const userList = Object.values(usersTable) as any[];

    // Recherche de l'utilisateur par nom d'utilisateur
    const matchingUser = userList.find(
      (u) => u.username && u.username.toLowerCase() === usernameInput.trim().toLowerCase()
    );

    if (!matchingUser || !matchingUser.passwordHash) {
      return null;
    }

    // Comparaison asynchrone (non-bloquante pour le thread React)
    const isPasswordValid = await new Promise<boolean>((resolve) => {
      bcrypt.compare(passwordInput, matchingUser.passwordHash, (err, isMatch) => {
        if (err) {
          console.error('[Auth] Erreur lors du contrôle du mot de passe hors ligne:', err);
          resolve(false);
        } else {
          resolve(Boolean(isMatch));
        }
      });
    });

    if (isPasswordValid) {
      return {
        id: matchingUser.id,
        username: matchingUser.username,
        passwordHash: matchingUser.passwordHash,
        role: matchingUser.role || 'cashier',
        fullName: matchingUser.fullName || matchingUser.name || matchingUser.username
      };
    }

    return null;
  } catch (error) {
    console.error('[Auth] Échec de la vérification hors ligne:', error);
    return null;
  }
}