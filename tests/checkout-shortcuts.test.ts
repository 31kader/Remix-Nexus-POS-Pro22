import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCheckoutShortcuts } from '../src/components/checkout/useCheckoutShortcuts';

describe('useCheckoutShortcuts - Non-blocage des lettres et gestion des touches F', () => {
  it('ne bloque JAMAIS la lettre "F" majuscule ni la lettre "f" minuscule', () => {
    const searchRef = { current: document.createElement('input') };
    const handleCheckout = vi.fn();
    const setCart = vi.fn();

    renderHook(() => useCheckoutShortcuts({
      cart: [],
      searchRef,
      handleCheckout,
      setCart
    }));

    // Simuler frappe de la lettre 'F' (Caps Lock ou Shift+F)
    const eventCapitalF = new KeyboardEvent('keydown', { key: 'F', bubbles: true, cancelable: true });
    window.dispatchEvent(eventCapitalF);
    expect(eventCapitalF.defaultPrevented).toBe(false);

    // Simuler frappe de la lettre 'f'
    const eventLowerF = new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true });
    window.dispatchEvent(eventLowerF);
    expect(eventLowerF.defaultPrevented).toBe(false);
  });

  it('ne bloque pas les lettres d\'un mot comme FROMAGE ou FARINE', () => {
    const searchRef = { current: document.createElement('input') };
    const handleCheckout = vi.fn();
    const setCart = vi.fn();

    renderHook(() => useCheckoutShortcuts({
      cart: [],
      searchRef,
      handleCheckout,
      setCart
    }));

    ['F', 'R', 'O', 'M', 'A', 'G', 'E'].forEach(letter => {
      const event = new KeyboardEvent('keydown', { key: letter, bubbles: true, cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it('intercepte et bloque correctement les touches de fonction non utilisées (F1, F6, F7, F8, F9, F12)', () => {
    const searchRef = { current: document.createElement('input') };
    const handleCheckout = vi.fn();
    const setCart = vi.fn();

    renderHook(() => useCheckoutShortcuts({
      cart: [],
      searchRef,
      handleCheckout,
      setCart
    }));

    // F1 doit être bloqué pour éviter l'aide du navigateur/Windows
    const eventF1 = new KeyboardEvent('keydown', { key: 'F1', bubbles: true, cancelable: true });
    window.dispatchEvent(eventF1);
    expect(eventF1.defaultPrevented).toBe(true);

    // F6 doit être bloqué
    const eventF6 = new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true });
    window.dispatchEvent(eventF6);
    expect(eventF6.defaultPrevented).toBe(true);

    // F12 sans Shift doit être bloqué pour éviter DevTools intempestif
    const eventF12 = new KeyboardEvent('keydown', { key: 'F12', bubbles: true, cancelable: true });
    window.dispatchEvent(eventF12);
    expect(eventF12.defaultPrevented).toBe(true);
  });

  it('exécute F3 pour focaliser la barre de recherche', () => {
    const input = document.createElement('input');
    const focusSpy = vi.spyOn(input, 'focus');
    const selectSpy = vi.spyOn(input, 'select');
    const searchRef = { current: input };

    renderHook(() => useCheckoutShortcuts({
      cart: [],
      searchRef,
      handleCheckout: vi.fn(),
      setCart: vi.fn()
    }));

    const eventF3 = new KeyboardEvent('keydown', { key: 'F3', bubbles: true, cancelable: true });
    window.dispatchEvent(eventF3);
    expect(eventF3.defaultPrevented).toBe(true);
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  });
});
