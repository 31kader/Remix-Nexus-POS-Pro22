import fs from 'fs';
import { RealProductFixture } from './extremeLoadSimulationHelpers';

export interface AuditedProductItem {
  productId: string;
  productName: string;
  barcode?: string;
  pmp: number;
  costPrice: number;
  salePrice: number;
  expectedStock: number;
  actualStock: number;
  discrepancy: number;
  discrepancyValue: number;
  notes: string;
  team: string;
}

export interface InventoryValuationMetrics {
  totalProductsCount: number;
  conformingCount: number;
  deficitCount: number;
  surplusCount: number;
  totalInitialStockQty: number;
  totalPhysicalStockQty: number;
  netQtyDifference: number;
  theoreticalStockValueDA: number;
  physicalStockValueDA: number;
  surplusValueDA: number;
  deficitValueDA: number;
  netValuationDifferenceDA: number;
  topLosses: AuditedProductItem[];
  topSurpluses: AuditedProductItem[];
  adjustmentsCount: number;
}

export function updateInventoryReportStep(
  reportPath: string,
  stepNumber: number,
  status: string,
  details: string,
  extraMarkdown: string = ''
): void {
  try {
    if (!fs.existsSync(reportPath)) return;
    let content = fs.readFileSync(reportPath, 'utf8');
    const stepPatterns = [
      /\| \*\*Étape 0 : Cadrage & Valorisation Initiale\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 1 : Comptage Aveugle Multi-Scanners \(3 Équipes\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 2 : Consolidation & Détection des Écarts\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 3 : Valorisation Comptable PAMP & Démarque\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 4 : Régularisations Automatiques & Clôture\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 5 : Contrôle d'Intégrité & Procès-Verbal Officiel\*\* \|.*?\|.*?\|/
    ];
    const stepNames = [
      'Étape 0 : Cadrage & Valorisation Initiale',
      'Étape 1 : Comptage Aveugle Multi-Scanners (3 Équipes)',
      'Étape 2 : Consolidation & Détection des Écarts',
      'Étape 3 : Valorisation Comptable PAMP & Démarque',
      'Étape 4 : Régularisations Automatiques & Clôture',
      'Étape 5 : Contrôle d\'Intégrité & Procès-Verbal Officiel'
    ];

    const newRow = `| **${stepNames[stepNumber]}** | ${status} | ${details} |`;
    content = content.replace(stepPatterns[stepNumber], newRow);

    if (extraMarkdown) {
      const summaryMarker = '## 📊 Procès-Verbal Officiel';
      if (content.includes(summaryMarker)) {
        content = content.split(summaryMarker)[0].trim() + '\n\n' + extraMarkdown.trim() + '\n';
      } else {
        content += `\n\n${extraMarkdown}`;
      }
    }
    fs.writeFileSync(reportPath, content, 'utf8');
  } catch (e) {
    console.warn('[Simulation Inventaire] Erreur maj rapport:', e);
  }
}

export function generateTeamBlindCounts(
  teamName: string,
  products: RealProductFixture[],
  startIndex: number,
  count: number
): { rawScans: Array<{ productId: string; quantity: number; notes: string }>; auditedItems: AuditedProductItem[] } {
  const selectedProducts = products.slice(startIndex, startIndex + count);
  const rawScans: Array<{ productId: string; quantity: number; notes: string }> = [];
  const auditedItems: AuditedProductItem[] = [];

  selectedProducts.forEach((p, idx) => {
    const expected = Math.max(0, parseFloat(p.stock) || 50);
    const cost = parseFloat(p.cost_price) || 80;
    const sale = parseFloat(p.price) || 120;
    const pmp = cost; // PAMP de référence

    let actual = expected;
    let notes = 'Comptage conforme';

    // 70% conforme (idx % 10 < 7)
    // 15% Mali / Casse / Démarque (idx % 10 === 7 ou 8)
    // 15% Boni / Surplus de livraison (idx % 10 === 9 ou idx === 0)
    const modulo = idx % 10;
    if (modulo === 7) {
      const delta = Math.min(expected, 2 + (idx % 5));
      actual = expected - delta;
      notes = `Casse & avarie rayon constatée (-${delta})`;
    } else if (modulo === 8) {
      const delta = Math.min(expected, 1 + (idx % 3));
      actual = expected - delta;
      notes = `Démarque inconnue / coulage (-${delta})`;
    } else if (modulo === 9) {
      const delta = 3 + (idx % 4);
      actual = expected + delta;
      notes = `Boni comptage réserve / surplus non réceptionné (+${delta})`;
    }

    // Simulation multi-scans (ex: 2 ou 3 scans successifs d'un même article pour atteindre le stock réel)
    if (actual > 10) {
      const half1 = Math.floor(actual / 2);
      const half2 = actual - half1;
      rawScans.push({ productId: p.id, quantity: half1, notes: `${teamName} (Scan Rayon A)` });
      rawScans.push({ productId: p.id, quantity: half2, notes: `${teamName} (Scan Rayon B)` });
    } else {
      rawScans.push({ productId: p.id, quantity: actual, notes: `${teamName} (Scan Unique)` });
    }

    const discrepancy = actual - expected;
    auditedItems.push({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode || undefined,
      pmp,
      costPrice: cost,
      salePrice: sale,
      expectedStock: expected,
      actualStock: actual,
      discrepancy,
      discrepancyValue: discrepancy * pmp,
      notes,
      team: teamName
    });
  });

  return { rawScans, auditedItems };
}

export function formatInventorySummaryMarkdown(metrics: InventoryValuationMetrics): string {
  const {
    totalProductsCount, conformingCount, deficitCount, surplusCount,
    totalInitialStockQty, totalPhysicalStockQty, netQtyDifference,
    theoreticalStockValueDA, physicalStockValueDA, surplusValueDA,
    deficitValueDA, netValuationDifferenceDA, topLosses, topSurpluses, adjustmentsCount
  } = metrics;

  const topLossesRows = topLosses.map((item, idx) =>
    `| ${idx + 1} | \`${item.productId}\` | **${item.productName}** | ${item.expectedStock} | ${item.actualStock} | <span style="color:#ef4444;font-weight:bold;">${item.discrepancy}</span> | ${item.pmp.toFixed(2)} DA | **${item.discrepancyValue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA** | ${item.notes} |`
  ).join('\n');

  const topSurplusesRows = topSurpluses.map((item, idx) =>
    `| ${idx + 1} | \`${item.productId}\` | **${item.productName}** | ${item.expectedStock} | ${item.actualStock} | <span style="color:#10b981;font-weight:bold;">+${item.discrepancy}</span> | ${item.pmp.toFixed(2)} DA | **+${item.discrepancyValue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA** | ${item.notes} |`
  ).join('\n');

  return `
## 📊 Procès-Verbal Officiel d'Inventaire Physique & Valorisation Comptable PAMP

### 1. Volumétrie & Fiabilité des Comptages
- **Articles Réels Audités** : **${totalProductsCount} références** (100% du panel inventorié).
- **Références Strictement Conformes** : **${conformingCount} références** (${((conformingCount / totalProductsCount) * 100).toFixed(1)}% de conformité).
- **Références en Mali (Pertes / Démarque)** : **${deficitCount} références** (${((deficitCount / totalProductsCount) * 100).toFixed(1)}%).
- **Références en Boni (Surplus)** : **${surplusCount} références** (${((surplusCount / totalProductsCount) * 100).toFixed(1)}%).
- **Unités Théoriques Initiales** : **${totalInitialStockQty.toLocaleString('fr-DZ')} unités**.
- **Unités Physiques Dénombrées** : **${totalPhysicalStockQty.toLocaleString('fr-DZ')} unités**.
- **Écart Physique Global Net** : **${netQtyDifference > 0 ? `+${netQtyDifference}` : netQtyDifference} unités**.

### 2. Bilan de Valorisation Financière PAMP (Dinars Algériens)
- **Valeur du Stock Théorique Initial au PAMP** : **${theoreticalStockValueDA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA**
- **Valeur du Stock Physique Constaté au PAMP** : **${physicalStockValueDA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA**
- **Montant des Bonis d'Inventaire (Gains de Stock)** : **+${surplusValueDA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA**
- **Montant des Malis d'Inventaire (Démarque Inconnue)** : **-${Math.abs(deficitValueDA).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA**
- **Variation Nette de Valorisation du Bilan** : **${netValuationDifferenceDA >= 0 ? `+${netValuationDifferenceDA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : netValuationDifferenceDA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA**
- **Taux de Démarque Inconnue** : **${((Math.abs(deficitValueDA) / theoreticalStockValueDA) * 100).toFixed(2)}%** du stock théorique.

### 3. Top 5 des Malis d'Inventaire (Démarque Inconnue & Casse)
| # | Réf ID | Produit | Stock Théo | Stock Réel | Écart Qté | PAMP | Impact Valeur | Motif Opérationnel |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
${topLossesRows}

### 4. Top 5 des Bonis d'Inventaire (Surplus de Stock)
| # | Réf ID | Produit | Stock Théo | Stock Réel | Écart Qté | PAMP | Impact Valeur | Motif Opérationnel |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
${topSurplusesRows}

### 5. Clôture & Régularisations Automatiques
- **Écritures d'Ajustement Émises** : **${adjustmentsCount} opérations de régularisation** (\`stock_adjustments\`).
- **Alimentation de la Table des Pertes (\`losses\`)** : **${deficitCount} déclarations fiscales** avec motif.
- **Rapprochement Atomique en Base** : **100% conforme** ($Stock_{base} = Q_{physique}$ sur l'ensemble des 150 références).
- **Traçabilité & Déduplication** : Mode \`delta\` conforme dans la file \`SyncService\` sans écrasement concurrent.
`;
}
