import { supabase, isSupabaseConfigured } from '../../supabase';
import { Browser } from '@capacitor/browser';
import { auth, User } from './AuthEmulator';

export class GoogleAuthProvider {}
export const googleProvider = new GoogleAuthProvider();

function safeClosePopup(popup: Window | null) {
  try {
    if (popup && !popup.closed) {
      popup.close();
    }
  } catch (_) {}
}

export const signInWithPopup = async (...args: any[]) => {
  if (isSupabaseConfigured) {
    try {
      const isNative = (window as any).Capacitor?.isNativePlatform();

      if (isNative) {
        // SOLUTION ABSOLUE : Flux Supabase officiel avec le schéma custom d'URL pour Capacitor
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.nexus.pos.pro://login',
            skipBrowserRedirect: true
          }
        });

        if (error) throw error;

        if (data?.url) {
          await Browser.open({ url: data.url });
        }
        return { user: null };
      } else {
        // SUR WEB & ELECTRON : Flux OAuth robuste avec support popup et synchronisation temps réel
        const redirectUrl = window.location.origin;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            queryParams: { prompt: 'select_account' }
          }
        });
        if (error) throw error;

        if (data?.url) {
          const width = 600;
          const height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;

          let popup: Window | null = null;
          try {
            popup = window.open(
              data.url,
              'google_auth',
              `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
            );
          } catch (_) {
            popup = null;
          }

          if (!popup) {
            window.location.href = data.url;
            return { user: null };
          }

          return new Promise<{ user: User | null }>((resolve, reject) => {
            let resolved = false;
            let broadcastChannel: BroadcastChannel | null = null;
            let authSubscription: { unsubscribe: () => void } | null = null;
            let safetyTimeout: any = null;

            const cleanup = () => {
              if (safetyTimeout) clearTimeout(safetyTimeout);
              window.removeEventListener('message', handleMessage);
              window.removeEventListener('focus', handleWindowFocus);
              window.removeEventListener('storage', handleStorageEvent);
              if (broadcastChannel) {
                try { broadcastChannel.close(); } catch (_) {}
              }
              if (authSubscription) {
                try { authSubscription.unsubscribe(); } catch (_) {}
              }
            };

            const handleSuccess = async (sessionPayload?: any) => {
              if (resolved) return;
              resolved = true;
              cleanup();
              try {
                if (sessionPayload) {
                  await supabase.auth.setSession(sessionPayload);
                }
                const { data: sessData } = await supabase.auth.getSession();
                const u = sessData?.session?.user || sessionPayload?.user;
                if (u) {
                  const safeUser = {
                    uid: u.id,
                    email: u.email || null,
                    displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || null
                  };
                  auth.trigger(safeUser);
                  resolve({ user: auth.currentUser });
                  return;
                }
              } catch (_) {}
              resolve({ user: auth.currentUser });
            };

            const handleError = (errMsg: string) => {
              if (resolved) return;
              resolved = true;
              cleanup();
              reject(new Error(errMsg || "Échec de connexion Google"));
            };

            const handleMessage = (e: MessageEvent) => {
              if (e.origin && e.origin !== window.location.origin) return;
              if (e.data?.type === 'nexus_oauth_success') {
                handleSuccess(e.data?.session);
              } else if (e.data?.type === 'nexus_oauth_error') {
                handleError(e.data?.error);
              }
            };

            const handleStorageEvent = (e: StorageEvent) => {
              if (e.key === 'nexus_oauth_event' && e.newValue) {
                try {
                  const payload = JSON.parse(e.newValue);
                  if (payload?.session) {
                    handleSuccess(payload.session);
                  }
                } catch (_) {}
              }
            };

            window.addEventListener('message', handleMessage);
            window.addEventListener('storage', handleStorageEvent);

            if (typeof BroadcastChannel !== 'undefined') {
              try {
                broadcastChannel = new BroadcastChannel('nexus_oauth_channel');
                broadcastChannel.onmessage = (e) => {
                  if (e.data?.type === 'nexus_oauth_success') {
                    handleSuccess(e.data?.session);
                  } else if (e.data?.type === 'nexus_oauth_error') {
                    handleError(e.data?.error);
                  }
                };
              } catch (_) {}
            }

            try {
              const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
                if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
                  handleSuccess(session);
                }
              });
              authSubscription = authListener?.subscription || null;
            } catch (_) {}

            const handleWindowFocus = () => {
              setTimeout(async () => {
                if (resolved) return;
                try {
                  const { data: sessData } = await supabase.auth.getSession();
                  if (sessData?.session?.user) {
                    handleSuccess(sessData.session);
                  }
                } catch (_) {}
              }, 600);
            };

            window.addEventListener('focus', handleWindowFocus);

            safetyTimeout = setTimeout(() => {
              if (resolved) return;
              resolved = true;
              cleanup();
              safeClosePopup(popup);
              resolve({ user: null });
            }, 300000);
          });
        }
        return { user: null };
      }
    } catch (error: any) {
      if (error.message && error.message.includes("Popup login not supported")) {
        throw new Error("La connexion via popup (Google) n'est pas supportée dans cet environnement. Veuillez utiliser votre E-mail et Mot de passe à la place.");
      }
      throw error;
    }
  }
  throw new Error("Connexion par Google impossible : Supabase n'est pas configuré. Veuillez utiliser l'e-mail et le mot de passe.");
};
