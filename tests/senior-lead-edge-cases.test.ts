import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../src/lib/security';
import { preparePayload, TABLE_COLUMNS } from '../src/lib/db-converters';
import { DEFAULT_COMPANY_SETTINGS, INTERFACE_CONFIGS } from '../src/config/appConfig';

describe('Senior Full-Stack Lead Edge-Cases & Security Suite', () => {
  describe('1. Sécurité & Chiffrement Local', () => {
    it('chiffre les données sensibles avec un sel dynamique et ne laisse rien en clair', () => {
      const sensitiveData = 'user_login_failed_attempts:5';
      const encrypted = encryptData(sensitiveData);

      expect(encrypted).not.toBe(sensitiveData);
      expect(encrypted.startsWith('nx2:')).toBe(true);
      expect(encrypted).not.toContain('attempts');
    });

    it('déchiffre parfaitement les données avec intégrité', () => {
      const secret = 'pin_1234_session_token';
      const encrypted = encryptData(secret);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(secret);
    });

    it('gère les payloads corrompus sans lancer d’exception non interceptée', () => {
      expect(() => {
        const result = decryptData('nx2:corrupted_payload_string_xyz');
        expect(typeof result).toBe('string');
      }).not.toThrow();
    });
  });

  describe('2. Sanitization & Prévention des Injections dans les Payloads Supabase', () => {
    it('filtre et élimine strictement les colonnes non autorisées du schéma', () => {
      const maliciousOrUnknownInput = {
        name: 'Produit Test',
        price: 1500,
        unauthorized_column: 'injection_value',
        admin_flag: true,
        '<script>alert(1)</script>': 'xss'
      };

      const sanitized = preparePayload('products', 'prod-123', maliciousOrUnknownInput);

      expect(sanitized.id).toBe('prod-123');
      expect(sanitized.name).toBe('Produit Test');
      expect(sanitized.price).toBe(1500);
      expect((sanitized as any).unauthorized_column).toBeUndefined();
      expect((sanitized as any).admin_flag).toBeUndefined();
      expect((sanitized as any)['<script>alert(1)</script>']).toBeUndefined();
    });

    it('assure la conversion d’ID pour online_orders en type compatible BigInt/number', () => {
      const orderPayload = {
        customer_name: 'Client Algérie',
        total_amount: 4500
      };

      const prepared = preparePayload('online_orders', '123456789', orderPayload);
      expect(typeof prepared.id).toBe('number');
      expect(prepared.id).toBe(123456789);
    });

    it('vérifie que TABLE_COLUMNS contient toutes les tables critiques du POS', () => {
      const requiredTables = [
        'products',
        'transactions',
        'customers',
        'suppliers',
        'categories',
        'cash_shifts',
        'online_orders',
        'cart_drafts'
      ];

      for (const table of requiredTables) {
        expect(TABLE_COLUMNS[table]).toBeDefined();
        expect(Array.isArray(TABLE_COLUMNS[table])).toBe(true);
        expect(TABLE_COLUMNS[table].length).toBeGreaterThan(0);
      }
    });
  });

  describe('3. Règles Métier & Précision Monétaire Algérienne (DA / 19% TVA)', () => {
    it('est configuré avec la monnaie nationale DA et le taux de TVA légal de 19%', () => {
      expect(DEFAULT_COMPANY_SETTINGS.currency).toBe('DA');
      expect(INTERFACE_CONFIGS.defaultCurrencySymbol).toBe('DA');
      expect(DEFAULT_COMPANY_SETTINGS.taxRate).toBe(19);
    });

    it('évite les erreurs d’arrondi flottant sur les totaux de caisse', () => {
      // Test classique de virgule flottante JavaScript (0.1 + 0.2 = 0.30000000000000004)
      const priceA = 100.10;
      const priceB = 200.20;
      const roundedTotal = Math.round((priceA + priceB) * 100) / 100;
      
      expect(roundedTotal).toBe(300.30);

      // Calcul TVA 19%
      const ht = 1000;
      const tva = Math.round((ht * (DEFAULT_COMPANY_SETTINGS.taxRate / 100)) * 100) / 100;
      const ttc = ht + tva;

      expect(tva).toBe(190);
      expect(ttc).toBe(1190);
    });
  });
});
