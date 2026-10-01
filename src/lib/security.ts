// Local storage data encryption helper — Nexus POS Pro v1.2.19
// Chiffrement moderne AES-256-GCM (Web Crypto API SubtleCrypto) + PBKDF2
// Rétrocompatibilité descendante complète avec nx2: (XOR salé) et JSON brut

const DEFAULT_KEY = 'default-nexus-key-salt-2026';
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
const SECRET_KEY = envKey || DEFAULT_KEY;
const LOCAL_SALT_STORAGE_KEY = 'nexus_local_salt_v1';
const PBKDF2_ITERATIONS = 100000;

if (!envKey && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('[Security] ⚠️ Attention: VITE_SUPABASE_ANON_KEY non défini dans l\'environnement. Utilisation de la clé de secours par défaut.');
}

// ==========================================
// Utilitaires de conversion d'octets / texte
// ==========================================

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

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ==========================================
// Primitives Aléatoires et SubtleCrypto
// ==========================================

function getSubtleCrypto(): SubtleCrypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.subtle) {
    return (globalThis as any).crypto.subtle;
  }
  throw new Error('[Security] SubtleCrypto non disponible dans l\'environnement actuel.');
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(array);
  }
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && typeof (globalThis as any).crypto.getRandomValues === 'function') {
    return (globalThis as any).crypto.getRandomValues(array);
  }
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

// ==========================================
// Gestion du Sel Persistant & Dérivation PBKDF2
// ==========================================

let memorySaltCache: Uint8Array | null = null;
let cachedAESKey: CryptoKey | null = null;
let cachedAESKeySaltHex: string = '';

/**
 * Obtient ou génère un sel cryptographique local de 16 octets persistant sur le terminal
 */
export function getOrCreateLocalSalt(): Uint8Array {
  if (memorySaltCache && memorySaltCache.length >= 16) {
    return memorySaltCache;
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const storedHex = localStorage.getItem(LOCAL_SALT_STORAGE_KEY);
      if (storedHex && storedHex.length >= 32) {
        const bytes = hexToBytes(storedHex);
        if (bytes.length >= 16) {
          memorySaltCache = bytes;
          return bytes;
        }
      }
      const newSalt = new Uint8Array(16);
      getRandomValues(newSalt);
      const hex = bytesToHex(newSalt);
      localStorage.setItem(LOCAL_SALT_STORAGE_KEY, hex);
      memorySaltCache = newSalt;
      return newSalt;
    }
  } catch (_) {}

  if (!memorySaltCache) {
    memorySaltCache = new Uint8Array(16);
    getRandomValues(memorySaltCache);
  }
  return memorySaltCache;
}

/**
 * Dérive une clé AES-256-GCM à partir de PBKDF2 (100 000 itérations SHA-256)
 */
