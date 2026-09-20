import { Product, Supplier } from '../../types';
import { matchProductInCatalog, normalizeForMatching } from './invoiceParser';

/**
 * ═══════════════════════════════════════════════════════════════════
 * TABLE OCR PARSER — Geometric Column-Based Extraction (100% Offline)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Instead of reading Tesseract output as flat text (which mixes columns),
 * this module uses the X/Y bounding boxes of each word to:
 * 1. Group words into rows (by similar Y coordinate)
 * 2. Detect column boundaries (by X-axis gaps)
 * 3. Classify columns as: Barcode | Designation | Quantity | Price | Total
 * 4. Extract structured product data per row
 */

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

interface TableRow {
  y: number;          // Average Y coordinate
  cells: { x: number; text: string }[];  // Cells sorted by X
}

interface ColumnDef {
  xMin: number;
  xMax: number;
  role: 'barcode' | 'designation' | 'quantity' | 'price' | 'total' | 'unknown';
  headerText?: string;
}

interface ExtractedTableItem {
  barcode?: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

// ─── Step 1: Group words into rows by Y-coordinate proximity ───
const groupWordsIntoRows = (words: OcrWord[], yTolerance: number = 10): TableRow[] => {
  if (!words || words.length === 0) return [];

  // Sort by Y then X
  const sorted = [...words].sort((a, b) => {
    const yDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(yDiff) > yTolerance) return yDiff;
    return a.bbox.x0 - b.bbox.x0;
  });

  const rows: TableRow[] = [];
  let currentRow: OcrWord[] = [sorted[0]];
  let currentY = sorted[0].bbox.y0;

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    if (Math.abs(word.bbox.y0 - currentY) <= yTolerance) {
      currentRow.push(word);
    } else {
      // Finalize current row
      rows.push({
        y: currentY,
        cells: currentRow
          .sort((a, b) => a.bbox.x0 - b.bbox.x0)
          .map(w => ({ x: w.bbox.x0, text: w.text }))
      });
      currentRow = [word];
      currentY = word.bbox.y0;
    }
  }
  // Don't forget the last row
  if (currentRow.length > 0) {
    rows.push({
      y: currentY,
      cells: currentRow
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)
        .map(w => ({ x: w.bbox.x0, text: w.text }))
    });
  }

  return rows;
};

