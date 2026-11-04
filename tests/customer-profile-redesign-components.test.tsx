import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CustomerIdentityAndCommercialCard } from '../src/components/customers/info/CustomerIdentityAndCommercialCard';
import { CustomerPurchaseStatsCard } from '../src/components/customers/info/CustomerPurchaseStatsCard';
import { CustomerLedgerNotesTable } from '../src/components/customers/info/CustomerLedgerNotesTable';
import type { Customer, CompanySettings } from '../src/types';

describe('Composants Récents de la Fiche Client Redessinée (Velvet Obsidian)', () => {
  const mockSettings: CompanySettings = {
    name: 'Nexus Algerie',
    currency: 'DA',
    taxRate: 0,
    receiptTemplate: 'standard',
    labelTemplate: 'standard',
    loyaltyPointsPerCurrencyUnit: 1,
    loyaltyPointValue: 1
  };

  const mockCustomer: Customer = {
    id: 'cust-test-123',
    name: 'Mourad Hadj Ali',
    phone: '0550123456',
    email: 'mourad@example.com',
    balance: 15400,
    totalSpent: 87500,
    loyaltyPoints: 340,
    purchaseCount: 14,
    lastPurchaseDate: '2026-11-04T12:00:00Z',
    address: 'Rue Didouche Mourad, Alger',
    city: 'Alger',
    isWholesale: true,
    creditLimit: 50000,
    latitude: 36.7538,
    longitude: 3.0588,
    mapsUrl: 'https://maps.google.com/?q=36.7538,3.0588',
    isAppUser: true,
    cashierNotes: [
      { note: 'Versement de 5000 DA par chèque', timestamp: '2026-11-01 10:00', author: 'Caisse 1' },
      { note: 'Client régulier très sérieux', timestamp: '2026-10-15 14:30', author: 'Admin' }
    ]
  };

  describe('1. CustomerIdentityAndCommercialCard', () => {
    it('affiche fidèlement les coordonnées, les badges B2B et les liens GPS', () => {
      render(
        <CustomerIdentityAndCommercialCard
          selectedCustomer={mockCustomer}
          settings={mockSettings}
          onOpenStatement={vi.fn()}
        />
      );

      expect(screen.getByText('0550123456')).toBeTruthy();
      expect(screen.getByText('mourad@example.com')).toBeTruthy();
      expect(screen.getByText(/Rue Didouche Mourad/)).toBeTruthy();
      expect(screen.getByText('Grossiste B2B')).toBeTruthy();
      expect(screen.getByText(/50000 DA/)).toBeTruthy();
      expect(screen.getByText(/Maps/)).toBeTruthy();
      expect(screen.getByText(/Waze/)).toBeTruthy();
      expect(screen.getByText(/Compte synchronisé sur l'Application Mobile/)).toBeTruthy();
    });
  });

  describe('2. CustomerPurchaseStatsCard', () => {
    it('affiche les totaux financiers en Dinars Algériens (DA) avec le formatage financier', () => {
      const historyStats = {
        storeTotal: 60000,
        storeCount: 10,
        onlineTotal: 27500,
        onlineCount: 4,
        netTotal: 87500,
        returnsCount: 0
      };

      render(
        <CustomerPurchaseStatsCard
          historyStats={historyStats}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('Achats en Magasin')).toBeTruthy();
      expect(screen.getByText('Commandes en Ligne')).toBeTruthy();
      expect(screen.getByText('Volume Net Cumulé')).toBeTruthy();
      expect(screen.getByText(/10 passages en caisse physique/)).toBeTruthy();
      expect(screen.getByText(/4 commandes mobile \/ web/)).toBeTruthy();
    });
  });

  describe('3. CustomerLedgerNotesTable', () => {
    it('affiche le journal des mémos et versements et permet la saisie rapide', async () => {
      const handleAddNote = vi.fn();
      render(
        <CustomerLedgerNotesTable
          selectedCustomer={mockCustomer}
          settings={mockSettings}
          onAddNote={handleAddNote}
        />
      );

      expect(screen.getByText(/Versement de 5000 DA par chèque/)).toBeTruthy();
      expect(screen.getByText(/Client régulier très sérieux/)).toBeTruthy();

      const input = screen.getByPlaceholderText(/Ajouter une note ou un mémo/i);
      fireEvent.change(input, { target: { value: 'Nouveau versement espèces 2000 DA' } });

      const addBtn = screen.getByRole('button', { name: /Ajouter/i });
      await act(async () => {
        fireEvent.click(addBtn);
      });

      expect(handleAddNote).toHaveBeenCalledWith('Nouveau versement espèces 2000 DA');
    });
  });
});
