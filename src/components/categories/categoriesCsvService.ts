import Papa from 'papaparse';
import { Category } from '../../types';
import { exportToCSV } from '../../lib/utils';
import { localDb } from '../../services/LocalDatabase';

export function exportCategoriesToCsv(
  categories: Category[],
  totalProductCounts: Record<string, number>
): void {
  const dataToExport = categories.map((cat) => {
    const parent = categories.find((c) => c.id === cat.parentId);
    return {
      id: cat.id,
      Nom: cat.name,
      Niveau: cat.level || 0,
      Parent_Id: cat.parentId || '',
      Parent_Nom: parent ? parent.name : '',
      Nb_Produits: totalProductCounts[cat.id] || 0
    };
  });
  exportToCSV(dataToExport, 'categories_export');
}

export interface CategoryImportResult {
  successCount: number;
  failCount: number;
  message: string;
}

export function importCategoriesFromCsv(
  file: File,
  existingCategories: Category[]
): Promise<CategoryImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const data = results.data as any[];
          let successCount = 0;
          let failCount = 0;

          for (const row of data) {
            const nom = row['Nom']?.trim();
            if (!nom) {
              failCount++;
              continue;
            }

            const parentId = row['Parent_Id']?.trim();
            const parentNom = row['Parent_Nom']?.trim();

            const existing = existingCategories.find(
              (c) => (c.name || '').toLowerCase() === nom.toLowerCase()
            );
            if (existing) {
              failCount++;
              continue;
            }

            let resolvedParentId = parentId || null;
            if (!resolvedParentId && parentNom) {
              const pData = existingCategories.find(
                (c) => (c.name || '').toLowerCase() === parentNom.toLowerCase()
              );
              if (pData) {
                resolvedParentId = pData.id;
              }
            }

            const newId = Math.random().toString(36).substring(2, 10);
            try {
              await localDb.insert(`categories/${newId}`, {
                id: newId,
                name: nom,
                parentId: resolvedParentId || undefined
              });
              successCount++;
            } catch {
              failCount++;
            }
          }

          const message = `${successCount} catégorie(s) importée(s) avec succès. ${
            failCount > 0 ? `${failCount} ignorée(s) (doublons ou erreurs).` : ''
          }`;

          resolve({ successCount, failCount, message });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
}
