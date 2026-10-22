import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERREUR: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  durationMs: number;
  message: string;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const msg = await fn();
    const duration = Date.now() - start;
    results.push({
      category,
      name,
      status: 'PASS',
      durationMs: duration,
      message: msg || 'OK'
    });
  } catch (err: any) {
    const duration = Date.now() - start;
    const isWarn = err?.isWarning === true;
    results.push({
      category,
      name,
      status: isWarn ? 'WARN' : 'FAIL',
      durationMs: duration,
      message: err?.message || String(err)
    });
  }
}

async function main() {
  console.log(`\n======================================================================`);
  console.log(`🚀 NEXUS POS PRO — TEST D'INTÉGRITÉ LIVE SUPABASE (SANS MOCK)`);
  console.log(`   URL Cible : ${SUPABASE_URL}`);
  console.log(`   Date      : ${new Date().toISOString()}`);
  console.log(`======================================================================\n`);

  // -------------------------------------------------------------------------
  // 1. TEST DE CONNECTIVITÉ GÉNÉRALE
  // -------------------------------------------------------------------------
  await runTest('CONNECTIVITÉ', 'Ping Supabase Cloud', async () => {
    const { data, error, status } = await supabase.from('settings').select('id').limit(1);
    if (error && status >= 500) throw new Error(`Serveur injoignable (${status}): ${error.message}`);
    return `Réponse HTTP ${status || 200}`;
  });

  // -------------------------------------------------------------------------
  // 2. TEST DES FONCTIONS RPC CRITIQUES
  // -------------------------------------------------------------------------
  
  // A. adjust_customer_balance avec 5 arguments (avec p_idempotency_key)
  await runTest('RPC', 'adjust_customer_balance (5 params avec idempotence)', async () => {
    // 1. Récupérer un client existant pour le test
    const { data: custs } = await supabase.from('customers').select('id, balance').limit(1);
    if (!custs || custs.length === 0) {
      throw { message: 'Aucun client disponible dans la base pour le test', isWarning: true };
    }
    const testCustId = custs[0].id;
    const testKey = `test_live_check_${Date.now()}`;

    // Appel avec 5 paramètres et delta = 0 (sans altérer les données financières)
    const { data, error, status } = await supabase.rpc('adjust_customer_balance', {
      p_id: String(testCustId),
      delta_balance: 0,
      delta_spent: 0,
      delta_points: 0,
      p_idempotency_key: testKey
    });

    if (error) {
      throw new Error(`Échec RPC 5 params (HTTP ${status || 'ERR'}): [${error.code}] ${error.message}`);
    }

    // 2. Tester l'idempotence : deuxième appel avec la MÊME clé doit retourner idempotent: true
    const { data: data2, error: err2 } = await supabase.rpc('adjust_customer_balance', {
      p_id: String(testCustId),
      delta_balance: 0,
      delta_spent: 0,
      delta_points: 0,
      p_idempotency_key: testKey
    });

    if (err2) {
      throw new Error(`Échec RPC test idempotence : [${err2.code}] ${err2.message}`);
    }

    if (data2?.idempotent !== true) {
      throw new Error(`L'idempotence n'a pas retourné idempotent=true au 2ème appel`);
    }

    return `Succès (HTTP ${status || 200}) — Idempotence validée`;
  });

  // B. adjust_customer_balance avec 4 arguments (signature classique rétrocompatible)
  await runTest('RPC', 'adjust_customer_balance (4 params rétrocompatibles)', async () => {
    const { data: custs } = await supabase.from('customers').select('id').limit(1);
    if (!custs || custs.length === 0) return 'Ignoré (aucun client)';
    const testCustId = custs[0].id;

    const { data, error, status } = await supabase.rpc('adjust_customer_balance', {
      p_id: String(testCustId),
      delta_balance: 0,
      delta_spent: 0,
      delta_points: 0
    });

    if (error) {
      throw new Error(`Échec RPC 4 params (HTTP ${status}): [${error.code}] ${error.message}`);
    }
    return `Succès (HTTP ${status || 200})`;
  });

  // C. apply_stock_adjustment (8 arguments)
  await runTest('RPC', 'apply_stock_adjustment (8 params atomiques)', async () => {
    const { data: prods } = await supabase.from('products').select('id').limit(1);
    if (!prods || prods.length === 0) {
      throw { message: 'Aucun produit disponible pour le test', isWarning: true };
    }
    const testProdId = prods[0].id;

    // Appel avec p_mode = 'delta' et p_value = 0 (exactement comme dans SyncService.ts)
    const { data, error, status } = await supabase.rpc('apply_stock_adjustment', {
      p_id: String(testProdId),
      p_value: 0,
      p_mode: 'delta',
      p_adj_id: `test_live_adj_${Date.now()}`,
      p_reason: 'Live Integrity Check',
      p_user_id: 'live_test',
      p_user_name: 'Système Test',
      p_is_loss: false
    });

    if (error) {
      throw new Error(`Échec apply_stock_adjustment (HTTP ${status}): [${error.code}] ${error.message}`);
    }
    return `Succès (HTTP ${status || 200})`;
  });

  // D. adjust_product_stock (2 arguments legacy)
  await runTest('RPC', 'adjust_product_stock (2 params delta legacy)', async () => {
    const { data: prods } = await supabase.from('products').select('id').limit(1);
    if (!prods || prods.length === 0) return 'Ignoré';
    const testProdId = prods[0].id;

    const { data, error, status } = await supabase.rpc('adjust_product_stock', {
      p_id: String(testProdId),
      delta: 0
    });

    if (error) {
      throw new Error(`Échec adjust_product_stock (HTTP ${status}): [${error.code}] ${error.message}`);
    }
    return `Succès (HTTP ${status || 200})`;
  });

  // -------------------------------------------------------------------------
  // 3. TEST DE DISPONIBILITÉ ET DROITS DES TABLES PRINCIPALES (RÔLE ANON)
  // -------------------------------------------------------------------------
  const tablesToTest = [
    'products',
    'customers',
    'transactions',
    'online_orders',
    'cash_shifts',
    'goods_receipt_notes',
    'purchases',
    'settings',
    'categories',
    'brands',
    'promotions',
    'suppliers',
    'damaged_items',
    'invoice_patterns',
    'customer_balance_adjustments',
    'employees',
    'users',
    'shortage_items',
    'custom_replenishment_lists'
  ];

  for (const table of tablesToTest) {
    await runTest('TABLES', `Table '${table}' — Accès API & RLS`, async () => {
      const { data, error, status } = await supabase.from(table).select('*').limit(1);
      if (error) {
        // Si l'erreur est 404, la table n'existe pas
        if (status === 404 || error.code === '42P01') {
          throw new Error(`Table introuvable en DB (404 / 42P01)`);
        }
        // Si l'erreur est 401/403 (RLS interdit au rôle anon mais table existante)
        if (status === 401 || status === 403 || error.code === '42501') {
          return `Protégée par RLS (${error.code || status} - Attendu pour tables sécurisées)`;
        }
        throw new Error(`Erreur [${error.code}]: ${error.message}`);
      }
      return `Accessible (HTTP ${status || 200}, ${(data || []).length} entrée vue)`;
    });
  }

  // -------------------------------------------------------------------------
  // 4. TEST D'INSERTION ET SUPPRESSION TRANSACTIONNELLE RÉELLE
  // -------------------------------------------------------------------------
  await runTest('TRANSACTIONS', 'Émission transaction test & nettoyage', async () => {
    const testTxId = `test_health_${Date.now()}`;
    const txPayload = {
      id: testTxId,
      total: 0,
      payment_method: 'cash',
      delivery_method: 'in_store',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'completed',
      customer_name: 'Live Health Check System',
      items: []
    };

    const { error: insErr, status: insStatus } = await supabase.from('transactions').insert(txPayload);
    if (insErr) {
      // Si RLS bloque l'insert direct anon (nécessite token staff)
      if (insStatus === 401 || insStatus === 403 || insErr.code === '42501') {
        return `Insert restreint aux rôles staff authentifiés (Conforme RLS)`;
      }
      throw new Error(`Insert rejeté (${insStatus}): [${insErr.code}] ${insErr.message}`);
    }

    // Nettoyage immédiat
    await supabase.from('transactions').delete().eq('id', testTxId);
    return `Insert & Delete test réussis (HTTP ${insStatus || 200})`;
  });

  // -------------------------------------------------------------------------
  // 5. RAPPORT ET SYNTHÈSE
  // -------------------------------------------------------------------------
  console.log(`\n======================================================================`);
  console.log(`📊 SYNTHÈSE DU TEST D'INTÉGRITÉ LIVE SUPABASE`);
  console.log(`======================================================================\n`);

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const r of results) {
    let icon = '✅';
    if (r.status === 'WARN') { icon = '⚠️ '; warnCount++; }
    else if (r.status === 'FAIL') { icon = '❌'; failCount++; }
    else { passCount++; }

    console.log(`${icon} [${r.category.padEnd(12)}] ${r.name.padEnd(45)} | ${r.durationMs}ms | ${r.message}`);
  }

  console.log(`\n----------------------------------------------------------------------`);
  console.log(`RÉSULTAT FINAL : ${passCount} Validés | ${warnCount} Avertissements | ${failCount} Échecs`);
  console.log(`----------------------------------------------------------------------\n`);

  if (failCount > 0) {
    console.error(`❌ ÉCHEC : ${failCount} anomalie(s) détectée(s) sur le serveur Supabase réel.`);
    process.exit(1);
  } else {
    console.log(`🎉 SUCCÈS TOTAL : Aucune anomalie 404, 403 bloquante ou décalage de signature !`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
