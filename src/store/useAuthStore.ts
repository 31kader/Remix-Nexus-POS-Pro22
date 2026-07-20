import { create } from 'zustand';
import { UserProfile, RolePermissions } from '../types';

interface AuthState {
  user: any;
  profile: UserProfile | null;
  authError: any;
  isLoggingIn: boolean;
  isUnauthorized: boolean;
  
  setUser: (user: any) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAuthError: (error: any) => void;
  setIsLoggingIn: (isLoggingIn: boolean) => void;
  setIsUnauthorized: (isUnauthorized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  authError: '',
  isLoggingIn: false,
  isUnauthorized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthError: (authError) => set({ authError }),
  setIsLoggingIn: (isLoggingIn) => set({ isLoggingIn }),
  setIsUnauthorized: (isUnauthorized) => set({ isUnauthorized }),
}));
