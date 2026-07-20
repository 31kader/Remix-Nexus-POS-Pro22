import { useState, useCallback, useMemo, useEffect } from 'react';
import { POSSession, Transaction, Customer } from '../types';
import { generateUniqueId } from '../lib/utils';
import { usePeopleStore } from '../store/usePeopleStore';

export function usePOSSessions(
  setActiveTab: (tab: string) => void, 
  setIsWholesale: (w: boolean) => void, 
  setDeliveryMethod: (m: 'in_store' | 'delivery' | 'pickup') => void
) {
  const customers = usePeopleStore(s => s.customers);
  
  // POS Multi-session State
  const [posSessions, setPosSessions] = useState<POSSession[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_pos_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load POS sessions:", e);
    }
    const initialId = generateUniqueId();
    return [{ id: initialId, name: 'Ticket 1', cart: [], selectedCustomer: null }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nexus_pos_active_session_id');
      if (saved && (posSessions || []).some(s => s?.id === saved)) return saved;
    } catch (e) {}
    // SÉCURITÉ EXTRA : Évite de lire .id sur undefined si le tableau est vide
    return posSessions && posSessions[0] ? posSessions[0].id : '';
  });

  // Auto-save sessions to localStorage
  useEffect(() => {
    if (posSessions) {
      localStorage.setItem('nexus_pos_sessions', JSON.stringify(posSessions));
    }
  }, [posSessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('nexus_pos_active_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // SÉCURITÉ : Recherche de la session active sans planter si posSessions est vide
  const activeSession = useMemo(() => {
    const sessions = posSessions || [];
    return sessions.find(s => s.id === activeSessionId) || sessions[0] || { id: '', name: '', cart: [], selectedCustomer: null };
  }, [posSessions, activeSessionId]);

  const cart = activeSession?.cart || [];
  const selectedCustomer = activeSession?.selectedCustomer || null;

  // 🛡️ CORRIGÉ & SÉCURISÉ : Plus de crash lors de l'ajout de produit (.findIndex / .map)
  const setCart = useCallback((newCart: any) => {
    setPosSessions(prev => (prev || []).map(s => {
      if (s.id === activeSessionId) {
        // Force un tableau propre pour éviter de passer un 'undefined' à la fonction callback (ex: prev => [...prev, item])
        const currentCartArray = Array.isArray(s.cart) ? s.cart : [];
        
        const updatedCart = typeof newCart === 'function' ? newCart(currentCartArray) : newCart;
        return { ...s, cart: Array.isArray(updatedCart) ? updatedCart : [] };
      }
      return s;
    }));
  }, [activeSessionId]);

  const setSelectedCustomer = useCallback((newCustomer: any) => {
    setPosSessions(prev => (prev || []).map(s => {
      if (s.id === activeSessionId) {
         const updatedCust = typeof newCustomer === 'function' ? newCustomer(s.selectedCustomer) : newCustomer;
         return { ...s, selectedCustomer: updatedCust };
      }
      return s;
    }));
  }, [activeSessionId]);

  const loadTransactionToCart = useCallback((t: Transaction) => {
    setCart([]);
    setCart(t.items || []);
    
    if (t.customerId) {
      const customer = (customers || []).find((c: Customer) => c.id === t.customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    } else {
      setSelectedCustomer(null);
    }
    
    setIsWholesale(!!t.isWholesale);
    
    if (t.deliveryMethod) {
      setDeliveryMethod(t.deliveryMethod);
    }

    setActiveTab('checkout');
    
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }, 100);
  }, [customers, setActiveTab, setCart, setSelectedCustomer, setIsWholesale, setDeliveryMethod]);

  // LE RETURN COMPLET AVEC TOUTES TES VARIABLES ET FONCTIONS
  return {
    posSessions: posSessions || [],
    setPosSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    cart,
    setCart,
    selectedCustomer,
    setSelectedCustomer,
    loadTransactionToCart
  };
}