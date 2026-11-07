import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

describe('🛡️ TESTS DE SÉCURITÉ LOGIN, SUPPRESSION DES BACKDOORS ET VALIDATION PIN (4-8 CHIFFRES)', () => {
  const loginAlternativesPath = path.resolve('src/components/login/LoginAlternatives.tsx');
  const useAuthUserPath = path.resolve('src/hooks/useAuthUser.tsx');
  const userPinEditorModalPath = path.resolve('src/components/employees/UserPinEditorModal.tsx');
  const loginViewPath = path.resolve('src/components/LoginView.tsx');
  const loginPinPadPath = path.resolve('src/components/login/LoginPinPad.tsx');

  describe('1. Éradication des Backdoors et Boutons sans Clé', () => {
    it('doit garantir que LoginAlternatives ne contient plus handleQuickAdminSession ni Admin Direct', () => {
      const content = fs.readFileSync(loginAlternativesPath, 'utf-8');
      expect(content).not.toContain('handleQuickAdminSession');
      expect(content).not.toContain('Admin Direct');
      expect(content).not.toContain('beloutchimoriss');
      expect(content).not.toContain('a43893ce-112a-48c4-85b8-b24978f4e8d0');
    });

    it('doit garantir que le bouton public Dépôt Cartons est supprimé de la page de login', () => {
      const content = fs.readFileSync(loginAlternativesPath, 'utf-8');
      expect(content).not.toContain('Dépôt Cartons');
      expect(content).not.toContain('#carton-reception');
    });

    it('doit garantir que useAuthUser ne contient plus le contournement auto_login', () => {
      const content = fs.readFileSync(useAuthUserPath, 'utf-8');
      expect(content).not.toContain('auto_login');
      expect(content).not.toContain('beloutchimoriss');
      expect(content).not.toContain('a43893ce-112a-48c4-85b8-b24978f4e8d0');
    });
  });

  describe('2. Validation & Harmonisation du Code PIN Caisse (4 à 8 chiffres)', () => {
    const pinRegex = /^\d{4,8}$/;

    it('doit rejeter les PINs de moins de 4 chiffres', () => {
      expect(pinRegex.test('')).toBe(false);
      expect(pinRegex.test('1')).toBe(false);
      expect(pinRegex.test('12')).toBe(false);
      expect(pinRegex.test('123')).toBe(false);
    });

    it('doit accepter tous les PINs valides entre 4 et 8 chiffres numériques', () => {
      expect(pinRegex.test('1234')).toBe(true);
      expect(pinRegex.test('12345')).toBe(true);
      expect(pinRegex.test('123456')).toBe(true);
      expect(pinRegex.test('1234567')).toBe(true);
      expect(pinRegex.test('12345678')).toBe(true);
    });

    it('doit rejeter les PINs dépassant 8 chiffres', () => {
      expect(pinRegex.test('123456789')).toBe(false);
      expect(pinRegex.test('1234567890')).toBe(false);
    });

    it('doit interdire formellement les caractères alphanumériques ou spéciaux dans le PIN', () => {
      expect(pinRegex.test('123a')).toBe(false);
      expect(pinRegex.test('abcd')).toBe(false);
      expect(pinRegex.test('12-34')).toBe(false);
      expect(pinRegex.test('12 34')).toBe(false);
    });

    it('doit vérifier que UserPinEditorModal applique la règle de 4 à 8 chiffres', () => {
      const content = fs.readFileSync(userPinEditorModalPath, 'utf-8');
      expect(content).toContain('/^\\d{4,8}$/');
      expect(content).toContain('maxLength={8}');
      expect(content).toContain('inputMode="numeric"');
    });

    it('doit vérifier que LoginView autorise la saisie jusqu\'à 8 chiffres et valide dès 4 chiffres', () => {
      const content = fs.readFileSync(loginViewPath, 'utf-8');
      expect(content).toContain('pinCode.length >= 8');
      expect(content).toContain('pinCode.length >= 4 && pinCode.length <= 8');
      expect(content).not.toContain('pinCode.length >= 6');
    });

    it('doit vérifier que LoginPinPad gère dynamiquement la longueur du PIN', () => {
      const content = fs.readFileSync(loginPinPadPath, 'utf-8');
      expect(content).toContain('pinCode.length >= 4 && pinCode.length <= 8');
      expect(content).not.toContain('[0, 1, 2, 3, 4, 5].map');
    });

    it('doit chiffrer correctement un PIN de 4 à 8 chiffres avec bcrypt ($2a$ ou $2b$)', () => {
      const pin = '5678';
      const hash = bcrypt.hashSync(pin, 10);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
      expect(bcrypt.compareSync('5678', hash)).toBe(true);
      expect(bcrypt.compareSync('0000', hash)).toBe(false);
    });
  });

  describe('3. Règle Anti-God Files (< 350 lignes) sur les composants de Login', () => {
    const filesToCheck = [
      loginAlternativesPath,
      loginPinPadPath,
      loginViewPath,
      userPinEditorModalPath,
      path.resolve('src/components/login/LoginHeader.tsx'),
      path.resolve('src/components/login/LoginIdentifierForm.tsx')
    ];

    filesToCheck.forEach((filePath) => {
      it(`doit respecter la limite de 350 lignes pour ${path.basename(filePath)}`, () => {
        const lines = fs.readFileSync(filePath, 'utf-8').split('\n').length;
        expect(lines).toBeLessThanOrEqual(350);
      });
    });
  });
});
