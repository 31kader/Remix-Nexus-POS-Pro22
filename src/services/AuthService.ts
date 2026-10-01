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
      const safeUserData = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null
      };
      this.currentUser = {
        ...safeUserData,
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
        // SOLUTION ABSOLUE : On passe par le flux Supabase officiel avec l'URL de redirection du projet
        // Cette URL doit être enregistrée dans Supabase > Auth > URL Configuration
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.nexus.pos.pro://login',
            skipBrowserRedirect: true
          }
        });

        if (error) throw error;

        if (data?.url) {
          // On ouvre le navigateur système
          await Browser.open({ url: data.url });
        }
        return { user: null };
      } else {
        // SUR WEB : Garder la logique de popup standard
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

          const popup = window.open(
            data.url,
            'google_auth',
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
          );

          if (!popup) {
            window.location.href = data.url;
          }
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

const ensureOwnerExists = async (cleanEmail: string, password: string): Promise<any> => {
  if (!checkIsOwner(cleanEmail)) return null;
  const users = getLocalValue('users') || {};
  let foundUser: any = Object.values(users).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
  if (!foundUser) {
    const employees = getLocalValue('employees') || {};
    foundUser = Object.values(employees).find((e: any) => e.email?.toLowerCase().trim() === cleanEmail);
  }
  if (!foundUser) {
    const id = PRIMARY_OWNER_UID || 'owner_admin_id';
    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = {
      id,
      uid: id,
      email: cleanEmail,
      passwordHash,
      role: 'admin',
      displayName: 'Administrateur',
      joinDate: new Date().toISOString()
    };
    await localDb.insert(`users/${id}`, newUser);
    foundUser = newUser;
  }
  return foundUser;
};

export const signInWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
  const cleanEmail = email.toLowerCase().trim();
  await ensureOwnerExists(cleanEmail, password);

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

  const findRemoteUser = async (identifier: string) => {
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return null;
    }
    try {
      // 1. Chercher dans la table public.users de Supabase
      const { data: dbUsers, error: uErr } = await supabase.from('users').select('*');
      if (!uErr && Array.isArray(dbUsers) && dbUsers.length > 0) {
        for (const u of dbUsers) {
          const camel = convertKeysToCamel(u);
          localDb.update(`users/${camel.id || camel.uid}`, camel);
        }
        const matched = matchUserInList(dbUsers.map(convertKeysToCamel), identifier);
        if (matched) return matched;
      }

      // 2. Chercher dans la table public.employees de Supabase
      const { data: dbEmp, error: eErr } = await supabase.from('employees').select('*');
      if (!eErr && Array.isArray(dbEmp) && dbEmp.length > 0) {
        for (const e of dbEmp) {
          const camel = convertKeysToCamel(e);
          localDb.update(`employees/${camel.id}`, camel);
        }
        const matched = matchUserInList(dbEmp.map(convertKeysToCamel), identifier);
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
        const user = {
          uid: data.user.id,
          email: data.user.email || null,
          displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || null
        };
        auth.trigger(user);
        return { user };
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      const isNetwork = errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network') || err?.name === 'TypeError';
      
      let foundUser: any = findLocalUser(cleanEmail);
      if (!foundUser && !isNetwork) {
        foundUser = await findRemoteUser(cleanEmail);
      }

      if (foundUser) {
        if (foundUser.status === 'inactive') {
          throw new Error("Ce compte a été désactivé");
        }
        const hash = foundUser.passwordHash || foundUser.password_hash;
        if (hash && bcrypt.compareSync(password, hash)) {
          const user = { 
            uid: foundUser.uid || foundUser.id, 
            email: foundUser.email || cleanEmail, 
            displayName: foundUser.displayName || foundUser.name || 'Utilisateur',
            role: foundUser.role || 'cashier'
          };
          auth.trigger(user);
          return { user };
        }
        throw new Error("Mot de passe ou code PIN incorrect");
      }

      if (isNetwork) {
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
  if (!foundUser) {
    foundUser = await findRemoteUser(cleanEmail);
  }
  if (!foundUser) throw new Error("Utilisateur non trouvé");
  if (foundUser.status === 'inactive') throw new Error("Ce compte a été désactivé");
  const hash = foundUser.passwordHash || foundUser.password_hash;
  if (!hash) throw new Error("Ce compte n'a pas de mot de passe (créé via Google).");
  if (!bcrypt.compareSync(password, hash)) throw new Error("Mot de passe ou code PIN incorrect");

  const user = { 
    uid: foundUser.uid || foundUser.id, 
    email: foundUser.email || cleanEmail, 
    displayName: foundUser.displayName || foundUser.name || 'Utilisateur',
    role: foundUser.role || 'cashier'
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
