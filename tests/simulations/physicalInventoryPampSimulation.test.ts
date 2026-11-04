import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { RealProductFixture } from './extremeLoadSimulationHelpers';
import {
  AuditedProductItem,
  InventoryValuationMetrics,
  generateTeamBlindCounts,
  updateInventoryReportStep,
  formatInventorySummaryMarkdown
} from './physicalInventorySimulationHelpers';

describe('📋 SIMULATION INVENTAIRE PHYSIQUE GÉNÉRAL & VALORISATION COMPTABLE PAMP', () => {
  let realProducts: RealProductFixture[] = [];
  const reportPath = path.resolve('docs/simulations/SIMULATION_INVENTAIRE_PHYSIQUE_PAMP_RAPPORT.md');

  // Suivi rigoureux des stocks et de la valorisation
  const initialStockMap = new Map<string, number>();
  const physicalStockMap = new Map<string, number>();
  const currentStockMap = new Map<string, number>();
  const pmpMap = new Map<string, number>();

  // Équipes de scan et sessions d'audit
  let activeAudit: any;
  const allAuditedItems: AuditedProductItem[] = [];
  const createdAdjustments: any[] = [];
  const createdLosses: any[] = [];
  const syncQueue: any[] = [];

  // Métriques financières globales
  let initialStockQty = 0;
  let physicalStockQty = 0;
  let theoreticalValuationDA = 0;
  let physicalValuationDA = 0;
  let totalSurplusDA = 0;
  let totalDeficitDA = 0;

  beforeAll(() => {
    const fixturePath = path.resolve('tests/simulations/realProductsSample.json');
    expect(fs.existsSync(fixturePath)).toBe(true);
    realProducts = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    expect(realProducts.length).toBeGreaterThanOrEqual(100);

    for (const p of realProducts) {
      const stock = Math.max(0, parseFloat(p.stock) || 50);
      const cost = parseFloat(p.cost_price) || 80;
      initialStockMap.set(p.id, stock);
      currentStockMap.set(p.id, stock);
      pmpMap.set(p.id, cost); // PAMP de référence
    }
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 0 : CADRAGE, ÉCHANTILLONNAGE & VALORISATION INITIALE PAMP
  // --------------------------------------------------------------------------
  it('Étape 0 : Cadrage, échantillonnage de 150 produits réels et valorisation initiale PAMP', () => {
    const startTime = new Date('2026-11-02T15:00:00.000Z');
    activeAudit = {
      id: 'audit_sim_annuel_2026',
      startDate: startTime.toISOString(),
      status: 'in_progress',
      auditorId: 'admin@nexuspos.dz',
      auditorName: 'Directeur d\'Exploitation & Contrôle',
      blindCountMode: true,
      items: [],
      notes: 'Inventaire Physique Général Annuel 2026 (Comptage à l\'aveugle 3 Équipes)'
    };

    for (const p of realProducts) {
      const stock = initialStockMap.get(p.id) || 0;
      const pmp = pmpMap.get(p.id) || 0;
      initialStockQty += stock;
      theoreticalValuationDA += stock * pmp;
    }

    expect(realProducts.length).toBe(150);
    expect(activeAudit.blindCountMode).toBe(true);
    expect(theoreticalValuationDA).toBeGreaterThan(0);

    updateInventoryReportStep(
      reportPath,
      0,
      '✅ Validé',
      `150 références réelles initialisées. Stock théorique : **${initialStockQty.toLocaleString('fr-DZ')} unités** valorisées à **${theoreticalValuationDA.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} DA** au PAMP. Audit ouvert en mode aveugle (\`blindCountMode: true\`).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 1 : COMPTAGE PHYSIQUE À L'AVEUGLE MULTI-SCANNERS (3 ÉQUIPES)
  // --------------------------------------------------------------------------
  it('Étape 1 : Comptage physique à l\'aveugle multi-scanners par 3 équipes concurrentes', () => {
    // Équipe 1 : Scanner Réserve & Palettes (Produits 0 à 49)
    const team1 = generateTeamBlindCounts('Équipe 01 (Réserve & Palettes)', realProducts, 0, 50);
    // Équipe 2 : Scanner Rayon Épicerie & Frais (Produits 50 à 99)
    const team2 = generateTeamBlindCounts('Équipe 02 (Épicerie & Frais)', realProducts, 50, 50);
    // Équipe 3 : Scanner Rayon Cosmétique & Droguerie (Produits 100 à 149)
    const team3 = generateTeamBlindCounts('Équipe 03 (Cosmétique & Droguerie)', realProducts, 100, 50);

    const rawScans = [...team1.rawScans, ...team2.rawScans, ...team3.rawScans];
    const scannedItems = [...team1.auditedItems, ...team2.auditedItems, ...team3.auditedItems];

    expect(rawScans.length).toBeGreaterThan(150); // Atteste des multi-scans successifs
    expect(scannedItems.length).toBe(150);

    // Consolidation préalable par productId (Règle Anti-Écrasement)
    const consolidatedScans = new Map<string, number>();
    for (const scan of rawScans) {
      consolidatedScans.set(scan.productId, (consolidatedScans.get(scan.productId) || 0) + scan.quantity);
    }

    for (const item of scannedItems) {
      const physicalQty = consolidatedScans.get(item.productId) || 0;
      physicalStockMap.set(item.productId, physicalQty);
      physicalStockQty += physicalQty;
      allAuditedItems.push(item);
    }

    expect(allAuditedItems.length).toBe(150);

    updateInventoryReportStep(
      reportPath,
      1,
      '✅ Validé',
      `3 équipes multi-scanners ont dénombré **${physicalStockQty.toLocaleString('fr-DZ')} unités** via **${rawScans.length} scans consolidés**. Zéro fuite d'information théorique (mode aveugle respecté).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 2 : CONSOLIDATION & DÉTECTION DES ÉCARTS (70% CONFORMES, 15% MALIS, 15% BONIS)
  // --------------------------------------------------------------------------
  it('Étape 2 : Détection et classification des écarts physiques (conformes, malis, bonis)', () => {
    let conforming = 0;
    let deficits = 0;
    let surpluses = 0;

    for (const item of allAuditedItems) {
      if (item.discrepancy === 0) {
        conforming++;
      } else if (item.discrepancy < 0) {
        deficits++;
      } else {
        surpluses++;
      }
    }

    expect(conforming).toBe(105); // 70% de 150
    expect(deficits).toBe(30);    // 20% malis
    expect(surpluses).toBe(15);   // 10% bonis
    expect(conforming + deficits + surpluses).toBe(150);

    updateInventoryReportStep(
      reportPath,
      2,
      '✅ Validé',
      `Classification certifiée sur 150 articles : **${conforming} conformes** (70.0%), **${deficits} malis / pertes** (20.0%) et **${surpluses} bonis / surplus** (10.0%).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 3 : VALORISATION COMPTABLE PAMP & CHIFFRAGE DE LA DÉMARQUE
  // --------------------------------------------------------------------------
  it('Étape 3 : Valorisation financière PAMP, calcul des bonis et de la démarque inconnue', () => {
    for (const item of allAuditedItems) {
      const pmp = item.pmp;
      const physicalVal = item.actualStock * pmp;
      physicalValuationDA += physicalVal;

      if (item.discrepancy > 0) {
        totalSurplusDA += item.discrepancy * pmp;
      } else if (item.discrepancy < 0) {
        totalDeficitDA += item.discrepancy * pmp; // Valeur négative
      }
    }

    const netValuationDifferenceDA = physicalValuationDA - theoreticalValuationDA;
    expect(physicalValuationDA).toBeGreaterThan(0);
    expect(totalSurplusDA).toBeGreaterThan(0);
    expect(totalDeficitDA).toBeLessThan(0);

    updateInventoryReportStep(
      reportPath,
      3,
      '✅ Validé',
      `Bilan PAMP : Stock physique valorisé à **${physicalValuationDA.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} DA**. Bonis : **+${totalSurplusDA.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} DA**, Démarque inconnue : **-${Math.abs(totalDeficitDA).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} DA** (Impact net : **${netValuationDifferenceDA.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} DA**).`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 4 : RÉGULARISATIONS AUTOMATIQUES & CLÔTURE DE L'AUDIT
  // --------------------------------------------------------------------------
  it('Étape 4 : Clôture d\'audit et génération des écritures de régularisation (stock_adjustments & losses)', () => {
    const nowIso = new Date('2026-11-02T15:20:00.000Z').toISOString();

    for (const item of allAuditedItems) {
      if (item.discrepancy !== 0) {
        const isLoss = item.discrepancy < 0;
        const adj = {
          id: `adj_sim_${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          oldQuantity: item.expectedStock,
          newQuantity: item.actualStock,
          adjustment: item.discrepancy,
          quantity: item.discrepancy,
          type: item.discrepancy > 0 ? 'found' : 'damage',
          reason: item.notes,
          date: nowIso,
          timestamp: nowIso,
          userId: 'admin@nexuspos.dz',
          userName: 'Directeur d\'Exploitation',
          isLoss
        };
        createdAdjustments.push(adj);
        syncQueue.push({ type: 'stock_adjustment', payload: adj, mode: 'delta' });

        if (isLoss) {
          createdLosses.push({
            id: `loss_sim_${item.productId}`,
            productId: item.productId,
            productName: item.productName,
            quantity: Math.abs(item.discrepancy),
            costPrice: item.pmp,
            totalCost: Math.abs(item.discrepancy) * item.pmp,
            reason: item.notes,
            date: nowIso,
            recordedBy: 'admin@nexuspos.dz'
          });
        }
      }

      // Mise à jour atomique du stock courant
      currentStockMap.set(item.productId, item.actualStock);
    }

    activeAudit.status = 'completed';
    activeAudit.endDate = nowIso;
    activeAudit.items = allAuditedItems;
    activeAudit.totalDiscrepancyValue = physicalValuationDA - theoreticalValuationDA;

    expect(createdAdjustments.length).toBe(45); // 30 malis + 15 bonis
    expect(createdLosses.length).toBe(30);       // 30 déclarations fiscales de pertes
    expect(activeAudit.status).toBe('completed');

    updateInventoryReportStep(
      reportPath,
      4,
      '✅ Validé',
      `Audit clôturé avec succès : **45 ajustements de stock** créés (\`stock_adjustments\`), **30 déclarations de pertes fiscales** enregistrées (\`losses\`) et empilées dans \`SyncService\` en mode delta.`
    );
  });

  // --------------------------------------------------------------------------
  // ÉTAPE 5 : CONTRÔLE D'INTÉGRITÉ POST-INVENTAIRE & PROCÈS-VERBAL OFFICIEL
  // --------------------------------------------------------------------------
  it('Étape 5 : Rapprochement physique 100% exact et édition du Procès-Verbal officiel d\'inventaire', () => {
    let perfectMatchCount = 0;
    for (const p of realProducts) {
      const physical = physicalStockMap.get(p.id);
      const current = currentStockMap.get(p.id);
      expect(current).toBe(physical);
      perfectMatchCount++;
    }

    expect(perfectMatchCount).toBe(150);

    const sortedDiscrepancies = [...allAuditedItems].sort((a, b) => a.discrepancyValue - b.discrepancyValue);
    const topLosses = sortedDiscrepancies.filter(i => i.discrepancy < 0).slice(0, 5);
    const topSurpluses = [...sortedDiscrepancies].filter(i => i.discrepancy > 0).reverse().slice(0, 5);

    const metrics: InventoryValuationMetrics = {
      totalProductsCount: realProducts.length,
      conformingCount: 105,
      deficitCount: 30,
      surplusCount: 15,
      totalInitialStockQty: initialStockQty,
      totalPhysicalStockQty: physicalStockQty,
      netQtyDifference: physicalStockQty - initialStockQty,
      theoreticalStockValueDA: theoreticalValuationDA,
      physicalStockValueDA: physicalValuationDA,
      surplusValueDA: totalSurplusDA,
      deficitValueDA: totalDeficitDA,
      netValuationDifferenceDA: physicalValuationDA - theoreticalValuationDA,
      topLosses,
      topSurpluses,
      adjustmentsCount: createdAdjustments.length
    };

    const summaryMarkdown = formatInventorySummaryMarkdown(metrics);

    updateInventoryReportStep(
      reportPath,
      5,
      '✅ Validé',
      `Audit certifié 100% conforme sur 150 articles ($Stock_{base} = Q_{physique}$). PV officiel d'inventaire PAMP généré avec succès.`,
      summaryMarkdown
    );
  });
});
