/**
 * Nettoyage des anciennes clés de cache obsolètes dans localStorage
 */
export function cleanupLegacyStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    const legacyKeys = [
      'nexus_supabase_emulator_db',
      'sync_queue',
      'nexus_local_db_cache',
      'nexus_offline_sync_backup',
      'nexus_old_cache'
    ];
    legacyKeys.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (_) {}
}
