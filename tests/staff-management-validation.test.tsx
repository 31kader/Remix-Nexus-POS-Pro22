import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddStaffModal } from '../src/components/AddStaffModal';

describe('AddStaffModal validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prevents creating an account without a name or identifier', () => {
    const onSave = vi.fn();
    render(<AddStaffModal isOpen={true} onClose={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByText(/nom complet est obligatoire/i)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('prevents weak passwords shorter than four characters', () => {
    const onSave = vi.fn();
    render(<AddStaffModal isOpen={true} onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/ex: ahmed ben/i), { target: { value: 'Ahmed' } });
    fireEvent.change(screen.getByPlaceholderText(/05xxxxxxxx/i), { target: { value: '0555555555' } });
    fireEvent.change(screen.getByPlaceholderText(/minimum 4 caractères/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByText(/au moins 4 caractères/i)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});
