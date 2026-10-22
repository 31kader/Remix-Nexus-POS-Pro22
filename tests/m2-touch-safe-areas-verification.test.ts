import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('📱 Jalon M2 — Refonte Responsive Mobile Caisse, Safe Area Insets & Ergonomie Tactile', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. Checkout.tsx : intègre les Safe Area Inset Bottom sur la barre mobile et le volet de paiement', () => {
    const filePath = path.join(rootDir, 'src/components/Checkout.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Barre d'actions mobile
    expect(content).toContain('pb-[max(env(safe-area-inset-bottom,0px),10px)]');
    // Volet tactile de paiement
    expect(content).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');
  });

  it('2. CheckoutSuccessModal.tsx : prévient le débordement horizontal sur écran étroit (< 380px)', () => {
    const filePath = path.join(rootDir, 'src/components/checkout/CheckoutSuccessModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('min-w-[380px]');
    expect(content).toContain('w-full max-w-sm mx-4');
  });

  it('3. CartItemsList.tsx : boutons de quantité et touches rapides agrandis pour le tactile (>= 38px)', () => {
    const filePath = path.join(rootDir, 'src/components/checkout/CartItemsList.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Boutons -1 et +1 agrandis à 40x40px
    expect(content).toContain('w-10 h-10 flex items-center justify-center rounded-lg');
    // Touches rapides de quantité 1, 2, 3, 5, 10, 20
    expect(content).toContain('min-w-[38px] h-10 px-2 flex items-center justify-center');
  });

  it('4. CartItemRow.tsx : cibles tactiles stepper et actions de ligne conformes (>= 38px)', () => {
    const filePath = path.join(rootDir, 'src/components/checkout/CartItemRow.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Stepper boutons - et + en w-10 h-10
    expect(content).toContain('w-10 h-10 flex items-center justify-center');
    // Bouton poubelle suppression
    expect(content).toContain('min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600');
    // Bouton détails produit
    expect(content).toContain('min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-amber-500/10');
  });

  it('5. Safe Area Insets sur les modales critiques (PinLock, BarcodeScanner, AddStaff, ShortagesDrawer)', () => {
    const pinLockContent = fs.readFileSync(path.join(rootDir, 'src/components/PinLockModal.tsx'), 'utf-8');
    expect(pinLockContent).toContain('pt-[max(env(safe-area-inset-top,0px),12px)] pb-[max(env(safe-area-inset-bottom,0px),16px)]');

    const barcodeContent = fs.readFileSync(path.join(rootDir, 'src/components/BarcodeScanner.tsx'), 'utf-8');
    expect(barcodeContent).toContain('pt-[max(env(safe-area-inset-top,0px),16px)]');

    const addStaffContent = fs.readFileSync(path.join(rootDir, 'src/components/AddStaffModal.tsx'), 'utf-8');
    expect(addStaffContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');

    const shortagesContent = fs.readFileSync(path.join(rootDir, 'src/components/smart-purchase/shortages/ShortageSuggestionsDrawer.tsx'), 'utf-8');
    expect(shortagesContent).toContain('pb-[max(env(safe-area-inset-bottom,0px),16px)]');
  });
});
