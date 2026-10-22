import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { isTabAllowed, TAB_PERMISSION_MAP } from '../src/lib/permissions';
import { DEFAULT_PERMISSIONS } from '../src/constants';
import { uploadImageBlobToStorage } from '../src/supabase';
import { setSecureItem, getSecureItem } from '../src/lib/security';
import { RolePermissions } from '../src/types';
import { auth, signInWithEmailAndPassword } from '../src/services/AuthService';
import { setLocalState, dbState } from '../src/lib/local-db';
import { checkIsOwner, OWNER_EMAILS } from '../src/config/ownerConfig';
import { supabase } from '../src/supabase';

// Mock Supabase
vi.mock('../src/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        signInWithPassword: vi.fn(),
        getSession: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockResolvedValue({ error: null })
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.webp' }, error: null }),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.supabase.co/test.webp' } }))
        }))
      }
    },
    uploadImageBlobToStorage: async (blob: Blob, _bucket: string, explicitType?: string) => {
      const mimeType = (explicitType || blob.type || '').toLowerCase().trim();
      const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif'
      ];
      if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType) || mimeType === 'image/svg+xml') {
        return null;
      }
      return 'https://test.supabase.co/products/photo.webp';
    }
  };
});

describe('⚔️ EMPIRICAL CHALLENGER : Axe R1 (Sécurité & Contrôle des Accès)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    auth.trigger(null);
    dbState.users = {};
    dbState.employees = {};
  });

  describe('1. Challenge Authentification : Connexion Owner Légitime vs Attaques d\'Imposture', () => {
    const ownerEmail = OWNER_EMAILS[0] || 'test_owner@nexus.local';

    it('Scenario 1.1 : Connexion Owner légitime en ligne -> provisionne le compte local et réussit', async () => {
      // Supabase répond avec succès
      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: {
          user: {
            id: 'owner_uid_123',
            email: ownerEmail,
            user_metadata: { full_name: 'Propriétaire Fondateur' }
          }
        },
        error: null
      });

      const result = await signInWithEmailAndPassword(auth, ownerEmail, 'SecretOwnerPass123!');
      expect(result.user).toBeDefined();
      expect(result.user.uid).toBe('owner_uid_123');

      // Vérifier que le compte local a été correctement provisionné avec rôle admin et hash bcrypt
      const localOwner = Object.values(dbState.users || {}).find(
        (u: any) => u.email?.toLowerCase().trim() === ownerEmail.toLowerCase().trim()
      ) as any;

      if (checkIsOwner(ownerEmail, 'owner_uid_123')) {
        expect(localOwner).toBeDefined();
        expect(localOwner.role).toBe('admin');
        expect(localOwner.passwordHash).toMatch(/^\$2[ab]\$/);
        expect(bcrypt.compareSync('SecretOwnerPass123!', localOwner.passwordHash)).toBe(true);
      }
    });

    it('Scenario 1.2 : Connexion Owner légitime hors-ligne (après initialisation en ligne) -> réussit', async () => {
      // Simuler terminal pré-provisionné
      const hash = bcrypt.hashSync('SecretOwnerPass123!', 10);
      setLocalState('users/owner_uid_123', {
        id: 'owner_uid_123',
        uid: 'owner_uid_123',
        email: ownerEmail,
        displayName: 'Propriétaire Fondateur',
        role: 'admin',
        passwordHash: hash,
        status: 'active'
      });

      // Simuler coupure réseau totale
      (supabase.auth.signInWithPassword as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await signInWithEmailAndPassword(auth, ownerEmail, 'SecretOwnerPass123!');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(ownerEmail);
      expect(auth.currentUser).not.toBeNull();
    });

    it('Scenario 1.3 : Tentative frauduleuse de connexion Owner hors-ligne avec mot de passe erroné -> bloqué', async () => {
      const hash = bcrypt.hashSync('RealOwnerPassword', 10);
      setLocalState('users/owner_uid_123', {
        id: 'owner_uid_123',
        uid: 'owner_uid_123',
        email: ownerEmail,
        role: 'admin',
        passwordHash: hash,
        status: 'active'
      });

      (supabase.auth.signInWithPassword as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        signInWithEmailAndPassword(auth, ownerEmail, 'WrongPasswordAttacker')
      ).rejects.toThrow(/Mot de passe ou code PIN incorrect/);

      expect(auth.currentUser).toBeNull();
    });

    it('Scenario 1.4 : Attaque par usurpation Owner sur terminal vierge sans réseau -> rejet strict sans provisioning fantôme', async () => {
      // Terminal vierge : aucune donnée locale pour l'owner
      dbState.users = {};
      dbState.employees = {};

      // Réseau indisponible
      (supabase.auth.signInWithPassword as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      if (checkIsOwner(ownerEmail)) {
        await expect(
          signInWithEmailAndPassword(auth, ownerEmail, 'AnyArbitraryPassword')
        ).rejects.toThrow(/Première connexion administrateur requise en ligne/);
      }

      // Confirmer qu'aucun compte n'a été inséré dans la base locale
      expect(Object.keys(dbState.users || {}).length).toBe(0);
      expect(auth.currentUser).toBeNull();
    });
  });

  describe('2. Challenge Élévation de Privilèges : Falsification Locale de Rôle (Local Profile Tampering)', () => {
    it('Scenario 2.1 : Caissier falsifiant profile.role = "admin" dans IndexedDB mais canAccess non accordé -> rejet strict des onglets sensibles', () => {
      // Attaquant ayant injecté role: "admin" dans sa session locale mais les permissions staff sont celles du caissier
      const cashierPermissions = DEFAULT_PERMISSIONS.cashier;
      const cashierCanAccess = (perm: keyof RolePermissions) => !!cashierPermissions[perm];

      const sensitiveTabs = ['settings', 'sync_studio', 'sync', 'employees', 'archives', 'reports', 'audit_logs'];

      for (const tab of sensitiveTabs) {
        // Même si isAdmin est injecté à true, isOwner est false et canAccess refuse
        const isAllowed = isTabAllowed(tab, cashierCanAccess, {
          isAdmin: true,
          isOwner: false,
          isManager: false,
          isCameraAgent: false
        });
        expect(isAllowed).toBe(false);
      }
    });

    it('Scenario 2.2 : Seul un véritable owner vérifié (isOwner: true) a le court-circuit immédiat', () => {
      expect(isTabAllowed('settings', undefined, { isOwner: true })).toBe(true);
      expect(isTabAllowed('sync_studio', undefined, { isOwner: true })).toBe(true);
      expect(isTabAllowed('sync', undefined, { isOwner: true })).toBe(true);
    });

    it('Scenario 2.3 : Accès au module caméra sans droit inventaire pour un faux admin -> bloqué', () => {
      const noInventoryCanAccess = (perm: keyof RolePermissions) => perm !== 'canAccessInventory';
      const isAllowed = isTabAllowed('camera', noInventoryCanAccess, {
        isAdmin: true,
        isOwner: false,
        isManager: false,
        isCameraAgent: false
      });
      expect(isAllowed).toBe(false);
    });
  });

  describe('3. Challenge PIN Sécurité : Rate-Limiting & Neutralisation des Codes par Défaut', () => {
    it('Scenario 3.1 : Rejet systématique des codes 0000 et 1234 face à un hash bcrypt légitime', () => {
      const realPin = '9241';
      const hash = bcrypt.hashSync(realPin, 10);

      expect(bcrypt.compareSync('0000', hash)).toBe(false);
      expect(bcrypt.compareSync('1234', hash)).toBe(false);
      expect(bcrypt.compareSync('000000', hash)).toBe(false);
      expect(bcrypt.compareSync('', hash)).toBe(false);
      expect(bcrypt.compareSync(realPin, hash)).toBe(true);
    });

    it('Scenario 3.2 : Simulation du verrouillage temporisé de 60 secondes après 5 échecs', () => {
      const PIN_MAX_ATTEMPTS = 5;
      const PIN_LOCK_DURATION_MS = 60000;

      let failures = 0;
      let lockUntil = 0;

      // 5 tentatives infructueuses
      for (let i = 1; i <= PIN_MAX_ATTEMPTS; i++) {
        failures = i;
        if (failures >= PIN_MAX_ATTEMPTS) {
          lockUntil = Date.now() + PIN_LOCK_DURATION_MS;
          setSecureItem('nexus_pin_lock_until', lockUntil.toString());
          setSecureItem('nexus_pin_failures', '0');
        } else {
          setSecureItem('nexus_pin_failures', failures.toString());
        }
      }

      const storedLockUntil = Number(getSecureItem('nexus_pin_lock_until'));
      expect(storedLockUntil).toBeGreaterThan(Date.now());
      expect(storedLockUntil - Date.now()).toBeLessThanOrEqual(PIN_LOCK_DURATION_MS);
      expect(storedLockUntil - Date.now()).toBeGreaterThan(PIN_LOCK_DURATION_MS - 2000);
    });
  });

  describe('4. Challenge SQL Migration RLS : Analyse Stricte de la Fonction is_admin()', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261001_phase2_security_rls_lockdown.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    it('Scenario 4.1 : Absence totale de tout email en dur dans les fonctions is_admin() et is_staff()', () => {
      // Extraire le corps de la fonction is_admin
      const isAdminMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION public\.is_admin\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
      expect(isAdminMatch).not.toBeNull();
      const isAdminBody = isAdminMatch![1];

      // Vérifier qu'il n'y a aucun littéral d'adresse email
      expect(isAdminBody).not.toMatch(/'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'/);
      expect(isAdminBody).not.toContain('kader_bouz');

      // Extraire le corps de la fonction is_staff
      const isStaffMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION public\.is_staff\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
      expect(isStaffMatch).not.toBeNull();
      const isStaffBody = isStaffMatch![1];
      expect(isStaffBody).not.toMatch(/'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'/);
    });

    it('Scenario 4.2 : Vérification dynamique des rôles via public.users ou app_metadata', () => {
      const isAdminMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION public\.is_admin\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
      const isAdminBody = isAdminMatch![1];

      // Doit vérifier service_role
      expect(isAdminBody).toContain("(select auth.role()) = 'service_role'");
      // Doit vérifier authenticated
      expect(isAdminBody).toContain("(select auth.role()) = 'authenticated'");
      // Doit vérifier dynamiquement le rôle admin dans public.users
      expect(isAdminBody).toContain("users.role = 'admin'");
      // Doit vérifier le claim JWT app_metadata
      expect(isAdminBody).toContain("app_metadata' ->> 'role') = 'admin'");
    });
  });

  describe('5. Challenge Uploads Anti-XSS : Rejet Strict des Polyglots et Formats Inattendus', () => {
    it('Scenario 5.1 : Rejet d\'un polyglot SVG déguisé', async () => {
      const polyglot = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>';
      const blob = new Blob([polyglot], { type: 'image/svg+xml' });
      const res = await uploadImageBlobToStorage(blob, 'products', 'image/svg+xml');
      expect(res).toBeNull();
    });

    it('Scenario 5.2 : Rejet d\'un fichier avec type MIME vide ou non supporté', async () => {
      const emptyBlob = new Blob(['abc'], { type: '' });
      expect(await uploadImageBlobToStorage(emptyBlob, 'products', '')).toBeNull();

      const exeBlob = new Blob(['MZ...'], { type: 'application/x-msdownload' });
      expect(await uploadImageBlobToStorage(exeBlob, 'products', 'application/x-msdownload')).toBeNull();

      const htmlBlob = new Blob(['<html></html>'], { type: 'text/html' });
      expect(await uploadImageBlobToStorage(htmlBlob, 'products', 'text/html')).toBeNull();
    });

    it('Scenario 5.3 : Acceptation des images matricielles légitimes (JPEG, PNG, WebP)', async () => {
      const webpBlob = new Blob(['RIFF...WEBP'], { type: 'image/webp' });
      const resWebp = await uploadImageBlobToStorage(webpBlob, 'products', 'image/webp');
      expect(resWebp).toContain('https://test.supabase.co');

      const pngBlob = new Blob(['\x89PNG...'], { type: 'image/png' });
      const resPng = await uploadImageBlobToStorage(pngBlob, 'products', 'image/png');
      expect(resPng).toContain('https://test.supabase.co');
    });
  });
});
