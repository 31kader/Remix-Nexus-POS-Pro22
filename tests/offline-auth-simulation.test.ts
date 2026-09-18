import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { auth, signInWithEmailAndPassword } from '../src/services/AuthService';
import { setLocalState, dbState } from '../src/lib/local-db';
import { supabase } from '../src/supabase';

// Mock Supabase to simulate a complete network blackout (Airplane mode / Internet down)
vi.mock('../src/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        signInWithPassword: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
        getSession: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null })
      }))
    }
  };
});

describe('Validation Réelle : Connexion Hors-Ligne (Offline Auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    auth.trigger(null);
    // Vider l'état local
    dbState.users = {};
    dbState.employees = {};
  });

  it('1. Connecte avec succès un caissier en mode hors-ligne lorsque Supabase échoue (Failed to fetch)', async () => {
    // Enregistrement d'un caissier dans la base locale (IndexedDB / dbState)
    const pinOrPassword = '1234';
    const passwordHash = bcrypt.hashSync(pinOrPassword, 10);

    setLocalState('users/caissier_1', {
      id: 'caissier_1',
      uid: 'caissier_1',
      email: 'amina@nexus.store',
      name: 'Amina Benali',
      displayName: 'Amina Benali',
      role: 'cashier',
      status: 'active',
      passwordHash: passwordHash
    });

    // Tentative de connexion alors que Supabase rejette "Failed to fetch" (pas d'internet)
    const result = await signInWithEmailAndPassword(auth, 'amina@nexus.store', pinOrPassword);

    // Vérifications du résultat
    expect(result.user).toBeDefined();
    expect(result.user.uid).toBe('caissier_1');
    expect(result.user.displayName).toBe('Amina Benali');

    // Vérification du token hors-ligne généré
    const token = await auth.currentUser?.getIdToken?.();
    expect(token).toBe('offline_token_caissier_1');

    // Vérification du stockage de session sécurisé (sessionStorage)
    const storedSession = sessionStorage.getItem('nexus_auth_user');
    expect(storedSession).not.toBeNull();
    const parsed = JSON.parse(storedSession!);
    expect(parsed.uid).toBe('caissier_1');
    expect(parsed.email).toBe('amina@nexus.store');
  });

  it('2. Rejette immédiatement un mot de passe incorrect en mode hors-ligne', async () => {
    setLocalState('users/caissier_2', {
      id: 'caissier_2',
      uid: 'caissier_2',
      email: 'karim@nexus.store',
      role: 'cashier',
      status: 'active',
      passwordHash: bcrypt.hashSync('correct_pass', 10)
    });

    // Mot de passe erroné
    await expect(
      signInWithEmailAndPassword(auth, 'karim@nexus.store', 'wrong_pass')
    ).rejects.toThrow();

    // L'utilisateur ne doit pas être connecté
    expect(auth.currentUser).toBeNull();
  });

  it('3. Bloque la connexion hors-ligne d’un compte désactivé', async () => {
    setLocalState('users/ex_employe', {
      id: 'ex_employe',
      uid: 'ex_employe',
      email: 'bloque@nexus.store',
      role: 'cashier',
      status: 'inactive', // Compte désactivé
      passwordHash: bcrypt.hashSync('1234', 10)
    });

    await expect(
      signInWithEmailAndPassword(auth, 'bloque@nexus.store', '1234')
    ).rejects.toThrow('Ce compte a été désactivé');

    expect(auth.currentUser).toBeNull();
  });

  it('4. Sauvegarde la session en sessionStorage et génère des tokens hors-ligne valides', async () => {
    const offlineUserData = {
      uid: 'gerant_01',
      email: 'gerant@nexus.store',
      displayName: 'Directeur Général'
    };

    auth.trigger(offlineUserData);

    expect(auth.currentUser).not.toBeNull();
    expect(auth.currentUser?.uid).toBe('gerant_01');

    const token = await auth.currentUser?.getIdToken?.();
    expect(token).toBe('offline_token_gerant_01');

    const stored = sessionStorage.getItem('nexus_auth_user');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).email).toBe('gerant@nexus.store');
  });
});
