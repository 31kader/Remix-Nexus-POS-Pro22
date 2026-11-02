import { Product, Supplier } from '../../types';
import { matchProductInCatalog, normalizeForMatching } from './invoiceParser';
import {
  parseCSV,
  parseExcel,
  extractPDFText,
  parseNumber
} from './parsers/tabularFileParsers';
import {
  detectHeaderAndColumns,
  isValidDataRow
} from './parsers/importColumnMapping';

// Ré-exportations pour compatibilité
export { parseCSV, parseExcel, extractPDFText };

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
        taxRate: 0,
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
    items,
    isPosScreenshot: false,
    importSource,
    columnMapping
  };
};
