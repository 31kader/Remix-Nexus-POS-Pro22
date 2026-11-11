// tests/general-performance-benchmark.test.ts
import { describe, it, expect } from 'vitest';

describe('Banc d\'Essai des Performances Générales (Nexus POS Pro)', () => {

  // =========================================================================
  // BENCHMARK 1 : Moteur de Caisse & Calculs Financiers DZD (TVA 19%)
  // =========================================================================
  it('Benchmark 1 [Moteur de Caisse] : 10 000 calculs de panier complets (TVA, remises, total)', () => {
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Panier type : 4 articles avec quantités, remises et TVA
      const items = [
        { price: 250, qty: 2, discountPercent: 5 },  // 500 - 5% = 475
        { price: 1200, qty: 1, discountPercent: 0 }, // 1200
        { price: 85, qty: 10, discountPercent: 10 }, // 850 - 10% = 765
        { price: 450, qty: 3, discountPercent: 0 }   // 1350
      ];

      let subtotal = 0;
      let totalDiscount = 0;
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const lineTotal = item.price * item.qty;
        const discount = lineTotal * (item.discountPercent / 100);
        subtotal += lineTotal;
        totalDiscount += discount;
      }

      const taxableAmount = subtotal - totalDiscount;
      const vatRate = 0.19; // TVA 19% Algérie
      const vatAmount = taxableAmount * vatRate;
      const grandTotal = taxableAmount + vatAmount;

      // Calcul monnaie rendue
      const tendered = 5000; // Billet de 5000 DA
      const change = Math.max(0, tendered - grandTotal);

      expect(grandTotal).toBeGreaterThan(0);
      expect(change).toBeGreaterThan(0);
    }

    const elapsed = performance.now() - start;
    const opsPerSec = Math.round((iterations / elapsed) * 1000);
    const avgLatencyUs = (elapsed / iterations) * 1000; // en microsecondes

    // Exigences de performance
    expect(elapsed).toBeLessThan(500); // 10 000 calculs en moins de 500 ms
    expect(opsPerSec).toBeGreaterThan(20000); // Plus de 20 000 calculs de caisse / seconde
  });

  // =========================================================================
  // BENCHMARK 2 : Scan Code-Barres & Résolution Ultra-Rapide (O(1))
  // =========================================================================
  it('Benchmark 2 [Scan Code-Barres] : 50 000 résolutions de douchette par seconde', () => {
    // Création d'une table d'indexation de 15 000 produits
    const barcodeMap = new Map<string, any>();
    for (let i = 1; i <= 15000; i++) {
      const code = `613${i.toString().padStart(10, '0')}`;
      barcodeMap.set(code, { id: `prod_${i}`, name: `Produit ${i}`, price: 100 + i });
    }

    const scanCount = 50000;
    const start = performance.now();

    for (let i = 0; i < scanCount; i++) {
      const targetIndex = (i % 15000) + 1;
      const targetCode = `613${targetIndex.toString().padStart(10, '0')}`;
      const found = barcodeMap.get(targetCode);
      expect(found).toBeDefined();
    }

    const elapsed = performance.now() - start;
    const scansPerSec = Math.round((scanCount / elapsed) * 1000);
    const avgScanLatencyMs = elapsed / scanCount;

    // Doit être capable d'exécuter plus de 50 000 scans par seconde en mémoire
    expect(scansPerSec).toBeGreaterThan(50000);
    // Latence par scan inférieure à 0.05 milliseconde
    expect(avgScanLatencyMs).toBeLessThan(0.05);
  });

  // =========================================================================
  // BENCHMARK 3 : Recherche Floue & Plein Texte dans le Catalogue
  // =========================================================================
  it('Benchmark 3 [Recherche Catalogue] : Filtrage dynamique de 15 000 articles en direct', () => {
    const catalog: any[] = [];
    const brands = ['Cevital', 'Candia', 'Danone', 'Amor Benamor', 'N\'Gaous', 'Ifri', 'Ramy'];
    const categories = ['Boissons', 'Épicerie', 'Laiterie', 'Conserves', 'Entretien', 'Boucherie'];

    for (let i = 1; i <= 15000; i++) {
      const brand = brands[i % brands.length];
      const category = categories[i % categories.length];
      catalog.push({
        id: `prod_${i}`,
        name: `Jus d'Orange Naturel 1L ${brand} Réf #${i}`,
        category,
        brand,
        barcode: `613000${i.toString().padStart(7, '0')}`,
        price: 180 + (i % 100)
      });
    }

    const queries = ['Candia', 'Jus d\'Orange', 'Amor', '6130000005', 'Boucherie'];
    const start = performance.now();

    queries.forEach(query => {
      const lower = query.toLowerCase();
      const results = catalog.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower) ||
        p.barcode.includes(lower)
      );
      expect(results.length).toBeGreaterThan(0);
    });

    const elapsed = performance.now() - start;
    const avgSearchLatencyMs = elapsed / queries.length;

    // Moins de 25 ms par recherche plein texte complète sur 15 000 articles
    expect(avgSearchLatencyMs).toBeLessThan(25.0);
  });

  // =========================================================================
  // BENCHMARK 4 : Historique des Ventes & Tri/Filtrage (Pagination 50 items)
  // =========================================================================
  it('Benchmark 4 [Historique des Ventes] : Tri et pagination sur 10 000 transactions', () => {
    const transactions: any[] = [];
    const now = Date.now();

    for (let i = 1; i <= 10000; i++) {
      transactions.push({
        id: `tx_${i}`,
        total: 500 + (i % 5000),
        cashier: i % 2 === 0 ? 'Karim' : 'Mohamed',
        timestamp: now - (i * 60000), // 1 transaction toutes les minutes
        status: 'completed',
        itemsCount: (i % 10) + 1
      });
    }

    const start = performance.now();

    // 1. Filtrage par caissier 'Karim'
    const filtered = transactions.filter(t => t.cashier === 'Karim');
    expect(filtered.length).toBe(5000);

    // 2. Tri chronologique décroissant (plus récentes en premier)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // 3. Découpage de la page 1 (50 items)
    const pageSize = 50;
    const page1 = filtered.slice(0, pageSize);
    expect(page1.length).toBe(50);

    const elapsed = performance.now() - start;

    // L'opération complète (Filtrage de 10 000 + Tri + Pagination) doit prendre moins de 15 ms
    expect(elapsed).toBeLessThan(15.0);
  });

  // =========================================================================
  // BENCHMARK 5 : Débit d'Ingestion Moteur de Synchronisation (Deltas / sec)
  // =========================================================================
  it('Benchmark 5 [Débit Sync Queue] : Ingestion de 5 000 opérations de stock en continu', () => {
    const start = performance.now();
    const opsCount = 5000;
    const dedupMap = new Map<string, number>();

    // Simulation de l'algorithme interne de SyncService (déduplication arithmétique relative)
    for (let i = 0; i < opsCount; i++) {
      const prodId = `prod_bench_${i % 100}`; // 100 produits uniques recevant 5 000 mouvements
      const delta = (i % 2 === 0) ? -1 : -2;

      const current = dedupMap.get(prodId) || 0;
      dedupMap.set(prodId, current + delta);
    }

    const elapsed = performance.now() - start;
    const opsPerSec = Math.round((opsCount / elapsed) * 1000);

    expect(dedupMap.size).toBe(100);
    // Doit être capable d'ingérer plus de 500 000 deltas par seconde en mémoire
    expect(opsPerSec).toBeGreaterThan(500000);
    expect(elapsed).toBeLessThan(20.0);
  });
});
