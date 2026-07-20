import { supabase, isSupabaseConfigured } from '../supabase';
import bcrypt from 'bcryptjs';
import { Browser } from '@capacitor/browser';
import {
  generateLocalId,
} from '../lib/db-converters';
import {
  getLocalValue,
} from '../lib/local-db';
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
      const stored = localStorage.getItem('nexus_auth_user');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          this.currentUser = { ...data, getIdToken: async () => btoa(JSON.stringify({ uid: data.uid || "anon", exp: Date.now() + 3600 * 1000 })) };
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
      this.currentUser = { ...user, getIdToken: async () => btoa(JSON.stringify({ uid: user.uid || "anon", exp: Date.now() + 3600 * 1000 })) };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_auth_user', JSON.stringify(this.currentUser));
      }
    } else {
      this.currentUser = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nexus_auth_user');
      }
    }
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}

export const auth = new AuthEmulator();

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

import { localDb } from './LocalDatabase';

const ensureOwnerExists = async (cleanEmail: string, password: string): Promise<any> => {
  const adminEmail = ((import.meta as any).env?.VITE_OWNER_EMAIL || (import.meta as any).env?.VITE_ADMIN_EMAIL || 'hrskader305@gmail.com').toLowerCase().trim();
  if (cleanEmail !== adminEmail) return null;
  const users = getLocalValue('users') || {};
  let foundUser: any = Object.values(users).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
  if (!foundUser) {
    const employees = getLocalValue('employees') || {};
    foundUser = Object.values(employees).find((e: any) => e.email?.toLowerCase().trim() === cleanEmail);
  }
  if (!foundUser) {
    const id = (import.meta as any).env?.VITE_OWNER_UID || 'FaQiBWkg8uTxZ2np7BQjDINTyQc2';
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

  const findLocalUser = (identifier: string) => {
    const cleanId = identifier.toLowerCase().trim();
    const cleanIdNoDomain = cleanId.endsWith('@nexus-pos.internal')
      ? cleanId.replace('@nexus-pos.internal', '')
      : cleanId.split('@')[0];

    const lookup = (table: string) => {
      const data = getLocalValue(table) || {};
      return Object.values(data).find((u: any) => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uEmailNoDomain = uEmail.endsWith('@nexus-pos.internal')
          ? uEmail.replace('@nexus-pos.internal', '')
          : uEmail.split('@')[0];
        const uPhone = (u.phone || '').replace(/\s+/g, '');
        const uName = (u.displayName || u.name || '').toLowerCase().trim();
        const uId = (u.id || u.uid || '').toLowerCase().trim();

        return uEmail === cleanId ||
               uEmailNoDomain === cleanIdNoDomain ||
               uPhone === cleanId.replace(/\s+/g, '') ||
               uName === cleanIdNoDomain ||
               uName === cleanId ||
               uId === cleanIdNoDomain;
      });
    };

    return lookup('users') || lookup('employees') || lookup('customers') || lookup('suppliers');
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
      
      if (isNetwork) {
        const foundUser: any = findLocalUser(cleanEmail);
        if (foundUser) {
          if (foundUser.status === 'inactive') {
            throw new Error("Ce compte a été désactivé");
          }
          const hash = foundUser.passwordHash || foundUser.password_hash;
          if (hash && bcrypt.compareSync(password, hash)) {
            const user = { uid: foundUser.uid || foundUser.id, email: foundUser.email, displayName: foundUser.displayName || foundUser.name };
            auth.trigger(user);
            return { user };
          }
        }
        const fetchErr = new Error("Failed to fetch");
        (fetchErr as any).code = 'auth/network-request-failed';
        throw fetchErr;
      }

      if (errMsg === 'Invalid login credentials' || err?.status === 400 || errMsg.toLowerCase().includes('invalid')) {
        const foundUser: any = findLocalUser(cleanEmail);
        if (foundUser) {
          if (foundUser.status === 'inactive') {
            throw new Error("Ce compte a été désactivé");
          }
          const hash = foundUser.passwordHash || foundUser.password_hash;
          if (hash && bcrypt.compareSync(password, hash)) {
            const user = { uid: foundUser.uid || foundUser.id, email: foundUser.email, displayName: foundUser.displayName || foundUser.name };
            auth.trigger(user);
            return { user };
          }
        }
        throw new Error("Identifiant ou mot de passe incorrect");
      }
      throw err;
    }
  }

  const foundUser: any = findLocalUser(cleanEmail);
  if (!foundUser) throw new Error("Utilisateur non trouvé");
  if (foundUser.status === 'inactive') throw new Error("Ce compte a été désactivé");
  const hash = foundUser.passwordHash || foundUser.password_hash;
  if (!hash) throw new Error("Ce compte n'a pas de mot de passe (créé via Google).");
  if (!bcrypt.compareSync(password, hash)) throw new Error("Mot de passe incorrect");

  const user = { uid: foundUser.uid || foundUser.id, email: foundUser.email, displayName: foundUser.displayName || foundUser.name };
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
