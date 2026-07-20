import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Customer, POSSession, Transaction } from '../types';
import { generateUniqueId } from '../lib/utils';
import { usePeopleStore } from './usePeopleStore';

interface CartState {
  posSessions: POSSession[];
  setPosSessions: (sessions: POSSession[] | ((prev: POSSession[]) => POSSession[])) => void;
  
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  
  // Derived state getters for convenience
  getCart: () => CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  
  getSelectedCustomer: () => Customer | null;
  setSelectedCustomer: (customer: Customer | null | ((prev: Customer | null) => Customer | null)) => void;
  
  isWholesale: boolean;
  setIsWholesale: (isWholesale: boolean) => void;
  
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  setDeliveryMethod: (method: 'in_store' | 'delivery' | 'pickup') => void;

  // Actions
  loadTransactionToCart: (transaction: Transaction, setActiveTab: (tab: string) => void) => void;
}

const initialId = generateUniqueId();

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      posSessions: [{ id: initialId, name: 'Ticket 1', cart: [], selectedCustomer: null }],
      setPosSessions: (updater) => set((state) => ({ 
        posSessions: typeof updater === 'function' ? updater(state.posSessions) : updater 
      })),

      activeSessionId: initialId,
      setActiveSessionId: (id) => set({ activeSessionId: id }),

      getCart: () => {
        const state = get();
        const activeSession = state.posSessions.find(s => s.id === state.activeSessionId) || state.posSessions[0];
        return activeSession?.cart || [];
      },

      setCart: (updater) => set((state) => {
        const activeId = state.activeSessionId;
        return {
          posSessions: state.posSessions.map(s => {
            if (s.id === activeId) {
              const updatedCart = typeof updater === 'function' ? updater(s.cart) : updater;
              return { ...s, cart: updatedCart };
            }
            return s;
          })
        };
      }),

      getSelectedCustomer: () => {
        const state = get();
        const activeSession = state.posSessions.find(s => s.id === state.activeSessionId) || state.posSessions[0];
        return activeSession?.selectedCustomer || null;
      },

      setSelectedCustomer: (updater) => set((state) => {
        const activeId = state.activeSessionId;
        return {
          posSessions: state.posSessions.map(s => {
            if (s.id === activeId) {
              const updatedCust = typeof updater === 'function' ? updater(s.selectedCustomer) : updater;
              return { ...s, selectedCustomer: updatedCust };
            }
            return s;
          })
        };
      }),

      isWholesale: false,
      setIsWholesale: (isWholesale) => set({ isWholesale }),

      deliveryMethod: 'in_store',
      setDeliveryMethod: (method) => set({ deliveryMethod: method }),

      loadTransactionToCart: (t: Transaction, setActiveTab) => {
        // 1. Clear current cart
        get().setCart([]);
        
        // 2. Load items from transaction
        get().setCart(t.items);
        
        // 3. Restore customer if exists
        if (t.customerId) {
          const customers = usePeopleStore.getState().customers;
          const customer = customers.find((c: Customer) => c.id === t.customerId);
          if (customer) {
            get().setSelectedCustomer(customer);
          }
        } else {
          get().setSelectedCustomer(null);
        }
        
        // 4. Restore wholesale mode
        set({ isWholesale: !!t.isWholesale });
        
        // 5. Restore delivery method if exists
        if (t.deliveryMethod) {
          set({ deliveryMethod: t.deliveryMethod });
        }

        // 6. Navigate to POS
        setActiveTab('checkout');
        
        // 7. Focus search
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }, 100);
      }
    }),
    {
      name: 'nexus-pos-cart-storage',
      partialize: (state) => ({ 
        posSessions: state.posSessions,
        activeSessionId: state.activeSessionId
      }),
    }
  )
);
