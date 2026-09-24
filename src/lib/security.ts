// Local storage data encryption helper
const DEFAULT_KEY = 'default-nexus-key-salt-2026';
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
const SECRET_KEY = envKey || DEFAULT_KEY;

if (!envKey && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('[Security] ⚠️ Attention: VITE_SUPABASE_ANON_KEY non défini dans l\'environnement. Utilisation de la clé de secours par défaut.');
}

function textToBytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  const utf8 = unescape(encodeURIComponent(text));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    bytes[i] = utf8.charCodeAt(i);
  }
  return bytes;
}

function bytesToText(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(bin));
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

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
    const inputBytes = textToBytes(text);
    const encryptedBytes = new Uint8Array(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i++) {
      const k = keyStream[i % keyStream.length];
      encryptedBytes[i] = inputBytes[i] ^ k;
    }

    const payload = `${salt}:${bytesToBase64(encryptedBytes)}`;
    return `nx2:${btoa(payload)}`;
  } catch (err) {
    console.warn('[Security] Enhanced encryption failed, using fallback:', err);
    return legacyEncrypt(text);
  }
}

function legacyEncrypt(text: string): string {
  const inputBytes = textToBytes(text);
  let result = '';
  for (let i = 0; i < inputBytes.length; i++) {
    const charCode = inputBytes[i];
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  return btoa(result);
}

function legacyDecrypt(cipherText: string): string {
  const rawData = atob(cipherText);
  const decryptedBytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    const charCode = rawData.charCodeAt(i);
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    decryptedBytes[i] = charCode ^ keyChar;
  }
  return bytesToText(decryptedBytes);
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
        const encryptedBytes = base64ToBytes(encryptedBase64);
        const keyStream = hashKeyWithSalt(SECRET_KEY, salt);
        const decryptedBytes = new Uint8Array(encryptedBytes.length);

        for (let i = 0; i < encryptedBytes.length; i++) {
          const k = keyStream[i % keyStream.length];
          decryptedBytes[i] = encryptedBytes[i] ^ k;
        }

        return bytesToText(decryptedBytes);
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
