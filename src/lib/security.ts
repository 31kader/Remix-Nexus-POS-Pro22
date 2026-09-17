// Local storage data encryption helper
const SECRET_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'default-nexus-key-salt-2026';

// Multi-round hash helper for keystream generation
function hashKeyWithSalt(key: string, salt: string): number[] {
  const combined = `${salt}:${key}:${salt.split('').reverse().join('')}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const stream: number[] = [];

  for (let i = 0; i < combined.length; i++) {
    const code = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code << 5), 0x5bd1e995);
    stream.push((h1 ^ (h2 >>> 16)) & 0xff);
  }

  while (stream.length < 64) {
    h1 = Math.imul(h1 ^ stream.length, 0x01000193);
    stream.push((h1 >>> 8) & 0xff);
  }

  return stream;
}

/**
 * Encrypts a plain text string using a salted dynamic keystream (nx2 format)
 * Returns Base64-encoded encrypted string prefixed with 'nx2:'
 */
export function encryptData(text: string): string {
  if (!text) return text;
  try {
    let salt = '';
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      salt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      salt = Math.random().toString(36).substring(2, 10);
    }

    const keyStream = hashKeyWithSalt(SECRET_KEY, salt);
    const utf8Text = unescape(encodeURIComponent(text));
    let encryptedChars = '';

    for (let i = 0; i < utf8Text.length; i++) {
      const charCode = utf8Text.charCodeAt(i);
      const k = keyStream[i % keyStream.length];
      encryptedChars += String.fromCharCode(charCode ^ k);
    }

    const payload = `${salt}:${btoa(encryptedChars)}`;
    return `nx2:${btoa(payload)}`;
  } catch (err) {
    console.warn('[Security] Enhanced encryption failed, using fallback:', err);
    return legacyEncrypt(text);
  }
}

function legacyEncrypt(text: string): string {
  let result = '';
  const utf8Text = unescape(encodeURIComponent(text));
  for (let i = 0; i < utf8Text.length; i++) {
    const charCode = utf8Text.charCodeAt(i);
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  return btoa(result);
}

function legacyDecrypt(cipherText: string): string {
  const rawData = atob(cipherText);
  let result = '';
  for (let i = 0; i < rawData.length; i++) {
    const charCode = rawData.charCodeAt(i);
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  return decodeURIComponent(escape(result));
}

/**
 * Decrypts a cipherText string back into its original plain text.
 * Automatically detects nx2 (salted keystream), legacy v1 (XOR), or plain fallback.
 */
export function decryptData(cipherText: string): string {
  if (!cipherText) return cipherText;

  // 1. Detect nx2 salted cipher
  if (cipherText.startsWith('nx2:')) {
    try {
      const rawPayload = atob(cipherText.substring(4));
      const colonIndex = rawPayload.indexOf(':');
      if (colonIndex > 0) {
        const salt = rawPayload.substring(0, colonIndex);
        const encryptedBase64 = rawPayload.substring(colonIndex + 1);
        const encryptedBytes = atob(encryptedBase64);
        const keyStream = hashKeyWithSalt(SECRET_KEY, salt);

        let result = '';
        for (let i = 0; i < encryptedBytes.length; i++) {
          const charCode = encryptedBytes.charCodeAt(i);
          const k = keyStream[i % keyStream.length];
          result += String.fromCharCode(charCode ^ k);
        }

        return decodeURIComponent(escape(result));
      }
    } catch (e) {
      console.warn('[Security] nx2 decryption failed, trying fallback:', e);
    }
  }

  // 2. Fallback to legacy v1 XOR decryption
  try {
    return legacyDecrypt(cipherText);
  } catch (err) {
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

/**
 * Removes an encrypted item from localStorage safely.
 */
export function removeSecureItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[Security] Failed to remove secure item:', err);
  }
}

export async function encryptLocalData(text: string): Promise<string> {
  return encryptData(text);
}

export async function decryptLocalData(cipherText: string): Promise<string> {
  return decryptData(cipherText);
}
