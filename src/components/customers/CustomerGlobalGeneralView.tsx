import React, { useState, useMemo } from 'react';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Customer } from '../../types';
import { parseCashierNotes } from '../../lib/utils';
import { usePeopleStore } from '../../store/usePeopleStore';
import { localDb } from '../../services/LocalDatabase';
import {
  CustomerGlobalGeneralViewProps,
  ParsedGeneralNote,
  JournalCustomerHeader,
  GeneralNotesKpis,
  GeneralNotesQuickInput,
  GeneralNotesTable,
  GeneralNoteMobileCard,
  JournalPagination,
  GeneralNotesFilterBar,
  parseNoteInfo
} from './journal';

export { type CustomerGlobalGeneralViewProps } from './journal';
export { parseNoteInfo };

export const CustomerGlobalGeneralView: React.FC<CustomerGlobalGeneralViewProps> = ({
  customers: propCustomers,
  settings,
  selectedCustomerId: initialSelectedCustomerId = null,
  onSelectCustomer,
  onOpenFinancialModal: _onOpenFinancialModal
}) => {
  const storeCustomers = usePeopleStore(s => s.customers);
  const customers = propCustomers && propCustomers.length > 0 ? propCustomers : storeCustomers;

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(initialSelectedCustomerId || null);
  const [filterType, setFilterType] = useState<'all' | 'versement' | 'retrait' | 'memo'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // Quick note entry state
  const [targetCustomerId, setTargetCustomerId] = useState<string>(initialSelectedCustomerId || '');
  const [quickNoteText, setQuickNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Map of customers
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Aggregate all notes from all customers
  const allNotes = useMemo(() => {
    const list: ParsedGeneralNote[] = [];

    customers.forEach(c => {
      if (!c) return;
      const rawNotes = parseCashierNotes(c.cashierNotes || (c as any).cashier_notes);
      rawNotes.forEach(item => {
        list.push(parseNoteInfo(c.id, c.name || 'Client sans nom', c.phone, item));
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customers]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return allNotes.filter(item => {
      if (activeCustomerId && item.customerId !== activeCustomerId) return false;
      if (filterType !== 'all' && item.type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.customerName || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchNote = (item.note || '').toLowerCase().includes(q);
        const matchAuthor = (item.author || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchNote && !matchAuthor) return false;
      }

      return true;
    });
  }, [allNotes, activeCustomerId, filterType, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    let versementsCount = 0;
    let versementsTotal = 0;
    let retraitsCount = 0;
    let retraitsTotal = 0;
    let memosCount = 0;

    filteredNotes.forEach(n => {
      if (n.type === 'versement') {
        versementsCount++;
        versementsTotal += (n.amount || 0);
      } else if (n.type === 'retrait') {
        retraitsCount++;
        retraitsTotal += (n.amount || 0);
      } else {
        memosCount++;
      }
    });

    return {
      totalNotes: filteredNotes.length,
      versementsCount,
      versementsTotal,
      retraitsCount,
      retraitsTotal,
      memosCount,
      netTotal: versementsTotal - retraitsTotal
    };
  }, [filteredNotes]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredNotes.slice(start, start + PAGE_SIZE);
  }, [filteredNotes, currentPage]);

  const handleAddNote = async () => {
    const custId = targetCustomerId || activeCustomerId;
    const trimmed = quickNoteText.trim();
    if (!custId || !trimmed) {
      toast.error("Veuillez sélectionner un client et saisir une note");
      return;
    }

    const targetCustomer = customerMap.get(custId);
    if (!targetCustomer) return;

    setIsSubmittingNote(true);
    try {
      const noteEntry = {
        note: trimmed,
        author: 'Direction/Caisse',
        timestamp: new Date().toISOString()
      };
      const currentNotes = parseCashierNotes(targetCustomer.cashierNotes || (targetCustomer as any).cashier_notes);
      const updatedNotes = [...currentNotes, noteEntry];
      const updatedCustomer: Customer = {
        ...targetCustomer,
        cashierNotes: updatedNotes,
        updatedAt: new Date().toISOString()
      };

      usePeopleStore.getState().setCustomers(prev =>
        prev.map(c => c.id === targetCustomer.id ? updatedCustomer : c)
      );
      await localDb.update(`customers/${targetCustomer.id}`, updatedCustomer);
      setQuickNoteText('');
      toast.success("Note enregistrée avec succès !");
    } catch (err) {
      console.warn("Erreur ajout note:", err);
      toast.error("Erreur lors de l'enregistrement de la note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const selectedCustomerObj = activeCustomerId ? customerMap.get(activeCustomerId) : null;

  return (
    <div className="flex-1 flex flex-col gap-4 bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-md overflow-hidden h-full">
      {/* 1. Header & Filtre par Client */}
      <JournalCustomerHeader
        icon={<UserCheck size={20} />}
        title="Grand Livre & Relevé de Compte"
        subtitle={`${filteredNotes.length} écriture(s) enregistrée(s) • Règlements, versements et mémos clients`}
        customers={customers}
        activeCustomerId={activeCustomerId}
        selectedCustomerObj={selectedCustomerObj}
        onSelectCustomer={(id) => {
          setActiveCustomerId(id);
          setPage(1);
          if (onSelectCustomer) onSelectCustomer(id);
        }}
        settings={settings}
      />

      {/* 2. Barre de Saisie Rapide de Note */}
      <GeneralNotesQuickInput
        customers={customers}
        activeCustomerId={activeCustomerId}
        targetCustomerId={targetCustomerId}
        setTargetCustomerId={setTargetCustomerId}
        quickNoteText={quickNoteText}
        setQuickNoteText={setQuickNoteText}
        isSubmittingNote={isSubmittingNote}
        handleAddNote={handleAddNote}
      />

      {/* 3. Statistiques & KPIs */}
      <GeneralNotesKpis
        stats={stats}
        settings={settings}
      />

      {/* 4. Barre de Filtres & Recherche */}
      <GeneralNotesFilterBar
        filterType={filterType}
        setFilterType={setFilterType}
        totalNotesCount={allNotes.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onResetPage={() => setPage(1)}
      />

      {/* 5. Tableau des Écritures & Cartes Mobiles */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60">
        {paginatedNotes.length > 0 ? (
          <>
            {/* Mobile Card List (< lg) */}
            <div className="block lg:hidden space-y-3 p-3">
              {paginatedNotes.map((noteItem, idx) => (
                <GeneralNoteMobileCard
                  key={idx}
                  noteItem={noteItem}
                  settings={settings}
                  name={noteItem.customerName}
                  typeLabel={noteItem.typeLabel}
                  author={noteItem.author}
                />
              ))}
            </div>

            {/* Desktop Table View (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <GeneralNotesTable
                paginatedNotes={paginatedNotes}
                settings={settings}
              />
            </div>
          </>
        ) : (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <UserCheck size={36} className="mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Aucune écriture trouvée</p>
            <p className="text-xs text-slate-500">Ajoutez une note ou modifiez les critères de filtrage.</p>
          </div>
        )}
      </div>

      {/* 6. Pagination */}
      <JournalPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredNotes.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
};

export default CustomerGlobalGeneralView;