// ─── Step 2: Detect column boundaries from header row or data patterns ───
const detectColumns = (rows: TableRow[], imageWidth: number): ColumnDef[] => {
  // Try to find a header row with keywords
  const headerKeywords: Record<string, ColumnDef['role']> = {
    'code': 'barcode', 'article': 'barcode', 'ean': 'barcode', 'barre': 'barcode',
    'designation': 'designation', 'désignation': 'designation', 'produit': 'designation', 'libelle': 'designation', 'libellé': 'designation',
    'qte': 'quantity', 'quantite': 'quantity', 'quantité': 'quantity', 'qty': 'quantity', 'nbr': 'quantity', 'nombre': 'quantity',
    'prix': 'price', 'pu': 'price', 'p.u': 'price', 'unitaire': 'price', 'cout': 'price', 'coût': 'price',
    'montant': 'total', 'total': 'total', 'ttc': 'total', 'ht': 'total',
  };

  let headerRow: TableRow | null = null;
  let headerRowIndex = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowText = (rows[i].cells || []).map(c => (c?.text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).join(' ');
    const matches = Object.keys(headerKeywords).filter(kw => rowText.includes(kw));
    if (matches.length >= 2) {
      headerRow = rows[i];
      headerRowIndex = i;
      break;
    }
  }

  const columns: ColumnDef[] = [];

  if (headerRow) {
    // Group header cells into column zones
    // Merge consecutive cells that are close together (< 30px gap)
    const mergedCells: { xMin: number; xMax: number; text: string }[] = [];
    let currentMerge = { xMin: headerRow.cells[0].x, xMax: headerRow.cells[0].x + 50, text: headerRow.cells[0].text };

    for (let i = 1; i < headerRow.cells.length; i++) {
      const cell = headerRow.cells[i];
      if (cell.x - currentMerge.xMax < 30) {
        // Merge
        currentMerge.xMax = cell.x + 50;
        currentMerge.text += ' ' + cell.text;
      } else {
        mergedCells.push({ ...currentMerge });
        currentMerge = { xMin: cell.x, xMax: cell.x + 50, text: cell.text };
      }
    }
    mergedCells.push(currentMerge);

    // Assign roles to merged header zones
    for (let i = 0; i < mergedCells.length; i++) {
      const mc = mergedCells[i];
      const normText = (mc?.text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      let role: ColumnDef['role'] = 'unknown';
      for (const [kw, r] of Object.entries(headerKeywords)) {
        if (normText.includes(kw)) {
          role = r;
          break;
        }
      }

      // Determine column X boundaries: from this header to the next
      const xMin = mc.xMin;
      const xMax = i < mergedCells.length - 1 ? mergedCells[i + 1].xMin - 1 : imageWidth;

      columns.push({ xMin, xMax, role, headerText: mc.text });
    }
  }

  // If no header detected, use positional heuristics
  if (columns.length === 0) {
    // Fallback: divide into 4-5 zones based on X distribution of all data cells
    const allX = rows.flatMap(r => r.cells.map(c => c.x));
    if (allX.length === 0) return [];

    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const range = maxX - minX;

    // Typical MFPC layout: Code(15%) | Designation(35%) | Qty(10%) | Price(15%) | Total(15%)
    columns.push({ xMin: minX, xMax: minX + range * 0.15, role: 'barcode' });
    columns.push({ xMin: minX + range * 0.15, xMax: minX + range * 0.50, role: 'designation' });
    columns.push({ xMin: minX + range * 0.50, xMax: minX + range * 0.65, role: 'quantity' });
    columns.push({ xMin: minX + range * 0.65, xMax: minX + range * 0.82, role: 'price' });
    columns.push({ xMin: minX + range * 0.82, xMax: maxX + 50, role: 'total' });
  }

  return columns;
};

// ─── Step 3: Extract cell content for each row using column boundaries ───
const extractRowCells = (row: TableRow, columns: ColumnDef[]): Record<ColumnDef['role'], string> => {
  const result: Record<string, string> = {
    barcode: '', designation: '', quantity: '', price: '', total: '', unknown: ''
  };

  for (const cell of row.cells) {
    // Find which column this cell belongs to
    let bestCol: ColumnDef | null = null;
    let bestDist = Infinity;

    for (const col of columns) {
      if (cell.x >= col.xMin - 10 && cell.x <= col.xMax + 10) {
        const dist = Math.abs(cell.x - (col.xMin + col.xMax) / 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestCol = col;
        }
      }
    }

    if (bestCol) {
      if (result[bestCol.role]) {
        result[bestCol.role] += ' ' + cell.text;
      } else {
        result[bestCol.role] = cell.text;
      }
    }
  }

  return result;
};

// ─── Step 4: Parse a number from OCR text (handles "1 170,00 DA" etc.) ───
const parseOcrNumber = (text: string): number => {
  if (!text || !text.trim()) return 0;
  let cleaned = text
    .replace(/[a-zA-ZÀ-ÿ%]/g, '') // Remove letters and %
    .replace(/\s+/g, '')            // Remove spaces (thousands separator)
    .replace(',', '.')             // French decimal
    .trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

// ─── Step 5: Determine if a row is a data row (not a header/footer/noise) ───
const isDataRow = (cellData: Record<string, string>): boolean => {
  const designation = cellData.designation?.trim() || '';
  const hasDesignation = designation.length >= 3;
  
  // Must have at least a designation or barcode
  const barcode = cellData.barcode?.trim() || '';
  const hasBarcode = /\d{4,}/.test(barcode);
  
  if (!hasDesignation && !hasBarcode) return false;

  // Skip noise lines
  const lower = designation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const noisePatterns = [
    'total', 'sous-total', 'net a payer', 'tva', 'timbre', 'remise',
    'fournisseur', 'designation', 'code article', 'montant',
    'signature', 'cachet', 'activer windows', 'bon de reception'
  ];
  if (noisePatterns.some(np => lower.includes(np))) return false;

  return true;
};

/**
 * Main entry point: Parse Tesseract word-level data into structured table items.
 * This uses geometric column detection instead of flat text parsing.
 */
export const parseTableFromOcrWords = (
  words: OcrWord[],
  rawText: string,
  suppliers: Supplier[],
  products: Product[],
  imageWidth: number = 1920
): {
  supplierName: string;
  invoiceNumber: string;
  receptionDate: string;
  totalAmount: number;
  items: any[];
  isPosScreenshot: boolean;
} => {
  // ─── Extract metadata from raw text (supplier, invoice#, date, total) ───
  let supplierName = '';
  const matchedSupplier = suppliers.find(s => 
    Boolean(s?.name && rawText.toLowerCase().includes(s.name.toLowerCase()))
  );
  if (matchedSupplier) {
    supplierName = matchedSupplier.name;
  } else {
    const supplierMatch = rawText.match(/fournisseur\s*[:#-]?\s*(.+)/i);
    if (supplierMatch) supplierName = supplierMatch[1].trim().split('\n')[0];
  }

  let invoiceNumber = '';
  const numMatch = rawText.match(/(?:facture|bon|bl|br|ticket|ref|n[°o])\s*[:#-]?\s*([a-zA-Z0-9\-/]{3,})/i);
  if (numMatch) invoiceNumber = numMatch[1].trim();
  else invoiceNumber = "FA-" + new Date().getFullYear() + "-" + Math.random().toString().substring(2, 6);

  let receptionDate = new Date().toISOString().split('T')[0];
  const dateMatch = rawText.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    if (+month >= 1 && +month <= 12 && +day >= 1 && +day <= 31) {
      receptionDate = `${year}-${month}-${day}`;
    }
  }

  let totalAmount = 0;
  const totalMatch = rawText.match(/total\s*(?:ttc|ht|net)?\s*[:#-]?\s*([\d\s,.]+)/i);
  if (totalMatch) {
    const val = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(val)) totalAmount = val;
  }

  const isPosScreenshot = /ticket|caisse/i.test(rawText);

  // ─── Geometric Table Extraction ───
  // Calculate Y tolerance based on average word height
  const avgHeight = words.length > 0
    ? words.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / words.length
    : 15;
  const yTolerance = Math.max(8, avgHeight * 0.6);

  const rows = groupWordsIntoRows(words, yTolerance);
  const columns = detectColumns(rows, imageWidth);

  const items: any[] = [];
  const processedKeys = new Set<string>();

  // If we detected columns, use structured extraction
  if (columns.length >= 2) {
    for (const row of rows) {
      const cellData = extractRowCells(row, columns);
      
      if (!isDataRow(cellData)) continue;

      const designation = cellData.designation?.trim() || '';
      const barcode = (cellData.barcode?.trim() || '').replace(/\D/g, ''); // Keep only digits
      const qty = parseOcrNumber(cellData.quantity) || 1;
      const price = parseOcrNumber(cellData.price);
      const total = parseOcrNumber(cellData.total);

      // Derive price from total/qty if price column is empty
      const finalPrice = price > 0 ? price : (total > 0 && qty > 0 ? total / qty : 0);
      const cleanBarcode = barcode.length >= 8 && barcode.length <= 14 ? barcode : undefined;

      const name = designation || (cleanBarcode ? `Article ${cleanBarcode}` : '');
      if (!name || name.length < 2) continue;

      // Automatic Catalog Mapping
      const matchedProduct = matchProductInCatalog({ name, barcode: cleanBarcode }, products);
      const key = matchedProduct ? `prod-${matchedProduct.id}` : `name-${normalizeForMatching(name)}`;
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);

      if (matchedProduct) {
        items.push({
          productId: matchedProduct.id,
          name: matchedProduct.name,
          barcode: matchedProduct.barcode || cleanBarcode,
          qty: Math.max(1, Math.round(qty)),
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
          qty: Math.max(1, Math.round(qty)),
          price: finalPrice > 0 ? finalPrice : 0,
          taxRate: 19,
          stockTendu: false,
          isDraft: true
        });
      }
    }
  }

  return {
    supplierName,
    invoiceNumber,
    receptionDate,
    totalAmount,
    items,
    isPosScreenshot
  };
};
