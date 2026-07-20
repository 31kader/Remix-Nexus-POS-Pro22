import { useEffect, useState } from 'react';
import { localDb } from '../../services/LocalDatabase';
import { POSSession, CartItem } from '../../types';

interface UseCheckoutDraftsProps {
  user: any;
  posSessions: POSSession[];
  setPosSessions: React.Dispatch<React.SetStateAction<POSSession[]>>;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cart: CartItem[];
}

export function useCheckoutDrafts({
  user,
  posSessions,
  setPosSessions,
  activeSessionId,
  setActiveSessionId,
  setCart,
  cart,
}: UseCheckoutDraftsProps) {
  const [hasRestored, setHasRestored] = useState(false);

  // Restore cart draft on mount
  useEffect(() => {
    if (!user?.uid || hasRestored) return;

    const loadDraft = async () => {
      try {
        const { val } = await localDb.get(`cartDrafts/${user.uid}`);
        const draft = val();
 
        if (draft) {
          const sessions = draft.sessions;
          const activeSessId = draft.activeSessionId || draft.active_session_id;

          // MODIFICATION SÉCURISÉE : Injection de s.cart || [] pour éviter les crashs
          if (sessions && sessions.length > 0) {
            const safeSessions = sessions.map((s: any) => ({ 
              ...s, 
              cart: s.cart || [] 
            }));
            setPosSessions(safeSessions);
            
            if (activeSessId && activeSessionId !== activeSessId) {
               setActiveSessionId(activeSessId);
            }
          } else if (draft.items && cart.length === 0) {
            setCart(draft.items);
          }
        }
        setHasRestored(true);
      } catch (error: any) {
        console.error("Error loading cart draft:", error);
        setHasRestored(true);
      }
    };

    loadDraft();
  }, [user?.uid, hasRestored, cart.length, setCart, setPosSessions, activeSessionId, setActiveSessionId]);

  // Auto-save cart draft
  useEffect(() => {
    if (!user?.uid || !hasRestored) return;

    const saveOrDeleteDraft = async () => {
      try {
        const hasContent = posSessions.some(s => s.cart && s.cart.length > 0);
        
        if (!hasContent) {
          await localDb.delete(`cartDrafts/${user.uid}`);
          return;
        }

        const sanitizedSessions = posSessions.map(session => ({
          ...session,
          cart: (session.cart || []).map(item => {
            const { imageUrl, imageUrls, description, bundleItems, ...rest } = item;
            return rest;
          })
        }));

        await localDb.insert(`cartDrafts/${user.uid}`, {
          id: user.uid,
          userId: user.uid,
          sessions: sanitizedSessions,
          activeSessionId: activeSessionId,
          updatedAt: new Date().toISOString()
        });
      } catch (error: any) {
        console.error("Error saving cart draft:", error);
      }
    };

    const timeoutId = setTimeout(saveOrDeleteDraft, 2000);
    return () => clearTimeout(timeoutId);
  }, [posSessions, activeSessionId, user?.uid, hasRestored]);

  return { hasRestored, setHasRestored };
}
