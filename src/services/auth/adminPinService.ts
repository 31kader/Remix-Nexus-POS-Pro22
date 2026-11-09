import bcrypt from 'bcryptjs';
import { localDb } from '../LocalDatabase';
import { supabase } from '../../supabase';
import { auth } from './AuthEmulator';
import { useAuthStore } from '../../store/useAuthStore';
import { getSecureItem, setSecureItem, removeSecureItem } from '../../lib/security';
import { enqueueSync } from '../SyncService';

/**
 * 🛡️ Récupère le hash bcrypt du compte Gérant/Owner depuis les sources locales fiables
 */
export async function getAdminBcryptHash(user: any): Promise<string | null> {
  if (!user) return null;
  const userUid = String(user.uid || user.id || '').toLowerCase().trim();
  const userEmail = String(user.email || '').toLowerCase().trim();

  try {
    // 1. Vérification dans localDb /users
    const userSnap = await localDb.get(`users/${userUid}`);
    if (userSnap && userSnap.exists()) {
      const u = userSnap.val();
      const hash = u?.pin || u?.pin_hash || u?.pinHash || u?.password_hash || u?.passwordHash;
      if (typeof hash === 'string' && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
        return hash;
      }
    }

    // 2. Recherche transversale par email dans tous les utilisateurs et employés
    const [usersSnap, empSnap] = await Promise.all([
      localDb.get('users'),
      localDb.get('employees')
    ]);

    const allRecords: any[] = [
      ...Object.values(usersSnap?.exists() ? usersSnap.val() || {} : {}),
      ...Object.values(empSnap?.exists() ? empSnap.val() || {} : {})
    ];

    for (const rec of allRecords) {
      if (!rec) continue;
      const rEmail = String(rec.email || '').toLowerCase().trim();
      const rUid = String(rec.uid || rec.id || '').toLowerCase().trim();
      if ((userEmail && rEmail === userEmail) || (userUid && rUid === userUid)) {
        const hash = rec.pin || rec.pin_hash || rec.pinHash || rec.password_hash || rec.passwordHash;
        if (typeof hash === 'string' && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
          return hash;
        }
      }
    }

    // 3. Repli sur les identifiants hors-ligne chiffrés
    const offlineCreds = getSecureItem<Record<string, any>>('nexus_offline_credentials') || {};
    const credRecord = offlineCreds[userEmail] || offlineCreds[userUid];
    if (credRecord?.hash && (credRecord.hash.startsWith('$2a$') || credRecord.hash.startsWith('$2b$'))) {
      return credRecord.hash;
    }
  } catch (err) {
    console.warn('[AdminPinService] Erreur lors de la recherche du hash admin :', err);
  }

  return null;
}

/**
 * 🔐 Vérifie le code PIN Gérant (Step-Up 2FA) lors d'une connexion Google OAuth
 */
export async function verifyAdminPin(
  pin: string,
  user: any
): Promise<{ success: boolean; isFirstSetup?: boolean; message?: string }> {
  const cleanPin = (pin || '').trim();

  // Rate Limiting : Vérification des verrouillages d'échecs
  const lockUntil = Number(getSecureItem<string>('nexus_admin_pin_lock_until') || '0');
  if (Date.now() < lockUntil) {
    const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
    return {
      success: false,
      message: `Trop d'échecs. Pavé Gérant verrouillé pendant ${remaining}s.`
    };
  }

  if (cleanPin.length < 4 || cleanPin.length > 8) {
    return {
      success: false,
      message: 'Le code PIN doit comporter entre 4 et 8 chiffres.'
    };
  }

  const existingHash = await getAdminBcryptHash(user);

  // Cas 1 : Premier enregistrement (aucun PIN n'existe pour cet email gérant)
  if (!existingHash) {
    const res = await resetAdminPin(cleanPin, user);
    if (res.success) {
      return { success: true, isFirstSetup: true };
    }
    return res;
  }

  // Cas 2 : Vérification du hash existant via bcrypt
  const isMatch = bcrypt.compareSync(cleanPin, existingHash);
  if (isMatch) {
    sessionStorage.setItem('nexus_admin_pin_unlocked', 'true');
    removeSecureItem('nexus_admin_pin_failures');
    removeSecureItem('nexus_admin_pin_lock_until');
    return { success: true };
  }

  // Échec de saisie : incrémentation du compteur et sanctions après 3 échecs
  const failures = Number(getSecureItem<string>('nexus_admin_pin_failures') || '0') + 1;
  if (failures >= 3) {
    setSecureItem('nexus_admin_pin_lock_until', (Date.now() + 60000).toString());
    removeSecureItem('nexus_admin_pin_failures');
    await cancelAdminUnlock();
    return {
      success: false,
      message: 'Sécurité : 3 tentatives erronées. Déconnexion immédiate du compte Gérant.'
    };
  } else {
    setSecureItem('nexus_admin_pin_failures', failures.toString());
    return {
      success: false,
      message: `Code PIN incorrect (${failures}/3 tentatives).`
    };
  }
}

/**
 * 🔄 Réinitialise le code PIN secret Gérant pour l'utilisateur Propriétaire vérifié
 */
export async function resetAdminPin(
  newPin: string,
  user: any
): Promise<{ success: boolean; message?: string }> {
  const cleanPin = (newPin || '').trim();
  if (cleanPin.length < 4 || cleanPin.length > 8) {
    return {
      success: false,
      message: 'Le code PIN doit comporter entre 4 et 8 chiffres.'
    };
  }

  const userUid = user?.uid || user?.id;
  const userEmail = user?.email || '';

  try {
    const newHash = bcrypt.hashSync(cleanPin, 10);
    const displayName = user?.displayName || user?.name || userEmail.split('@')[0] || 'Gérant';

    const updateData: any = {
      uid: userUid,
      email: userEmail,
      displayName,
      role: 'admin',
      pin: newHash,
      passwordHash: newHash,
      updatedAt: new Date().toISOString()
    };

    if (userUid) {
      await localDb.insert(`users/${userUid}`, updateData);
      enqueueSync('users', userUid, 'UPSERT', updateData);
    }

    // Mise à jour directe sur Supabase pour propagation instantanée
    try {
      if (userUid) {
        await supabase.from('users').update({
          pin: newHash,
          password_hash: newHash,
          updated_at: new Date().toISOString()
        }).eq('id', userUid);
      } else if (userEmail) {
        await supabase.from('users').update({
          pin: newHash,
          password_hash: newHash,
          updated_at: new Date().toISOString()
        }).eq('email', userEmail);
      }
    } catch (supaErr) {
      console.warn('[AdminPinService] Synchronisation immédiate Supabase différée :', supaErr);
    }

    sessionStorage.setItem('nexus_admin_pin_unlocked', 'true');
    removeSecureItem('nexus_admin_pin_failures');
    removeSecureItem('nexus_admin_pin_lock_until');

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: 'Erreur lors de la configuration du PIN : ' + (err?.message || 'Erreur inconnue')
    };
  }
}

/**
 * 🚫 Annule la tentative d'accès Gérant et révoque immédiatement toute session active
 */
export async function cancelAdminUnlock(): Promise<void> {
  try {
    sessionStorage.removeItem('nexus_admin_pin_unlocked');
    sessionStorage.removeItem('nexus_active_online_session');
    sessionStorage.removeItem('nexus_auth_user');
  } catch (_) {}

  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[AdminPinService] signOut error :', e);
  }

  auth.trigger(null);
  useAuthStore.getState().setPendingAdminUnlockUser(null);
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setProfile(null);
  useAuthStore.getState().setIsUnauthorized(false);
}
