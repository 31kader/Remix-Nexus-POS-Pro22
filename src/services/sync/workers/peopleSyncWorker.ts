import { supabase } from '../../../supabase';
import { TABLE_NAME_MAPPINGS } from '../../../lib/db-converters';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncPayload } from '../types';
import { 
  sanitizePayloadForSupabase, 
  isAuthOrPermissionError, 
  isTableMissingError, 
  ADMIN_RESTRICTED_SYNC_TABLES 
} from '../syncSanitizer';
import { SyncContextRefs } from './productSyncWorker';

/**
 * 👥 Traitement des entités parentes (Réglages, Catégories, Marques, Fournisseurs, Utilisateurs, Employés, Cartons)
 */
export async function processParentEntities(
  queue: SyncPayload[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs,
  hasActiveSupabaseSession: boolean
): Promise<void> {
  const parentTables = ['settings', 'categories', 'brands', 'suppliers', 'users', 'employees'];
  const parentItems = queue.filter(item => {
    const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
    return parentTables.includes(targetTable) && item.action !== 'DELETE';
  });

  for (const item of parentItems) {
    const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
    if (ADMIN_RESTRICTED_SYNC_TABLES.has(targetTable) && !hasActiveSupabaseSession) {
      refs.hadAuthOrPermissionError = true;
      continue;
    }
    try {
      const rawParentPayload = (item.payload && typeof item.payload === 'object' && !item.payload.id && item.recordId)
        ? { ...item.payload, id: item.recordId }
        : item.payload;
      const payload = sanitizePayloadForSupabase(targetTable, rawParentPayload, item.recordId);
      if (!payload.id && item.recordId) payload.id = item.recordId;

      if (targetTable === 'users') {
        delete (payload as any).employeeId;
        delete (payload as any).employee_id;

        let existingId: string | null = null;
        try {
          if (payload.email) {
            const { data: existingUser } = await supabase.from('users').select('id').eq('email', payload.email).maybeSingle();
            if (existingUser?.id) {
              existingId = existingUser.id;
              payload.id = existingUser.id;
            }
          }
          if (!existingId && payload.uid) {
            const { data: existingUser } = await supabase.from('users').select('id').eq('uid', payload.uid).maybeSingle();
            if (existingUser?.id) {
              existingId = existingUser.id;
              payload.id = existingUser.id;
            }
          }
        } catch (_) {}

        if (existingId) {
          const updatePayload = { ...payload };
          delete updatePayload.id;
          const updateRes = await supabase.from('users').update(updatePayload).eq('id', existingId);
          if (!updateRes.error) {
            const parentKey = `${item.table}:${item.recordId || payload.id}`;
            completedKeys.add(parentKey);
            if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
            if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
            processedSnapshots.set(parentKey, { opId: item.opId });
            updateProgress(targetTable);
            continue;
          } else if (isAuthOrPermissionError(updateRes.error)) {
            console.warn(`[SyncService] Écriture users réservée aux administrateurs (401/403). Compte synchronisé conservé.`);
            const parentKey = `${item.table}:${item.recordId || payload.id}`;
            completedKeys.add(parentKey);
            if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
            if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
            processedSnapshots.set(parentKey, { opId: item.opId });
            updateProgress(targetTable);
            continue;
          }
        }
      }

      // 🛡️ Élimination des collisions 409 / 403 : UPDATE direct pour les réglages (settings) sans SELECT préliminaire
      if (targetTable === 'settings' && (payload.id || item.recordId)) {
        const settingsId = payload.id || item.recordId;
        const updatePayload = { ...payload };
        delete updatePayload.id;
        delete updatePayload.created_at;
        const updateRes = await supabase.from('settings').update(updatePayload).eq('id', settingsId);
        if (!updateRes.error) {
          const parentKey = `${item.table}:${item.recordId || payload.id}`;
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        } else if (isAuthOrPermissionError(updateRes.error)) {
          console.warn(`[SyncService] Écriture settings réservée aux administrateurs (401/403). Réglage conservé localement.`);
          const parentKey = `${item.table}:${item.recordId || payload.id}`;
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        }
      }

      // 🛡️ Élimination des collisions 409 / 403 : UPDATE direct pour les employés existants sans SELECT préliminaire
      if (targetTable === 'employees' && (payload.id || item.recordId)) {
        const empId = payload.id || item.recordId;
        const updatePayload = { ...payload };
        delete updatePayload.id;
        delete updatePayload.created_at;
        const updateRes = await supabase.from('employees').update(updatePayload).eq('id', empId);
        if (!updateRes.error) {
          const parentKey = `${item.table}:${item.recordId || payload.id}`;
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        } else if (isAuthOrPermissionError(updateRes.error)) {
          console.warn(`[SyncService] Écriture employees réservée aux administrateurs (401/403). Fiche conservée localement.`);
          const parentKey = `${item.table}:${item.recordId || payload.id}`;
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        }
      }

      // 🛡️ Fonction utilitaire de validation de synchro d'une entité parente
      const parentKey = `${item.table}:${item.recordId || payload.id}`;
      const markParentCompleted = () => {
        completedKeys.add(parentKey);
        if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
        if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
        processedSnapshots.set(parentKey, { opId: item.opId });
        updateProgress(targetTable);
      };

      // 🛡️ Élimination des collisions 409 : UPDATE direct pour les fournisseurs existants
      if (targetTable === 'suppliers' && (payload.id || item.recordId)) {
        const supplierId = payload.id || item.recordId;
        let existingId: string | null = null;
        try {
          if (supplierId) {
            const { data: existingSupplier } = await supabase.from('suppliers').select('id').eq('id', supplierId).maybeSingle();
            if (existingSupplier?.id) existingId = existingSupplier.id;
          }
          if (!existingId && payload.name) {
            const { data: existingByName } = await supabase.from('suppliers').select('id').ilike('name', String(payload.name).trim()).maybeSingle();
            if (existingByName?.id) existingId = existingByName.id;
          }
        } catch (_) {}

        if (existingId) {
          const updatePayload = { ...payload };
          delete updatePayload.id;
          delete updatePayload.created_at;
          const updateRes = await supabase.from('suppliers').update(updatePayload).eq('id', existingId);
          if (!updateRes.error) {
            markParentCompleted();
            continue;
          }
        } else {
          // Nouveau fournisseur : tentative d'insertion directe
          const { error: insErr } = await supabase.from('suppliers').insert(payload);
          if (!insErr) {
            markParentCompleted();
            continue;
          } else if (String(insErr?.message || insErr?.code || '').includes('409') || insErr?.code === '23505') {
            // Collision d'unicité détectée : repli immédiat en UPDATE
            if (payload.name) {
              const updatePayload = { ...payload };
              delete updatePayload.id;
              delete updatePayload.created_at;
              await supabase.from('suppliers').update(updatePayload).ilike('name', String(payload.name).trim());
            }
            markParentCompleted();
            continue;
          }
        }
      }

      // 🛡️ Élimination des collisions 409 : UPDATE direct pour les catégories et marques existantes
      if ((targetTable === 'categories' || targetTable === 'brands') && (payload.id || item.recordId)) {
        const entityId = payload.id || item.recordId;
        let existingId: string | null = null;
        try {
          const { data: existingEntity } = await supabase.from(targetTable).select('id').eq('id', entityId).maybeSingle();
          if (existingEntity?.id) {
            existingId = existingEntity.id;
          } else if (payload.name) {
            const { data: existingByName } = await supabase.from(targetTable).select('id').ilike('name', String(payload.name).trim()).maybeSingle();
            if (existingByName?.id) existingId = existingByName.id;
          }
        } catch (_) {}

        if (existingId) {
          const updatePayload = { ...payload };
          delete updatePayload.id;
          delete updatePayload.created_at;
          const updateRes = await supabase.from(targetTable).update(updatePayload).eq('id', existingId);
          if (!updateRes.error) {
            markParentCompleted();
            continue;
          }
        }
      }

      let res = await supabase.from(targetTable).upsert(payload, { onConflict: 'id' });

      if (!res?.error) {
        markParentCompleted();
      } else if (isAuthOrPermissionError(res.error)) {
        refs.hadAuthOrPermissionError = true;
        console.warn(`[SyncService] Accès refusé ou session requise (401/403) sur ${targetTable}. En attente de session.`);
        break;
      } else if (isTableMissingError(res.error)) {
        console.warn(`[SyncService] Table distante inexistante sur Supabase pour ${targetTable} (404/PGRST), retrait de la file.`);
        markParentCompleted();
      } else if (isNetworkOrTimeoutError(res.error)) {
        refs.hadNetworkError = true;
        break;
      } else {
        let recovered = false;
        if (payload.id) {
          const updatePayload = { ...payload };
          delete updatePayload.id;
          delete updatePayload.created_at;
          const { error: updErr } = await supabase.from(targetTable).update(updatePayload).eq('id', payload.id);
          if (!updErr || isTableMissingError(updErr)) {
            recovered = true;
            markParentCompleted();
          } else if (isNetworkOrTimeoutError(updErr)) {
            refs.hadNetworkError = true;
          }
        }

        if (!recovered && targetTable === 'suppliers' && payload.name) {
          try {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            delete updatePayload.created_at;
            const { error: updErr } = await supabase.from('suppliers').update(updatePayload).ilike('name', String(payload.name).trim());
            if (!updErr) recovered = true;
            else if (isNetworkOrTimeoutError(updErr)) refs.hadNetworkError = true;
          } catch (_) {}
          if (recovered) {
            markParentCompleted();
          }
        }

        if (!recovered && targetTable === 'users') {
          if (payload.uid) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            const { error: updErr } = await supabase.from('users').update(updatePayload).eq('uid', payload.uid);
            if (!updErr) recovered = true;
            else if (isNetworkOrTimeoutError(updErr)) refs.hadNetworkError = true;
          }
          if (!recovered && payload.email) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            const { error: updErr } = await supabase.from('users').update(updatePayload).eq('email', payload.email);
            if (!updErr) recovered = true;
            else if (isNetworkOrTimeoutError(updErr)) refs.hadNetworkError = true;
          }
          if (recovered) {
            markParentCompleted();
          }
        }
      }
    } catch (pErr) {
      if (isTableMissingError(pErr)) {
        const parentKey = `${item.table}:${item.recordId || item.payload?.id}`;
        completedKeys.add(parentKey);
        if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
        processedSnapshots.set(parentKey, { opId: item.opId });
        updateProgress(item.table);
      } else if (isNetworkOrTimeoutError(pErr)) {
        refs.hadNetworkError = true;
      } else {
        console.warn(`[SyncService] Parent upsert on ${item.table} error:`, pErr);
      }
    }
  }
}

// Réexportation transparente du worker de synchronisation des soldes clients
export { processCustomerBalances } from './customerBalanceSyncWorker';
