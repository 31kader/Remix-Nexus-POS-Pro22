import { describe, expect, it } from 'vitest';
import { validateAppUserCredentials } from '../src/lib/authAccountValidation';

describe('validateAppUserCredentials', () => {
  it('returns null when account is not app-enabled', () => {
    const result = validateAppUserCredentials({
      entityLabel: 'client',
      isAppUser: false,
      email: '',
      password: '',
      isEditing: false
    });

    expect(result).toBeNull();
  });

  it('requires email for app-enabled account', () => {
    const result = validateAppUserCredentials({
      entityLabel: 'client',
      isAppUser: true,
      email: '',
      password: '1234',
      isEditing: false
    });

    expect(result).toContain('email');
  });

  it('requires password on creation when app-enabled', () => {
    const result = validateAppUserCredentials({
      entityLabel: 'fournisseur',
      isAppUser: true,
      email: 'supplier@nexus.local',
      password: '',
      isEditing: false
    });

    expect(result).toContain('mot de passe');
  });

  it('allows empty password on edit when app-enabled', () => {
    const result = validateAppUserCredentials({
      entityLabel: 'fournisseur',
      isAppUser: true,
      email: 'supplier@nexus.local',
      password: '',
      isEditing: true
    });

    expect(result).toBeNull();
  });

  it('rejects weak password below minimum length', () => {
    const result = validateAppUserCredentials({
      entityLabel: 'client',
      isAppUser: true,
      email: 'client@nexus.local',
      password: '123',
      isEditing: false,
      minPasswordLength: 4
    });

    expect(result).toContain('au moins 4');
  });
});
