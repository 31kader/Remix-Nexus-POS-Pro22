/**
 * Utilitaires de normalisation et de matching flou pour l'OCR
 */

// Normalizer to remove accents, punctuation and lowercase words
export const normalizeTextForOcr = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’°+/#&-\[\]_:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const getLevenshteinDistance = (s1: string, s2: string): number => {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
};

export const areWordsSimilar = (w1: string, w2: string): boolean => {
  if (w1 === w2) return true;
  if (Math.abs(w1.length - w2.length) > 2) return false;
  
  const dist = getLevenshteinDistance(w1, w2);
  if (w1.length <= 4) return dist <= 1;
  if (w1.length <= 7) return dist <= 1;
  return dist <= 2;
};

export const isFuzzyNameMatch = (productName: string, lineText: string): boolean => {
  const normProg = normalizeTextForOcr(productName);
  const normLine = normalizeTextForOcr(lineText);
  
  if (normProg.length < 3) return false;
  
  // Exact substring match is always valid
  if (normLine.includes(normProg)) return true;
  
  const progWords = normProg.split(" ").filter(w => w.length >= 3);
  const lineWords = normLine.split(" ").filter(w => w.length >= 2);
  
  if (progWords.length === 0) return false;
  
  // STRICT RULE: Single-word product names CANNOT fuzzy match.
  // They are too short and too likely to collide with random OCR text.
  // They can only match via exact barcode/SKU (handled elsewhere).
  if (progWords.length <= 1) return false;
  
  let matchedCount = 0;
  for (const pW of progWords) {
    const hasSimilar = lineWords.some(lW => {
      if (lW.includes(pW) || pW.includes(lW)) return true;
      return areWordsSimilar(pW, lW);
    });
    
    if (hasSimilar) {
      matchedCount++;
    }
  }
  
  // Require at least 2 words to match AND 90%+ ratio
  if (matchedCount < 2) return false;
  
  const matchRatio = matchedCount / progWords.length;
  return matchRatio >= 0.90;
};
