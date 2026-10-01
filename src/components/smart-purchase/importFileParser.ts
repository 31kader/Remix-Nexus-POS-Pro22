import { Product, Supplier } from '../../types';
import { matchProductInCatalog, normalizeForMatching } from './invoiceParser';
import { readWorkbookSafely, sanitizeRowObject } from '../../lib/excelSecurity';

/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE IMPORT PARSER — CSV / Excel / PDF Import (100% Offline)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Replaces OCR with direct file import:
 * - CSV: Auto-detect separator (, ; \t |), parse columns
 * - Excel: Read first sheet, detect header row, parse columns
 * - PDF: Extract embedded text (digital PDFs only)
 * 
 * Auto-maps columns by header keywords (Désignation, Qté, Prix, Code...)
 * Auto-maps products against the local catalog by barcode/name
 */

// ─── Column role detection by header keywords ───
type ColumnRole = 'barcode' | 'designation' | 'quantity' | 'price' | 'total' | 'skip';

const COLUMN_KEYWORDS: Record<ColumnRole, string[]> = {
  barcode: ['code', 'code article', 'code barre', 'barcode', 'ean', 'ref', 'reference', 'référence', 'sku', 'code produit'],
  designation: ['designation', 'désignation', 'produit', 'article', 'libelle', 'libellé', 'nom', 'description', 'intitule', 'intitulé'],
  quantity: ['qte', 'quantite', 'quantité', 'qty', 'nbr', 'nombre', 'nb', 'nbre', 'qté', 'carton', 'nbr carton'],
  price: ['prix', 'prix u', 'p.u', 'pu', 'prix unitaire', 'prix ht', 'cout', 'coût', 'prix achat', 'prix u. ht'],
  total: ['montant', 'total', 'total ht', 'total ttc', 'mt ht', 'montant ht', 'sous total'],
  skip: ['tva', 'remise', 'discount', 'taxe', 'tax', 'unite', 'unité', 'unit', 'stock', 'depot', 'dépôt'],
};

const detectColumnRole = (header: string): ColumnRole => {
  const normalized = header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.]/g, '')
    .trim();

  // Check exact and partial matches
  for (const [role, keywords] of Object.entries(COLUMN_KEYWORDS) as [ColumnRole, string[]][]) {
    for (const kw of keywords) {
      const normKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalized === normKw || normalized.includes(normKw) || normKw.includes(normalized)) {
        return role;
      }
    }
  }

  // Fallback: if header looks numeric or short, skip
  if (/^\d+$/.test(normalized) || normalized.length < 2) return 'skip';
  return 'skip';
};

