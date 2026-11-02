import React, { useState, useMemo } from 'react';
import { Customer, CompanySettings, Transaction } from '../../../types';
import { usePeopleStore } from '../../../store/usePeopleStore';
import { useCoreStore } from '../../../store/useCoreStore';
import { localDb } from '../../../services/LocalDatabase';
import { escapeHtml } from '../../../lib/utils';
import { toast } from 'sonner';
import { DebtAgeInfo, DebtorCustomerItem, AgingCounts } from './debtsTypes';

interface UseDebtsLedgerLogicProps {
  propCustomers?: Customer[];
  propSettings?: CompanySettings;
  openWhatsApp?: (phone: string, text: string) => void;
}

export function useDebtsLedgerLogic({
  propCustomers,
  propSettings,
  openWhatsApp
}: UseDebtsLedgerLogicProps) {
  // Always fallback to live store to guarantee 100% data presence
  const storeCustomers = usePeopleStore(s => s.customers);
  const setCustomers = usePeopleStore(s => s.setCustomers);
  const storeSettings = useCoreStore(s => s.settings);

  const allCustomers = (propCustomers && propCustomers.length > 0) ? propCustomers : storeCustomers;
  const settings = propSettings || storeSettings;

  const [search, setSearch] = useState('');
  const [tabView, setTabView] = useState<'debtors' | 'all'>('debtors');
  const [filterType, setFilterType] = useState<'all' | 'high'>('all');
  const [agingFilter, setAgingFilter] = useState<'all' | 'recent' | 'warning' | 'overdue'>('all');

  // Modal State for Adding New Debt / Quick Customer
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [debtTargetType, setDebtTargetType] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtNote, setDebtNote] = useState('');
  const [isSavingDebt, setIsSavingDebt] = useState(false);

  // Helper to calculate debt age in days
  const getDebtAgeInfo = (c: Customer): DebtAgeInfo => {
    const now = new Date().getTime();
    const dateRef = c.lastVisit ? new Date(c.lastVisit).getTime() : (c.joinDate ? new Date(c.joinDate).getTime() : now);
    const diffDays = Math.max(0, Math.floor((now - dateRef) / (1000 * 60 * 60 * 24)));

    if (diffDays <= 15) {
      return { days: diffDays, status: 'recent', label: 'Récente', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    } else if (diffDays <= 30) {
      return { days: diffDays, status: 'warning', label: 'À surveiller', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    } else {
      return { days: diffDays, status: 'overdue', label: 'En retard', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' };
    }
  };

  // Filter only debtor customers (balance < 0)
  const debtorCustomers = useMemo<DebtorCustomerItem[]>(() => {
    return allCustomers
      .filter(c => (Number(c.balance) || 0) < 0)
      .map(c => {
        const debtAmount = Math.abs(Number(c.balance) || 0);
        const ageInfo = getDebtAgeInfo(c);
        return {
          ...c,
          debtAmount,
          debtAgeDays: ageInfo.days,
          debtStatus: ageInfo.status,
          debtLabel: ageInfo.label,
          debtBadgeClass: ageInfo.badgeClass
        };
      })
      .sort((a, b) => b.debtAmount - a.debtAmount);
  }, [allCustomers]);

  const displayList = useMemo(() => {
    const source = tabView === 'debtors' 
      ? debtorCustomers 
      : allCustomers.map(c => {
          const isDebtor = (Number(c.balance) || 0) < 0;
          const ageInfo = getDebtAgeInfo(c);
          return {
            ...c,
            debtAmount: isDebtor ? Math.abs(Number(c.balance) || 0) : 0,
            debtAgeDays: ageInfo.days,
            debtStatus: ageInfo.status,
            debtLabel: ageInfo.label,
            debtBadgeClass: ageInfo.badgeClass
          };
        });

    return source.filter(c => {
      const matchSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search);
      if (!matchSearch) return false;

      if (filterType === 'high' && tabView === 'debtors' && (c.debtAmount || 0) <= 10000) return false;
      
      if (tabView === 'debtors' && agingFilter !== 'all') {
        if (c.debtStatus !== agingFilter) return false;
      }

      return true;
    });
  }, [tabView, debtorCustomers, allCustomers, search, filterType, agingFilter]);

  const totalDebt = useMemo(() => {
    return debtorCustomers.reduce((acc, c) => acc + c.debtAmount, 0);
  }, [debtorCustomers]);

  // Count by aging category
  const agingCounts = useMemo<AgingCounts>(() => {
    let recent = 0, warning = 0, overdue = 0;
    debtorCustomers.forEach(c => {
      if (c.debtStatus === 'recent') recent++;
      else if (c.debtStatus === 'warning') warning++;
      else if (c.debtStatus === 'overdue') overdue++;
    });
    return { recent, warning, overdue };
  }, [debtorCustomers]);

  const handleSendWhatsAppReminder = (c: any) => {
    if (!c.phone) {
      toast.error("Ce client n'a pas de numéro de téléphone enregistré.");
      return;
    }
    const debt = (c.debtAmount || Math.abs(Number(c.balance) || 0)).toFixed(2);
    const storeName = settings.name || 'notre magasin';
    const ageDays = c.debtAgeDays || 0;
    const extraOverdue = ageDays > 30 ? ` (Dette en attente depuis ${ageDays} jours)` : '';
    const message = `Bonjour M./Mme ${c.name}, sauf erreur de notre part, votre solde de crédit (dette) auprès de ${storeName} est actuellement de ${debt} ${settings.currency || 'DA'}${extraOverdue}. Merci de bien vouloir passer au magasin pour régulariser votre compte. Bonne journée !`;
    
    if (openWhatsApp) {
      openWhatsApp(c.phone, message);
    } else {
      const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    }
  };

  const handlePrintStatement = (c: any) => {
    const debt = (c.debtAmount || Math.abs(Number(c.balance) || 0)).toFixed(2);
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Relevé de Dette - ${escapeHtml(c.name)}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #111; line-height: 1.5; }
            .header { border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #b91c1c; }
            .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .total-box { font-size: 26px; font-weight: 900; color: #b91c1c; text-align: right; margin-top: 30px; padding: 15px; border-top: 2px solid #222; }
            .footer { margin-top: 50px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${escapeHtml(settings.name || 'NEXUS POS PRO')}</h2>
            <p style="margin: 0; font-size: 12px; color: #555;">Tél : ${escapeHtml(settings.phone || 'Non renseigné')} | ${escapeHtml(settings.address || '')}</p>
          </div>

          <div class="title">RELEVÉ DE DETTE & CRÉDIT CLIENT</div>
          <p style="font-size: 12px; color: #666;">Date d'édition : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>

          <div class="info-box">
            <p style="margin: 4px 0;"><strong>Client :</strong> ${escapeHtml(c.name)}</p>
            <p style="margin: 4px 0;"><strong>Téléphone :</strong> ${escapeHtml(c.phone || 'Non renseigné')}</p>
            ${c.address ? `<p style="margin: 4px 0;"><strong>Adresse :</strong> ${escapeHtml(c.address)}</p>` : ''}
          </div>

          <div class="total-box">
            SOLDE RESTANT DÛ : ${debt} ${escapeHtml(settings.currency || 'DA')}
          </div>

          <div class="footer">
            Document édité automatiquement par Nexus POS Pro. Merci de votre confiance !
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 250);
  };

  // Submit New Debt
  const handleSaveNewDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(debtAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Veuillez saisir un montant de dette valide.");
      return;
    }

    setIsSavingDebt(true);
    try {
      let targetCustomer: Customer | undefined;

      if (debtTargetType === 'new') {
        if (!newCustomerName.trim()) {
          toast.error("Veuillez renseigner le nom du nouveau client.");
          setIsSavingDebt(false);
          return;
        }

        const newId = 'cust_' + Date.now();
        const createdCustomer: Customer = {
          id: newId,
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
          balance: -amountNum,
          loyaltyPoints: 0,
          totalSpent: 0,
          purchaseCount: 1,
          lastVisit: new Date().toISOString()
        };

        const updated = [createdCustomer, ...allCustomers];
        setCustomers(updated);
        await localDb.insert(`customers/${createdCustomer.id}`, createdCustomer);
        toast.success(`Nouveau client "${createdCustomer.name}" créé avec une dette de ${amountNum.toFixed(2)} ${settings.currency || 'DA'} !`);
      } else {
        targetCustomer = allCustomers.find(c => c.id === selectedCustomerId);
        if (!targetCustomer) {
          toast.error("Veuillez sélectionner un client existant.");
          setIsSavingDebt(false);
          return;
        }

        const currentBal = Number(targetCustomer.balance) || 0;
        const newBal = currentBal - amountNum;

        const updatedCust: Customer = {
          ...targetCustomer,
          balance: newBal,
          lastVisit: new Date().toISOString()
        };

        const updated = allCustomers.map(c => c.id === targetCustomer!.id ? updatedCust : c);
        setCustomers(updated);
        await localDb.update(`customers/${targetCustomer.id}`, updatedCust);
        toast.success(`Dette de ${amountNum.toFixed(2)} ${settings.currency || 'DA'} ajoutée au compte de ${targetCustomer.name} !`);
      }

      setIsAddDebtModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setDebtAmount('');
      setDebtNote('');
      setSelectedCustomerId('');
    } catch (err: any) {
      console.error("Erreur enregistrement dette :", err);
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setIsSavingDebt(false);
    }
  };

  return {
    allCustomers,
    settings,
    search,
    setSearch,
    tabView,
    setTabView,
    filterType,
    setFilterType,
    agingFilter,
    setAgingFilter,
    isAddDebtModalOpen,
    setIsAddDebtModalOpen,
    debtTargetType,
    setDebtTargetType,
    selectedCustomerId,
    setSelectedCustomerId,
    newCustomerName,
    setNewCustomerName,
    newCustomerPhone,
    setNewCustomerPhone,
    debtAmount,
    setDebtAmount,
    debtNote,
    setDebtNote,
    isSavingDebt,
    debtorCustomers,
    displayList,
    totalDebt,
    agingCounts,
    handleSendWhatsAppReminder,
    handlePrintStatement,
    handleSaveNewDebt
  };
}
