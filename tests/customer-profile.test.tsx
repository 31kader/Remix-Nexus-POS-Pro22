import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerProfile } from '../src/components/CustomerProfile';
import { LanguageProvider } from '../src/translations';
import type { Customer } from '../src/types';

describe('CustomerProfile', () => {
  it('renders even when the customer name is missing', () => {
    const customer = {
      id: '1',
      name: undefined as unknown as string,
      loyaltyPoints: 0,
      balance: 0,
      totalSpent: 0,
      favoriteItems: [],
      alerts: [],
      cashierNotes: [],
    } as Customer;

    expect(() =>
      render(
        <LanguageProvider>
          <CustomerProfile customer={customer} onAddNote={() => {}} />
        </LanguageProvider>
      )
    ).not.toThrow();

    expect(screen.getByText('Client sans nom')).toBeTruthy();
  });
});
