import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SocketProvider } from './context/SocketContext.tsx';
import { LanguageProvider } from './translations.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, isSupabaseConfigured } from './supabase';
import { auth } from './services/AuthService';
import { localDb } from './services/LocalDatabase';
import { initAndSyncSupabase } from './services/SupabaseSync';
import { loadInitialState } from './lib/local-db';
import { loadPendingSyncQueue } from './services/SyncService';

// --- INITIALISATION DU MOTEUR DE DONNÉES (Fix Infinite Loop) ---
async function bootstrap() {
  if (typeof window === 'undefined') return;

  await loadInitialState();
  await loadPendingSyncQueue();

  if (isSupabaseConfigured) {
    // 1. Charger la catégorie par défaut
    localDb.insert('categories/uncategorized', { id: 'uncategorized', name: 'Sans catégorie', level: 1 })
      .catch(() => {});

    let lastUserId: string | null = null;
    let initialSyncDone = false;

    // 2. Écouteur d'authentification Supabase
    supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (session?.user) {
        const currentUserId = session.user.id;
        auth.trigger({
          uid: currentUserId,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null
        });

        if (currentUserId !== lastUserId || !initialSyncDone) {
          lastUserId = currentUserId;
          initialSyncDone = true;
          initAndSyncSupabase().catch(err => console.warn("Sync error:", err));
        }
      } else {
        auth.trigger(null);
        if (lastUserId !== null || !initialSyncDone) {
          lastUserId = null;
          initialSyncDone = true;
          initAndSyncSupabase();
        }
      }
    });
  }
}

// Lancement immédiat
bootstrap();

// Handle Capacitor deep links (OAuth redirects)
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    // 1. Fermer le navigateur externe immédiatement
    await Browser.close();

    // 2. Analyser l'URL de retour
    if (url.includes('access_token=')) {
      const urlParts = url.split('#');
      if (urlParts.length > 1) {
        const params = new URLSearchParams(urlParts[1]);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          // 3. Injecter manuellement la session dans Supabase
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (!error) {
            window.location.href = window.location.origin;
            return;
          }
        }
      }
    }

    // Fallback standard
    const sessionUrl = url.replace('com.nexus.pos.pro://login', window.location.origin);
    window.location.href = sessionUrl;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SocketProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </SocketProvider>
    </ErrorBoundary>
  </StrictMode>,
);
