import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('📱 Jalon M3 — Refonte Responsive Mobile des Écrans Métier (Clients, Dépenses, Caisse, Achats & Inventaire)', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. Customers.tsx : navigation fluide responsive (liste 100% sur mobile sans client, détail 100% avec bouton retour)', () => {
    const filePath = path.join(rootDir, 'src/components/Customers.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Panneau de gauche (liste) : masqué sur mobile si un client est sélectionné
    expect(content).toContain('selectedCustomerId ? "hidden md:flex" : "flex"');

    // Panneau de droite (détail) : masqué sur mobile si aucun client sélectionné, 100% plein écran si sélectionné
    expect(content).toContain('selectedCustomerId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full"');

    // Bouton de retour mobile bien visible vers la liste
    expect(content).toContain('onClick={() => setSelectedCustomerId(null)}');
    expect(content).toContain('Retour à la liste');
    expect(content).toContain('ArrowLeft className="w-5 h-5 text-indigo-400"');
  });

  it('2. CustomerTableView.tsx : vue cartes tactiles mobile (block lg:hidden) et tableau bureau (hidden lg:block)', () => {
    const filePath = path.join(rootDir, 'src/components/customers/CustomerTableView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Pattern adaptatif cartes / table
    expect(content).toContain('block lg:hidden space-y-3 p-3');
    expect(content).toContain('hidden lg:block overflow-x-auto');

    // Données affichées sur mobile
    expect(content).toContain('cust.name || \'Client sans nom\'');
    expect(content).toContain('cust.loyaltyPoints');
    expect(content).toContain('settings.currency || \'DA\'');

    // Cibles tactiles >= 38px
    expect(content).toContain('min-h-[38px]');
    expect(content).toContain('min-w-[38px]');
  });

  it('3. CustomerGlobalJournalView.tsx : cartes timeline mobiles et tableau panoramique bureau', () => {
    const filePath = path.join(rootDir, 'src/components/customers/CustomerGlobalJournalView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('block lg:hidden space-y-3 p-3');
    expect(content).toContain('hidden lg:block overflow-x-auto');
    expect(content).toContain('item.customerName || \'Client de passage\'');
    expect(content).toContain('min-h-[38px]');
    expect(content).toContain('min-w-[38px]');
  });

  it('4. CustomerGlobalGeneralView.tsx : cartes mémos/règlements mobiles et tableau bureau', () => {
    const filePath = path.join(rootDir, 'src/components/customers/CustomerGlobalGeneralView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('block lg:hidden space-y-3 p-3');
    expect(content).toContain('hidden lg:block overflow-x-auto');
    expect(content).toContain('noteItem.customerName');
    expect(content).toContain('noteItem.typeLabel');
    expect(content).toContain('noteItem.author');
  });

  it('5. Expenses.tsx : vue cartes tactiles mobile pleine largeur avec montant DA et cibles >= 38px', () => {
    const filePath = path.join(rootDir, 'src/components/Expenses.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Pattern cartes mobile vs tableau bureau
    expect(content).toContain('block lg:hidden space-y-3 p-3');
    expect(content).toContain('hidden lg:block overflow-x-auto');

    // Données clés et devise DA
    expect(content).toContain('expense.description');
    expect(content).toContain('formatPrice(expense.amount)');
    expect(content).toContain('settings.currency || \'DA\'');

    // Cibles tactiles >= 38px pour actions
    expect(content).toContain('min-w-[38px] min-h-[38px]');
  });

  it('6. CashManagementHistory.tsx : cartes tactiles mobile des sessions de caisse avec écart DA et rapport Z', () => {
    const filePath = path.join(rootDir, 'src/components/cash-management/CashManagementHistory.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('block lg:hidden space-y-3 p-3');
    expect(content).toContain('hidden lg:block overflow-x-auto');
    expect(content).toContain('shift.openedBy || \'Caissier\'');
    expect(content).toContain('diff < -0.01');
    expect(content).toContain('min-h-[38px]');
    expect(content).toContain('printZReport(shift, settings)');
  });

  it('7. ShortagesTable.tsx & PurchaseCartTable.tsx : cartes tactiles d\'approvisionnement et manques', () => {
    const shortagesPath = path.join(rootDir, 'src/components/smart-purchase/shortages/ShortagesTable.tsx');
    const shortagesContent = fs.readFileSync(shortagesPath, 'utf-8');

    expect(shortagesContent).toContain('block lg:hidden space-y-3 p-3');
    expect(shortagesContent).toContain('hidden lg:block overflow-x-auto');
    expect(shortagesContent).toContain('w-10 h-10 rounded-xl');
    expect(shortagesContent).toContain('min-w-[38px] min-h-[38px]');

    const cartPath = path.join(rootDir, 'src/components/smart-purchase/PurchaseCartTable.tsx');
    const cartContent = fs.readFileSync(cartPath, 'utf-8');

    expect(cartContent).toContain('block lg:hidden space-y-3 p-3');
    expect(cartContent).toContain('hidden lg:block w-full overflow-x-auto');
    expect(cartContent).toContain('w-10 h-10 rounded-xl');
  });

  it('8. InventoryProductRow.tsx : prix de vente et marge visibles sur smartphone, cibles tactiles >= 32px à 38px', () => {
    const filePath = path.join(rootDir, 'src/components/inventory/InventoryProductRow.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Checkbox agrandie pour le toucher tactile (w-8 h-8 / min-w-[32px])
    expect(content).toContain('w-8 h-8 min-w-[32px] min-h-[32px]');

    // Prix et marge visibles sur mobile (< md)
    expect(content).toContain('flex md:hidden items-center gap-2 mt-1.5 flex-wrap text-xs font-mono');
    expect(content).toContain('(product.price || 0).toFixed(2)');
    expect(content).toContain('Marge:');
  });
});
