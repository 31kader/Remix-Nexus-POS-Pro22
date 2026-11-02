import { Product, Supplier } from '../../types';
import { parseSmartAlgerianNumber } from '../../utils/ocrUtils';
import {
  LEARNED_OCR_MAPPINGS_KEY,
  getLearnedOcrMappings,
  saveLearnedOcrMapping,
  normalizeForMatching,
  extractDistinctiveTokens,
  matchProductInCatalog
} from './invoiceCatalogMatcher';

export {
  LEARNED_OCR_MAPPINGS_KEY,
  getLearnedOcrMappings,
  saveLearnedOcrMapping,
  normalizeForMatching,
  extractDistinctiveTokens,
  matchProductInCatalog
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
  let cleaned = line.replace(/[\u00A0\u202F]/g, ' ');

  // 1. Check for leading or embedded barcode (8-14 digits)
  let barcode: string | undefined = undefined;
  const bcMatch = cleaned.match(/\b\d{8,14}\b/);
  if (bcMatch) {
    barcode = bcMatch[0];
    cleaned = cleaned.replace(bcMatch[0], ' ');
  }

  // 2. Normaliser les nombres avec séparateurs de milliers (. ou , ou espace) avant l'extraction
  // Ex: "1.200,00" -> "1200.00", "1,200.00" -> "1200.00", "1.500" -> "1500", "1 170,00 DA" -> "1170.00"
  cleaned = cleaned.replace(/\b(\d{1,3})[.\s](\d{3})[,.](\d{2})\b/g, '$1$2.$3');
  cleaned = cleaned.replace(/\b(\d{1,3}),(\d{3})\.(\d{2})\b/g, '$1$2.$3');
  cleaned = cleaned.replace(/\b(\d{1,3})\.(\d{3})\b/g, '$1$2');
  cleaned = cleaned.replace(/(\d)\s+(\d{3}(?:[.,]\d{1,2})?)/g, '$1$2');
  cleaned = cleaned.replace(/(\d)\s*(DA|DZD|DT|€|\$)\b/gi, '$1');

  const numberMatches = cleaned.match(/\b\d+(?:[.,]\d{1,3})?\b/g) || [];
  const numbers = numberMatches
    .map(n => parseSmartAlgerianNumber(n))
    .filter(v => !isNaN(v) && v > 0);

  // 3. Clean line to get the product designation
  let name = cleaned
    .replace(/\b\d+(?:[.,]\d{1,3})?\b/g, ' ')
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
        taxRate: 0,
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
        taxRate: 0,
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
