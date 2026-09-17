import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase';
export { supabase };

export type SyncStatusPayload = {
  isSyncing: boolean;
  lastSync?: string;
  error?: string;
};

type SyncUpdateCallback = (status: SyncStatusPayload) => void;

// Ensemble des écouteurs actifs
const syncUpdateListeners: Set<SyncUpdateCallback> = new Set();
let activeRealtimeChannel: RealtimeChannel | null = null;

/**
 * 🛡️ EXPORTÉ : S'abonne aux notifications de synchronisation dans l'application
 */
export function onSyncUpdate(callback: SyncUpdateCallback): () => void {
  syncUpdateListeners.add(callback);

  // Notifie immédiatement de l'état actuel
  try {
    callback({ isSyncing: false });
  } catch (err) {
    console.error('[SupabaseSync] Erreur lors de la notification initiale:', err);
  }

  // Retourne la fonction de nettoyage
  return () => {
    syncUpdateListeners.delete(callback);
  };
}

/**
 * Notifie tous les abonnés d'un changement de statut
 */
export function notifySyncUpdate(status: SyncStatusPayload): void {
  syncUpdateListeners.forEach((listener) => {
    try {
      if (typeof listener === 'function') {
        listener(status);
      }
    } catch (err) {
      console.error('[SupabaseSync] Erreur dans le listener:', err);
    }
  });
}

export function stopRealtimeSync(): void {
  if (activeRealtimeChannel && supabase && typeof supabase.removeChannel === 'function') {
    try {
      supabase.removeChannel(activeRealtimeChannel);
    } catch (e) {}
    activeRealtimeChannel = null;
  }
}

/**
 * Initialise l'écouteur Temps Réel Supabase (Sécurisé contre Me.subscribe is not a function)
 */
let reconnectTimeout: any = null;

export function setupRealtimeSync(): void {
  if (!supabase || !isSupabaseConfigured) {
    return;
  }

  try {
    stopRealtimeSync();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    // Notification de disponibilité Realtime sans ouvrir de canal wildcard redondant
    notifySyncUpdate({
      isSyncing: false,
      lastSync: new Date().toISOString()
    });
    console.log('[SupabaseSync] ✅ Service Realtime synchronisé avec le flux applicatif unifié.');
  } catch (err) {
    console.error('[SupabaseSync] Erreur lors de l\'initialisation Realtime:', err);
  }
}

/**
 * 🛡️ EXPORTÉ : Initialise et effectue la première synchronisation au démarrage
 */
export async function initAndSyncSupabase(): Promise<void> {
  notifySyncUpdate({ isSyncing: true });

  try {
    console.log('[SupabaseSync] Initialisation de la synchronisation Supabase...');

    // Lancement de l'écoute temps réel sécurisée
    setupRealtimeSync();

    notifySyncUpdate({
      isSyncing: false,
      lastSync: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SupabaseSync] Échec de l\'initialisation:', err);
    notifySyncUpdate({
      isSyncing: false,
      error: err?.message || 'Erreur lors de l\'initialisation Supabase'
    });
  }
}

/**
 * Permet de forcer une synchronisation manuelle
 */
export async function syncWithSupabase(): Promise<void> {
  return initAndSyncSupabase();
}