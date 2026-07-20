import React, { useState, useCallback, useEffect } from 'react';
import { localDb } from '../../services/LocalDatabase';
import { toast } from 'sonner';
import { POSSession, CashShift, Promotion, Voucher, Customer } from '../../types';
import { generateUniqueId } from '../../lib/utils';

interface UseCheckoutSessionAndPromoProps {
  posSessions: POSSession[];
  setPosSessions: React.Dispatch<React.SetStateAction<POSSession[]>>;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  profile: any;
  user: any;
  setActiveShift: React.Dispatch<React.SetStateAction<CashShift | null>>;
  promotions: Promotion[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  settings: any;
}

export function useCheckoutSessionAndPromo({
  posSessions,
  setPosSessions,
  activeSessionId,
  setActiveSessionId,
  profile,
  user,
  setActiveShift,
  promotions,
  selectedCustomer,
  setSelectedCustomer,
  settings,
}: UseCheckoutSessionAndPromoProps) {
  const [promoCode, setPromoCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [initialCashInput, setInitialCashInput] = useState('');
  const [isOpeningSession, setIsOpeningSession] = useState(false);

  // Reset local Promo/Voucher states when switching active session
  useEffect(() => {
    setActivePromotion(null);
    setAppliedVoucher(null);
    setPromoCode('');
    setVoucherCode('');
  }, [activeSessionId]);

  const addNewSession = useCallback(() => {
    if (posSessions.length >= 10) return;
    const newId = generateUniqueId();
    const nextNumber = posSessions.length + 1;
    const newSession: POSSession = {
      id: newId,
      name: `Ticket ${nextNumber}`,
      cart: [],
      selectedCustomer: null
    };
    setPosSessions((prev: POSSession[]) => [...prev, newSession]);
    setActiveSessionId(newId);
  }, [posSessions.length, setPosSessions, setActiveSessionId]);

  const removeSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (posSessions.length <= 1) return;
    
    setPosSessions((prev: POSSession[]) => {
      const filtered = prev.filter((s: POSSession) => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }, [posSessions.length, activeSessionId, setPosSessions, setActiveSessionId]);

  const handleDirectOpenShift = async () => {
    if (!initialCashInput || isOpeningSession) return;
    setIsOpeningSession(true);
    try {
      const newId = Math.random().toString(36).substring(2, 10);
      const newShift = {
        id: newId,
        openedAt: new Date().toISOString(),
        openedBy: profile?.displayName || profile?.email || user?.email || 'Unknown',
        initialCash: parseFloat(initialCashInput) || 0,
        status: 'open' as const
      };
      await localDb.insert(`shifts/${newId}`, newShift);
      setActiveShift(newShift);
      toast.success("Session de caisse ouverte avec succès !");
      setInitialCashInput('');
    } catch (error: any) {
      console.error("Failed to open shift:", error);
      toast.error("Erreur lors de l'ouverture de la session: " + error.message);
    } finally {
      setIsOpeningSession(false);
    }
  };

  const applyVoucher = async (subtotal: number) => {
    try {
      const { val } = await localDb.get('vouchers');
      const vouchers = val() || {};
      const found = Object.values(vouchers).find((v: any) => v.code?.toUpperCase() === voucherCode.toUpperCase() && v.status === 'active');
      
      if (!found) {
        alert("Bon d'achat invalide ou expiré");
        return;
      }
 
      const voucher = found as Voucher;
      
      if (voucher.expiryDate && new Date(voucher.expiryDate) < new Date()) {
        alert('Ce bon d\'achat est expiré.');
        return;
      }

      if (voucher.minPurchase && subtotal < voucher.minPurchase) {
        alert(`Ce bon nécessite un achat minimum de ${voucher.minPurchase.toFixed(2)} ${settings.currency}.`);
        return;
      }

      if (voucher.customerId && (!selectedCustomer || selectedCustomer.id !== voucher.customerId)) {
        alert(`Ce bon est réservé à un client spécifique (${voucher.customerName || 'Identifié'}).`);
        return;
      }

      if (voucher.type === 'fixed' && (voucher.currentBalance || 0) <= 0) {
        alert("Ce bon n'a plus de solde disponible.");
        return;
      }
      
      setAppliedVoucher(voucher);
      setVoucherCode('');
    } catch (error) {
      console.error('Error applying voucher:', error);
      alert('Erreur lors de l\'application du bon.');
    }
  };

  const applyPromoCode = () => {
    const promo = promotions.find((p: Promotion) => p.code?.toUpperCase() === promoCode.toUpperCase() && p.isActive);
    if (promo) {
      setActivePromotion(promo);
      setPromoCode('');
    } else {
      alert("Code promo invalide ou expiré");
    }
  };

  const addCustomerNote = async (note: string) => {
    if (!selectedCustomer) return;
    const noteEntry = {
      note,
      timestamp: new Date().toISOString(),
      author: profile?.displayName || 'Caisse'
    };
    
    setSelectedCustomer((prev: any) => ({
      ...prev,
      cashierNotes: [...(prev.cashierNotes || []), noteEntry]
    }));
    
    try {
      const notes = [...(selectedCustomer.cashierNotes || []), noteEntry];
      await localDb.update(`customers/${selectedCustomer.id}`, { cashierNotes: notes });
      toast.success("Note ajoutée");
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Erreur lors de l'ajout de la note: " + error.message);
    }
  };

  return {
    promoCode,
    setPromoCode,
    voucherCode,
    setVoucherCode,
    activePromotion,
    setActivePromotion,
    appliedVoucher,
    setAppliedVoucher,
    initialCashInput,
    setInitialCashInput,
    isOpeningSession,
    setIsOpeningSession,
    addNewSession,
    removeSession,
    handleDirectOpenShift,
    applyVoucher,
    applyPromoCode,
    addCustomerNote,
  };
}
