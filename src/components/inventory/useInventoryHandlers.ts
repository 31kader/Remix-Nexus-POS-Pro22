import { localDb } from '../../services/LocalDatabase';
import { logAction } from '../../lib/utils';
import Papa from 'papaparse';
import { Product, Purchase, CompanySettings } from '../../types';
import { toast } from 'sonner';

export function useInventoryHandlers({
  products,
  user,
  settings,
  setIsProcessing,
  setActiveTab,
  setProductToDelete,
  setIsDeleteConfirmOpen,
  setCsvHeaders,
  setImportPreviewData,
  setIsImportModalOpen,
  productToDelete
}: any) {
  
  const generateLowStockOrder = async () => {
    const lowStockItems = products.filter((p: Product) => p.stock <= (p.minStock || 5));
    if (lowStockItems.length === 0) {
      alert("Aucun produit en stock faible.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const purchaseData: Omit<Purchase, 'id'> = {
        supplierId: 'low-stock-auto',
        supplierName: 'Auto-Réapprovisionnement',
        items: lowStockItems.map((p: Product) => ({
          productId: p.id,
          name: p.name,
          quantity: (p.minStock || 5) * 2 - p.stock,
          costPrice: p.costPrice || 0,
          taxes: 0,
        })),
        total: lowStockItems.reduce((sum: number, p: Product) => sum + ((p.costPrice || 0) * ((p.minStock || 5) * 2 - p.stock)), 0),
        date: new Date().toISOString(),
        status: 'draft',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        updatedAt: new Date().toISOString()
      };
      const newId = Math.random().toString(36).substring(2, 10);
      await localDb.insert(`purchases/${newId}`, purchaseData);
      alert("Commande automatique générée dans les achats (Brouillon).");
      setActiveTab('purchases');
    } catch (error: any) {
      console.error("Error creating purchase:", error);
      alert("Erreur lors de la création de la commande: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      const product = products.find((p: Product) => p.id === productToDelete);
      try {
        // Query transactions and purchases to check for associations
        const transactionsSnap = await localDb.get('transactions');
        const transactions = transactionsSnap.exists() ? Object.values(transactionsSnap.val() || {}) : [];
        const hasTransactions = transactions.some((t: any) => 
          (t.items || []).some((item: any) => item.productId === productToDelete || item.id === productToDelete)
        );

        const purchasesSnap = await localDb.get('purchases');
        const purchases = purchasesSnap.exists() ? Object.values(purchasesSnap.val() || {}) : [];
        const hasPurchases = purchases.some((p: any) => 
          (p.items || []).some((item: any) => item.productId === productToDelete || item.id === productToDelete)
        );

        if (hasTransactions || hasPurchases) {
          const confirmDeactivate = window.confirm(
            `⚠️ Impossible de supprimer définitivement "${product?.name || 'ce produit'}" car des ventes ou achats y sont associés.\n\nVoulez-vous désactiver son profil (passer son statut à "Inactive") à la place ?`
          );
          if (confirmDeactivate) {
            await localDb.update(`products/${productToDelete}`, { status: 'inactive' });
            toast.success("Produit désactivé avec succès.");
          }
          setIsDeleteConfirmOpen(false);
          setProductToDelete(null);
          return;
        }

        await localDb.delete(`products/${productToDelete}`);
        window.dispatchEvent(new CustomEvent('product-cache-delete', { detail: { id: productToDelete } }));
        logAction(user?.uid || 'unknown', user?.displayName || 'Utilisateur', 'Suppression Produit', 'Inventaire', `Produit: ${product?.name || 'Inconnu'}, SKU: ${product?.sku || 'Inconnu'}`);
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
        toast.success("Produit supprimé avec succès.");
      } catch (error: any) {
        console.error("Error deleting product:", error);
        alert("Erreur lors de la suppression: " + error.message);
      }
    }
  };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results: any) => {
          const rawRows = results.data as any[][];
          if (!rawRows || rawRows.length === 0) {
            toast.error("Le fichier CSV est vide.");
            return;
          }

          const firstRow = rawRows[0] || [];
          const knownHeaderTerms = ['nom', 'name', 'désignation', 'designation', 'article', 'produit', 'product', 'prix', 'price', 'sku', 'code', 'barcode', 'stock', 'qte', 'quantite', 'categorie', 'category', 'achat', 'cout', 'cost'];
          
          const isHeaderRow = firstRow.some((col: any) => {
            if (typeof col !== 'string') return false;
            const lower = col.toLowerCase().trim();
            return knownHeaderTerms.includes(lower);
          });

          let headers: string[] = [];
          let dataObjects: any[] = [];

          if (isHeaderRow) {
            headers = firstRow.map((h: any, idx: number) => (h && h.toString().trim()) || `Colonne ${idx + 1}`);
            const dataRows = rawRows.slice(1);
            dataObjects = dataRows
              .filter((row: any[]) => row && row.some(cell => cell && cell.toString().trim() !== ''))
              .map((row: any[]) => {
                const obj: Record<string, any> = {};
                headers.forEach((h, idx) => {
                  obj[h] = row[idx] !== undefined ? row[idx] : '';
                });
                return obj;
              });
          } else {
            // No header row: first row is data!
            headers = firstRow.map((_, idx: number) => `Colonne ${idx + 1}`);
            dataObjects = rawRows
              .filter((row: any[]) => row && row.some(cell => cell && cell.toString().trim() !== ''))
              .map((row: any[]) => {
                const obj: Record<string, any> = {};
                headers.forEach((h, idx) => {
                  obj[h] = row[idx] !== undefined ? row[idx] : '';
                });
                return obj;
              });
          }

          if (dataObjects.length > 0) {
            setCsvHeaders(headers);
            setImportPreviewData(dataObjects);
            setIsImportModalOpen(true);
          } else {
            toast.error("Aucune ligne de produit valide trouvée dans le fichier.");
          }
        },
        error: (error: any) => {
          console.error('Error parsing CSV:', error);
          toast.error('Erreur lors de la lecture du fichier CSV: ' + error.message);
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      try {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        
        if (!rawJson || rawJson.length === 0) {
          toast.error("Le fichier Excel est vide.");
          return;
        }

        const firstRow = rawJson[0] || [];
        const knownHeaderTerms = ['nom', 'name', 'désignation', 'designation', 'article', 'produit', 'product', 'prix', 'price', 'sku', 'code', 'barcode', 'stock', 'qte', 'quantite', 'categorie', 'category', 'achat', 'cout', 'cost'];
        
        const isHeaderRow = firstRow.some((col: any) => {
          if (typeof col !== 'string') return false;
          const lower = col.toLowerCase().trim();
          return knownHeaderTerms.includes(lower);
        });

        let headers: string[] = [];
        let dataObjects: any[] = [];

        if (isHeaderRow) {
          headers = firstRow.map((h: any, idx: number) => (h && h.toString().trim()) || `Colonne ${idx + 1}`);
          const dataRows = rawJson.slice(1);
          dataObjects = dataRows
            .filter((row: any[]) => row && row.some(cell => cell && cell.toString().trim() !== ''))
            .map((row: any[]) => {
              const obj: Record<string, any> = {};
              headers.forEach((h, idx) => {
                obj[h] = row[idx] !== undefined ? row[idx] : '';
              });
              return obj;
            });
        } else {
          headers = firstRow.map((_, idx: number) => `Colonne ${idx + 1}`);
          dataObjects = rawJson
            .filter((row: any[]) => row && row.some(cell => cell && cell.toString().trim() !== ''))
            .map((row: any[]) => {
              const obj: Record<string, any> = {};
              headers.forEach((h, idx) => {
                obj[h] = row[idx] !== undefined ? row[idx] : '';
              });
              return obj;
            });
        }

        if (dataObjects.length > 0) {
          setCsvHeaders(headers);
          setImportPreviewData(dataObjects);
          setIsImportModalOpen(true);
        } else {
          toast.error("Aucune ligne de produit valide trouvée dans le fichier.");
        }
      } catch (error: any) {
        console.error('Error parsing XLSX:', error);
        toast.error('Erreur lors de la lecture du fichier Excel: ' + error.message);
      }
    }
  };

  const handleCSVExport = () => {
    const headers = ['name', 'price', 'costPrice', 'stock', 'category', 'sku', 'unit'];
    const csvContent = [
      headers.join(','),
      ...products.map((p: Product) => [
        `"${p.name}"`,
        p.price,
        p.costPrice || 0,
        p.stock,
        `"${p.categoryId || ''}"`,
        `"${p.sku || ''}"`,
        `"${p.unit || 'unité'}"`
      ].join(','))
    ].join('\
');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventaire.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    generateLowStockOrder,
    handleDelete,
    confirmDelete,
    handleCSVImport,
    handleCSVExport
  };
}
