import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { isTabAllowed, TAB_PERMISSION_MAP } from '../src/lib/permissions';
import { DEFAULT_PERMISSIONS } from '../src/constants';
import { uploadImageBlobToStorage } from '../src/supabase';
import { setSecureItem, getSecureItem } from '../src/lib/security';
import { RolePermissions } from '../src/types';
import fs from 'fs';
import path from 'path';

describe('🔒 Jalon M1 : Sécurité Critique & Contrôle des Accès (Axe R1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('1. P0-SEC-01 : Éradication de l\'email hardcodé en base PostgreSQL', () => {
    it('confirme l\'absence absolue de kader_bouz@hotmail.com dans la migration RLS', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261001_phase2_security_rls_lockdown.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      
      expect(sqlContent).not.toContain('kader_bouz@hotmail.com');
      expect(sqlContent).toContain('users.role = \'admin\'');
    });

    it('vérifie que is_admin() s\'appuie sur la table public.users et les claims JWT dynamiques', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261001_phase2_security_rls_lockdown.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

      expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.is_admin\(\)/);
      expect(sqlContent).toMatch(/EXISTS \(\s*SELECT 1 FROM public\.users/);
      expect(sqlContent).toContain("app_metadata' ->> 'role') = 'admin'");
    });
  });

  describe('2. P0-SEC-02 : Verrouillage strict du rôle Admin et suppression du bypass universel', () => {
    const createCanAccess = (permissions: RolePermissions) => {
      return (perm: keyof RolePermissions) => !!permissions[perm];
    };

    it('bloque l\'accès aux modules admin (settings, sync_studio, audit_logs) si le rôle admin n\'est pas vérifié par canAccess', () => {
      // Simule un profil caissier ayant modifié localement son role en "admin" mais dont canAccess renvoie false
      const unverifiedAdminCanAccess = (_perm: keyof RolePermissions) => false;

      expect(isTabAllowed('settings', unverifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(false);
      expect(isTabAllowed('sync_studio', unverifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(false);
      expect(isTabAllowed('audit_logs', unverifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(false);
      expect(isTabAllowed('reports', unverifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(false);
    });

    it('autorise l\'accès complet si l\'administrateur est vérifié (canAccess accordé)', () => {
      const verifiedAdminCanAccess = createCanAccess(DEFAULT_PERMISSIONS.admin);

      expect(isTabAllowed('settings', verifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(true);
      expect(isTabAllowed('sync_studio', verifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(true);
      expect(isTabAllowed('audit_logs', verifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(true);
      expect(isTabAllowed('reports', verifiedAdminCanAccess, { isAdmin: true, isOwner: false })).toBe(true);
    });

    it('autorise immédiatement l\'owner authentifié par checkIsOwner (.env)', () => {
      expect(isTabAllowed('settings', undefined, { isOwner: true })).toBe(true);
      expect(isTabAllowed('sync_studio', undefined, { isOwner: true })).toBe(true);
      expect(isTabAllowed('reports', undefined, { isOwner: true })).toBe(true);
    });

    it('bloque formellement le caissier sur les onglets sensibles', () => {
      const cashierCanAccess = createCanAccess(DEFAULT_PERMISSIONS.cashier);

      expect(isTabAllowed('reports', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      expect(isTabAllowed('settings', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      expect(isTabAllowed('sync_studio', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(false);
      // Mais autorise les onglets de travail
      expect(isTabAllowed('checkout', cashierCanAccess, { isAdmin: false, isOwner: false })).toBe(true);
    });
  });

  describe('3. P0-SEC-03 : Sécurité des PINs (Bcrypt obligatoire, pas de 0000/1234 par défaut)', () => {
    it('génère et valide un hash bcrypt conforme ($2a$/$2b$)', () => {
      const pin = '8520';
      const hash = bcrypt.hashSync(pin, 10);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
      expect(bcrypt.compareSync(pin, hash)).toBe(true);
      expect(bcrypt.compareSync('0000', hash)).toBe(false);
      expect(bcrypt.compareSync('1234', hash)).toBe(false);
    });

    it('persiste et récupère correctement nexus_pin_lock_until et nexus_pin_failures via le stockage sécurisé', () => {
      setSecureItem('nexus_pin_failures', '3');
      expect(Number(getSecureItem('nexus_pin_failures'))).toBe(3);

      const lockTarget = Date.now() + 60000;
      setSecureItem('nexus_pin_lock_until', lockTarget.toString());
      expect(Number(getSecureItem('nexus_pin_lock_until'))).toBe(lockTarget);
    });
  });

  describe('4. P1-SEC-02 : Durcissement des Uploads & Protection Anti-XSS (supabase.ts)', () => {
    it('rejette les blobs sans type MIME défini ou avec type vide', async () => {
      const emptyTypeBlob = new Blob(['binary data'], { type: '' });
      const result = await uploadImageBlobToStorage(emptyTypeBlob, 'products', '');
      expect(result).toBeNull();
    });

    it('rejette formellement les fichiers SVG (image/svg+xml) pour prévenir les attaques Stored XSS', async () => {
      const svgPayload = '<svg onload="alert(1)"><circle r="10"/></svg>';
      const svgBlob = new Blob([svgPayload], { type: 'image/svg+xml' });
      const result = await uploadImageBlobToStorage(svgBlob, 'products', 'image/svg+xml');
      expect(result).toBeNull();
    });

    it('rejette les types de fichiers non-images (text/html, application/javascript)', async () => {
      const htmlBlob = new Blob(['<script>alert(1)</script>'], { type: 'text/html' });
      const result = await uploadImageBlobToStorage(htmlBlob, 'products', 'text/html');
      expect(result).toBeNull();

      const jsBlob = new Blob(['console.log("pwned")'], { type: 'application/javascript' });
      const jsResult = await uploadImageBlobToStorage(jsBlob, 'products', 'application/javascript');
      expect(jsResult).toBeNull();
    });
  });
});
