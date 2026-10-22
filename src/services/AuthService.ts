import { supabase, isSupabaseConfigured } from '../supabase';
import bcrypt from 'bcryptjs';
import { Browser } from '@capacitor/browser';
import {
  generateLocalId,
  convertKeysToCamel
} from '../lib/db-converters';
import {
  getLocalValue,
} from '../lib/local-db';
import { localDb } from './LocalDatabase';
import {
  initAndSyncSupabase,
} from './SupabaseSync';
import { toast } from 'sonner';

// ----------------- Auth Emulator & Interface -----------------

export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role?: string;
  employeeId?: string | null;
  isOffline?: boolean;
  providerData?: { email: string | null; [key: string]: any }[];
  getIdToken?: () => Promise<string>;
}

class AuthEmulator {
  currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('nexus_auth_user') || localStorage.getItem('nexus_auth_user');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          this.currentUser = {
            ...data,
            getIdToken: async () => {
              if (isSupabaseConfigured) {
                try {
                  const { data: sessData } = await supabase.auth.getSession();
                  if (sessData?.session?.access_token) {
                    return sessData.session.access_token;
                  }
                } catch (_) {}
              }
              return data.uid ? `offline_token_${data.uid}` : '';
            }
          };
          // Nettoyage legacy de localStorage
          localStorage.removeItem('nexus_auth_user');
        } catch (e) {}
      }
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    setTimeout(() => callback(this.currentUser), 0);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  trigger(user: any) {
    if (user) {
      const safeUserData: Record<string, any> = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null
      };
      const resolvedRole = user.role || (this.currentUser && this.currentUser.uid === user.uid ? this.currentUser.role : undefined);
      if (resolvedRole) {
        safeUserData.role = resolvedRole;
      }
      if (user.employeeId !== undefined) {
        safeUserData.employeeId = user.employeeId;
      }
      this.currentUser = {
        ...(safeUserData as User),
        getIdToken: async () => {
          if (isSupabaseConfigured) {
            try {
              const { data: sessData } = await supabase.auth.getSession();
              if (sessData?.session?.access_token) {
                return sessData.session.access_token;
              }
            } catch (_) {}
          }
          return safeUserData.uid ? `offline_token_${safeUserData.uid}` : '';
        }
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nexus_auth_user', JSON.stringify(safeUserData));
        localStorage.removeItem('nexus_auth_user');
      }
    } else {
      this.currentUser = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nexus_auth_user');
        localStorage.removeItem('nexus_auth_user');
      }
    }
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}

export const auth = new AuthEmulator();
if (typeof window !== 'undefined') {
  (window as any).auth = auth;
}

export function onAuthStateChanged(arg1: any, arg2?: any) {
  const callback = typeof arg1 === 'function' ? arg1 : arg2;
  const authInstance = typeof arg1 === 'function' ? auth : arg1;
  return (authInstance || auth).onAuthStateChanged(callback);
}

export class GoogleAuthProvider {}
export const googleProvider = new GoogleAuthProvider();

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
        // SUR WEB & ELECTRON : Flux OAuth robuste avec support popup et redirection automatique
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

          // La popup OAuth se ferme elle-même (main.tsx, isOAuthPopup). Appeler win.close() depuis
          // l'opener est bloqué par Cross-Origin-Opener-Policy (accounts.google.com) et ne produit
          // que l'avertissement "would block the window.close call" : on ne le fait donc plus.
          const safeClosePopup = (_win: Window | null) => {};

          if (!popup) {
            // Popup bloqué ou indisponible : basculer immédiatement en redirection directe
            window.location.href = data.url;
            return { user: null };
          }

          // Popup ouvert : attendre la transmission de session ou l'événement d'authentification
          return new Promise<{ user: User | null }>((resolve, reject) => {
            let resolved = false;
            let broadcastChannel: BroadcastChannel | null = null;
            let authSubscription: { unsubscribe: () => void } | null = null;
            let safetyTimeout: any = null;

            const cleanup = () => {
              if (safetyTimeout) clearTimeout(safetyTimeout);
              window.removeEventListener('message', handleMessage);
              window.removeEventListener('focus', handleWindowFocus);
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
              safeClosePopup(popup);
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
              safeClosePopup(popup);
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

            window.addEventListener('message', handleMessage);

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

            // Écouter les événements d'authentification Supabase (session injectée en tâche de fond)
            try {
              const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
                if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
                  handleSuccess(session);
                }
              });
              authSubscription = authListener?.subscription || null;
            } catch (_) {}

            // Détection sécurisée au retour de focus sans toucher popup.closed (élimine Cross-Origin-Opener-Policy)
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

            // Timeout de sécurité de 5 minutes
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

import { checkIsOwner, PRIMARY_OWNER_UID } from '../config/ownerConfig';

