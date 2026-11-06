/**
 * 📅 Normalisation et sécurisation des formats date/heure pour inputs HTML
 * Protège contre les avertissements Chromium : "The specified value does not conform to the required format".
 */

/**
 * Normalise n'importe quelle valeur de date pour un `<input type="datetime-local" />`.
 * Le format attendu par Chromium est strictement `yyyy-MM-ddThh:mm` (16 caractères).
 */
export function toDatetimeLocalValue(val?: unknown): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Format simple date : 2026-10-30 -> 2026-10-30T12:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str}T12:00`;
  }

  // Format ISO ou avec 'T' : 2026-10-30T14:30(:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    return str.slice(0, 16);
  }

  // Format SQL avec espace : 2026-10-30 14:30:00
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    return str.replace(/\s+/, 'T').slice(0, 16);
  }

  // Fallback via Date parser
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch (_) {}

  return '';
}

/**
 * Normalise n'importe quelle valeur de date pour un `<input type="date" />`.
 * Le format attendu par Chromium est strictement `yyyy-MM-dd` (10 caractères).
 */
export function toDateInputValue(val?: unknown): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  } catch (_) {}

  return '';
}

/**
 * Convertit une valeur de saisie utilisateur en chaîne ISO standard sécurisée.
 */
export function normalizeDateToIso(val?: unknown): string {
  if (!val) return new Date().toISOString();
  const str = String(val).trim();
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return `${str}T12:00:00.000Z`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (_) {}
  return new Date().toISOString();
}
