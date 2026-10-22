import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';

// 🛡️ Initialisation précoce du monitoring Sentry (actif si VITE_SENTRY_DSN est configuré)
initSentry();
import { SocketProvider } from './context/SocketContext.tsx';
import { LanguageProvider } from './translations.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, isSupabaseConfigured } from './supabase';
import { auth } from './services/AuthService';
import { localDb } from './services/LocalDatabase';
import { initAndSyncSupabase } from './services/SupabaseSync';
import { loadInitialState, setLocalState } from './lib/local-db';
import { loadPendingSyncQueue } from './services/SyncService';
import { APP_CONFIG } from './config/appConfig';

import { useAuthStore } from './store/useAuthStore';
import { processSyncQueue } from './services/SyncService';

export const isOAuthPopup = typeof window !== 'undefined' && (
  window.name === 'google_auth' ||
  (window.name && window.name.includes('google_auth')) ||
  Boolean(window.opener && window.opener !== window && (
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token=') ||
    window.location.search.includes('error=') ||
    window.location.search.includes('error_description=')
  ))
);

// --- INITIALISATION DU MOTEUR DE DONNÉES (Fix Infinite Loop) ---
async function bootstrap() {
  if (typeof window === 'undefined') return;

  // 🔄 Rafraîchissement automatique des caches statiques (ServiceWorker / CacheStorage) lors d'une montée de version (Android APK / Web / Electron) sans toucher à IndexedDB
  try {
    const lastVer = localStorage.getItem('nexus_installed_version');
    if (lastVer !== APP_CONFIG.version) {
      localStorage.setItem('nexus_installed_version', APP_CONFIG.version);
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.update().catch(() => {})));
      }
    }
  } catch (_) {}

  await loadInitialState();
  await loadPendingSyncQueue();

  if (isSupabaseConfigured) {
    // 🛡️ DÉTECTION GLOBALE DU RETOUR OAUTH SUPABASE (PKCE Code, Tokens ou Erreur)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashClean = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hashClean);

      const oauthError = urlParams.get('error_description') || urlParams.get('error') || hashParams.get('error_description') || hashParams.get('error');
      const pkceCode = urlParams.get('code') || hashParams.get('code');
      const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');

      if (oauthError) {
        const decoded = decodeURIComponent(oauthError.replace(/\+/g, ' '));
        console.warn('[OAuth] Erreur Google/Supabase reçue :', decoded);
        useAuthStore.getState().setAuthError(decoded);
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('nexus_oauth_channel');
            bc.postMessage({ type: 'nexus_oauth_error', error: decoded });
            bc.close();
          } catch (_) {}
        }
        if (window.opener && window.opener !== window) {
          try { window.opener.postMessage({ type: 'nexus_oauth_error', error: decoded }, window.location.origin); } catch (_) {}
        }
        window.history.replaceState(null, '', window.location.pathname);
        if (isOAuthPopup) {
          try { window.close(); } catch (_) {}
          return;
        }
      } else if (pkceCode) {
        console.log('[OAuth] Code PKCE détecté, vérification et échange de session...');
        let establishedSession: any = null;
        try {
          // Vérifier d'abord si une session valide a déjà été détectée/échangée par Supabase
          const { data: currentSess } = await supabase.auth.getSession();
          if (currentSess?.session) {
            establishedSession = currentSess.session;
          } else {
            const { data: sessData, error: exErr } = await supabase.auth.exchangeCodeForSession(pkceCode);
            if (!exErr && sessData?.session) {
              establishedSession = sessData.session;
            } else if (exErr) {
              const { data: retrySess } = await supabase.auth.getSession();
              if (retrySess?.session) {
                establishedSession = retrySess.session;
              } else {
                console.warn('[OAuth] Échec échange code PKCE :', exErr.message);
                useAuthStore.getState().setAuthError(exErr.message);
              }
            }
          }
        } catch (exchangeErr: any) {
          console.warn('[OAuth] Erreur pendant échange code:', exchangeErr);
        }

        if (establishedSession) {
          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const bc = new BroadcastChannel('nexus_oauth_channel');
              bc.postMessage({ type: 'nexus_oauth_success', session: establishedSession });
              bc.close();
            } catch (_) {}
          }
          if (window.opener && window.opener !== window) {
            try { window.opener.postMessage({ type: 'nexus_oauth_success', session: establishedSession }, window.location.origin); } catch (_) {}
          }
        }
        window.history.replaceState(null, '', window.location.pathname);
        if (isOAuthPopup) {
          try { window.close(); } catch (_) {}
          return;
        }
      } else if (accessToken && refreshToken) {
        console.log('[OAuth] Tokens reçus, enregistrement de session...');
        let establishedSession: any = null;
        try {
          const { data: sessData, error: sErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (!sErr && sessData?.session) {
            establishedSession = sessData.session;
          }
        } catch (tokenErr) {
          console.warn('[OAuth] Erreur setSession:', tokenErr);
        }

        if (establishedSession) {
          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const bc = new BroadcastChannel('nexus_oauth_channel');
              bc.postMessage({ type: 'nexus_oauth_success', session: establishedSession });
              bc.close();
            } catch (_) {}
          }
          if (window.opener && window.opener !== window) {
            try { window.opener.postMessage({ type: 'nexus_oauth_success', session: establishedSession }, window.location.origin); } catch (_) {}
          }
        }
        window.history.replaceState(null, '', window.location.pathname);
        if (isOAuthPopup) {
          try { window.close(); } catch (_) {}
          return;
        }
      }
    } catch (oauthInitErr) {
      console.warn('[OAuth] Erreur inspection URL auth:', oauthInitErr);
    }

    // 1. Charger la catégorie par défaut en local sans polluer la file de synchro
    setLocalState('categories/uncategorized', { id: 'uncategorized', name: 'Sans catégorie', level: 1 });

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
          // Déclencher immédiatement la synchronisation de la file avec le nouveau jeton authentifié
          processSyncQueue().catch(() => {});
        }
      } else {
        const localSession = typeof window !== 'undefined' ? sessionStorage.getItem('nexus_auth_user') : null;
        if (!localSession) {
          auth.trigger(null);
        }
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
    try { await Browser.close(); } catch (_) {}

    if (!url) return;
    let pkceCode: string | null = null;
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let oauthError: string | null = null;

    try {
      const parsedUrl = new URL(url.replace('com.nexus.pos.pro://', 'http://localhost/'));
      pkceCode = parsedUrl.searchParams.get('code');
      oauthError = parsedUrl.searchParams.get('error_description') || parsedUrl.searchParams.get('error');

      if (parsedUrl.hash) {
        const hParams = new URLSearchParams(parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash);
        if (!pkceCode) pkceCode = hParams.get('code');
        if (!accessToken) accessToken = hParams.get('access_token');
        if (!refreshToken) refreshToken = hParams.get('refresh_token');
        if (!oauthError) oauthError = hParams.get('error_description') || hParams.get('error');
      }
    } catch (_) {}

    if (oauthError) {
      useAuthStore.getState().setAuthError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
      return;
    }

    if (pkceCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(pkceCode);
      if (!error) {
        window.location.href = window.location.origin;
        return;
      }
    } else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (!error) {
        window.location.href = window.location.origin;
        return;
      }
    }

    // Fallback standard
    const sessionUrl = url.replace('com.nexus.pos.pro://login', window.location.origin);
    window.location.href = sessionUrl;
  });

  // ⚡ GESTION DU CYCLE DE VIE ANDROID (T9) : Détection de la reprise au premier plan
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      window.dispatchEvent(new CustomEvent('app-foreground-resume'));
    }
  });
}

const rootElement = document.getElementById('root')!;

if (isOAuthPopup) {
  createRoot(rootElement).render(
    <div className="h-screen w-full flex items-center justify-center bg-[#05070a] text-slate-200 font-sans p-6 text-center select-none">
      <div className="flex flex-col items-center gap-4 max-w-sm p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-500" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-white">Connexion Google Validée</span>
          <span className="text-xs text-slate-400">Transmission de la session au terminal de caisse...</span>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="mt-2 px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
        >
          Fermer cette fenêtre
        </button>
      </div>
    </div>
  );
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <SocketProvider>
          <LanguageProvider>
            <App   />
          </LanguageProvider>
        </SocketProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
