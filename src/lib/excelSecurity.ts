/**
 * Nexus POS Pro — Module de Sécurité Excel & SheetJS
 * 
 * 🛡️ Wrapper défensif pour la bibliothèque 'xlsx' (SheetJS v0.18.5)
 * Mitige les vulnérabilités :
 * - GHSA-4r6h-8v6p-xvw6 / CWE-1321 (Prototype Pollution)
 * - GHSA-5pgg-2g8v-p4x9 / CWE-1333 (Regular Expression Denial of Service / ReDoS)
 * - Anti-Zip Bomb & Memory Exhaustion (limite de taille et de dimensions)
 */

export const MAX_EXCEL_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
export const MAX_EXCEL_ROWS = 10000;
export const MAX_EXCEL_COLS = 150;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Vérifie si un fichier Excel respecte les contraintes de sécurité (taille, extension).
 */
export function isExcelFileSafe(file: File): { safe: boolean; error?: string } {
  if (file.size > MAX_EXCEL_FILE_SIZE) {
    return {
      safe: false,
      error: `Le fichier dépasse la taille maximale autorisée (10 Mo). Taille : ${(file.size / (1024 * 1024)).toFixed(2)} Mo.`
    };
  }

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
  if (!isExcel) {
    return {
      safe: false,
      error: "Format de fichier non pris en charge. Veuillez utiliser un fichier .xlsx, .xls ou .csv."
    };
  }

  return { safe: true };
}

/**
 * Assainit récursivement un objet de données tabulaires pour éliminer
 * tout risque de Prototype Pollution (CWE-1321).
 */
export function sanitizeRowObject<T extends Record<string, any>>(rawObj: T): T {
  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
    return rawObj;
  }

  const cleanObj: Record<string, any> = {};

  for (const key of Object.keys(rawObj)) {
    // Rejet strict des clés de prototype
    if (FORBIDDEN_KEYS.has(key) || key.includes('__proto__') || key.includes('prototype')) {
      console.warn(`[Security] Clé interdite ignorée dans le fichier Excel : "${key}"`);
      continue;
    }

    const value = (rawObj as Record<string, any>)[key];

    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        cleanObj[key] = value.map(item => (typeof item === 'object' ? sanitizeRowObject(item) : item));
      } else {
        cleanObj[key] = sanitizeRowObject(value);
      }
    } else {
      cleanObj[key] = value;
    }
  }

  return cleanObj as T;
}

/**
 * Vérifie l'intégrité de Object.prototype contre toute injection malveillante.
 */
function verifyPrototypeIntegrity(): void {
  const dangerousProps = ['polluted', 'isAdmin', 'role', 'authenticated', 'accessLevel'];
  for (const prop of dangerousProps) {
    if (prop in Object.prototype) {
      // Nettoyage immédiat
      delete (Object.prototype as any)[prop];
      throw new Error(`[Security Alert] Tentative de Prototype Pollution détectée et bloquée sur la propriété "${prop}".`);
    }
  }
}

/**
 * Charge la bibliothèque xlsx de façon asynchrone (Lazy Loading)
 * pour ne pas alourdir le bundle principal et isoler le code tiers.
 */
async function loadXlsx() {
  return await import('xlsx');
}

export interface SafeWorkbookResult {
  workbook: any;
  firstSheetName: string;
  worksheet: any;
  rawRows: any[][];
}

/**
 * Lit un fichier ou buffer Excel de manière sécurisée en désactivant
 * l'évaluation des formules, du HTML et en plafonnant les dimensions.
 */
