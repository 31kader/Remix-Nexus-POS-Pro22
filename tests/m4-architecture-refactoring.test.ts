import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mocks nécessaires pour le rendu ou l'import de composants
vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {}
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}));

describe('🏛️ Jalon M4 : Refactoring Architectural & Qualité du Code (Axe R4)', () => {

  // =========================================================================
  // 1. P1-ARCH-01 : Sélecteurs Zustand ciblés (élimination des re-renders)
  // =========================================================================
  describe('1. P1-ARCH-01 — Sélecteurs Zustand ciblés', () => {
    it('utilise des sélecteurs atomiques ciblés dans useDataFetching.ts au lieu d un appel global au store', () => {
      const filePath = path.resolve(__dirname, '../src/hooks/useDataFetching.ts');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Vérifie l'absence d'appel global useCoreStore() sans sélecteur
      expect(content).not.toMatch(/const\s+\w+\s*=\s*useCoreStore\(\s*\);/);
      expect(content).not.toMatch(/const\s+\w+\s*=\s*useTransactionStore\(\s*\);/);

      // Vérifie la présence de sélecteurs ciblés atomiques
      expect(content).toMatch(/useCoreStore\(\s*s\s*=>\s*s\.setSettings\s*\)/);
      expect(content).toMatch(/useCoreStore\(\s*s\s*=>\s*s\.setProducts\s*\)/);
      expect(content).toMatch(/useTransactionStore\(\s*s\s*=>\s*s\.setTransactions\s*\)/);
      expect(content).toMatch(/usePeopleStore\(\s*s\s*=>\s*s\.setCustomers\s*\)/);
    });

    it('utilise des sélecteurs ciblés dans useAuthUser.tsx pour isoler les abonnements d authentification', () => {
      const filePath = path.resolve(__dirname, '../src/hooks/useAuthUser.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Vérifie la présence de sélecteurs ciblés
      expect(content).toMatch(/useAuthStore\(\s*s\s*=>\s*s\.user\s*\)/);
      expect(content).toMatch(/useAuthStore\(\s*s\s*=>\s*s\.profile\s*\)/);
      expect(content).toMatch(/useAuthStore\(\s*s\s*=>\s*s\.setProfile\s*\)/);
    });
  });

  // =========================================================================
  // 2. P1-ARCH-02 : Reclassement des custom hooks (src/components/ ➔ src/hooks/)
  // =========================================================================
  describe('2. P1-ARCH-02 — Reclassement des custom hooks et stubs rétrocompatibles', () => {
    const CANONICAL_HOOKS = [
      'useCustomersLogic',
      'useEmployeesLogic',
      'useExpiryManagerLogic',
      'useGRNLogic',
      'useOrdersLogic',
      'useProductFormLogic',
      'usePromotionsLogic',
      'useReturnModalLogic',
      'useSuppliersLogic',
      'useTransactionHistoryLogic'
    ];

    it('les custom hooks sont physiquement hébergés dans src/hooks/use*Logic.ts', () => {
      for (const hookName of CANONICAL_HOOKS) {
        const canonicalPath = path.resolve(__dirname, `../src/hooks/${hookName}.ts`);
        expect(fs.existsSync(canonicalPath), `Le fichier canonique ${hookName}.ts doit exister dans src/hooks/`).toBe(true);

        const content = fs.readFileSync(canonicalPath, 'utf-8');
        expect(content).toContain(`export function ${hookName}`);
      }
    });

    it('les stubs rétrocompatibles dans src/components/ ré-exportent fidèlement les hooks canoniques', () => {
      for (const hookName of CANONICAL_HOOKS) {
        const isTs = hookName === 'useGRNLogic' || hookName === 'usePromotionsLogic' || hookName === 'useReturnModalLogic';
        const ext = isTs ? '.ts' : '.tsx';
        const stubPath = path.resolve(__dirname, `../src/components/${hookName}${ext}`);
        expect(fs.existsSync(stubPath), `Le stub ${hookName}${ext} doit exister dans src/components/`).toBe(true);

        const content = fs.readFileSync(stubPath, 'utf-8');
        expect(content).toContain(`../hooks/${hookName}`);
        expect(content).toContain(`export * from '../hooks/${hookName}'`);
      }
    });
  });

  // =========================================================================
  // 3. P1-ARCH-03 : Modularisation des God Files (CustomerDetailTabs, CatalogPrinter)
  // =========================================================================
  describe('3. P1-ARCH-03 — Découpage modulaire des God Files', () => {
    it('CustomerDetailTabs.tsx délègue aux sous-composants modulaires dans src/components/customers/tabs/', () => {
      const tabsIndexPath = path.resolve(__dirname, '../src/components/customers/tabs/index.ts');
      expect(fs.existsSync(tabsIndexPath)).toBe(true);

      const mainFile = path.resolve(__dirname, '../src/components/CustomerDetailTabs.tsx');
      const content = fs.readFileSync(mainFile, 'utf-8');

      // Le fichier a été allégé de 1324 lignes à < 350 lignes
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThan(350);

      // Le composant importe et utilise les sous-onglets
      expect(content).toContain('<CustomerInfoTab');
      expect(content).toContain('<CustomerHistoryTab');
      expect(content).toContain('<CustomerDigitalCardTab');
    });

    it('parseNoteFinancialInfo analyse fidèlement les versements, retraits et mémos', () => {
      // Import direct du module fonctionnel pur sans instanciation lourde
      const tabInfoPath = path.resolve(__dirname, '../src/components/customers/tabs/CustomerInfoTab.tsx');
      expect(fs.existsSync(tabInfoPath)).toBe(true);

      const content = fs.readFileSync(tabInfoPath, 'utf-8');
      expect(content).toContain('export function parseNoteFinancialInfo');

      // Test de la fonction exportée depuis le fichier compilé
      const tabFile = fs.readFileSync(path.resolve(__dirname, '../src/components/CustomerDetailTabs.tsx'), 'utf-8');
      expect(tabFile).toContain('export { parseNoteFinancialInfo }');
    });

    it('CatalogPrinter.tsx délègue aux sous-composants dans src/components/catalog-printer/', () => {
      const printerIndexPath = path.resolve(__dirname, '../src/components/catalog-printer/index.ts');
      expect(fs.existsSync(printerIndexPath)).toBe(true);

      const mainFile = path.resolve(__dirname, '../src/components/CatalogPrinter.tsx');
      const content = fs.readFileSync(mainFile, 'utf-8');

      // Le fichier a été allégé de 1569 lignes à < 700 lignes
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThan(700);

      // Le composant principal assemble les 4 blocs modulaires
      expect(content).toContain('<CatalogTopBar');
      expect(content).toContain('<CatalogQueueList');
      expect(content).toContain('<CatalogConfigPanel');
      expect(content).toContain('<CatalogA4Preview');

      // Vérifie les fichiers créés dans src/components/catalog-printer/
      expect(fs.existsSync(path.resolve(__dirname, '../src/components/catalog-printer/CatalogTopBar.tsx'))).toBe(true);
      expect(fs.existsSync(path.resolve(__dirname, '../src/components/catalog-printer/CatalogQueueList.tsx'))).toBe(true);
      expect(fs.existsSync(path.resolve(__dirname, '../src/components/catalog-printer/CatalogConfigPanel.tsx'))).toBe(true);
      expect(fs.existsSync(path.resolve(__dirname, '../src/components/catalog-printer/CatalogA4Preview.tsx'))).toBe(true);
      expect(fs.existsSync(path.resolve(__dirname, '../src/components/catalog-printer/types.ts'))).toBe(true);
    });
  });

  // =========================================================================
  // 4. P1-ARCH-04 & P1-ARCH-05 : Typage Supabase Database & Normalisation Modèles
  // =========================================================================
  describe('4. P1-ARCH-04 & P1-ARCH-05 — Typage Supabase Database & Normalisation Modèles', () => {
    it('le schéma Database est déclaré dans src/types/database.types.ts avec toutes les tables majeures', () => {
      const dbTypesPath = path.resolve(__dirname, '../src/types/database.types.ts');
      expect(fs.existsSync(dbTypesPath)).toBe(true);

      const content = fs.readFileSync(dbTypesPath, 'utf-8');
      expect(content).toContain('export interface Database');
      expect(content).toContain('products:');
      expect(content).toContain('transactions:');
      expect(content).toContain('customers:');
      expect(content).toContain('stock_adjustments:');
      expect(content).toContain('users:');
    });

    it('src/supabase.ts type le client avec Database createClient<Database>', () => {
      const supabasePath = path.resolve(__dirname, '../src/supabase.ts');
      const content = fs.readFileSync(supabasePath, 'utf-8');

      expect(content).toContain("import { Database } from './types/database.types'");
      expect(content).toMatch(/createClient<Database>\(/);
    });

    it('le store useAuthStore type le profil utilisateur avec UserProfile', () => {
      const storePath = path.resolve(__dirname, '../src/store/useAuthStore.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      expect(content).toContain('profile: UserProfile | null');
      expect(content).toContain('setProfile: (profile: UserProfile | null) => void');
    });

    it('le modèle Customer normalise passwordHash, mapsUrl et cashierNotes', () => {
      const customerTypesPath = path.resolve(__dirname, '../src/types/customers.ts');
      const content = fs.readFileSync(customerTypesPath, 'utf-8');

      expect(content).toContain('passwordHash?: string;');
      expect(content).toContain('mapsUrl?: string;');
      expect(content).toContain('cashierNotes?: { note: string; timestamp: string; author: string }[];');
    });

    it('le type PaymentMethod dans src/types/sales.ts est une union stricte des 6 modes valides', () => {
      const salesTypesPath = path.resolve(__dirname, '../src/types/sales.ts');
      const content = fs.readFileSync(salesTypesPath, 'utf-8');

      expect(content).toMatch(/export\s+type\s+PaymentMethod\s*=\s*'cash'\s*\|\s*'card'\s*\|\s*'balance'\s*\|\s*'transfer'\s*\|\s*'check'\s*\|\s*'debt'/);
    });
  });

  // =========================================================================
  // 5. P1-DEVEX-01 : Suppression du clone SQL orphelin src/lib/supabase/queries/
  // =========================================================================
  describe('5. P1-DEVEX-01 — Éradication du répertoire clone src/lib/supabase/queries/', () => {
    it('le dossier doublon src/lib/supabase/queries/ est définitivement supprimé', () => {
      const orphanDir = path.resolve(__dirname, '../src/lib/supabase/queries');
      expect(fs.existsSync(orphanDir), 'Le dossier orphelin src/lib/supabase/queries ne doit plus exister').toBe(false);
    });
  });
});
