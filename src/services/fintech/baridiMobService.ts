/**
 * 💳 Service Fintech BaridiMob / Algérie Poste & SATIM
 * Génération de charges utiles QR Code dynamique et validation de RIP.
 */

export interface BaridiMobPayloadOptions {
  rip: string;
  amount: number;
  transactionId: string;
  merchantName?: string;
}

/**
 * Valide un RIP Algérie Poste (20 chiffres) avec l'algorithme modulo 97.
 * Format : Code Banque (3) + Code Guichet (3) + Numéro de Compte (12) + Clé RIP (2)
 * Algérie Poste : Banque = 007
 */
export function validateAlgerianRip(rip: string): boolean {
  const cleanRip = rip.replace(/\s+/g, '');
  if (!/^\d{20}$/.test(cleanRip)) return false;

  const accountPart = cleanRip.slice(0, 18);
  const keyPart = parseInt(cleanRip.slice(18, 20), 10);

  // Calcul clé modulo 97 (Standard ISO 7064 / Algérie Poste)
  // Clé = 97 - ( (Account % 97 * 100) % 97 )
  let remainder = 0;
  for (let i = 0; i < accountPart.length; i++) {
    remainder = (remainder * 10 + parseInt(accountPart[i], 10)) % 97;
  }
  const expectedKey = 97 - ((remainder * 100) % 97);
  return keyPart === expectedKey;
}

/**
 * Formate un RIP pour un affichage lisible (3 3 12 2)
 */
export function formatAlgerianRip(rip: string): string {
  const clean = rip.replace(/\D/g, '').slice(0, 20);
  if (clean.length !== 20) return clean;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 18)} ${clean.slice(18, 20)}`;
}

/**
 * Génère la chaîne d'encodage pour le QR Code BaridiMob
 * Conforme au schéma de paiement instantané P2M d'Algérie Poste
 */
export function generateBaridiMobQrString(options: BaridiMobPayloadOptions): string {
  const cleanRip = options.rip.replace(/\s+/g, '');
  const cleanAmount = Math.max(0, options.amount).toFixed(2);
  const cleanRef = (options.transactionId || 'TX').slice(0, 20).toUpperCase();
  const cleanName = (options.merchantName || 'NEXUS STORE').slice(0, 30);

  // Schéma URI standardisé pour BaridiMob / SATIM QR
  // baridimob://pay?rip=00799999000000000012&amt=1500.00&cur=DZD&ref=TX1234&desc=NEXUS
  const params = new URLSearchParams({
    rip: cleanRip,
    amt: cleanAmount,
    cur: 'DZD',
    ref: cleanRef,
    desc: cleanName
  });

  return `baridimob://pay?${params.toString()}`;
}

const BARIDIMOB_RIP_STORAGE_KEY = 'nexus_baridimob_merchant_rip';
const BARIDIMOB_NAME_STORAGE_KEY = 'nexus_baridimob_merchant_name';

export function getSavedBaridiMobConfig(): { rip: string; merchantName: string } {
  if (typeof window === 'undefined') {
    return { rip: '00799999000000000012', merchantName: 'NEXUS COMMERCE' };
  }
  try {
    const rip = localStorage.getItem(BARIDIMOB_RIP_STORAGE_KEY) || '';
    const merchantName = localStorage.getItem(BARIDIMOB_NAME_STORAGE_KEY) || '';
    return { rip, merchantName };
  } catch {
    return { rip: '', merchantName: '' };
  }
}

export function saveBaridiMobConfig(rip: string, merchantName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BARIDIMOB_RIP_STORAGE_KEY, rip.trim());
    localStorage.setItem(BARIDIMOB_NAME_STORAGE_KEY, merchantName.trim());
  } catch (err) {
    console.warn('[BaridiMob] Erreur sauvegarde config:', err);
  }
}
