import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 🛡️ GARDE-FOU ANTI-GOD FILES (TOLÉRANCE ZÉRO)
 * 
 * Ce test unitaire empêche définitivement la création ou la croissance incontrôlée
 * de "God Files" dans l'application Nexus POS Pro.
 * 
 * Règles codifiées (conformément à GEMINI.md) :
 * 1. Plafond strict : Aucun fichier applicatif (.ts/.tsx) dans src/ ne doit dépasser 500 lignes de code.
 * 2. Standard d'excellence cible : Tout fichier applicatif doit être < 350 lignes.
 * 3. Seuls 3 sanctuaires système de bas niveau sont autorisés :
 *    - db-converters.ts
 *    - diagnosticQueries.ts
 *    - database.types.ts
 */

const MAX_LINES_LIMIT = 500;
const EXCELLENCE_TARGET_LIMIT = 350;

const SANCTUARIES = [
  'db-converters.ts',
  'diagnosticQueries.ts',
  'database.types.ts'
];

function getAllTsFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('🛡️ Garde-Fou Architectural — Tolérance Zéro Anti-God Files (<= 500 lignes)', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const allFiles = getAllTsFiles(srcDir);

  it('doit scanner tous les fichiers TypeScript applicatifs dans src/', () => {
    expect(allFiles.length).toBeGreaterThan(150);
  });

  it('aucun fichier applicatif (hors les 3 sanctuaires) ne doit dépasser 500 lignes', () => {
    const offendingFiles: { file: string; lines: number }[] = [];

    for (const filePath of allFiles) {
      const isSanctuary = SANCTUARIES.some(s => filePath.endsWith(s));
      if (isSanctuary) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;

      if (lines > MAX_LINES_LIMIT) {
        const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
        offendingFiles.push({ file: relativePath, lines });
      }
    }

    if (offendingFiles.length > 0) {
      const errorReport = offendingFiles
        .map(f => `  ❌ ${f.file} (${f.lines} lignes > max ${MAX_LINES_LIMIT})`)
        .join('\n');
      throw new Error(`Violation de la règle Anti-God Files dans GEMINI.md !\n${errorReport}`);
    }

    expect(offendingFiles).toEqual([]);
  });

  it('standard d\'excellence absolu (< 350 lignes) atteint à 100% sur l\'ensemble du code source', () => {
    const exceedingTargetFiles: { file: string; lines: number }[] = [];

    for (const filePath of allFiles) {
      const isSanctuary = SANCTUARIES.some(s => filePath.endsWith(s));
      if (isSanctuary) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;

      if (lines >= EXCELLENCE_TARGET_LIMIT) {
        const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
        exceedingTargetFiles.push({ file: relativePath, lines });
      }
    }

    if (exceedingTargetFiles.length > 0) {
      const errorReport = exceedingTargetFiles
        .map(f => `  ⚠️ ${f.file} (${f.lines} lignes >= cible d'excellence ${EXCELLENCE_TARGET_LIMIT})`)
        .join('\n');
      throw new Error(`Standard d'Excellence non atteint !\n${errorReport}`);
    }

    expect(exceedingTargetFiles).toEqual([]);
  });

  it('les 3 sanctuaires obligatoires restent identifiés et protégés', () => {
    const foundSanctuaries = SANCTUARIES.map(s => {
      const found = allFiles.find(f => f.endsWith(s));
      return { sanctuary: s, found: Boolean(found) };
    });

    for (const s of foundSanctuaries) {
      expect(s.found, `Le sanctuaire ${s.sanctuary} doit exister dans src/`).toBe(true);
    }
  });
});
