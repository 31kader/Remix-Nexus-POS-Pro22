import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Search, Plus, ArrowUpRight, ArrowDownRight, MessageSquare, 
  Printer, AlertCircle, CheckCircle2, Phone, Calendar, UserCheck, 
  DollarSign, TrendingDown, Users, ChevronRight, FileText, Send,
  UserPlus, FileSpreadsheet, Sparkles, X, History, ArrowRight, Clock
} from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../../types';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useCoreStore } from '../../store/useCoreStore';
import { localDb } from '../../services/LocalDatabase';
import { formatSafe, escapeHtml } from '../../lib/utils';
import { toast } from 'sonner';

interface CustomerDebtsLedgerProps {
  customers?: Customer[];
  transactions?: Transaction[];
  settings?: CompanySettings;
  onOpenFinancialModal?: (customer: Customer) => void;
  openWhatsApp?: (phone: string, text: string) => void;
}

export const CustomerDebtsLedger: React.FC<CustomerDebtsLedgerProps> = ({
  customers: propCustomers,
  transactions: propTransactions,
  settings: propSettings,
  onOpenFinancialModal,
  openWhatsApp
}) => {
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
  const getDebtAgeInfo = (c: Customer) => {
    const now = new Date().getTime();
    const dateRef = c.lastVisit ? new Date(c.lastVisit).getTime() : (c.joinDate ? new Date(c.joinDate).getTime() : now);
    const diffDays = Math.max(0, Math.floor((now - dateRef) / (1000 * 60 * 60 * 24)));

    if (diffDays <= 15) {
      return { days: diffDays, status: 'recent' as const, label: 'Récente', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    } else if (diffDays <= 30) {
      return { days: diffDays, status: 'warning' as const, label: 'À surveiller', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    } else {
      return { days: diffDays, status: 'overdue' as const, label: 'En retard', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' };
    }
  };

  // Filter only debtor customers (balance < 0)
  const debtorCustomers = useMemo(() => {
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
  const agingCounts = useMemo(() => {
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

  return (
    <div className="space-y-6 pb-8">
      
      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Debts */}
        <div className="p-5 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-slate-900 border border-rose-500/25 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-rose-400 tracking-wider">
            <span>Total Dettes Globales</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <CreditCard size={17} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {totalDebt.toFixed(2)} <span className="text-sm font-sans text-rose-400 font-bold">{settings.currency || 'DA'}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Montant total dû par vos clients</p>
        </div>

        {/* Total Debtors */}
        <div className="p-5 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/25 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-amber-400 tracking-wider">
            <span>Comptes Débiteurs</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users size={17} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {debtorCustomers.length} <span className="text-xs font-sans text-amber-400 font-bold">clients</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Clients ayant un solde négatif</p>
        </div>

        {/* Biggest Debt */}
        <div className="p-5 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-slate-900 border border-indigo-500/25 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-indigo-400 tracking-wider">
            <span>Plus Forte Dette</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <TrendingDown size={17} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {(debtorCustomers[0]?.debtAmount || 0).toFixed(2)} <span className="text-sm font-sans text-indigo-400 font-bold">{settings.currency || 'DA'}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
            {debtorCustomers[0] ? debtorCustomers[0].name : 'Aucun débiteur'}
          </p>
        </div>

        {/* Up to date customers */}
        <div className="p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-slate-900 border border-emerald-500/25 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400 tracking-wider">
            <span>Comptes à Jour / Crédits</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
            {allCustomers.length - debtorCustomers.length} <span className="text-xs font-sans text-emerald-400 font-bold">clients</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Soldes nuls ou prépayés</p>
        </div>

      </div>

      {/* Control & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 border border-slate-800 rounded-xl shadow-xl">
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Sub-view Switcher */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTabView('debtors')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                tabView === 'debtors' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard size={14} />
              Débiteurs Uniquement ({debtorCustomers.length})
            </button>
            <button
              type="button"
              onClick={() => setTabView('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                tabView === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              Tous les Clients ({allCustomers.length})
            </button>
          </div>

          {/* High Debt Filter */}
          {tabView === 'debtors' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterType(prev => prev === 'all' ? 'high' : 'all')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                  filterType === 'high' 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                &gt; 10 000 {settings.currency || 'DA'}
              </button>

              {/* Aging Filter Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAgingFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all ${
                    agingFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setAgingFilter('recent')}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all flex items-center gap-1 ${
                    agingFilter === 'recent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-emerald-500/60 hover:text-emerald-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  &lt;15j ({agingCounts.recent})
                </button>
                <button
                  type="button"
                  onClick={() => setAgingFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all flex items-center gap-1 ${
                    agingFilter === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-amber-500/60 hover:text-amber-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  15-30j ({agingCounts.warning})
                </button>
                <button
                  type="button"
                  onClick={() => setAgingFilter('overdue')}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all flex items-center gap-1 ${
                    agingFilter === 'overdue' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'text-rose-500/60 hover:text-rose-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  &gt;30j ({agingCounts.overdue})
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Search and Action Buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou tél..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddDebtModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-600/20 flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            Ajouter une Dette
          </button>
        </div>

      </div>

      {/* Debtors / Customer List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        {displayList.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {displayList.map((c: any) => {
              const isDebtor = (Number(c.balance) || 0) < 0;
              const debtVal = Math.abs(Number(c.balance) || 0);

              return (
                <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                  
                  {/* Left Info */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                      isDebtor 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-bold text-white text-base">{c.name}</h4>
                        {isDebtor && (
                          <>
                            <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-lg uppercase tracking-wider">
                              Débiteur
                            </span>
                            <span className={`px-2 py-0.5 border text-[9px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 ${c.debtBadgeClass || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                              <Clock size={10} />
                              {c.debtLabel} ({c.debtAgeDays}j)
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><Phone size={12} className="text-indigo-400" /> {c.phone || 'Pas de numéro'}</span>
                        {c.address && <span>• {c.address}</span>}
                        <span>• Points : <strong className="text-amber-400">{c.loyaltyPoints || 0}</strong></span>
                        {c.lastVisit && (
                          <span className="text-[10px] text-slate-500">
                            • Dernier mouvement : {new Date(c.lastVisit).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right Financial Balance & Actions */}
                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {isDebtor ? 'Montant Dette Restante' : 'Solde Prépayé'}
                      </p>
                      <p className={`text-2xl font-black font-mono tracking-tight ${isDebtor ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {debtVal.toFixed(2)} <span className="text-xs font-sans font-bold">{settings.currency || 'DA'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Règlement Modal Button */}
                      {onOpenFinancialModal && (
                        <button
                          type="button"
                          onClick={() => onOpenFinancialModal(c)}
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-1.5"
                          title="Enregistrer un versement / règlement"
                        >
                          <DollarSign size={15} />
                          Régler
                        </button>
                      )}

                      {/* WhatsApp Reminder */}
                      {isDebtor && (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppReminder(c)}
                          className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all active:scale-95"
                          title="Envoyer rappel WhatsApp avec le montant dû"
                        >
                          <Send size={16} />
                        </button>
                      )}

                      {/* Print Statement */}
                      {isDebtor && (
                        <button
                          type="button"
                          onClick={() => handlePrintStatement(c)}
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95"
                          title="Imprimer Relevé de Dette"
                        >
                          <Printer size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <CreditCard size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">Aucun compte trouvé</p>
              <p className="text-xs text-slate-400 mt-1">
                {tabView === 'debtors' 
                  ? "Vous n'avez aucun client débiteur enregistré actuellement. Vous pouvez ajouter une dette avec le bouton ci-dessous."
                  : "Aucun client ne correspond à votre recherche."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddDebtModalOpen(true)}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-lg shadow-rose-600/20"
            >
              <Plus size={16} />
              Créer une Dette Immédiate
            </button>
          </div>
        )}
      </div>

      {/* MODAL : AJOUTER UNE DETTE CLIENT */}
      {isAddDebtModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#06080e]/90  flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="bg-slate-900 border border-slate-800 shadow-md rounded-xl w-full max-w-md p-6 space-y-5">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">Ajouter une Dette Client</h3>
                  <p className="text-[11px] text-slate-400">Enregistrez un crédit ou un achat impayé sur le carnet.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDebtModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewDebt} className="space-y-4">
              
              {/* Choice: Existing vs New Customer */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDebtTargetType('existing')}
                  className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${
                    debtTargetType === 'existing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Client Existant
                </button>
                <button
                  type="button"
                  onClick={() => setDebtTargetType('new')}
                  className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${
                    debtTargetType === 'new' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Nouveau Client
                </button>
              </div>

              {/* Target Customer Picker or Inputs */}
              {debtTargetType === 'existing' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sélectionner le Client :</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choisir un client dans la liste --</option>
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - Solde actuel : {(Number(c.balance) || 0).toFixed(2)} ${settings.currency || 'DA'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Nom & Prénom du Client :</label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Ex: Mourad Bouzid"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">N° Téléphone (Optionnel, pour WhatsApp) :</label>
                    <input
                      type="tel"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Ex: 0550 12 34 56"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* Debt Amount */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-rose-400">Montant de la Dette (${settings.currency || 'DA'}) :</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-slate-950 border border-rose-500/40 rounded-xl p-3.5 text-lg font-mono font-black text-rose-300 focus:outline-none focus:border-rose-500 pr-14 shadow-inner"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {settings.currency || 'DA'}
                  </span>
                </div>
              </div>

              {/* Debt Note */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Motif / Commentaire (Optionnel) :</label>
                <input
                  type="text"
                  value={debtNote}
                  onChange={(e) => setDebtNote(e.target.value)}
                  placeholder="Ex: Achat épicerie à crédit"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDebtModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingDebt}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {isSavingDebt ? 'Enregistrement...' : 'Enregistrer la Dette'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
