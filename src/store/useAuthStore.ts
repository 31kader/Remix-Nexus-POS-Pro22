import React from 'react';
import { create } from 'zustand';
import { UserProfile } from '../types';
import { User } from '../services/AuthService';
import { setSentryUser } from '../lib/sentry';

interface AuthState {
  user: User | UserProfile | null;
  profile: UserProfile | null;
  authError: React.ReactNode;
  isLoggingIn: boolean;
  isUnauthorized: boolean;
  pendingAdminUnlockUser: any | null;
  
  setUser: (user: User | UserProfile | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAuthError: (error: React.ReactNode) => void;
  setIsLoggingIn: (isLoggingIn: boolean) => void;
  setIsUnauthorized: (isUnauthorized: boolean) => void;
  setPendingAdminUnlockUser: (user: any | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  authError: '',
  isLoggingIn: false,
  isUnauthorized: false,
  pendingAdminUnlockUser: null,

  setUser: (user) => {
    set({ user });
    setSentryUser(user ? { uid: user.uid, role: (user as any).role } : null);
  },
  setProfile: (profile) => set({ profile }),
  setAuthError: (authError) => set({ authError }),
  setIsLoggingIn: (isLoggingIn) => set({ isLoggingIn }),
  setIsUnauthorized: (isUnauthorized) => set({ isUnauthorized }),
  setPendingAdminUnlockUser: (pendingAdminUnlockUser) => set({ pendingAdminUnlockUser }),
}));