const ensureOwnerExists = async (cleanEmail: string, uid?: string, password?: string): Promise<any> => {
  if (!checkIsOwner(cleanEmail, uid)) return null;
  // Ne provisionne le compte local que sur validation préalable du mot de passe auprès de Supabase
  if (!password) return null;
  const users = getLocalValue('users') || {};
  let foundUser: any = Object.values(users).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
  if (!foundUser) {
    const employees = getLocalValue('employees') || {};
    foundUser = Object.values(employees).find((e: any) => e.email?.toLowerCase().trim() === cleanEmail);
  }
  const id = uid || PRIMARY_OWNER_UID || 'owner_admin_id';
  const passwordHash = bcrypt.hashSync(password, 10);
  const updatedUser = {
    ...(foundUser || {}),
    id,
    uid: id,
    email: cleanEmail,
    passwordHash,
    role: 'admin',
    displayName: foundUser?.displayName || 'Administrateur',
    joinDate: foundUser?.joinDate || new Date().toISOString()
  };
  await localDb.updateLocalOnly(`users/${id}`, updatedUser);
  return updatedUser;
};

export const signInWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
  const cleanEmail = email.toLowerCase().trim();

  const matchUserInList = (list: any[], identifier: string) => {
    if (!Array.isArray(list)) return null;
    const cleanId = (identifier || '').toLowerCase().trim();
    const cleanIdNoDomain = cleanId.endsWith('@nexus-pos.internal')
      ? cleanId.replace('@nexus-pos.internal', '')
      : (cleanId.includes('@') ? cleanId.split('@')[0] : cleanId);
    const cleanDigits = cleanIdNoDomain.replace(/\D/g, '');

    return list.find((u: any) => {
      if (!u) return false;
      const uEmail = (u.email || '').toLowerCase().trim();
      const uEmailNoDomain = uEmail.endsWith('@nexus-pos.internal')
        ? uEmail.replace('@nexus-pos.internal', '')
        : (uEmail.includes('@') ? uEmail.split('@')[0] : uEmail);
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const uName = (u.displayName || u.display_name || u.name || '').toLowerCase().trim();
      const uId = (u.id || u.uid || '').toLowerCase().trim();

      return uEmail === cleanId ||
             (cleanIdNoDomain && uEmail === cleanIdNoDomain) ||
             (cleanIdNoDomain && uEmailNoDomain === cleanIdNoDomain) ||
             (cleanDigits && uPhone && (uPhone === cleanDigits || uPhone.endsWith(cleanDigits) || cleanDigits.endsWith(uPhone))) ||
             (cleanIdNoDomain && uName === cleanIdNoDomain) ||
             uName === cleanId ||
             uId === cleanId ||
             uId === cleanIdNoDomain;
    }) || null;
  };

  const findLocalUser = (identifier: string) => {
    const lookup = (table: string) => {
      const data = getLocalValue(table) || {};
      const list = Object.values(data);
      return matchUserInList(list, identifier);
    };

    return lookup('users') || lookup('employees');
  };

  const verifyUserPasswordOrPin = (foundUser: any, pwd: string): boolean => {
    const candidateHashes = [
      foundUser?.passwordHash,
      foundUser?.password_hash,
      foundUser?.pin,
      foundUser?.password
    ].filter((h): h is string => typeof h === 'string' && h.length > 0);

    return candidateHashes.some(h => {
      if (h.startsWith('$2a$') || h.startsWith('$2b$')) {
        try {
          return bcrypt.compareSync(pwd, h);
        } catch (_) {
          return false;
        }
      }
      return false;
    });
  };

  const hasAnyConfiguredCredential = (foundUser: any): boolean => {
    return Boolean(
      foundUser?.passwordHash ||
      foundUser?.password_hash ||
      foundUser?.pin ||
      foundUser?.password
    );
  };

  const stripSensitiveCredentials = (record: any) => {
    if (!record || typeof record !== 'object') return record;
    const { passwordHash, password_hash, password, pin, ...safeRecord } = record;
    return safeRecord;
  };

  const findRemoteUser = async (identifier: string) => {
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return null;
    }
    try {
      // 1. Chercher dans la table public.users de Supabase
      const { data: dbUsers, error: uErr } = await supabase
        .from('users')
        .select('id, uid, email, display_name, name, phone, role, employee_id, status, join_date, password_hash, pin, updated_at');
      if (!uErr && Array.isArray(dbUsers) && dbUsers.length > 0) {
        const camelUsers = dbUsers.map(convertKeysToCamel);
        for (const camel of camelUsers) {
          localDb.updateLocalOnly(`users/${camel.id || camel.uid}`, stripSensitiveCredentials(camel));
        }
        const matched = matchUserInList(camelUsers, identifier);
        if (matched) return matched;
      }

      // 2. Chercher dans la table public.employees de Supabase
      const { data: dbEmp, error: eErr } = await supabase
        .from('employees')
        .select('id, name, role, phone, email, hire_date, status, is_clocked_in, permissions, password_hash, pin, updated_at');
      if (!eErr && Array.isArray(dbEmp) && dbEmp.length > 0) {
        const camelEmps = dbEmp.map(convertKeysToCamel);
        for (const camel of camelEmps) {
          localDb.updateLocalOnly(`employees/${camel.id}`, stripSensitiveCredentials(camel));
        }
        const matched = matchUserInList(camelEmps, identifier);
        if (matched) return matched;
      }
    } catch (err) {
      console.warn('[AuthService] findRemoteUser lookup error:', err);
    }
    return null;
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        const isOwnerAccount = checkIsOwner(cleanEmail, data.user.id);
        if (isOwnerAccount) {
          await ensureOwnerExists(cleanEmail, data.user.id, password);
        }
        const user = {
          uid: data.user.id,
          email: data.user.email || null,
          displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || null,
          role: isOwnerAccount ? 'admin' : undefined
        };
        auth.trigger(user);
        return { user };
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      const isNetwork = errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network') || err?.name === 'TypeError';
      
      let foundUser: any = findLocalUser(cleanEmail);
      if ((!foundUser || !hasAnyConfiguredCredential(foundUser)) && !isNetwork) {
        const remoteMatch = await findRemoteUser(cleanEmail);
        if (remoteMatch) foundUser = remoteMatch;
      }

      if (foundUser) {
        if (foundUser.status === 'inactive') {
          throw new Error("Ce compte a été désactivé");
        }
        if (verifyUserPasswordOrPin(foundUser, password)) {
          const user = { 
            uid: foundUser.uid || foundUser.id, 
            email: foundUser.email || cleanEmail, 
            displayName: foundUser.displayName || foundUser.name || 'Utilisateur',
            role: checkIsOwner(foundUser.email || cleanEmail, foundUser.uid || foundUser.id) ? 'admin' : (foundUser.role || 'cashier')
          };
          auth.trigger(user);
          return { user };
        }
        throw new Error("Mot de passe ou code PIN incorrect");
      }

      if (isNetwork) {
        if (checkIsOwner(cleanEmail)) {
          throw new Error("Première connexion administrateur requise en ligne pour valider et synchroniser vos identifiants.");
        }
        const fetchErr = new Error("Failed to fetch");
        (fetchErr as any).code = 'auth/network-request-failed';
        throw fetchErr;
      }

      if (errMsg === 'Invalid login credentials' || err?.status === 400 || errMsg.toLowerCase().includes('invalid')) {
        throw new Error("Identifiant ou mot de passe incorrect");
      }
      throw err;
    }
  }

  let foundUser: any = findLocalUser(cleanEmail);
  if (!foundUser || !hasAnyConfiguredCredential(foundUser)) {
    const remoteMatch = await findRemoteUser(cleanEmail);
    if (remoteMatch) foundUser = remoteMatch;
  }
  if (!foundUser) {
    if (checkIsOwner(cleanEmail)) {
      throw new Error("Première connexion administrateur requise en ligne pour valider et synchroniser vos identifiants.");
    }
    throw new Error("Utilisateur non trouvé");
  }
  if (foundUser.status === 'inactive') throw new Error("Ce compte a été désactivé");
  if (!hasAnyConfiguredCredential(foundUser)) throw new Error("Ce compte n'a pas de mot de passe (créé via Google).");
  if (!verifyUserPasswordOrPin(foundUser, password)) throw new Error("Mot de passe ou code PIN incorrect");

  const user = { 
    uid: foundUser.uid || foundUser.id, 
    email: foundUser.email || cleanEmail, 
    displayName: foundUser.displayName || foundUser.name || 'Utilisateur',
    role: checkIsOwner(foundUser.email || cleanEmail, foundUser.uid || foundUser.id) ? 'admin' : (foundUser.role || 'cashier')
  };
  auth.trigger(user);
  return { user };
};

export async function signOut() {
  if (isSupabaseConfigured) {
    try { await supabase.auth.signOut(); } catch (err) {}
  }
  auth.trigger(null);
  return true;
}

export const createUserWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
  const cleanEmail = email.toLowerCase().trim();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password: password });
    if (error) throw error;
    if (data.user) {
      const user = { uid: data.user.id, email: data.user.email || null, displayName: data.user.email?.split('@')[0] || null };
      auth.trigger(user);
      return { user };
    }
  }
  const id = generateLocalId();
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = { uid: id, email: cleanEmail, displayName: cleanEmail.split('@')[0] };
  auth.trigger(user);
  return { user };
};
