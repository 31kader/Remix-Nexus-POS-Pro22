import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Hoisted mocks for Vitest
const { mockSupabaseUpdate, mockSupabaseFrom, mockApplyStockAdjustment, mockLocalDbUpdate } = vi.hoisted(() => {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null })
  });
  return {
    mockSupabaseUpdate: updateFn,
    mockSupabaseFrom: vi.fn(() => ({
      update: updateFn
    })),
    mockApplyStockAdjustment: vi.fn().mockResolvedValue({
      success: true,
      newStock: 10,
      adjustmentId: 'mock_adj_id',
      appliedDirectly: true
    }),
    mockLocalDbUpdate: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mockSupabaseFrom
  }
}));

vi.mock('../src/services/stockService', () => ({
  applyStockAdjustment: mockApplyStockAdjustment
}));

vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    update: mockLocalDbUpdate,
    updateLocalOnly: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: () => false, val: () => null })
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

import { EditTransactionModal } from '../src/components/EditTransactionModal';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { Transaction, Product, CompanySettings } from '../src/types';
import { checkIsOwner, OWNER_EMAILS } from '../src/config/ownerConfig';

describe('⚡ Jalon M3 : Dysfonctionnements Bloquants & DevEx (Axe R3)', () => {
  const mockSettings: CompanySettings = {
    name: 'Nexus POS Store',
    currency: 'DA',
    taxRate: 19
  } as CompanySettings;

  const mockProducts: Product[] = [
    {
      id: 'prod-item-1',
      name: 'Café Moulu 250g',
      price: 250,
      costPrice: 150,
      stock: 40,
      taxRate: 19,
      unit: 'pcs',
      status: 'active'
    } as Product,
    {
      id: 'prod-item-2',
      name: 'Sucre Morceaux 1kg',
      price: 120,
      costPrice: 80,
      stock: 30,
      taxRate: 19,
      unit: 'pcs',
      status: 'active'
    } as Product,
    {
      id: 'bundle-pack-1',
      name: 'Pack Petit Déjeuner',
      price: 500,
      costPrice: 300,
      stock: 10,
      taxRate: 19,
      unit: 'pcs',
      status: 'active',
      isBundle: true,
      bundleItems: [
        { productId: 'prod-item-1', quantity: 2 },
        { productId: 'prod-item-2', quantity: 1 }
      ]
    } as Product
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('P0-PERF-01 : EditTransactionModal (Correction SQL 42703 & Traitement Atomique N+1)', () => {
    const originalTransaction: Transaction = {
      id: 'tx-m3-001',
      timestamp: '2026-10-09T10:00:00.000Z',
      total: 620,
      paymentMethod: 'cash',
      userId: 'user-cashier-1',
      status: 'pending',
      items: [
        {
          id: 'prod-item-1',
          name: 'Café Moulu 250g',
          price: 250,
          costPrice: 150,
          quantity: 2,
          stock: 40,
          taxRate: 19,
          unit: 'pcs'
        } as any,
        {
          id: 'prod-item-2',
          name: 'Sucre Morceaux 1kg',
          price: 120,
          costPrice: 80,
          quantity: 1,
          stock: 30,
          taxRate: 19,
          unit: 'pcs'
        } as any
      ]
    };

    it('(a) utilise updated_at en snake_case et proscrit updatedAt dans le payload PostgREST (Anti-Erreur 42703)', async () => {
      const onClose = vi.fn();
      render(
        React.createElement(EditTransactionModal, {
          isOpen: true,
          onClose: onClose,
          transaction: originalTransaction,
          products: mockProducts,
          settings: mockSettings
        })
      );

      // Cliquer sur le bouton "Enregistrer les modifications"
      const saveButton = screen.getByText('Enregistrer les modifications');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('transactions');
      });

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const payloadPassed = mockSupabaseUpdate.mock.calls[0][0];

      // Vérification clé snake_case
      expect(payloadPassed).toHaveProperty('updated_at');
      expect(typeof payloadPassed.updated_at).toBe('string');

      // 🛡️ Zéro régression PostgREST : interdiction absolue de la colonne updatedAt camelCase
      expect(payloadPassed).not.toHaveProperty('updatedAt');
      expect(onClose).toHaveBeenCalled();
    });

    it('(b) consolide préalablement les deltas de stock et applique applyStockAdjustment en mode delta avec idempotence', async () => {
      const onClose = vi.fn();
      render(
        React.createElement(EditTransactionModal, {
          isOpen: true,
          onClose: onClose,
          transaction: originalTransaction,
          products: mockProducts,
          settings: mockSettings
        })
      );

      // Réduire la quantité de prod-item-1 de 2 à 1 (réintégration de +1 en stock)
      const minusButtons = screen.getAllByRole('button');
      // Le premier bouton Minus correspond au premier article
      const firstMinus = minusButtons.find((b: HTMLElement) => b.querySelector('svg')?.classList.contains('lucide-minus'));
      if (firstMinus) {
        fireEvent.click(firstMinus);
      }

      const saveButton = screen.getByText('Enregistrer les modifications');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockApplyStockAdjustment).toHaveBeenCalled();
      });

      // Vérifier l'appel à applyStockAdjustment
      expect(mockApplyStockAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-item-1',
          value: 1, // original (2) - nouveau (1) = +1 restitué au stock
          mode: 'delta',
          adjustmentId: `adj_edit_tx_${originalTransaction.id}_prod-item-1`
        })
      );

      // Vérifier que la persistance locale IndexedDB et le store Zustand ont été mis à jour
      expect(mockLocalDbUpdate).toHaveBeenCalledWith(
        `transactions/${originalTransaction.id}`,
        expect.objectContaining({
          id: originalTransaction.id,
          total: 370 // 1x 250 + 1x 120 = 370 DA
        })
      );
    });

    it('(c) gère le déballage de bundles/packs avec report arithmétique atomique sur les composants', async () => {
      const bundleTransaction: Transaction = {
        id: 'tx-bundle-002',
        timestamp: '2026-10-09T11:00:00.000Z',
        total: 500,
        paymentMethod: 'cash',
        userId: 'user-cashier-1',
        status: 'pending',
        items: [
          {
            id: 'bundle-pack-1',
            name: 'Pack Petit Déjeuner',
            price: 500,
            costPrice: 300,
            quantity: 2, // Contient 2 * 2 = 4 cafés et 2 * 1 = 2 sucres
            stock: 10,
            taxRate: 19,
            unit: 'pcs'
          } as any
        ]
      };

      const onClose = vi.fn();
      render(
        React.createElement(EditTransactionModal, {
          isOpen: true,
          onClose: onClose,
          transaction: bundleTransaction,
          products: mockProducts,
          settings: mockSettings
        })
      );

      // Réduire la quantité du pack de 2 à 1 (diminution de 1 pack, donc restitution de 2 cafés et 1 sucre)
      const minusButtons = screen.getAllByRole('button');
      const firstMinus = minusButtons.find((b: HTMLElement) => b.querySelector('svg')?.classList.contains('lucide-minus'));
      if (firstMinus) {
        fireEvent.click(firstMinus);
      }

      const saveButton = screen.getByText('Enregistrer les modifications');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockApplyStockAdjustment).toHaveBeenCalled();
      });

      // Vérification des deltas reportés sur les composants enfants du bundle
      expect(mockApplyStockAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-item-1',
          value: 2, // 1 pack * 2 unités par pack = +2 cafés
          mode: 'delta',
          adjustmentId: `adj_edit_tx_${bundleTransaction.id}_prod-item-1`
        })
      );

      expect(mockApplyStockAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-item-2',
          value: 1, // 1 pack * 1 unité par pack = +1 sucre
          mode: 'delta',
          adjustmentId: `adj_edit_tx_${bundleTransaction.id}_prod-item-2`
        })
      );
    });
  });

  describe('P0-DEVEX-01 : server.ts & package.json (Mode Développement Local & Vite HMR)', () => {
    it('(a) package.json expose le script "dev:vite": "vite" pour le développement direct', () => {
      const packageJsonPath = path.resolve(__dirname, '../package.json');
      const rawPackage = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(rawPackage);

      expect(pkg.scripts).toHaveProperty('dev:vite');
      expect(pkg.scripts['dev:vite']).toBe('vite');
    });

    it('(b) server.ts n\'utilise plus la clause !IS_EDITOR qui forçait IS_PROD à true en local', () => {
      const serverPath = path.resolve(__dirname, '../server.ts');
      const serverCode = fs.readFileSync(serverPath, 'utf-8');

      // Vérifier que !IS_EDITOR a été totalement supprimé de la définition de IS_PROD
      expect(serverCode).not.toContain('!IS_EDITOR');
    });

    it('(c) server.ts active le rechargement à chaud HMR (hmr: true) dans createViteServer', () => {
      const serverPath = path.resolve(__dirname, '../server.ts');
      const serverCode = fs.readFileSync(serverPath, 'utf-8');

      // Vérifier que createViteServer active HMR
      expect(serverCode).toContain('hmr: true');
      expect(serverCode).not.toContain('hmr: false');
    });

    it('(d) IS_PROD et computeIsProd s\'évaluent rigoureusement selon l\'environnement', async () => {
      const { IS_PROD, computeIsProd } = await import('../server');
      
      // En environnement de test / dev local non compilé
      if (process.env.NODE_ENV !== 'production' && !process.cwd().includes('dist')) {
        expect(IS_PROD).toBe(false);
      }

      // Test unitaire de computeIsProd avec simulation des variables
      // Mode Dev standard (sans K_SERVICE)
      expect(computeIsProd({ NODE_ENV: 'development' }, 'C:/app', 'C:/app/server.ts')).toBe(false);
      expect(computeIsProd({ NODE_ENV: undefined }, 'C:/app', 'C:/app/server.ts')).toBe(false);

      // Mode Production explicite
      expect(computeIsProd({ NODE_ENV: 'production' }, 'C:/app', 'C:/app/server.ts')).toBe(true);

      // Mode Packagé dans dist
      expect(computeIsProd({ NODE_ENV: 'development' }, 'C:/app/dist', 'C:/app/dist/server.cjs')).toBe(true);
    });
  });

  describe('P0-DEVEX-02 : .env.example & Typage ImportMetaEnv', () => {
    it('(a) .env.example contient l\'ensemble exhaustif des variables frontend et backend', () => {
      const envExamplePath = path.resolve(__dirname, '../.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Variables Supabase & Auth
      expect(envContent).toContain('VITE_SUPABASE_URL=');
      expect(envContent).toContain('VITE_SUPABASE_ANON_KEY=');
      expect(envContent).toContain('VITE_OWNER_EMAIL=');
      expect(envContent).toContain('VITE_OWNER_UID=');
      expect(envContent).toContain('VITE_ADMIN_EMAIL=');

      // Variables Serveur & API
      expect(envContent).toContain('PORT=');
      expect(envContent).toContain('NODE_ENV=');
      expect(envContent).toContain('VITE_APP_URL=');

      // Variables IA & Vision
      expect(envContent).toContain('VITE_GEMINI_API_KEY=');
      expect(envContent).toContain('GEMINI_API_KEY=');
      expect(envContent).toContain('VITE_GROQ_API_KEY=');
    });

    it('(b) src/vite-env.d.ts déclare l\'interface ImportMetaEnv avec les clés typées', () => {
      const viteEnvPath = path.resolve(__dirname, '../src/vite-env.d.ts');
      const viteEnvContent = fs.readFileSync(viteEnvPath, 'utf-8');

      expect(viteEnvContent).toContain('interface ImportMetaEnv');
      expect(viteEnvContent).toContain('VITE_SUPABASE_URL: string');
      expect(viteEnvContent).toContain('VITE_SUPABASE_ANON_KEY: string');
      expect(viteEnvContent).toContain('VITE_OWNER_EMAIL?: string');
      expect(viteEnvContent).toContain('VITE_ADMIN_EMAIL?: string');
      expect(viteEnvContent).toContain('VITE_OWNER_UID?: string');
      expect(viteEnvContent).toContain('VITE_APP_URL?: string');
      expect(viteEnvContent).toContain('VITE_GEMINI_API_KEY?: string');
      expect(viteEnvContent).toContain('VITE_GROQ_API_KEY?: string');
    });

    it('(c) src/config/ownerConfig.ts n\'utilise aucun contournement (import.meta as any).env', () => {
      const ownerConfigPath = path.resolve(__dirname, '../src/config/ownerConfig.ts');
      const ownerConfigContent = fs.readFileSync(ownerConfigPath, 'utf-8');

      // Zéro 'as any' sur import.meta
      expect(ownerConfigContent).not.toContain('(import.meta as any)');
      expect(ownerConfigContent).toContain('import.meta.env.VITE_OWNER_EMAIL');
      expect(ownerConfigContent).toContain('import.meta.env.VITE_OWNER_UID');
    });

    it('(d) checkIsOwner fonctionne de manière sécurisée et robuste', () => {
      // Test de cas limites
      expect(checkIsOwner(null, null)).toBe(false);
      expect(checkIsOwner('', '')).toBe(false);
      expect(checkIsOwner('fake@attacker.com', 'fake-uid')).toBe(false);

      if (OWNER_EMAILS.length > 0 && OWNER_EMAILS[0]) {
        expect(checkIsOwner(OWNER_EMAILS[0], null)).toBe(true);
        expect(checkIsOwner(OWNER_EMAILS[0].toUpperCase(), null)).toBe(true);
      }
    });
  });
});
