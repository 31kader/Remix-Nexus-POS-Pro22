import React, { useState, useMemo } from 'react';
import { 
  X, Printer, FileSpreadsheet, FileText, 
  MessageSquare, Copy, Check, ExternalLink, 
  Layers, Building2, CheckSquare 
} from 'lucide-react';
import { ShortageItem } from '../../../types/shortages';
import { Supplier, CompanySettings } from '../../../types';
import { useShortageStore } from '../../../store/useShortageStore';
import { Button } from '../../ui';
import { 
  generateShortageA4PrintHtml, 
  printShortageHtmlDocument, 
  exportShortagesToExcel, 
  exportShortagesToCSV, 
  generateShortagesWhatsAppText,
  formatDZD,
  openWhatsAppDirectShare,
  formatAlgerianWhatsAppPhone
} from './shortageExportHelpers';
import { cn } from '../../../lib/utils';

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
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<'all_in_one' | 'whatsapp'>('all_in_one');
  const [recipientPhone, setRecipientPhone] = useState('');

  // Articles filtrés selon les critères actifs du tableau
  const filteredItems = useMemo(() => getFilteredItems(), [getFilteredItems, items, activeListId, selectedSupplierFilter]);
  const checkedItems = useMemo(() => filteredItems.filter(i => i.isChecked), [filteredItems]);

  // Si des articles sont cochés et qu'on ouvre la modal, cibler les cochés par défaut si > 0
  React.useEffect(() => {
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
        if (found?.phone) {
          setRecipientPhone(found.phone);
        } else {
          setRecipientPhone('');
        }
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
    const distinctSuppliers = Array.from(new Set(targetItems.map(i => i.supplierName).filter(Boolean)));
    if (distinctSuppliers.length === 1) return distinctSuppliers[0];
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

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppText);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch (err) {
      console.error('Échec de la copie dans le presse-papier:', err);
    }
  };

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
            className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps Défilant */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. Sélecteur du Périmètre d'Export */}
          <div className="bg-industrial-900/40 p-3.5 rounded-2xl border border-industrial-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-industrial-400 tracking-wider block mb-0.5">
                Périmètre à exporter / imprimer
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {targetItems.length} article(s) ciblé(s)
                </span>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  ({totalQuantity} unités • {formatDZD(totalValuation)} DA)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-industrial-950 p-1 rounded-xl border border-industrial-800">
              {checkedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExportScope('checked')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5",
                    exportScope === 'checked'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-industrial-400 hover:text-white"
                  )}
                >
                  <CheckSquare size={13} />
                  <span>Cochés ({checkedItems.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5",
                  exportScope === 'filtered'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-industrial-400 hover:text-white"
                )}
              >
                <span>Vue filtrée ({filteredItems.length})</span>
              </button>
            </div>
          </div>

          {/* 2. Récapitulatif Contextuel */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-industrial-500 uppercase block">Fournisseur :</span>
                <span className="font-bold text-white truncate block">{resolvedSupplierName}</span>
              </div>
            </div>

            <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800 flex items-center gap-2">
              <Layers size={16} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-industrial-500 uppercase block">Liste :</span>
                <span className="font-bold text-white truncate block">{resolvedListName}</span>
              </div>
            </div>
          </div>

          {/* 3. Onglets de Présentation */}
          <div className="flex border-b border-industrial-800 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('all_in_one')}
              className={cn(
                "pb-2 text-xs font-mono font-bold transition-all uppercase tracking-wider border-b-2",
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
                "pb-2 text-xs font-mono font-bold transition-all uppercase tracking-wider border-b-2 flex items-center gap-1.5",
                activeTab === 'whatsapp'
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-industrial-500 hover:text-industrial-300"
              )}
            >
              <MessageSquare size={13} />
              <span>Message WhatsApp / SMS</span>
            </button>
          </div>

          {/* Contenu de l'onglet Formats */}
          {activeTab === 'all_in_one' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* Carte 1 : Impression A4 */}
              <div className="bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between group shadow-lg">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Printer size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Bon de Commande A4
                  </h3>
                  <p className="text-[11px] text-industrial-400 font-mono leading-relaxed">
                    Document officiel prêt à imprimer ou enregistrer en PDF avec marges, en-tête et signatures.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="button"
                    disabled={targetItems.length === 0}
                    onClick={handlePrintA4}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={14} />
                    <span>Imprimer A4</span>
                  </Button>
                </div>
              </div>

              {/* Carte 2 : Export Excel (.xlsx) */}
              <div className="bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-lg">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Feuille Excel (.xlsx)
                  </h3>
                  <p className="text-[11px] text-industrial-400 font-mono leading-relaxed">
                    Export structuré sécurisé avec colonnes calculées (P.U, total, codes-barres) via SheetJS.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="button"
                    disabled={targetItems.length === 0}
                    onClick={handleExportExcel}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Export Excel</span>
                  </Button>
                </div>
              </div>

              {/* Carte 3 : Export CSV (.csv) */}
              <div className="bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-lg">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Fichier CSV (.csv)
                  </h3>
                  <p className="text-[11px] text-industrial-400 font-mono leading-relaxed">
                    Format universel encodé en UTF-8 avec BOM et séparateur point-virgule compatible tableurs.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="button"
                    disabled={targetItems.length === 0}
                    onClick={handleExportCSV}
                    className="w-full bg-industrial-950 border border-industrial-700 hover:border-amber-500 text-amber-400 hover:text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText size={14} />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Contenu de l'onglet WhatsApp */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 pt-1">
              {/* Carte d'envoi direct WhatsApp */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-mono uppercase text-emerald-300 font-bold block mb-1">
                      Numéro WhatsApp du Fournisseur / Commercial :
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="Ex: 0555 12 34 56 ou +213 661 ..."
                        className="bg-industrial-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400 w-full sm:w-72"
                      />
                      {recipientPhone && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-500/20">
                          +{formatAlgerianWhatsAppPhone(recipientPhone) || 'Invalide'}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={targetItems.length === 0}
                    onClick={() => openWhatsAppDirectShare({ text: whatsAppText, phoneNumber: recipientPhone })}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare size={16} />
                    <span>Ouvrir sur WhatsApp</span>
                    <ExternalLink size={13} />
                  </Button>
                </div>

                <p className="text-[11px] text-emerald-400/80 font-mono">
                  Ouvre instantanément WhatsApp Web sur PC ou l'application WhatsApp sur smartphone avec le message pré-rempli.
                </p>
              </div>

              {/* Aperçu du message et bouton de copie */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-industrial-400">
                    Aperçu du texte de commande :
                  </span>
                  <Button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm",
                      copiedWhatsApp
                        ? "bg-emerald-600 text-white"
                        : "bg-industrial-900 border border-industrial-700 hover:border-emerald-500 text-emerald-400 hover:text-white"
                    )}
                  >
                    {copiedWhatsApp ? (
                      <>
                        <Check size={14} />
                        <span>Copié dans le presse-papier !</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copier le message</span>
                      </>
                    )}
                  </Button>
                </div>

                <textarea
                  readOnly
                  value={whatsAppText}
                  rows={9}
                  className="w-full bg-industrial-950 border border-industrial-800 rounded-2xl p-4 font-mono text-xs text-industrial-200 leading-relaxed focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pied de la Modale */}
        <div className="p-4 border-t border-industrial-800 bg-industrial-900/60 flex items-center justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="bg-industrial-900 border-industrial-700 text-white font-mono text-xs px-5 py-2 rounded-xl"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
