/**
 * ⚖️ Décodeurs Universels de Trames Séries pour Balances de Comptoir
 * Supporte : Toledo Continuous, Dibal, CAS, Bizerba, NCI.
 */

export interface ParsedScaleWeight {
  weight: number;
  unit: 'kg' | 'g';
  isStable: boolean;
  isTare: boolean;
  raw: string;
}

/**
 * Protocole Toledo Continuous (Mettler Toledo)
 * Trame type : <STX> <StatusA> <StatusB> <StatusC> <Weight 6 digits> <Tare 6 digits> <CR>
 */
export function parseToledoFrame(raw: string): ParsedScaleWeight | null {
  if (!raw || raw.length < 6) return null;

  // Recherche d'un groupe numérique de poids dans la trame
  const match = raw.match(/([+-]?\d{4,6})/);
  if (!match) return null;

  const rawNum = parseInt(match[1], 10);
  const weight = Math.round((rawNum / 1000) * 1000) / 1000; // 3 décimales (kg)

  // Dans le protocole Toledo, le byte StatusB indique la stabilité (bit 0 = 0 -> stable)
  const isStable = !raw.includes('U') && !raw.includes('?');

  return {
    weight: Math.max(0, weight),
    unit: 'kg',
    isStable,
    isTare: raw.includes('T') || raw.includes('NET'),
    raw
  };
}

/**
 * Protocole Dibal / CAS
 * Trame type : "ST,GS,+001.250kg" ou "US,GS,+001.250kg" (US = Unstable, ST = Stable)
 */
export function parseDibalCasFrame(raw: string): ParsedScaleWeight | null {
  if (!raw) return null;

  const isStable = raw.startsWith('ST') || !raw.startsWith('US');
  const isTare = raw.includes('NT') || raw.includes('NET');

  const match = raw.match(/([+-]?\d+(?:\.\d+)?)\s*(kg|g)?/i);
  if (!match) return null;

  let weight = parseFloat(match[1]);
  if (isNaN(weight)) return null;

  const unit: 'kg' | 'g' = (match[2]?.toLowerCase() === 'g') ? 'g' : 'kg';
  if (unit === 'g') {
    weight = weight / 1000;
  }

  return {
    weight: Math.max(0, Math.round(weight * 1000) / 1000),
    unit: 'kg',
    isStable,
    isTare,
    raw
  };
}

/**
 * Protocole NCI Standard POS
 * Trame type : "<LF>  1.250kg<CR>"
 */
export function parseNciFrame(raw: string): ParsedScaleWeight | null {
  if (!raw) return null;

  const match = raw.match(/([+-]?\s*\d+(?:\.\d+)?)\s*(kg|g|lb)?/i);
  if (!match) return null;

  const weightStr = match[1].replace(/\s+/g, '');
  const weight = parseFloat(weightStr);
  if (isNaN(weight)) return null;

  return {
    weight: Math.max(0, Math.round(weight * 1000) / 1000),
    unit: 'kg',
    isStable: !raw.includes('?'),
    isTare: false,
    raw
  };
}

/**
 * Décodeur universel selon le protocole configuré
 */
export function parseScaleFrame(raw: string, protocol: 'toledo' | 'dibal' | 'cas' | 'nci' | 'custom' = 'toledo'): ParsedScaleWeight | null {
  const clean = raw.trim();
  if (!clean) return null;

  switch (protocol) {
    case 'toledo':
      return parseToledoFrame(clean) || parseDibalCasFrame(clean);
    case 'dibal':
    case 'cas':
      return parseDibalCasFrame(clean);
    case 'nci':
      return parseNciFrame(clean);
    default:
      return parseDibalCasFrame(clean) || parseToledoFrame(clean);
  }
}