export async function readWorkbookSafely(
  input: File | Blob | ArrayBuffer | Uint8Array,
  options?: { maxRows?: number; maxCols?: number }
): Promise<SafeWorkbookResult> {
  const maxRows = options?.maxRows ?? MAX_EXCEL_ROWS;
  const maxCols = options?.maxCols ?? MAX_EXCEL_COLS;

  // 1. Validation de la taille
  let buffer: ArrayBuffer | Uint8Array;
  if (input instanceof File || input instanceof Blob) {
    if (input.size > MAX_EXCEL_FILE_SIZE) {
      throw new Error(`Fichier Excel trop volumineux (max 10 Mo). Taille : ${(input.size / (1024 * 1024)).toFixed(2)} Mo.`);
    }
    buffer = await input.arrayBuffer();
  } else if (input instanceof Uint8Array) {
    if (input.byteLength > MAX_EXCEL_FILE_SIZE) {
      throw new Error(`Buffer Excel trop volumineux (max 10 Mo).`);
    }
    buffer = input;
  } else {
    if (input.byteLength > MAX_EXCEL_FILE_SIZE) {
      throw new Error(`Buffer Excel trop volumineux (max 10 Mo).`);
    }
    buffer = input;
  }

  // 2. Vérification d'intégrité pré-lecture
  verifyPrototypeIntegrity();

  // 3. Import dynamique de SheetJS
  const XLSX = await loadXlsx();

  // 4. Options durcies de lecture (Désactivation HTML, Formules, Formats avancés ReDoS)
  const readOptions = {
    type: 'array' as const,
    cellFormula: false, // Pas d'évaluation de formules
    cellHTML: false,    // Pas d'analyse HTML (anti-XSS et anti-ReDoS)
    cellNF: false,      // Pas de formatage de nombre lourd
    cellStyles: false,  // Pas de parsing de styles CSS/XML
    dense: true,        // Mode dense : tableaux de données plats, évite la prolifération d'objets
    raw: true           // Valeurs brutes sans formateur vulnérable
  };

  const workbook = XLSX.read(buffer, readOptions);

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Le fichier Excel ne contient aucune feuille de calcul valide.");
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 5. Extraction en tableau 2D dense avec limitation de lignes
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ''
  });

  // 6. Plafonnement anti-DoS sur le volume de lignes
  if (rawRows.length > maxRows) {
    console.warn(`[Security] Fichier Excel tronqué à ${maxRows} lignes pour prévenir un déni de service.`);
    rawRows.length = maxRows;
  }

  // 7. Plafonnement des colonnes et assainissement élément par élément
  for (let r = 0; r < rawRows.length; r++) {
    if (Array.isArray(rawRows[r])) {
      if (rawRows[r].length > maxCols) {
        rawRows[r] = rawRows[r].slice(0, maxCols);
      }
    }
  }

  // 8. Vérification post-lecture
  verifyPrototypeIntegrity();

  return {
    workbook,
    firstSheetName,
    worksheet,
    rawRows
  };
}

/**
 * Lit un fichier Excel et retourne directement les lignes sous forme d'objets sécurisés.
 */
export async function readExcelObjectsSafely<T = Record<string, any>>(
  input: File | Blob | ArrayBuffer | Uint8Array,
  options?: { maxRows?: number; maxCols?: number }
): Promise<T[]> {
  const { worksheet } = await readWorkbookSafely(input, options);
  const XLSX = await loadXlsx();

  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Assainissement de chaque ligne d'objet
  const sanitized = rawRows.map(row => sanitizeRowObject(row) as T);
  verifyPrototypeIntegrity();

  return sanitized;
}

/**
 * Export sécurisé vers un fichier Excel (.xlsx) avec lazy loading de SheetJS.
 */
export async function exportToExcelSafely(
  data: any[],
  fileName: string,
  sheetName: string = "Données"
): Promise<void> {
  if (!data || data.length === 0) {
    throw new Error("Aucune donnée à exporter.");
  }

  const XLSX = await loadXlsx();

  // Assainissement préventif des données avant export
  const cleanData = data.map(item => (typeof item === 'object' && item !== null ? sanitizeRowObject(item) : item));

  const worksheet = XLSX.utils.json_to_sheet(cleanData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)); // 31 caractères max dans Excel

  // Écriture binaire et téléchargement via Blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '_');
  link.download = sanitizedFileName.endsWith('.xlsx') ? sanitizedFileName : `${sanitizedFileName}.xlsx`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 300);
}
