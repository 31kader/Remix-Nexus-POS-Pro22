import { useState, useMemo } from 'react';
import { POSSession, Promotion, Customer, CompanySettings, CashShift, Voucher } from '../../types';
import { toast } from 'sonner';
import { localDb } from '../../services/LocalDatabase';
import { usePeopleStore } from '../../store/usePeopleStore';
import { getTerminalId, getTerminalName } from '../../services/terminalService';

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
  settings: CompanySettings;
}

export function useCheckoutSessionAndPromo({
  posSessions = [],
  setPosSessions,
  activeSessionId,
  setActiveSessionId,
  profile,
  user,
  setActiveShift,
  promotions = [],
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

  // 🛡️ Filtre préventif contre les entrées null/undefined dans le tableau de sessions
  const safeSessions = useMemo(() => {
    if (!Array.isArray(posSessions)) return [];
    return posSessions.filter((s): s is POSSession => Boolean(s && typeof s === 'object'));
  }, [posSessions]);

  // 🛡️ Recherche sécurisée de la session active
  const activeSession = useMemo(() => {
    if (safeSessions.length === 0) return null;
    const found = safeSessions.find((s) => s.id === activeSessionId);
    return found || safeSessions[0] || null;
  }, [safeSessions, activeSessionId]);

  // Ajouter un panier / session
  const addNewSession = () => {
    const newId = `session_${Date.now()}`;
    const newSession: POSSession = {
      id: newId,
      name: `Caisse ${safeSessions.length + 1}`,
      cart: [],
      selectedCustomer: null,
      // 🛡️ Propriétés défensives pour éviter tout crash si un composant UI lit s.active ou s.isActive
      ...({ active: true, isActive: true } as any)
    };
    setPosSessions((prev) => [...(Array.isArray(prev) ? prev : []), newSession]);
    setActiveSessionId(newId);
  };

  // Fermer / Supprimer un panier
  const removeSession = (sessionId: string) => {
    if (safeSessions.length <= 1) {
      toast.error('Impossible de fermer le dernier panier actif');
      return;
    }
    const filtered = safeSessions.filter((s) => s.id !== sessionId);
    setPosSessions(filtered);
    if (activeSessionId === sessionId && filtered.length > 0) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Ouverture directe d'un shift de caisse
  const handleDirectOpenShift = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const cash = parseFloat(initialCashInput) || 0;
    const shiftId = `shift_${Date.now()}`;
    
    const newShift: CashShift = {
      id: shiftId,
      openedBy: profile?.fullName || profile?.name || 'Caissier',
      openedAt: new Date().toISOString(),
      initialCash: cash,
      status: 'open',
      terminalId: getTerminalId(),
      terminalName: getTerminalName(),
    };
    
    localDb.insert(`shifts/${shiftId}`, newShift).catch(err => {
      console.warn('[Checkout] Erreur insertion shift localDb:', err);
    });
    setActiveShift(newShift);
    setIsOpeningSession(false);
    setInitialCashInput('');
    toast.success(`Session de caisse ouverte (${getTerminalName()})`);
  };

  // Appliquer un bon de réduction
  const applyVoucher = async (subtotal: number) => {
    const trimmedCode = voucherCode.trim();
    if (!trimmedCode) return;

    try {
      // 1. Chercher dans la base locale des vrais bons créés
      const { val } = await localDb.get('vouchers');
      const data = (typeof val === 'function' ? val() : val) || {};
      const allVouchers = Object.values(data) as Voucher[];
      
      const found = allVouchers.find(v => v && v.code && v.code.toUpperCase() === trimmedCode.toUpperCase());

      if (found) {
        if (found.status === 'used' || (found.currentBalance !== undefined && found.currentBalance <= 0)) {
          toast.error("Ce bon de réduction a déjà été utilisé");
          return;
        }
        if (found.expiryDate && new Date(found.expiryDate).getTime() < Date.now()) {
          toast.error("Ce bon de réduction est expiré");
          return;
        }
        if (found.customerId && selectedCustomer && found.customerId !== selectedCustomer.id) {
          toast.error("Ce bon est réservé à un autre client");
          return;
        }

        setAppliedVoucher(found);
        const desc = found.type === 'percent' ? `-${found.value}%` : `-${found.currentBalance ?? found.value} DA`;
        toast.success(`Bon de réduction "${found.code}" appliqué (${desc})`);
        return;
      }

      // 2. Chercher si c'est un code promotionnel actif
      const safePromos = Array.isArray(promotions) ? promotions.filter(Boolean) : [];
      const foundPromo = safePromos.find((p) => p && p.code && String(p.code).trim().toLowerCase() === trimmedCode.toLowerCase() && p.isActive);
      if (foundPromo) {
        setActivePromotion(foundPromo);
        const desc = foundPromo.type === 'percentage' ? `-${foundPromo.value}%` : `-${foundPromo.value} DA`;
        toast.success(`Promotion "${foundPromo.name || 'Promotion'}" appliquée (${desc})`);
        return;
      }

      // 3. Code promotionnel prédéfini de secours
      if (trimmedCode.toUpperCase() === 'NEXUS10') {
        const discount = (typeof subtotal === 'number' && !isNaN(subtotal)) ? subtotal * 0.1 : 10;
        const mockVoucher: Voucher = {
          id: `voucher_${Date.now()}`,
          code: trimmedCode.toUpperCase(),
          type: 'percent',
          value: 10,
          currentBalance: discount,
          status: 'active',
          createdAt: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        setAppliedVoucher(mockVoucher);
        toast.success('Bon de réduction appliqué (-10%)');
        return;
      }

      toast.error('Code promo ou bon invalide');
    } catch (err) {
      console.warn('[Checkout] Erreur recherche bon:', err);
      toast.error('Code promo ou bon invalide');
    }
  };

  // Appliquer un code promo
  const applyPromoCode = () => {
    if (!promoCode.trim()) return;
    const safePromos = Array.isArray(promotions) ? promotions.filter(Boolean) : [];
    const found = safePromos.find((p) => p && p.code && String(p.code).trim().toLowerCase() === promoCode.trim().toLowerCase() && p.isActive);
    if (found) {
      setActivePromotion(found);
      toast.success(`Promotion "${found.name || 'Promotion'}" appliquée`);
    } else {
      toast.error('Code promotionnel invalide ou expiré');
    }
  };

  // Note client
  const addCustomerNote = (note: string) => {
    if (!selectedCustomer) return;
    const updated = {
      ...selectedCustomer,
      notes: note,
    };
    setSelectedCustomer(updated);
    localDb.update(`customers/${selectedCustomer.id}`, { notes: note });
    usePeopleStore.getState().setCustomers(prev => 
      (prev || []).map(c => c.id === selectedCustomer.id ? updated : c)
    );
    toast.success('Note client mise à jour');
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
    activeSession,
    addNewSession,
    removeSession,
    handleDirectOpenShift,
    applyVoucher,
    applyPromoCode,
    addCustomerNote,
  };
}