async function deriveAESKey(salt: Uint8Array): Promise<CryptoKey> {
  const saltHex = bytesToHex(salt);
  if (cachedAESKey && cachedAESKeySaltHex === saltHex) {
    return cachedAESKey;
  }

  const subtle = getSubtleCrypto();
  const rawSecret = textToBytes(`${SECRET_KEY}:nexus-pos-aes-2026`);
  const baseKey = await subtle.importKey(
    'raw',
    rawSecret,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  cachedAESKey = derivedKey;
  cachedAESKeySaltHex = saltHex;
  return derivedKey;
}

// ==========================================
// Chiffrement AES-256-GCM (Web Crypto API)
// ==========================================

/**
 * Chiffre une chaîne en AES-256-GCM via SubtleCrypto avec dérivation PBKDF2 et sel persistant
 * Préfixe du résultat : 'aes:v1:...'
 */
export async function encryptLocalData(text: string): Promise<string> {
  if (!text) return text;
  try {
    const subtle = getSubtleCrypto();
    const salt = getOrCreateLocalSalt();
    const key = await deriveAESKey(salt);

    // IV cryptographiquement sécurisé de 12 octets (standard AES-GCM)
    const iv = new Uint8Array(12);
    getRandomValues(iv);

    const inputBytes = textToBytes(text);
    const cipherBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      inputBytes
    );

    const cipherBytes = new Uint8Array(cipherBuffer);
    const saltHex = bytesToHex(salt);
    const ivBase64 = bytesToBase64(iv);
    const cipherBase64 = bytesToBase64(cipherBytes);

    return `aes:v1:${saltHex}:${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.warn('[Security] Échec du chiffrement AES-256-GCM, repli nx2:', err);
    return encryptData(text);
  }
}

/**
 * Déchiffre une chaîne chiffrée en AES-256-GCM, nx2 (XOR legacy), ou texte brut
 * Rétrocompatibilité descendante totale et transparente
 */
export async function decryptLocalData(cipherText: string): Promise<string> {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;

  // 1. Détection AES-256-GCM
  if (cipherText.startsWith('aes:')) {
    try {
      const parts = cipherText.split(':');
      let salt: Uint8Array;
      let ivBase64: string;
      let cipherBase64: string;

      if (parts[1] === 'v1' && parts.length === 5) {
        salt = hexToBytes(parts[2]);
        ivBase64 = parts[3];
        cipherBase64 = parts[4];
      } else if (parts.length === 3) {
        salt = getOrCreateLocalSalt();
        ivBase64 = parts[1];
        cipherBase64 = parts[2];
      } else {
        throw new Error('Format de payload aes invalide');
      }

      const iv = base64ToBytes(ivBase64);
      const cipherBytes = base64ToBytes(cipherBase64);
      const subtle = getSubtleCrypto();
      const key = await deriveAESKey(salt);

      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        cipherBytes
      );

      return bytesToText(new Uint8Array(decryptedBuffer));
    } catch (err) {
      console.warn('[Security] Échec du déchiffrement AES, tentative de repli:', err);
      return decryptData(cipherText);
    }
  }

  // 2. Détection format JSON brut non chiffré
  if (cipherText.startsWith('{') || cipherText.startsWith('[')) {
    return cipherText;
  }

  // 3. Repli vers le déchiffrement synchrone hérité (nx2 / v1)
  return decryptData(cipherText);
}

// Alias explicites
export const encryptDataAES = encryptLocalData;
export const decryptDataAES = decryptLocalData;

// ==========================================
// Moteur Synchrone Legacy (nx2: flux XOR)
// ==========================================

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
 * Chiffre une chaîne en mode synchrone (format nx2: flux XOR salé)
 * Utilisé pour conserver la compatibilité des signatures synchrones
 */
export function encryptData(text: string): string {
  if (!text) return text;
  try {
    let salt = '';
    const bytes = new Uint8Array(8);
    getRandomValues(bytes);
    salt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

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
    console.warn('[Security] nx2 encryption failed, using fallback:', err);
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
 * Déchiffre une chaîne chiffrée de manière synchrone (nx2, v1 XOR ou JSON brut)
 */
export function decryptData(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;

  // 1. JSON brut en clair
  if (cipherText.startsWith('{') || cipherText.startsWith('[')) {
    return cipherText;
  }

  // 2. Détection du préfixe nx2:
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

  // 3. Si un payload aes est fourni en appel synchrone
  if (cipherText.startsWith('aes:')) {
    return '';
  }

  // 4. Repli vers le déchiffrement legacy v1 XOR
  try {
    return legacyDecrypt(cipherText);
  } catch (err) {
    return cipherText;
  }
}

// ==========================================
// Méthodes de Stockage Local Sécurisé
// ==========================================

/**
 * Chiffre un objet et le stocke dans localStorage (synchrone).
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
 * Récupère et déchiffre un élément de localStorage (synchrone).
 * Rétrocompatible avec JSON en clair existant et nx2:.
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
 * Supprime un élément sécurisé de localStorage.
 */
export function removeSecureItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[Security] Failed to remove secure item:', err);
  }
}

/**
 * Purge tous les secrets locaux et réinitialise les clés dérivées en mémoire
 */
export function clearSecureItems(): void {
  try {
    cachedAESKey = null;
    cachedAESKeySaltHex = '';
    memorySaltCache = null;

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

