// Local storage data encryption helper
const SECRET_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'default-nexus-key-salt-2026';

/**
 * Encrypts a plain text string using a key derived from the Supabase anon key
 * and returns a Base64-encoded encrypted string.
 */
export function encryptData(text: string): string {
  if (!text) return text;
  try {
    let result = '';
    const utf8Text = unescape(encodeURIComponent(text));
    for (let i = 0; i < utf8Text.length; i++) {
      const charCode = utf8Text.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return btoa(result);
  } catch (err) {
    console.warn('[Security] Encryption failed:', err);
    return text;
  }
}

/**
 * Decrypts a Base64-encoded encrypted string back into its original plain text.
 */
export function decryptData(cipherText: string): string {
  if (!cipherText) return cipherText;
  try {
    const rawData = atob(cipherText);
    let result = '';
    for (let i = 0; i < rawData.length; i++) {
      const charCode = rawData.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return decodeURIComponent(escape(result));
  } catch (err) {
    // If decryption fails, it might be unencrypted legacy data
    return cipherText;
  }
}

/**
 * Encrypts an object and stores it in localStorage.
 */
export function setSecureItem(key: string, value: any): void {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, encryptData(str));
  } catch (err) {
    console.warn('[Security] Failed to set secure item:', err);
  }
}

/**
 * Retrieves and decrypts an item from localStorage.
 */
export function getSecureItem<T = any>(key: string): T | null {
  try {
    const cipherText = localStorage.getItem(key);
    if (!cipherText) return null;
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

export async function encryptLocalData(text: string): Promise<string> {
  return encryptData(text);
}

export async function decryptLocalData(cipherText: string): Promise<string> {
  return decryptData(cipherText);
}
