import {
  SECRET_KEY,
  getRandomValues,
  textToBytes,
  bytesToText,
  bytesToBase64,
  base64ToBytes
} from './cryptoUtils';

export function hashKeyWithSalt(key: string, salt: string): number[] {
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

export function legacyEncrypt(text: string): string {
  const inputBytes = textToBytes(text);
  let result = '';
  for (let i = 0; i < inputBytes.length; i++) {
    const charCode = inputBytes[i];
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  return btoa(result);
}

export function legacyDecrypt(cipherText: string): string {
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
