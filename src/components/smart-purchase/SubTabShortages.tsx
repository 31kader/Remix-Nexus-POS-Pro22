import React, { useMemo, useState } from 'react';
import { Product, Supplier, Purchase, CompanySettings } from '../../types';
import { ShortageItem } from '../../types/shortages';
import { useShortageStore } from '../../store/useShortageStore';
import { ShortagesHeader } from './shortages/ShortagesHeader';
import { CustomListsTabs } from './shortages/CustomListsTabs';
import { ShortagesFiltersBar } from './shortages/ShortagesFiltersBar';
import { ShortagesTable } from './shortages/ShortagesTable';
import { ShortageSuggestionsDrawer } from './shortages/ShortageSuggestionsDrawer';
import { CustomListModal } from './shortages/CustomListModal';
import { ShortagePrintExportModal } from './shortages/ShortagePrintExportModal';
import { AddCustomShortageModal } from './shortages/AddCustomShortageModal';

interface SubTabShortagesProps {
  products: Product[];
  suppliers: Supplier[];
  purchases?: Purchase[];
  companySettings?: CompanySettings;
  onConvertToPurchase?: (items: ShortageItem[], supplierId?: string) => void;
  onPrintExport?: () => void;
}

export const SubTabShortages: React.FC<SubTabShortagesProps> = ({
  products,
  suppliers,
  purchases = [],
  companySettings,
  onConvertToPurchase,
  onPrintExport
}) => {
  const isSuggestionsOpen = useShortageStore(s => s.isSuggestionsOpen);
  const setIsSuggestionsOpen = useShortageStore(s => s.setIsSuggestionsOpen);
  const items = useShortageStore(s => s.items);
  const selectedSupplierFilter = useShortageStore(s => s.selectedSupplierFilter);
  const detectLowStockProducts = useShortageStore(s => s.detectLowStockProducts);

  // Modales locales
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isPrintExportOpen, setIsPrintExportOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [printModalTab, setPrintModalTab] = useState<'all_in_one' | 'whatsapp'>('all_in_one');

  // Calcul du nombre d'articles suggérés disponibles
  const suggestedCount = useMemo(() => {
    return detectLowStockProducts(products, purchases, suppliers).length;
  }, [products, purchases, suppliers, items, detectLowStockProducts]);

  // Handler d'impression/export et WhatsApp
  const handleOpenPrintExport = onPrintExport || (() => {
    setPrintModalTab('all_in_one');
    setIsPrintExportOpen(true);
  });

  const handleOpenWhatsApp = () => {
    setPrintModalTab('whatsapp');
    setIsPrintExportOpen(true);
  };

  const handleOpenAddCustom = (barcode?: string) => {
    setPendingBarcode(barcode || '');
    setIsAddCustomOpen(true);
  };

  // Handler de conversion vers le Bon d'Achat
  const handleConvertToPurchase = () => {
    if (!onConvertToPurchase) return;

    const filteredItems = useShortageStore.getState().getFilteredItems();
    const checkedItems = filteredItems.filter(i => i.isChecked);
    const itemsToConvert = checkedItems.length > 0 ? checkedItems : filteredItems;

    if (itemsToConvert.length === 0) return;

    // Déterminer si un fournisseur commun peut être pré-sélectionné
    let targetSupplierId: string | undefined = undefined;
    if (selectedSupplierFilter !== 'all') {
      targetSupplierId = selectedSupplierFilter;
    } else {
      const distinctSuppliers = Array.from(
        new Set(itemsToConvert.map(i => i.supplierId).filter(Boolean))
      );
      if (distinctSuppliers.length === 1) {
        targetSupplierId = distinctSuppliers[0];
      }
    }

    onConvertToPurchase(itemsToConvert, targetSupplierId);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. En-tête avec statistiques et actions globales */}
      <ShortagesHeader
        onOpenSuggestions={() => setIsSuggestionsOpen(true)}
        onConvertToPurchase={onConvertToPurchase ? handleConvertToPurchase : undefined}
        onPrintExport={handleOpenPrintExport}
        onOpenAddCustom={() => handleOpenAddCustom()}
        onOpenWhatsApp={handleOpenWhatsApp}
        suggestedCount={suggestedCount}
      />

      {/* 2. Onglets-pills des listes personnalisées libres */}
      <CustomListsTabs
        onOpenManageModal={() => setIsListModalOpen(true)}
      />

      {/* 3. Barre d'outils de recherche, douchette USB et filtres */}
      <ShortagesFiltersBar
        products={products}
        suppliers={suppliers}
        onOpenAddCustom={handleOpenAddCustom}
      />

      {/* 4. Tableau interactif des articles manquants */}
      <ShortagesTable
        onOpenSuggestions={() => setIsSuggestionsOpen(true)}
      />

      {/* 5. Tiroir coulissant latéral des suggestions de réassort */}
      <ShortageSuggestionsDrawer
        products={products}
        purchases={purchases}
        suppliers={suppliers}
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
      />

      {/* 6. Modale de gestion des listes personnalisées (Création, modification, suppression) */}
      <CustomListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
      />

      {/* 7. Modale d'ajout rapide d'un article hors-catalogue */}
      <AddCustomShortageModal
        isOpen={isAddCustomOpen}
        onClose={() => setIsAddCustomOpen(false)}
        suppliers={suppliers}
        initialBarcode={pendingBarcode}
      />

      {/* 8. Modale d'impression A4 épurée et d'export Excel, CSV et WhatsApp */}
      <ShortagePrintExportModal
        isOpen={isPrintExportOpen}
        onClose={() => setIsPrintExportOpen(false)}
        suppliers={suppliers}
        companySettings={companySettings}
        initialTab={printModalTab}
      />
    </div>
  );
};
