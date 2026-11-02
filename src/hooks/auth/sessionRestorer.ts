import { getSecureItem } from '../../lib/security';

export interface CachedSession {
  uid: string;
  email?: string;
  displayName?: string;
  role?: any;
  employeeId?: string | null;
  isOffline?: boolean;
}

export function getCachedUserSession(): { session: CachedSession | null; isOffline: boolean } {
  const sessionOffline = getSecureItem('nexus_active_offline_session');
  let sessionOnline: any = null;
  try {
    const rawSession = sessionStorage.getItem('nexus_active_online_session');
    if (rawSession) {
      sessionOnline = JSON.parse(rawSession);
    }
  } catch (_) {}
  if (!sessionOnline) {
    sessionOnline = getSecureItem('nexus_active_online_session');
  }

  const session = sessionOffline || sessionOnline;
  return {
    session: session || null,
    isOffline: !!sessionOffline
  };
}

export function cacheActiveOnlineSession(sessionData: CachedSession): void {
  try {
    sessionStorage.setItem('nexus_active_online_session', JSON.stringify(sessionData));
    try { localStorage.removeItem('nexus_active_online_session'); } catch (_) {}
  } catch (cacheErr) {
    console.warn("Failed to cache online session:", cacheErr);
  }
}
