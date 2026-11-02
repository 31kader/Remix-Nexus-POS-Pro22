import { useState, useEffect } from 'react';

export function useAppCustomerDisplayState() {
  const [isCustomerDisplay, setIsCustomerDisplay] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash === '#customer-display' || window.location.pathname.startsWith('/customer-display');
  });

  useEffect(() => {
    const checkDisplay = () => {
      const isDisplay = window.location.hash === '#customer-display' || window.location.pathname.startsWith('/customer-display');
      setIsCustomerDisplay(isDisplay);
    };
    window.addEventListener('hashchange', checkDisplay);
    window.addEventListener('popstate', checkDisplay);
    return () => {
      window.removeEventListener('hashchange', checkDisplay);
      window.removeEventListener('popstate', checkDisplay);
    };
  }, []);

  return { isCustomerDisplay };
}
