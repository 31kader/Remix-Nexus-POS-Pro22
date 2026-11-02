import {
  SECRET_KEY,
  LOCAL_SALT_STORAGE_KEY,
  PBKDF2_ITERATIONS,
  textToBytes,
  bytesToText,
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  hexToBytes,
  getSubtleCrypto,
  getRandomValues
} from './cryptoUtils';
import { encryptData, decryptData } from './legacyEncryption';

let memorySaltCache: Uint8Array | null = null;
let cachedAESKey: CryptoKey | null = null;
let cachedAESKeySaltHex: string = '';

export function resetAESCache(): void {
  cachedAESKey = null;
  cachedAESKeySaltHex = '';
  memorySaltCache = null;
}

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
export async function deriveAESKey(salt: Uint8Array): Promise<CryptoKey> {
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
