import { supabase, isSupabaseConfigured } from '../../supabase';

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

export class AuthEmulator {
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
