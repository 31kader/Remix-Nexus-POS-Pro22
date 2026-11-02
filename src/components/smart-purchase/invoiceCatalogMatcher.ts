import { Product } from '../../types';

export const LEARNED_OCR_MAPPINGS_KEY = 'nexus_ocr_learned_mappings_v1';

export const getLearnedOcrMappings = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(LEARNED_OCR_MAPPINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLearnedOcrMapping = (scannedName: string, productId: string) => {
  if (!scannedName || !productId) return;
  try {
    const norm = normalizeForMatching(scannedName);
    if (norm.length < 2) return;
    const current = getLearnedOcrMappings();
    current[norm] = productId;
    // Aussi enregistrer la chaîne brute en minuscule au cas où elle contient des chiffres distinctifs (ex: "MAXON 45G")
    const rawClean = scannedName.trim().toLowerCase().replace(/\s+/g, ' ');
    current[rawClean] = productId;
    localStorage.setItem(LEARNED_OCR_MAPPINGS_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Could not save learned OCR mapping:', e);
  }
};

/**
 * Normalizes text for matching by removing accents, special characters, and extra spaces.
 */
export const normalizeForMatching = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extracts distinctive keyword tokens from a product name, filtering out generic stopwords and units.
 */
export const extractDistinctiveTokens = (name: string): string[] => {
  const normalized = normalizeForMatching(name);
  const stopwords = new Set([
    'de', 'la', 'le', 'les', 'du', 'des', 'en', 'et', 'au', 'aux', 'un', 'une', 'pour', 'avec', 'sans',
    'da', 'dzd', 'dt', 'eur', 'usd', 'pcs', 'kg', 'g', 'l', 'ml', 'cl', 'gr', 'u', 'lot', 'pack'
  ]);
  return normalized
    .split(' ')
    .filter(w => w.length >= 3 && !stopwords.has(w) && !/^\d+$/.test(w));
};

/**
 * Intelligent Automatic Catalog Mapper:
 * Matches a scanned item against the product catalog with high precision.
 * 0. Learned User Mapping (100% priority - remembered from previous manual links!)
 * 1. Barcode match (exact)
 * 2. SKU match (exact)
 * 3. Exact normalized name match
 * 4. Substring name match
 * 5. Multi-word distinctive token similarity match (>= 75% tokens overlap)
 */
export const matchProductInCatalog = (
  item: { name: string; barcode?: string; sku?: string },
  products: Product[]
): Product | undefined => {
  if (!products || products.length === 0) return undefined;

  // 0. Learned User Mapping (Mémorisation automatique des liaisons précédentes)
  if (item.name) {
    const learned = getLearnedOcrMappings();
    const rawKey = item.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const normKey = normalizeForMatching(item.name);
    const learnedProductId = learned[rawKey] || learned[normKey];
    if (learnedProductId) {
      const learnedProduct = products.find(p => p.id === learnedProductId);
      if (learnedProduct) return learnedProduct;
    }
  }

  // 1. Direct Barcode Match
  if (item.barcode && item.barcode.trim().length >= 4) {
    const cleanBc = item.barcode.trim();
    const match = products.find(p => p.barcode && p.barcode.trim() === cleanBc);
    if (match) return match;
  }

  // 2. Barcode embedded in scanned name / line
  const embeddedBcMatch = item.name.match(/\b\d{8,14}\b/);
  if (embeddedBcMatch) {
    const foundBc = embeddedBcMatch[0];
    const match = products.find(p => p.barcode && p.barcode.trim() === foundBc);
    if (match) return match;
  }

  // 3. Direct SKU Match
  if (item.sku && item.sku.trim().length >= 3) {
    const cleanSku = item.sku.trim().toLowerCase();
    const match = products.find(p => p.sku && p.sku.trim().toLowerCase() === cleanSku);
    if (match) return match;
  }

  // 4. Exact Normalized Name Match
  const normItemName = normalizeForMatching(item.name);
  if (normItemName.length >= 3) {
    const exactMatch = products.find(p => normalizeForMatching(p.name) === normItemName);
    if (exactMatch) return exactMatch;
  }

  // 5. Substring containment match (e.g. "LOVLEY MARSHMALLOWS" in "LOVLEY MARSHMALLOWS 40G")
  if (normItemName.length >= 4) {
    for (const p of products) {
      const normPName = normalizeForMatching(p.name);
      if (normPName.length >= 4) {
        if (normItemName.includes(normPName) || normPName.includes(normItemName)) {
          return p;
        }
      }
    }
  }

  // 6. Distinctive Keyword Tokens Overlap (Multi-word names)
  const itemTokens = extractDistinctiveTokens(item.name);
  if (itemTokens.length >= 2) {
    let bestMatch: Product | undefined = undefined;
    let bestScore = 0;

    for (const p of products) {
      const pTokens = extractDistinctiveTokens(p.name);
      if (pTokens.length >= 2) {
        const matchingTokens = pTokens.filter(t => 
          itemTokens.some(it => it === t || (it.length >= 4 && t.length >= 4 && (it.includes(t) || t.includes(it))))
        );
        const score = matchingTokens.length / Math.max(pTokens.length, itemTokens.length);
        if (score >= 0.75 && matchingTokens.length >= 2 && score > bestScore) {
          bestScore = score;
          bestMatch = p;
        }
      }
    }

    if (bestMatch) return bestMatch;
  }

  return undefined;
};
