import { Product, Supplier } from '../../types';

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

// Lines that are clearly NOT product lines (document headers, footers, totals, software UI)
const isNoiseLine = (line: string): boolean => {
  const lower = line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (lower.length < 3) return true;
  if (/^[\d\s,.:/\-|#°%()=_*+]+$/.test(lower)) return true;

  const noiseStarts = [
    'total', 'sous-total', 'sous total', 'net a payer', 'montant total',
    'tva', 'timbre', 'remise globale', 'acompte', 'solde', 'ancien solde', 'nouveau solde', 'solde actuel',
    'reglement', 'espece', 'cheque', 'virement',
    'facture', 'bon de livraison', 'bon de reception',
    'fournisseur', 'raison sociale', 'client',
    'adresse', 'tel ', 'telephone', 'fax', 'email', 'contact',
    'rc ', 'nif ', 'nis ', 'n° piece', 'n piece', 'piece commerciale',
    'signature', 'cachet', 'page ',
    'code article', 'designation', 'nbr carton', 'nbr. carton',
    'prix u', 'prix ht', 'prix unitaire', 'prix ttc',
    'hors taxe', 'total ht', 'total ttc', 'total net', 'total h.t',
    'payee par', 'paye par', 'depot', 'magasin principal',
    'ajouter un article', 'supprimer', 'imprimer', 'valider', 'annuler', 'fermer',
    'activer la lecture', 'verifier le changement', 'deplacer vers',
    'navigation', 'purchases', 'ventes', 'gestion',
    'commandes en ligne', 'gestion clients', 'nombre de ventes',
    'retours articles', 'promotions', 'inventaire', 'suivi peremption',
    'classifications', 'verificateur', 'ecran client', 'verrouiller',
    'activer windows', 'accedez aux param', 'tapez ici',
    'articles dans le bon', 'inspecter l', 'article',
    'p. achat', 'remise (%)', 'tva (%)',
    'merci de votre visite', 'arretee la presente', 'somme de',
    'tonnage', 'regler', 'reste',
    'pieces liees', 'documents', 'reglements', 'note',
    'n serie', 'n° serie',
  ];

  for (const ns of noiseStarts) {
    if (lower === ns || lower.startsWith(ns + ' ') || lower.startsWith(ns + ':') || lower.startsWith(ns + '\t')) {
      return true;
    }
  }

  // Header lines with 2+ column names
  const headerKeywords = ['qte', 'quantite', 'prix', 'remise', 'montant', 'tva', 'reference', 'designation', 'carton'];
  const headerHits = headerKeywords.filter(k => lower.includes(k)).length;
  if (headerHits >= 2) return true;

  return false;
};

/**
 * Extracts numbers and product text from a single invoice line.
 */
const splitLineIntoNameAndNumbers = (line: string): { barcode?: string; name: string; numbers: number[] } => {
  let cleaned = line;

  // 1. Check for leading or embedded barcode (8-14 digits)
  let barcode: string | undefined = undefined;
  const bcMatch = cleaned.match(/\b\d{8,14}\b/);
  if (bcMatch) {
    barcode = bcMatch[0];
    cleaned = cleaned.replace(bcMatch[0], ' ');
  }

  // 2. Clean currency words and extract numbers (handling decimals with , or .)
  // E.g. "1 170,00 DA" -> "1170.00"
  cleaned = cleaned.replace(/(\d)\s+(\d{3}(?:[.,]\d{1,2})?)/g, '$1$2'); // merge thousands e.g. "1 170" -> "1170"
  cleaned = cleaned.replace(/(\d)\s*(DA|DZD|DT|€|\$)\b/gi, '$1');

  const numberMatches = cleaned.match(/\b\d+(?:[.,]\d{1,2})?\b/g) || [];
  const numbers = numberMatches
    .map(n => parseFloat(n.replace(',', '.')))
    .filter(v => !isNaN(v) && v > 0);

  // 3. Clean line to get the product designation
  let name = cleaned
    .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, ' ')
    .replace(/\b(DA|DZD|DT|EUR|USD|€|\$|%|pcs|kg|u|l|m|g|ml|cl)\b/gi, ' ')
    .replace(/[*#|:;_=+><\[\]{}()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { barcode, name, numbers };
};

/**
 * Determines Quantity and Unit Price from extracted line numbers using arithmetic relation (qty * price = total).
 */
const determineQtyAndPrice = (numbers: number[]): { qty: number; price: number } => {
  if (numbers.length === 0) return { qty: 1, price: 0 };
  if (numbers.length === 1) return { qty: 1, price: numbers[0] };

  // 1. Check for standard arithmetic relation: qty * price ≈ total (with 5% tolerance)
  for (let i = 0; i < numbers.length; i++) {
    for (let j = 0; j < numbers.length; j++) {
      if (i === j) continue;
      const product = numbers[i] * numbers[j];
      if (product <= 0) continue;

      for (let k = 0; k < numbers.length; k++) {
        if (k === i || k === j) continue;
        const total = numbers[k];
        if (Math.abs(product - total) <= Math.max(2, total * 0.05)) {
          // Found qty and price!
          const qtyCandidate = Math.min(numbers[i], numbers[j]);
          const priceCandidate = Math.max(numbers[i], numbers[j]);
          if (qtyCandidate <= 1000) {
            return { qty: Math.max(1, Math.round(qtyCandidate)), price: priceCandidate };
          }
        }
      }
    }
  }

  // 2. If no 3-way product found, check the first 2 distinct numbers
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted[0] <= 500 && sorted.length >= 2) {
    return { qty: Math.max(1, Math.round(sorted[0])), price: sorted[1] };
  }

  return { qty: 1, price: sorted[sorted.length - 1] };
};

/**
 * Main parser function: extracts invoice header info, line items, and performs automatic catalog mapping.
 */
export const parseRawInvoiceText = (rawText: string, suppliers: Supplier[], products: Product[]) => {
  const text = rawText.replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Supplier Name
  let supplierName = '';
  const matchedSupplier = suppliers.find(s => 
    Boolean(s?.name && text.toLowerCase().includes(s.name.toLowerCase()))
  );
  if (matchedSupplier) {
    supplierName = matchedSupplier.name;
  } else {
    const supplierLine = lines.find(l => /fournisseur|supplier|grossiste|société|ets\b/i.test(l));
    if (supplierLine) {
      supplierName = supplierLine.replace(/fournisseur|supplier|grossiste|société|ets|:|#/gi, '').trim();
    }
  }

  // 2. Invoice / Reception Note Number
  let invoiceNumber = '';
  const numMatch = text.match(/(?:facture|bon|bl|br|ticket|ref|n[°o])\s*[:#-]?\s*([a-zA-Z0-9\-/]{3,})/i);
  if (numMatch) {
    invoiceNumber = numMatch[1].trim();
  } else {
    invoiceNumber = "FA-" + new Date().getFullYear() + "-" + Math.random().toString().substring(2, 6);
  }

  // 3. Reception Date
  let receptionDate = new Date().toISOString().split('T')[0];
  const dateMatch = text.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    if (+month >= 1 && +month <= 12 && +day >= 1 && +day <= 31) {
      receptionDate = `${year}-${month}-${day}`;
    }
  }

  // 4. Total Amount
  let totalAmount = 0;
  const totalMatch = text.match(/total\s*(?:ttc|ht|net|general|h\.t)?\s*[:#-]?\s*([\d\s,.]+)/i);
  if (totalMatch) {
    const val = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(val)) totalAmount = val;
  }

  const isPosScreenshot = /ticket|caisse/i.test(text);

  // 5. Line Item Extraction & Automatic Mapping
  const extractedItems: any[] = [];
  const processedKeys = new Set<string>();

  for (const line of lines) {
    if (isNoiseLine(line)) continue;

    const { barcode, name, numbers } = splitLineIntoNameAndNumbers(line);
    if (name.length < 3 && !barcode) continue;

    const { qty, price } = determineQtyAndPrice(numbers);

    // Run Automatic Mapping against the store product catalog
    const matchedProduct = matchProductInCatalog({ name, barcode }, products);

    const key = matchedProduct ? `prod-${matchedProduct.id}` : `name-${normalizeForMatching(name)}`;
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    if (matchedProduct) {
      extractedItems.push({
        productId: matchedProduct.id,
        name: matchedProduct.name,
        barcode: matchedProduct.barcode || barcode,
        qty: Math.max(1, qty),
        price: price > 0 ? price : (matchedProduct.costPrice || matchedProduct.price || 0),
        taxRate: matchedProduct.taxRate || 0,
        imageUrl: matchedProduct.imageUrl,
        stockTendu: false,
        isDraft: false
      });
    } else {
      extractedItems.push({
        productId: '',
        name: name || `Article Scanné ${barcode || ''}`,
        barcode: barcode,
        qty: Math.max(1, Math.round(qty)),
        price: price > 0 ? price : 0,
        taxRate: 19,
        stockTendu: false,
        isDraft: true
      });
    }
  }

  return {
    supplierName,
    invoiceNumber,
    receptionDate,
    totalAmount,
    items: extractedItems,
    isPosScreenshot
  };
};
