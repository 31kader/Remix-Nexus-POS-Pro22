import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, MessageSquare } from 'lucide-react';
import { Supplier, CompanySettings } from '../../../types';
import { useShortageStore } from '../../../store/useShortageStore';
import { Button } from '../../ui';
import { 
  generateShortageA4PrintHtml, 
  printShortageHtmlDocument, 
  exportShortagesToExcel, 
  exportShortagesToCSV, 
  generateShortagesWhatsAppText
} from './shortageExportHelpers';
import { cn } from '../../../lib/utils';
import { ShortageExportScopeHeader } from './ShortageExportScopeHeader';
import { ShortageExportFormatCards } from './ShortageExportFormatCards';
import { ShortageWhatsAppTab } from './ShortageWhatsAppTab';

interface ShortagePrintExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers?: Supplier[];
  companySettings?: CompanySettings;
  initialTab?: 'all_in_one' | 'whatsapp';
}

export const ShortagePrintExportModal: React.FC<ShortagePrintExportModalProps> = ({
  isOpen,
  onClose,
  suppliers = [],
  companySettings,
  initialTab
}) => {
  const items = useShortageStore(s => s.items);
  const customLists = useShortageStore(s => s.customLists);
  const activeListId = useShortageStore(s => s.activeListId);
  const selectedSupplierFilter = useShortageStore(s => s.selectedSupplierFilter);
  const getFilteredItems = useShortageStore(s => s.getFilteredItems);

  // Choix du périmètre d'export : cochés ou tous les filtrés
  const [exportScope, setExportScope] = useState<'checked' | 'filtered'>('filtered');
  const [activeTab, setActiveTab] = useState<'all_in_one' | 'whatsapp'>('all_in_one');
  const [recipientPhone, setRecipientPhone] = useState('');

  // Articles filtrés selon les critères actifs du tableau
  const filteredItems = useMemo(() => getFilteredItems(), [getFilteredItems, items, activeListId, selectedSupplierFilter]);
  const checkedItems = useMemo(() => filteredItems.filter(i => i.isChecked), [filteredItems]);

  // Si des articles sont cochés et qu'on ouvre la modal, cibler les cochés par défaut si > 0
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (checkedItems.length > 0) {
        setExportScope('checked');
      } else {
        setExportScope('filtered');
      }

      // Pré-remplissage du numéro du fournisseur
      if (selectedSupplierFilter !== 'all') {
        const found = suppliers.find(s => s.id === selectedSupplierFilter || s.name === selectedSupplierFilter);
        setRecipientPhone(found?.phone || '');
      } else {
        setRecipientPhone('');
      }
    }
  }, [isOpen, initialTab, checkedItems.length, selectedSupplierFilter, suppliers]);

  if (!isOpen) return null;

  const targetItems = exportScope === 'checked' && checkedItems.length > 0 
    ? checkedItems 
    : filteredItems;

  // Résolution du nom lisible du fournisseur
  const resolvedSupplierName = (() => {
    if (selectedSupplierFilter !== 'all') {
      const found = suppliers.find(s => s.id === selectedSupplierFilter);
      return found ? found.name : selectedSupplierFilter;
    }
    const distinctSuppliers = Array.from(new Set(targetItems.map(i => i.supplierName).filter((name): name is string => Boolean(name))));
    if (distinctSuppliers.length === 1 && distinctSuppliers[0]) return distinctSuppliers[0];
    if (distinctSuppliers.length > 1) return `Multi-fournisseurs (${distinctSuppliers.length})`;
    return 'Tous fournisseurs';
  })();

  // Résolution du nom de la liste active
  const resolvedListName = (() => {
    if (activeListId !== 'all') {
      const found = customLists.find(l => l.id === activeListId);
      return found ? found.name : 'Liste personnalisée';
    }
    return 'Toutes les listes';
  })();

  const companyName = companySettings?.name || 'Nexus POS Pro';
  const companyPhone = companySettings?.phone || '';

  const totalQuantity = targetItems.reduce((acc, it) => acc + (it.quantityNeeded || 0), 0);
  const totalValuation = targetItems.reduce((acc, it) => acc + ((it.quantityNeeded || 0) * (it.costPrice || 0)), 0);

  // Handlers des actions d'export
  const handlePrintA4 = () => {
    const html = generateShortageA4PrintHtml({
      items: targetItems,
      supplierName: resolvedSupplierName,
      listName: resolvedListName,
      companyName,
      companyPhone,
      currency: 'DA'
    });
    printShortageHtmlDocument(html);
  };

  const handleExportExcel = async () => {
    try {
      await exportShortagesToExcel(targetItems, undefined, resolvedListName);
    } catch (err: any) {
      alert(`Erreur export Excel : ${err?.message || 'Erreur inconnue'}`);
    }
  };

  const handleExportCSV = () => {
    try {
      exportShortagesToCSV(targetItems, undefined, resolvedListName);
    } catch (err: any) {
      alert(`Erreur export CSV : ${err?.message || 'Erreur inconnue'}`);
    }
  };

  const whatsAppText = generateShortagesWhatsAppText({
    items: targetItems,
    supplierName: resolvedSupplierName,
    listName: resolvedListName,
    companyName
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-industrial-950 border border-industrial-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-print-export-title"
      >
        {/* En-tête de la Modale */}
        <div className="flex items-center justify-between p-5 border-b border-industrial-800 bg-industrial-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Printer size={20} />
            </div>
            <div>
              <h2 id="modal-print-export-title" className="text-lg font-black text-white uppercase tracking-tight">
                Impression & Exportation du Réassort
              </h2>
              <p className="text-xs text-industrial-400 font-mono">
                Générez des bons de commande A4, fichiers Excel/CSV ou messages WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps Défilant */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Périmètre d'export & Récapitulatif Contextuel */}
          <ShortageExportScopeHeader
            targetItemsCount={targetItems.length}
            totalQuantity={totalQuantity}
            totalValuation={totalValuation}
            checkedItemsCount={checkedItems.length}
            filteredItemsCount={filteredItems.length}
            exportScope={exportScope}
            onScopeChange={setExportScope}
            resolvedSupplierName={resolvedSupplierName}
            resolvedListName={resolvedListName}
          />

          {/* Onglets de Présentation */}
          <div className="flex border-b border-industrial-800 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('all_in_one')}
              className={cn(
                "pb-2 text-xs font-mono font-bold transition-all uppercase tracking-wider border-b-2 cursor-pointer",
                activeTab === 'all_in_one'
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-industrial-500 hover:text-industrial-300"
              )}
            >
              Formats d'Impression & Téléchargement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={cn(
                "pb-2 text-xs font-mono font-bold transition-all uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer",
                activeTab === 'whatsapp'
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-industrial-500 hover:text-industrial-300"
              )}
            >
              <MessageSquare size={13} />
              <span>Message WhatsApp / SMS</span>
            </button>
          </div>

          {/* Formats d'impression et de téléchargement */}
          {activeTab === 'all_in_one' && (
            <ShortageExportFormatCards
              hasItems={targetItems.length > 0}
              onPrintA4={handlePrintA4}
              onExportExcel={handleExportExcel}
              onExportCSV={handleExportCSV}
            />
          )}

          {/* Contenu de l'onglet WhatsApp */}
          {activeTab === 'whatsapp' && (
            <ShortageWhatsAppTab
              hasItems={targetItems.length > 0}
              recipientPhone={recipientPhone}
              onRecipientPhoneChange={setRecipientPhone}
              whatsAppText={whatsAppText}
            />
          )}
        </div>

        {/* Pied de la Modale */}
        <div className="p-4 border-t border-industrial-800 bg-industrial-900/60 flex items-center justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="bg-industrial-900 border-industrial-700 text-white font-mono text-xs px-5 py-2 rounded-xl cursor-pointer"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
