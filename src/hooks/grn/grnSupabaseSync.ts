import { supabase, isSupabaseConfigured } from '../../supabase';
import { localDb } from '../../services/LocalDatabase';
import { GoodsReceiptNote } from '../../types';
import { toast } from 'sonner';

export async function executeSyncGrnsToSupabase(
  currentGrns: GoodsReceiptNote[],
  refreshGrns: () => Promise<void>
) {
  if (!isSupabaseConfigured) {
    toast.error("Supabase n'est pas configuré.");
    return;
  }

  try {
    const snapshot = await localDb.get('goodsReceiptNotes');
    const grnsData = snapshot.exists() ? snapshot.val() || {} : {};
    const localList: GoodsReceiptNote[] = Object.keys(grnsData).map(id => ({ id, ...grnsData[id] }));

    const allMap = new Map<string, GoodsReceiptNote>();
    currentGrns.forEach(g => allMap.set(g.id, g));
    localList.forEach(g => allMap.set(g.id, { ...allMap.get(g.id), ...g }));
    const allGrns = Array.from(allMap.values());

    if (allGrns.length === 0) {
      toast.info("Aucun bon de réception à synchroniser.");
      return;
    }

    const payloads = allGrns.map(g => ({
      id: g.id,
      supplier_id: g.supplierId || null,
      date: g.date || new Date().toISOString(),
      items: g.items || [],
      global_discount: Number(g.globalDiscount) || 0,
      global_vat: Number(g.globalVat) || 0,
      status: g.status || 'draft'
    }));

    const { error } = await supabase.from('goods_receipt_notes').upsert(payloads, { onConflict: 'id' });
    if (error) {
      console.error('[Supabase GRN Sync Error]', error);
      toast.error("Erreur de synchronisation : " + (error.message || "Erreur"));
    } else {
      toast.success(`${payloads.length} bon(s) de réception synchronisé(s) vers Supabase !`);
      await refreshGrns();
    }
  } catch (err: any) {
    console.error('[Supabase GRN Sync Exception]', err);
    toast.error("Erreur inattendue : " + (err?.message || "Erreur inconnue"));
  }
}
