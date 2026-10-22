import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('⚔️ Empirical Challenger M3 — Desktop Non-Regression & Business Logic Integrity', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. Customers : Desktop split layout (>= md) and Grand Tableau (>= lg) are intact', () => {
    const customersPath = path.join(rootDir, 'src/components/Customers.tsx');
    const tablePath = path.join(rootDir, 'src/components/customers/CustomerTableView.tsx');
    const customersContent = fs.readFileSync(customersPath, 'utf-8');
    const tableContent = fs.readFileSync(tablePath, 'utf-8');

    // Desktop split preservation
    expect(customersContent).toContain('w-full md:w-1/3 flex flex-col gap-3');
    expect(customersContent).toContain('md:w-2/3 md:flex-initial');
    expect(customersContent).toContain('hidden md:flex md:w-2/3 md:h-full');

    // Mobile back button is strictly hidden on desktop
    expect(customersContent).toContain('className="md:hidden');
    expect(customersContent).toContain('Retour à la liste');

    // CustomerTableView desktop table has all columns intact
    expect(tableContent).toContain('hidden lg:block overflow-x-auto');
    expect(tableContent).toContain('<table className="w-full text-left border-collapse min-w-[900px]">');
    expect(tableContent).toContain('<th className="py-4 px-4">Client</th>');
    expect(tableContent).toContain('<th className="py-4 px-4">Téléphone & Email</th>');
    expect(tableContent).toContain('<th className="py-4 px-4">Situation Solde / Dette</th>');
    expect(tableContent).toContain('<th className="py-4 px-4">Points</th>');
    expect(tableContent).toContain('<th className="py-4 px-4">CA Total</th>');
    expect(tableContent).toContain('<th className="py-4 px-4">Dernière Visite</th>');
    expect(tableContent).toContain('<th className="py-4 px-4 text-right">Actions</th>');

    // Balance calculations and currencies
    expect(tableContent).toContain("settings.currency || 'DA'");
    expect(tableContent).toContain('balance < 0 ? (');
  });

  it('2. Expenses : Desktop table has all 6 columns and sorting intact without layout breakage', () => {
    const expensesPath = path.join(rootDir, 'src/components/Expenses.tsx');
    const content = fs.readFileSync(expensesPath, 'utf-8');

    // Desktop container & table
    expect(content).toContain('hidden lg:block overflow-x-auto');
    expect(content).toContain('<table className="w-full text-left border-collapse">');

    // Headers
    expect(content).toContain('sortKey="date"');
    expect(content).toContain('sortKey="description"');
    expect(content).toContain('sortKey="category"');
    expect(content).toContain('sortKey="paymentMethod"');
    expect(content).toContain('sortKey="amount"');
    expect(content).toContain('Actions');

    // Currency formatting
    expect(content).toContain("settings.currency || 'DA'");
    expect(content).toContain('formatPrice(');

    // Mobile cards are strictly hidden on desktop
    expect(content).toContain('block lg:hidden space-y-3');
  });

  it('3. CashManagementHistory : Desktop table preserves all 8 columns and Z Report action', () => {
    const cashPath = path.join(rootDir, 'src/components/cash-management/CashManagementHistory.tsx');
    const content = fs.readFileSync(cashPath, 'utf-8');

    // Desktop container & table
    expect(content).toContain('hidden lg:block overflow-x-auto');
    expect(content).toContain('<table className="w-full text-left border-collapse">');

    // 8 columns
    expect(content).toContain('Date & Horaires');
    expect(content).toContain('Caissier');
    expect(content).toContain('Fond Initial');
    expect(content).toContain('Attendu');
    expect(content).toContain('Compté (Final)');
    expect(content).toContain('Écart');
    expect(content).toContain('CA Total');
    expect(content).toContain('Rapport Z');

    // Variance logic (diff = final - expected)
    expect(content).toContain('const diff = final - expected;');
    expect(content).toContain('diff < -0.01');
    expect(content).toContain('diff > 0.01');
    expect(content).toContain('printZReport(shift, settings)');

    // Mobile cards are strictly hidden on desktop
    expect(content).toContain('block lg:hidden space-y-3');
  });

  it('4. ShortagesTable : Desktop table preserves all 8 columns and bulk checkbox selection', () => {
    const shortagesPath = path.join(rootDir, 'src/components/smart-purchase/shortages/ShortagesTable.tsx');
    const content = fs.readFileSync(shortagesPath, 'utf-8');

    // Desktop table container
    expect(content).toContain('hidden lg:block overflow-x-auto');
    expect(content).toContain('<table className="w-full text-left border-collapse">');

    // Columns
    expect(content).toContain('Article & Référence');
    expect(content).toContain('Stock / Seuil');
    expect(content).toContain('Fournisseur');
    expect(content).toContain('P.U Achat');
    expect(content).toContain('Quantité Souhaitée');
    expect(content).toContain('Sous-Total Estimé');
    expect(content).toContain('Actions');

    // Bulk selection checkbox
    expect(content).toContain('handleHeaderCheckToggle');

    // Subtotal and currency
    expect(content).toContain('totalFilteredValuation');
    expect(content).toContain('DA');

    // Mobile cards are hidden on desktop
    expect(content).toContain('block lg:hidden space-y-3');
  });

  it('5. PurchaseCartTable : Desktop table preserves all 7 columns, inline inputs and association controls', () => {
    const cartPath = path.join(rootDir, 'src/components/smart-purchase/PurchaseCartTable.tsx');
    const content = fs.readFileSync(cartPath, 'utf-8');

    // Desktop table container
    expect(content).toContain('hidden lg:block w-full overflow-x-auto');
    expect(content).toContain('<table className="w-full text-left border-collapse min-w-[760px]">');

    // Columns
    expect(content).toContain('Article');
    expect(content).toContain('P. Achat HT');
    expect(content).toContain('Qté');
    expect(content).toContain('Remise (%)');
    expect(content).toContain('TVA (%)');
    expect(content).toContain('Total HT');
    expect(content).toContain('Actions');

    // Calculations intact
    expect(content).toContain('lineTotal = ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)) * (1 - (Number(item.discount) || 0) / 100)');

    // Mobile cards are hidden on desktop
    expect(content).toContain('block lg:hidden space-y-3');
  });

  it('6. InventoryProductRow : Desktop financial columns (Achat, Vente, Marge) and mobile view are cleanly partitioned', () => {
    const rowPath = path.join(rootDir, 'src/components/inventory/InventoryProductRow.tsx');
    const content = fs.readFileSync(rowPath, 'utf-8');

    // Desktop section
    expect(content).toContain('hidden md:flex items-center gap-6 text-right');
    expect(content).toContain('Achat');
    expect(content).toContain('Vente');
    expect(content).toContain('Marge');

    // Mobile section
    expect(content).toContain('flex md:hidden items-center gap-2 mt-1.5 flex-wrap text-xs font-mono');
    expect(content).toContain('Marge:');

    // Margin formula intact
    expect(content).toContain('margin = (product.price || 0) - (product.costPrice || 0)');
  });
});
