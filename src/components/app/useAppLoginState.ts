import { useState } from 'react';
import type { Customer, Supplier } from '../../types';

export function useAppLoginState() {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(() => {
    let cachedOffline: string | null = null;
    let cachedOnline: string | null = null;
    try {
      cachedOffline = sessionStorage.getItem('nexus_active_offline_session');
      if (!cachedOffline) {
        cachedOffline = localStorage.getItem('nexus_active_offline_session');
        if (cachedOffline) {
          sessionStorage.setItem('nexus_active_offline_session', cachedOffline);
          localStorage.removeItem('nexus_active_offline_session');
        }
      }
      cachedOnline = sessionStorage.getItem('nexus_active_online_session');
      if (!cachedOnline) {
        cachedOnline = localStorage.getItem('nexus_active_online_session');
        if (cachedOnline) {
          sessionStorage.setItem('nexus_active_online_session', cachedOnline);
          localStorage.removeItem('nexus_active_online_session');
        }
      }
    } catch (_) {
      cachedOffline = null;
      cachedOnline = null;
    }
    return !(cachedOffline || cachedOnline);
  });

  return {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    showPassword,
    setShowPassword,
    currentCustomer,
    setCurrentCustomer,
    currentSupplier,
    setCurrentSupplier,
    loading,
    setLoading
  };
}
