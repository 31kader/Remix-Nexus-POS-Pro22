import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCheckoutShortcuts } from '../src/components/checkout/useCheckoutShortcuts';
import { CartItem } from '../src/types';

describe('⚡ Raccourcis Clavier Exclusifs de Caisse (POS)', () => {
  let mockCart: CartItem[];
  let searchInput: HTMLInputElement;
  let barcodeInput: HTMLInputElement;
  let searchRef: { current: HTMLInputElement | null };
  let handleCheckout: any;
  let setCart: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCart = [
      {
        id: 'p1',
        cartItemId: 'item-1',
        name: 'Produit Test 1',
        price: 150,
        costPrice: 100,
        quantity: 2,
        sku: 'SKU-001',
        barcode: '613000000001',
        taxRate: 19,
        stock: 50,
        minStock: 5,
        unit: 'pcs',
        categoryId: 'cat-1',
        supplier: 'Fournisseur 1',
        status: 'active',
        priceHistory: [],
        updatedAt: new Date().toISOString()
      } as CartItem
    ];

    document.body.innerHTML = '';

    searchInput = document.createElement('input');
    searchInput.id = 'product-search-input';
    document.body.appendChild(searchInput);

    barcodeInput = document.createElement('input');
    barcodeInput.id = 'direct-barcode-input';
    document.body.appendChild(barcodeInput);

    searchRef = { current: searchInput };
    handleCheckout = vi.fn();
    setCart = vi.fn();

    vi.spyOn(searchInput, 'focus');
    vi.spyOn(searchInput, 'select');
    vi.spyOn(barcodeInput, 'focus');
    vi.spyOn(barcodeInput, 'select');
  });

  it('1. F2 : Vide le panier avec confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'F2', cancelable: true });
    window.dispatchEvent(event);

    expect(window.confirm).toHaveBeenCalledWith("Voulez-vous vraiment vider le panier ?");
    expect(setCart).toHaveBeenCalledWith([]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('2. F10 : Sélectionne et donne le focus à la barre de code-barres', () => {
    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'F10', cancelable: true });
    window.dispatchEvent(event);

    expect(barcodeInput.focus).toHaveBeenCalled();
    expect(barcodeInput.select).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('3. F3 : Sélectionne et donne le focus à la barre de recherche', () => {
    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'F3', cancelable: true });
    window.dispatchEvent(event);

    expect(searchInput.focus).toHaveBeenCalled();
    expect(searchInput.select).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('4. Alt+P : Valide la vente ET imprime le ticket', () => {
    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'p', altKey: true, cancelable: true });
    window.dispatchEvent(event);

    expect(handleCheckout).toHaveBeenCalledWith('cash', true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('5. F5 : Valide la vente SANS imprimer et empêche le rechargement navigateur', () => {
    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'F5', cancelable: true });
    window.dispatchEvent(event);

    expect(handleCheckout).toHaveBeenCalledWith('cash', false);
    expect(event.defaultPrevented).toBe(true);
  });

  it('6. Tout autre raccourci F (F1, F4, F8, F11, etc.) est désactivé et neutralisé', () => {
    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    // Test F1
    const eventF1 = new KeyboardEvent('keydown', { key: 'F1', cancelable: true });
    window.dispatchEvent(eventF1);
    expect(handleCheckout).not.toHaveBeenCalled();
    expect(eventF1.defaultPrevented).toBe(true);

    // Test F4
    const eventF4 = new KeyboardEvent('keydown', { key: 'F4', cancelable: true });
    window.dispatchEvent(eventF4);
    expect(handleCheckout).not.toHaveBeenCalled();
    expect(eventF4.defaultPrevented).toBe(true);

    // Test F8
    const eventF8 = new KeyboardEvent('keydown', { key: 'F8', cancelable: true });
    window.dispatchEvent(eventF8);
    expect(handleCheckout).not.toHaveBeenCalled();
    expect(eventF8.defaultPrevented).toBe(true);

    // Test F11
    const eventF11 = new KeyboardEvent('keydown', { key: 'F11', cancelable: true });
    window.dispatchEvent(eventF11);
    expect(handleCheckout).not.toHaveBeenCalled();
    expect(eventF11.defaultPrevented).toBe(true);

    // Test F12 seul (bloqué pour éviter ouverture intempestive par les caissiers)
    const eventF12 = new KeyboardEvent('keydown', { key: 'F12', cancelable: true });
    window.dispatchEvent(eventF12);
    expect(handleCheckout).not.toHaveBeenCalled();
    expect(eventF12.defaultPrevented).toBe(true);
  });

  it('7. Raccourcis sécurisés DevTools admin (Ctrl+Shift+F12 et Ctrl+Alt+D) ne sont PAS bloqués', () => {
    renderHook(() =>
      useCheckoutShortcuts({
        cart: mockCart,
        searchRef,
        handleCheckout,
        setCart
      })
    );

    // Test Ctrl+Shift+F12
    const eventCtrlShiftF12 = new KeyboardEvent('keydown', {
      key: 'F12',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true
    });
    window.dispatchEvent(eventCtrlShiftF12);
    expect(eventCtrlShiftF12.defaultPrevented).toBe(false);

    // Test Ctrl+Alt+D
    const eventCtrlAltD = new KeyboardEvent('keydown', {
      key: 'd',
      ctrlKey: true,
      altKey: true,
      cancelable: true
    });
    window.dispatchEvent(eventCtrlAltD);
    expect(eventCtrlAltD.defaultPrevented).toBe(false);
  });
});