// ─── Parse a number from various formats ───
const parseNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  
  let cleaned = String(val)
    .replace(/[a-zA-ZÀ-ÿ%]/g, '')  // Remove letters
    .replace(/\s+/g, '')            // Remove spaces (thousands)
    .trim();

  // Handle French format: "1.170,00" or "1 170,00"
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // "1.170,00" → "1170.00"
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // "115,00" → "115.00"
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// ─── CSV Parser ───
const detectSeparator = (text: string): string => {
  const firstLines = text.split('\n').slice(0, 5).join('\n');
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  
  for (const char of Object.keys(counts)) {
    counts[char] = (firstLines.match(new RegExp(char === '|' ? '\\|' : char, 'g')) || []).length;
  }

  // Return the separator with the highest count
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

const parseCSVLine = (line: string, separator: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const parseCSV = (text: string): string[][] => {
  const separator = detectSeparator(text);
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return lines.map(line => parseCSVLine(line, separator));
};

// ─── Excel Parser ───
export const parseExcel = async (file: File): Promise<string[][]> => {
  const { rawRows } = await readWorkbookSafely(file);
  return rawRows.map(row => {
    return (row || []).map((cell: any) => {
      if (cell !== null && typeof cell === 'object') {
        const clean = sanitizeRowObject(cell);
        return String(clean ?? '');
      }
      return String(cell ?? '');
    });
  });
};

// ─── PDF Text Extractor (digital PDFs) ───
export const extractPDFText = (text: string): string => {
  // Extract text from PDF operators
  const matches = text.match(/\((.*?)\)\s*T[jJ]/g) || text.match(/\(([^)]+)\)/g);
  
  if (matches) {
    return matches.map(m => {
      const val = m.trim();
      if (val.startsWith('(') && (val.endsWith(') Tj') || val.endsWith(') TJ'))) {
        return val.slice(1, val.lastIndexOf(')'));
      } else if (val.startsWith('(') && val.endsWith(')')) {
        return val.slice(1, -1);
      }
      return val;
    }).join('\n');
  }

  // Fallback: extract alphanumeric sequences
  const alphaMatches = text.match(/[A-Za-zÀ-ÿ0-9\s\-:.,\/]{5,}/g);
  return alphaMatches ? alphaMatches.join('\n') : '';
};

// ─── Main: Detect header row and map columns ───
interface ColumnMapping {
  index: number;
  role: ColumnRole;
  header: string;
}

const detectHeaderAndColumns = (rows: string[][]): { headerIndex: number; columns: ColumnMapping[] } => {
  // Search first 10 rows for a header row (one with 3+ recognized column keywords)
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const mappings: ColumnMapping[] = row.map((cell, idx) => ({
      index: idx,
      role: detectColumnRole(cell),
      header: cell
    }));

    const recognizedCount = mappings.filter(m => m.role !== 'skip').length;
    const hasDesignation = mappings.some(m => m.role === 'designation');
    
    if (recognizedCount >= 2 && hasDesignation) {
      return { headerIndex: i, columns: mappings };
    }
  }

  // Fallback: assume first row is header, try positional mapping
  if (rows.length > 0 && rows[0].length >= 3) {
    const firstRow = rows[0];
    // Check if first row looks like data (has numbers) rather than headers
    const hasNumbers = firstRow.some(cell => /^\d+([.,]\d+)?$/.test(cell.trim()));
    
    if (hasNumbers && firstRow.length >= 3) {
      // No header row, assume positional: barcode | designation | qty | price | total
      const positional: ColumnMapping[] = [];
      if (firstRow.length >= 5) {
        positional.push({ index: 0, role: 'barcode', header: 'Code' });
        positional.push({ index: 1, role: 'designation', header: 'Désignation' });
        positional.push({ index: 2, role: 'quantity', header: 'Qté' });
        positional.push({ index: 3, role: 'price', header: 'Prix' });
        positional.push({ index: 4, role: 'total', header: 'Total' });
      } else if (firstRow.length >= 3) {
        positional.push({ index: 0, role: 'designation', header: 'Désignation' });
        positional.push({ index: 1, role: 'quantity', header: 'Qté' });
        positional.push({ index: 2, role: 'price', header: 'Prix' });
      }
      return { headerIndex: -1, columns: positional };
    }

    // First row is likely headers
    return {
      headerIndex: 0,
      columns: firstRow.map((cell, idx) => ({
        index: idx,
        role: detectColumnRole(cell),
        header: cell
      }))
    };
  }

  return { headerIndex: -1, columns: [] };
};

// ─── Check if a row is valid data (not empty, not total line) ───
const isValidDataRow = (row: string[], columns: ColumnMapping[]): boolean => {
  const desigCol = columns.find(c => c.role === 'designation');
  if (!desigCol) return false;

  const designation = (row[desigCol.index] || '').trim();
  if (designation.length < 2) return false;

  const lower = designation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const noisePatterns = [
    'total', 'sous-total', 'sous total', 'net a payer', 'tva', 'timbre',
    'remise globale', 'acompte', 'solde', 'reglement', 'signature',
    'fournisseur', 'adresse', 'telephone', 'cachet', 'page',
    'merci', 'arretee', 'somme de', 'reste a payer'
  ];
  if (noisePatterns.some(np => lower.startsWith(np))) return false;

  return true;
};

// ─── Main Import Function ───
export interface ImportResult {
  supplierName: string;
  invoiceNumber: string;
  receptionDate: string;
  totalAmount: number;
  items: any[];
  isPosScreenshot: boolean;
  importSource: 'csv' | 'excel' | 'pdf';
  columnMapping: string; // Human-readable column mapping for debug
}

