import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuantityInput } from '../src/components/checkout/QuantityInput';
import { CartItem } from '../src/types';

describe('QuantityInput Full Validation', () => {
  it('test typing key 6 (-) on AZERTY without Shift converts to 6 in normal sale', () => {
    let currentQty = 1;
    const item: CartItem = {
      id: 'p1',
      cartItemId: 'item-1',
      name: 'Produit Test',
      price: 100,
      quantity: 1,
    } as any;

    const setQuantity = vi.fn((id, qty) => {
      currentQty = qty;
    });

    render(<QuantityInput item={item} setQuantity={setQuantity} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    // User types '-' on AZERTY keyboard (key 6)
    fireEvent.change(input, { target: { value: '-' } });
    expect(input.value).toBe('6');
    expect(setQuantity).toHaveBeenCalledWith('item-1', 6, false);
  });

  it('test Arabic-Indic digits convert to standard numbers', () => {
    const item: CartItem = {
      id: 'p1',
      cartItemId: 'item-1',
      name: 'Produit Test',
      price: 100,
      quantity: 1,
    } as any;

    const setQuantity = vi.fn();

    render(<QuantityInput item={item} setQuantity={setQuantity} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    // User types Arabic ٥ (5)
    fireEvent.change(input, { target: { value: '٥' } });
    expect(input.value).toBe('5');
    expect(setQuantity).toHaveBeenCalledWith('item-1', 5, false);

    // User types Arabic ١٠ (10)
    fireEvent.change(input, { target: { value: '١٠' } });
    expect(input.value).toBe('10');
    expect(setQuantity).toHaveBeenCalledWith('item-1', 10, false);
  });

  it('test ArrowUp and ArrowDown keys', () => {
    const item: CartItem = {
      id: 'p1',
      cartItemId: 'item-1',
      name: 'Produit Test',
      price: 100,
      quantity: 2,
    } as any;

    const setQuantity = vi.fn();

    render(<QuantityInput item={item} setQuantity={setQuantity} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('3');
    expect(setQuantity).toHaveBeenCalledWith('item-1', 3, false);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('2');
    expect(setQuantity).toHaveBeenCalledWith('item-1', 2, false);
  });
});
