import { readWorkbookSafely, sanitizeRowObject } from '../../../lib/excelSecurity';

/**
 * Parsers de fichiers tabulaires bruts (CSV, Excel, PDF digital)
 * Exécution 100% offline sans fuite de données
 */

// ─── Parse a number from various formats ───
export const parseNumber = (val: string | number | undefined | null): number => {
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
export const detectSeparator = (text: string): string => {
  const firstLines = text.split('\n').slice(0, 5).join('\n');
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  
  for (const char of Object.keys(counts)) {
    counts[char] = (firstLines.match(new RegExp(char === '|' ? '\\|' : char, 'g')) || []).length;
  }

  // Return the separator with the highest count
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

export const parseCSVLine = (line: string, separator: string): string[] => {
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
