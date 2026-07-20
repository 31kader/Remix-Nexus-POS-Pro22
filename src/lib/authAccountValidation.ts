export interface AppUserValidationInput {
  entityLabel: 'client' | 'fournisseur';
  isAppUser: boolean;
  email: string;
  password: string;
  isEditing: boolean;
  minPasswordLength?: number;
}

export function validateAppUserCredentials(input: AppUserValidationInput): string | null {
  const {
    entityLabel,
    isAppUser,
    email,
    password,
    isEditing,
    minPasswordLength = 4
  } = input;

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!isAppUser) {
    return null;
  }

  if (!cleanEmail) {
    return `L'email est obligatoire pour un compte ${entityLabel} connecte.`;
  }

  if (!isEditing && !cleanPassword) {
    return `Le mot de passe est obligatoire pour creer un compte ${entityLabel} connecte.`;
  }

  if (cleanPassword && cleanPassword.length < minPasswordLength) {
    return `Le mot de passe doit contenir au moins ${minPasswordLength} caracteres.`;
  }

  return null;
}
