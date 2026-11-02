import { encryptData, decryptData } from './legacyEncryption';
import { encryptLocalData, decryptLocalData, resetAESCache } from './aesEncryption';

/**
 * Chiffre un objet et le stocke (synchrone).
 * 🛡️ SEC-02 : Si la clé concerne une session, isole dans sessionStorage (règle projet: sessions en sessionStorage).
 */
export function setSecureItem(key: string, value: any): void {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = encryptData(str);
    if (key.includes('session')) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, encrypted);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }
    localStorage.setItem(key, encrypted);
  } catch (err) {
    console.warn('[Security] Failed to set secure item:', err);
  }
}

/**
 * Récupère et déchiffre un élément (synchrone).
 * 🛡️ SEC-02 : Vérifie sessionStorage pour les sessions avec migration et purge transparente depuis localStorage.
 * Rétrocompatible avec JSON en clair existant et nx2:.
 */
export function getSecureItem<T = any>(key: string): T | null {
  try {
    let cipherText: string | null = null;
    if (key.includes('session')) {
      if (typeof sessionStorage !== 'undefined') {
        cipherText = sessionStorage.getItem(key);
      }
      if (!cipherText && typeof localStorage !== 'undefined') {
        cipherText = localStorage.getItem(key);
        if (cipherText) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(key, cipherText);
          }
          localStorage.removeItem(key);
        }
      }
    } else {
      cipherText = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }

    if (!cipherText) return null;

    // Rétrocompatibilité : migration transparente du JSON en clair existant
    if (cipherText.startsWith('{') || cipherText.startsWith('[')) {
      try {
        const plain = JSON.parse(cipherText) as T;
        setSecureItem(key, plain);
        return plain;
      } catch (_) {}
    }

    const decrypted = decryptData(cipherText);
    try {
      return JSON.parse(decrypted) as T;
    } catch (_) {
      return decrypted as any;
    }
  } catch (err) {
    console.warn('[Security] Failed to get secure item:', err);
    return null;
  }
}

/**
 * Supprime un élément sécurisé de localStorage et de sessionStorage.
 */
export function removeSecureItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('[Security] Failed to remove secure item:', err);
  }
}

/**
 * Purge tous les secrets locaux et réinitialise les clés dérivées en mémoire
 */
export function clearSecureItems(): void {
  try {
    resetAESCache();

    if (typeof localStorage === 'undefined') return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('nexus_sec_') ||
        k === 'nexus_offline_credentials' ||
        k === 'nexus_pos_master_pin' ||
        k === 'nexus_active_offline_session' ||
        k === 'nexus_active_online_session' ||
        k === 'nexus_login_lock_until' ||
        k === 'nexus_login_failures'
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (err) {
    console.warn('[Security] Failed to clear secure items:', err);
  }
}

/**
 * Chiffre un objet avec AES-256-GCM et le stocke dans localStorage (asynchrone).
 */
export async function setSecureItemAsync(key: string, value: any): Promise<void> {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = await encryptLocalData(str);
    localStorage.setItem(key, encrypted);
  } catch (err) {
    console.warn('[Security] Failed to set secure item async:', err);
  }
}

/**
 * Récupère et déchiffre un élément de localStorage avec AES-256-GCM / nx2 (asynchrone).
 */
export async function getSecureItemAsync<T = any>(key: string): Promise<T | null> {
  try {
    const cipherText = localStorage.getItem(key);
    if (!cipherText) return null;

    if (cipherText.startsWith('{') || cipherText.startsWith('[')) {
      try {
        const plain = JSON.parse(cipherText) as T;
        await setSecureItemAsync(key, plain);
        return plain;
      } catch (_) {}
    }

    const decrypted = await decryptLocalData(cipherText);
    try {
      return JSON.parse(decrypted) as T;
    } catch (_) {
      return decrypted as any;
    }
  } catch (err) {
    console.warn('[Security] Failed to get secure item async:', err);
    return null;
  }
}
