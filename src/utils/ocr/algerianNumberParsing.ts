/**
 * Parsing intelligent des nombres et montants pour factures algériennes et françaises
 */

export const parseSmartAlgerianNumber = (raw: string | number | undefined | null): number => {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : raw;
  }

  let s = String(raw)
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/(DA|DZD|DT|EUR|USD|TTC|HT|€|\$|%)/gi, '')
    .trim();

  if (!s) return 0;

  // Fusionner les espaces séparateurs de milliers : "1 200,00" -> "1200,00", "12 500" -> "12500"
  s = s.replace(/(\d)\s+(?=\d{3}(?:\b|[.,]))/g, '$1');
  s = s.replace(/\s+/g, '');

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Format Européen / Algérien : "1.200,50" ou "12.500,00"
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Format Anglo-Saxon : "1,200.50"
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Ex: "1,500" (milliers) vs "325,00" ou "45,5" (décimales)
    if (/^\d{1,3}(,\d{3})+$/.test(s)) {
      s = s.replace(/,/g, '');
    } else {
      const parts = s.split(',');
      if (parts.length > 2) {
        const dec = parts.pop();
        s = parts.join('') + '.' + dec;
      } else {
        s = s.replace(',', '.');
      }
    }
  } else if (hasDot) {
    // Ex: "1.200" ou "15.000" sur facture algérienne = 1200 DA / 15000 DA (séparateur de milliers)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    } else if ((s.match(/\./g) || []).length > 1) {
      const parts = s.split('.');
      const dec = parts.pop();
      s = parts.join('') + '.' + dec;
    }
  }

  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
};

export const cleanAndExtractOcrNumbers = (lineText: string): number[] => {
  let cleaned = lineText.replace(/[\u00A0\u202F]/g, ' ');
  
  cleaned = cleaned.replace(/(\d)[oO]/g, '$10');
  cleaned = cleaned.replace(/[oO](\d)/g, '0$1');
  
  cleaned = cleaned.replace(/(\d)[lIi]/g, '$11');
  cleaned = cleaned.replace(/[lIi](\d)/g, '1$1');
  
  // Fusionner d'abord les formats milliers avec point/virgule/espace (ex: 1.200,00 ou 1 200,00 ou 1.500)
  cleaned = cleaned.replace(/\b(\d{1,3})[.\s](\d{3})[,.](\d{2})\b/g, '$1$2.$3');
  cleaned = cleaned.replace(/\b(\d{1,3}),(\d{3})\.(\d{2})\b/g, '$1$2.$3');
  cleaned = cleaned.replace(/\b(\d{1,3})\.(\d{3})\b/g, '$1$2');
  cleaned = cleaned.replace(/\b(\d+)\s*[,.·/\-|]\s*(\d{2})\b/g, '$1.$2');
  
  cleaned = cleaned.replace(/(\d+)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/g, '$1 $2');

  cleaned = cleaned.replace(/(\d)\s+(\d{3}(?:[.,]\d+)?)\b/g, '$1$2');
  
  const numberMatches = cleaned.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
  
  return numberMatches
    .map(n => parseSmartAlgerianNumber(n))
    .filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
};