export const parseImportedFile = async (
  file: File,
  suppliers: Supplier[],
  products: Product[]
): Promise<ImportResult> => {
  const fileName = file.name.toLowerCase();
  let rows: string[][] = [];
  let importSource: 'csv' | 'excel' | 'pdf' = 'csv';

  // 1. Parse file based on type
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    importSource = 'excel';
    rows = await parseExcel(file);
  } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
    importSource = 'csv';
    const text = await file.text();
    rows = parseCSV(text);
  } else if (fileName.endsWith('.pdf')) {
    importSource = 'pdf';
    const text = await file.text();
    const extracted = extractPDFText(text);
    if (extracted.trim().length > 10) {
      rows = parseCSV(extracted); // Parse the extracted text as delimited
    } else {
      throw new Error("Ce PDF ne contient pas de texte numérique extractible. Exportez-le en CSV ou Excel depuis votre logiciel.");
    }
  } else {
    throw new Error("Format non supporté. Utilisez CSV, Excel (.xlsx/.xls) ou PDF.");
  }

  if (rows.length < 2) {
    throw new Error("Le fichier ne contient pas assez de données (minimum 2 lignes).");
  }

  // 2. Detect header and column mapping
  const { headerIndex, columns } = detectHeaderAndColumns(rows);
  
  if (columns.length === 0) {
    throw new Error("Impossible de détecter les colonnes. Vérifiez que le fichier contient au moins une colonne 'Désignation' et une colonne 'Quantité' ou 'Prix'.");
  }

  const columnMapping = columns
    .filter(c => c.role !== 'skip')
    .map(c => `Col ${c.index + 1}: ${c.header} → ${c.role}`)
    .join(' | ');

  // 3. Extract metadata from all text
  const allText = rows.map(r => r.join(' ')).join('\n');
  
  let supplierName = '';
  const matchedSupplier = suppliers.find(s => Boolean(s?.name && allText.toLowerCase().includes(s.name.toLowerCase())));
  if (matchedSupplier) supplierName = matchedSupplier.name;

  let invoiceNumber = '';
  const numMatch = allText.match(/(?:facture|bon|bl|br|ticket|ref|n[°o])\s*[:#-]?\s*([a-zA-Z0-9\-/]{3,})/i);
  if (numMatch) invoiceNumber = numMatch[1].trim();
  else invoiceNumber = "IMP-" + new Date().getFullYear() + "-" + Math.random().toString().substring(2, 6);

  let receptionDate = new Date().toISOString().split('T')[0];
  const dateMatch = allText.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    if (+month >= 1 && +month <= 12 && +day >= 1 && +day <= 31) {
      receptionDate = `${year}-${month}-${day}`;
    }
  }

  // 4. Extract line items
  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
  const items: any[] = [];
  const processedKeys = new Set<string>();

  const barcodeCol = columns.find(c => c.role === 'barcode');
  const designationCol = columns.find(c => c.role === 'designation');
  const qtyCol = columns.find(c => c.role === 'quantity');
  const priceCol = columns.find(c => c.role === 'price');
  const totalCol = columns.find(c => c.role === 'total');

  let totalAmount = 0;

  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    if (!isValidDataRow(row, columns)) continue;

    const barcode = barcodeCol ? (row[barcodeCol.index] || '').trim() : '';
    const designation = designationCol ? (row[designationCol.index] || '').trim() : '';
    const qty = qtyCol ? parseNumber(row[qtyCol.index]) : 1;
    const price = priceCol ? parseNumber(row[priceCol.index]) : 0;
    const total = totalCol ? parseNumber(row[totalCol.index]) : 0;

    // Derive price from total/qty if price is 0
    const finalPrice = price > 0 ? price : (total > 0 && qty > 0 ? total / qty : 0);
    const finalQty = qty > 0 ? qty : 1;

    const name = designation || (barcode ? `Article ${barcode}` : '');
    if (!name || name.length < 2) continue;

    // Clean barcode (only keep if it's 4+ digits)
    const cleanBarcode = /^\d{4,14}$/.test(barcode.replace(/\s/g, '')) ? barcode.replace(/\s/g, '') : undefined;

    // Automatic Catalog Mapping
    const matchedProduct = matchProductInCatalog({ name, barcode: cleanBarcode }, products);
    const key = matchedProduct ? `prod-${matchedProduct.id}` : `name-${normalizeForMatching(name)}`;
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    const lineTotal = finalPrice * finalQty;
    totalAmount += lineTotal;

    if (matchedProduct) {
      items.push({
        productId: matchedProduct.id,
        name: matchedProduct.name,
        barcode: matchedProduct.barcode || cleanBarcode,
        qty: Math.max(1, Math.round(finalQty)),
        price: finalPrice > 0 ? finalPrice : (matchedProduct.costPrice || matchedProduct.price || 0),
        taxRate: matchedProduct.taxRate || 0,
        imageUrl: matchedProduct.imageUrl,
        stockTendu: false,
        isDraft: false
      });
    } else {
      items.push({
        productId: '',
        name,
        barcode: cleanBarcode,
        qty: Math.max(1, Math.round(finalQty)),
        price: finalPrice > 0 ? finalPrice : 0,
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
    items,
    isPosScreenshot: false,
    importSource,
    columnMapping
  };
};
