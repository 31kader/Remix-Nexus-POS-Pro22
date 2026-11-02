/**
 * Mappeur de colonnes pour les factures d'achat importées
 */

export type ColumnRole = 'barcode' | 'designation' | 'quantity' | 'price' | 'total' | 'skip';

export const COLUMN_KEYWORDS: Record<ColumnRole, string[]> = {
  barcode: ['code', 'code article', 'code barre', 'barcode', 'ean', 'ref', 'reference', 'référence', 'sku', 'code produit'],
  designation: ['designation', 'désignation', 'produit', 'article', 'libelle', 'libellé', 'nom', 'description', 'intitule', 'intitulé'],
  quantity: ['qte', 'quantite', 'quantité', 'qty', 'nbr', 'nombre', 'nb', 'nbre', 'qté', 'carton', 'nbr carton'],
  price: ['prix', 'prix u', 'p.u', 'pu', 'prix unitaire', 'prix ht', 'cout', 'coût', 'prix achat', 'prix u. ht'],
  total: ['montant', 'total', 'total ht', 'total ttc', 'mt ht', 'montant ht', 'sous total'],
  skip: ['tva', 'remise', 'discount', 'taxe', 'tax', 'unite', 'unité', 'unit', 'stock', 'depot', 'dépôt'],
};

export const detectColumnRole = (header: string): ColumnRole => {
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

export interface ColumnMapping {
  index: number;
  role: ColumnRole;
  header: string;
}

export const detectHeaderAndColumns = (rows: string[][]): { headerIndex: number; columns: ColumnMapping[] } => {
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

export const isValidDataRow = (row: string[], columns: ColumnMapping[]): boolean => {
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
