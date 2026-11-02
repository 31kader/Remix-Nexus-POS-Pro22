import { GoodsReceiptNote } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { enqueueSync } from '../../services/SyncService';
import { convertKeysToCamel } from '../../lib/db-converters';

export async function fetchGrnsFromDatabase(): Promise<GoodsReceiptNote[]> {
  let combinedGrns: GoodsReceiptNote[] = [];
  let remoteRows: any[] = [];

  // 1. Fetch from Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('goods_receipt_notes')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        remoteRows = data;
        combinedGrns = data.map((item: any) => {
          if (typeof item.items === 'string') {
            try { item.items = JSON.parse(item.items); } catch(e) {}
          }
          return convertKeysToCamel(item) as GoodsReceiptNote;
        });
      }
    } catch (sErr) {
      console.warn('[Supabase GRN Fetch Error]', sErr);
    }
  }

  // 2. Fetch localDb snapshot
  const snapshot = await localDb.get('goodsReceiptNotes');
  let localList: GoodsReceiptNote[] = [];
  if (snapshot.exists()) {
    const grnsData = snapshot.val() || {};
    localList = Object.keys(grnsData).map(id => ({ id, ...grnsData[id] } as GoodsReceiptNote));
    
    // Merge without duplicates
    const map = new Map<string, GoodsReceiptNote>();
    combinedGrns.forEach(g => map.set(g.id, g));
    localList.forEach(g => map.set(g.id, { ...map.get(g.id), ...g }));
    combinedGrns = Array.from(map.values());
  }

  // 3. Auto-backfill: Si des bons existent localement mais pas dans Supabase, les synchroniser
  if (isSupabaseConfigured && localList.length > 0) {
    const remoteIds = new Set(remoteRows.map((d: any) => d.id));
    const missingFromRemote = localList.filter(l => l.id && !remoteIds.has(l.id));
    if (missingFromRemote.length > 0) {
      const backfillPayloads = missingFromRemote.map(g => ({
        id: g.id,
        supplier_id: g.supplierId || null,
        date: g.date || new Date().toISOString(),
        items: g.items || [],
        global_discount: Number(g.globalDiscount) || 0,
        global_vat: Number(g.globalVat) || 0,
        status: g.status || 'draft'
      }));
      supabase.from('goods_receipt_notes').upsert(backfillPayloads, { onConflict: 'id' })
        .then((res: any) => {
          const bErr = res?.error;
          if (bErr) {
            console.warn('[Supabase GRN Auto-Backfill Error]', bErr);
          } else {
            console.log(`[Supabase GRN Auto-Backfill] ${backfillPayloads.length} bon(s) synchronisé(s) vers Supabase.`);
          }
        })
        .catch(() => {});
    }
  }

  combinedGrns.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  return combinedGrns;
}

export async function saveGrnRecord(grnRecord: GoodsReceiptNote, nowIso: string) {
  await localDb.insert(`goodsReceiptNotes/${grnRecord.id}`, grnRecord);

  if (isSupabaseConfigured) {
    try {
      const supabasePayload = {
        id: grnRecord.id,
        supplier_id: grnRecord.supplierId || null,
        date: nowIso,
        items: grnRecord.items || [],
        global_discount: Number(grnRecord.globalDiscount) || 0,
        global_vat: Number(grnRecord.globalVat) || 0,
        status: grnRecord.status || 'draft'
      };
      const { error: sbErr } = await supabase.from('goods_receipt_notes').upsert(supabasePayload, { onConflict: 'id' });
      if (sbErr) {
        console.warn('[Supabase GRN Insert Error]', sbErr);
        enqueueSync('goods_receipt_notes', grnRecord.id, 'UPSERT', supabasePayload);
      }
    } catch (sErr) {
      console.warn('[Supabase GRN Insert Exception]', sErr);
    }
  }
}

export async function validateGrnRecord(grnId: string) {
  await localDb.update(`goodsReceiptNotes/${grnId}`, { status: 'validated' });

  if (isSupabaseConfigured) {
    try {
      const { error: updErr } = await supabase.from('goods_receipt_notes').update({ status: 'validated' }).eq('id', grnId);
      if (updErr) {
        console.warn('[Supabase GRN Update Error]', updErr);
        enqueueSync('goods_receipt_notes', grnId, 'UPSERT', { id: grnId, status: 'validated' });
      }
    } catch (sErr) {
      console.warn('[Supabase GRN Update Error]', sErr);
    }
  }
}
