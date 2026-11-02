import { Product, CompanySettings, Category, Brand } from '../../../types';
import { printLabels } from '../../../services/printService';
import { exportToExcel } from '../../../lib/utils';
import { toast } from 'sonner';

interface UseInventoryExportAndPrintProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  settings: CompanySettings;
}

export function useInventoryExportAndPrint({
  products,
  categories,
  brands,
  settings
}: UseInventoryExportAndPrintProps) {
  const printQuickLabel = (product: Product) => {
    const savedPrinterType = (() => {
      try {
        const val = localStorage.getItem('nexus_label_printer_type');
        if (val === 'dedicated_label_printer' || val === 'receipt_printer') return val;
      } catch (_) {}
      return 'dedicated_label_printer';
    })();
    printLabels([product], { ...settings, labelPrinterType: savedPrinterType } as any);
  };

  const handleExportExcel = async () => {
    try {
      if (!products || products.length === 0) {
        toast.error("Aucun produit à exporter.");
        return;
      }
      
      const exportData = products.map((p: Product) => {
        const cat = categories.find(c => c.id === p.categoryId);
        const brand = brands.find(b => b.id === p.brandId);
        return {
          'ID': p.id,
          'Désignation': p.name || '',
          'Code-barres': p.barcode || '',
          'SKU': p.sku || '',
          'Prix Vente (DA)': Number(p.price) || 0,
          'Prix Achat (DA)': Number(p.costPrice) || 0,
          'Stock': Number(p.stock) || 0,
          'Stock Min': Number(p.minStock) || 0,
          'Catégorie': cat?.name || p.categoryId || '',
          'Marque': brand?.name || p.brandId || '',
          'Fournisseur': p.supplier || '',
          'Unité': p.unit || 'pcs',
          'Statut': p.status || 'active',
          'Date Expiration': p.expirationDate || ''
        };
      });

      await exportToExcel(exportData, `catalogue_produits_${new Date().toISOString().slice(0, 10)}`);
      toast.success(`${products.length} produit(s) exporté(s) en Excel avec succès !`);
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Erreur lors de l'export: " + err.message);
    }
  };

  return {
    printQuickLabel,
    handleExportExcel
  };
}
