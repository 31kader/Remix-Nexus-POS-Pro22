import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Customer, POSSession, Transaction } from '../types';
import { generateUniqueId } from '../lib/utils';
import { usePeopleStore } from './usePeopleStore';
import { useTransactionStore } from './useTransactionStore';
import { toast } from 'sonner';

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
  
  getEditingTransaction: () => Transaction | null;
  setEditingTransaction: (transaction: Transaction | null) => void;
  cancelEditTransaction: () => void;

  isWholesale: boolean;
  setIsWholesale: (isWholesale: boolean) => void;
  
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  setDeliveryMethod: (method: 'in_store' | 'delivery' | 'pickup') => void;

  // Actions
  loadTransactionToCart: (transactionOrId: Transaction | string, setActiveTab: (tab: string) => void) => void;
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
        const currentSessions = state.posSessions && state.posSessions.length > 0 
          ? state.posSessions 
          : [{ id: activeId, name: 'Ticket 1', cart: [], selectedCustomer: null }];

        return {
          posSessions: currentSessions.map(s => {
            if (s.id === activeId || currentSessions.length === 1) {
              const updatedCart = typeof updater === 'function' ? updater(s.cart || []) : updater;
              return { ...s, cart: Array.isArray(updatedCart) ? updatedCart : [] };
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
        const currentSessions = state.posSessions && state.posSessions.length > 0 
          ? state.posSessions 
          : [{ id: activeId, name: 'Ticket 1', cart: [], selectedCustomer: null }];

        return {
          posSessions: currentSessions.map(s => {
            if (s.id === activeId || currentSessions.length === 1) {
              const updatedCust = typeof updater === 'function' ? updater(s.selectedCustomer) : updater;
              return { ...s, selectedCustomer: updatedCust };
            }
            return s;
          })
        };
      }),

      getEditingTransaction: () => {
        const state = get();
        const activeSession = state.posSessions.find(s => s.id === state.activeSessionId) || state.posSessions[0];
        return activeSession?.editingTransaction || null;
      },

      setEditingTransaction: (transaction) => set((state) => {
        const activeId = state.activeSessionId;
        return {
          posSessions: state.posSessions.map(s => {
            if (s.id === activeId) {
              return {
                ...s,
                editingTransaction: transaction
              };
            }
            return s;
          })
        };
      }),

      cancelEditTransaction: () => {
        const activeId = get().activeSessionId;
        set(state => ({
          posSessions: state.posSessions.map(s => {
            if (s.id === activeId) {
              const cleanName = s.name.includes('(Modif)') ? 'Ticket 1' : s.name;
              return {
                ...s,
                name: cleanName,
                cart: [],
                selectedCustomer: null,
                editingTransaction: null
              };
            }
            return s;
          })
        }));
      },

      isWholesale: false,
      setIsWholesale: (isWholesale) => set({ isWholesale }),

      deliveryMethod: 'in_store',
      setDeliveryMethod: (method) => set({ deliveryMethod: method }),

      loadTransactionToCart: (transactionOrId: Transaction | string, setActiveTab) => {
        let t: any = transactionOrId;
        if (typeof transactionOrId === 'string') {
          const allTransactions = useTransactionStore.getState().transactions;
          t = allTransactions.find(item => item.id === transactionOrId);
        }

        if (!t) {
          toast.error("Impossible de retrouver les données de la transaction.");
          return;
        }

        // Parse items if string
        let rawItems = t.items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch (_) { rawItems = []; }
        }
        if (!Array.isArray(rawItems)) rawItems = [];

        if (rawItems.length === 0) {
          toast.error("Cette transaction ne contient aucun article.");
          return;
        }

        // Format items properly as CartItems
        const formattedItems: CartItem[] = rawItems.map((item: any, idx: number) => {
          return {
            ...item,
            id: item.id || item.productId || `prod-${idx}`,
            name: item.name || item.productName || 'Article',
            price: Number(item.price || item.unitPrice || 0),
            quantity: Math.max(1, Number(item.quantity || 1)),
            sku: item.sku || item.barcode || '',
            stock: item.stock !== undefined ? item.stock : 999,
            cartItemId: item.cartItemId || `cart-item-${Date.now()}-${idx}`
          } as CartItem;
        });

        // Set cart into active POS session
        const activeId = get().activeSessionId;
        const currentSessions = get().posSessions;
        const targetSessions = (currentSessions && currentSessions.length > 0)
          ? currentSessions
          : [{ id: activeId || initialId, name: 'Ticket 1', cart: [], selectedCustomer: null }];

        let customerToSet: Customer | null = null;
        if (t.customerId) {
          const customers = usePeopleStore.getState().customers;
          customerToSet = customers.find((c: Customer) => c.id === t.customerId) || null;
        }

        const ticketShortId = (t.id || '').slice(-6).toUpperCase();
        const sessionName = `Ticket #${ticketShortId} (Modif)`;

        const updatedSessions = targetSessions.map(s => {
          if (s.id === activeId || targetSessions.length === 1) {
            return {
              ...s,
              name: sessionName,
              cart: formattedItems,
              selectedCustomer: customerToSet,
              editingTransaction: t
            };
          }
          return s;
        });

        set({
          posSessions: updatedSessions,
          isWholesale: !!t.isWholesale,
          deliveryMethod: t.deliveryMethod || 'in_store'
        });

        toast.success(`Vente #${ticketShortId} en mode modification (${formattedItems.length} articles).`);

        // Navigate to POS
        setActiveTab('checkout');
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
