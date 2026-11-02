import { supabase, isSupabaseConfigured } from '../../supabase';
import bcrypt from 'bcryptjs';
import { generateLocalId, convertKeysToCamel } from '../../lib/db-converters';
import { getLocalValue } from '../../lib/local-db';
import { localDb } from '../LocalDatabase';
import { checkIsOwner, PRIMARY_OWNER_UID } from '../../config/ownerConfig';
import { auth, User } from './AuthEmulator';

export const ensureOwnerExists = async (cleanEmail: string, uid?: string, password?: string): Promise<any> => {
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
