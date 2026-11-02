import { useState, useMemo } from 'react';
import { InventoryAudit as InventoryAuditType, Product, CompanySettings } from '../../../types';
import { localDb } from '../../../services/LocalDatabase';
import { generateUniqueId, safeGetItems } from '../../../lib/utils';
import { printInventorySheetA4 } from './printInventorySheetA4';
import { executeConfirmAudit } from './confirmAuditService';
import { toast } from 'sonner';

interface UseInventoryAuditLogicProps {
  audits: InventoryAuditType[];
  products: Product[];
  user: any;
  settings: CompanySettings;
}

export function useInventoryAuditLogic({
  audits = [],
  products = [],
  user,
  settings
}: UseInventoryAuditLogicProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAudit, setActiveAudit] = useState<InventoryAuditType | null>(null);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryToAdd, setCategoryToAdd] = useState('');
  const [itemFilter, setItemFilter] = useState<'all' | 'discrepancy' | 'ok'>('all');
  const [blindCountMode, setBlindCountMode] = useState(false);

  const currency = settings?.currency || 'DA';

  const uniqueCategories = useMemo(() => {
    const s = new Set<string>();
    for (const p of products) {
      if (p?.categoryId) s.add(p.categoryId);
    }
    return Array.from(s).sort();
  }, [products]);

  const globalKpis = useMemo(() => {
    let totalRefs = 0;
    let totalDisc = 0;
    let totalImpact = 0;
    for (const a of audits) {
      const items = safeGetItems(a);
      totalRefs += items.length;
      totalDisc += items.filter((i: any) => Number(i.discrepancy) !== 0).length;
      totalImpact += Number(a.totalDiscrepancyValue) || 0;
    }
    return {
      totalSessions: audits.length,
      totalRefs,
      totalDisc,
      totalImpact
    };
  }, [audits]);

  const startNewAudit = async () => {
    const newAudit = {
      id: generateUniqueId(),
      startDate: new Date().toISOString(),
      status: 'in_progress' as const,
      auditorId: user?.uid || 'admin',
      items: []
    };
    try {
      await localDb.insert(`audits/${newAudit.id}`, newAudit);
      setActiveAudit(newAudit as InventoryAuditType);
      setAuditItems([]);
      setIsModalOpen(true);
      toast.success("Nouvelle fiche d'inventaire physique ouverte !");
    } catch (error: any) {
      console.error('Error creating audit:', error);
      toast.error('Erreur: ' + (error?.message || 'Erreur inconnue'));
    }
  };

  const addProductToAudit = (product: Product) => {
    if (auditItems.find(item => item.productId === product.id)) {
      toast.info(`"${product.name}" est déjà dans la fiche d'inventaire`);
      return;
    }
    setAuditItems(prev => [
      ...prev,
      {
        productId: product.id,
        sku: product.sku || product.barcode || '',
        productName: product.name,
        costPrice: Number(product.costPrice) || 0,
        expectedStock: Number(product.stock) || 0,
        actualStock: Number(product.stock) || 0,
        discrepancy: 0,
        notes: ''
      }
    ]);
  };

  const handleAddCategoryToAudit = () => {
    if (!categoryToAdd) return;
    const existingIds = new Set(auditItems.map(i => i.productId));
    const toAdd = products
      .filter(p => p.categoryId === categoryToAdd && !existingIds.has(p.id))
      .slice(0, 60)
      .map(p => ({
        productId: p.id,
        sku: p.sku || p.barcode || '',
        productName: p.name,
        costPrice: Number(p.costPrice) || 0,
        expectedStock: Number(p.stock) || 0,
        actualStock: Number(p.stock) || 0,
        discrepancy: 0,
        notes: ''
      }));

    if (toAdd.length === 0) {
      toast.info('Aucun nouvel article à ajouter pour ce rayon.');
      return;
    }
    setAuditItems(prev => [...prev, ...toAdd]);
    toast.success(`${toAdd.length} article(s) du rayon ajoutés à la fiche d'inventaire.`);
    setCategoryToAdd('');
  };

  const handleAddLowStockProducts = () => {
    const existingIds = new Set(auditItems.map(i => i.productId));
    const toAdd = products
      .filter(p => (Number(p.stock) || 0) <= (Number(p.minStock ?? (p as any).lowStockThreshold) || 5) && !existingIds.has(p.id))
      .slice(0, 40)
      .map(p => ({
        productId: p.id,
        sku: p.sku || p.barcode || '',
        productName: p.name,
        costPrice: Number(p.costPrice) || 0,
        expectedStock: Number(p.stock) || 0,
        actualStock: Number(p.stock) || 0,
        discrepancy: 0,
        notes: ''
      }));

    if (toAdd.length === 0) {
      toast.info('Aucun article en alerte stock à ajouter.');
      return;
    }
    setAuditItems(prev => [...prev, ...toAdd]);
    toast.success(`${toAdd.length} article(s) en alerte stock ajoutés.`);
  };

  const updateActualStock = (productId: string, actual: number) => {
    setAuditItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            actualStock: actual,
            discrepancy: actual - item.expectedStock
          };
        }
        return item;
      })
    );
  };

  const updateItemNote = (productId: string, notes: string) => {
    setAuditItems(prev =>
      prev.map(item => (item.productId === productId ? { ...item, notes } : item))
    );
  };

  const removeItemFromAudit = (productId: string) => {
    setAuditItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handlePrintInventorySheet = () => {
    printInventorySheetA4({
      auditItems,
      products,
      settings,
      blindCountMode
    });
  };

  const handleConfirmAudit = async () => {
    if (!activeAudit) return;
    try {
      await executeConfirmAudit({
        activeAudit,
        auditItems,
        products,
        user
      });

      setIsModalOpen(false);
      setActiveAudit(null);
      setIsConfirmModalOpen(false);
      toast.success("Fiche d'inventaire validée et stocks mis à jour avec succès !");
    } catch (error: any) {
      console.error('Error confirming audit:', error);
      toast.error('Erreur lors de la validation: ' + (error?.message || 'Erreur inconnue'));
    }
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const res: Product[] = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p) continue;
      if (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && String(p.sku).toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q))
      ) {
        res.push(p);
        if (res.length >= 25) break;
      }
    }
    return res;
  }, [products, search]);

  const visibleAuditItems = useMemo(() => {
    if (itemFilter === 'discrepancy') return auditItems.filter(i => Number(i.discrepancy) !== 0);
    if (itemFilter === 'ok') return auditItems.filter(i => Number(i.discrepancy) === 0);
    return auditItems;
  }, [auditItems, itemFilter]);

  const currentAuditDiscrepancyValue = useMemo(() => {
    return auditItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (Number(item.discrepancy) || 0) * (Number(product?.costPrice || item.costPrice) || 0);
    }, 0);
  }, [auditItems, products]);

  return {
    isModalOpen,
    setIsModalOpen,
    activeAudit,
    setActiveAudit,
    auditItems,
    setAuditItems,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    search,
    setSearch,
    categoryToAdd,
    setCategoryToAdd,
    itemFilter,
    setItemFilter,
    blindCountMode,
    setBlindCountMode,
    currency,
    uniqueCategories,
    globalKpis,
    filteredProducts,
    visibleAuditItems,
    currentAuditDiscrepancyValue,
    startNewAudit,
    addProductToAudit,
    handleAddCategoryToAudit,
    handleAddLowStockProducts,
    updateActualStock,
    updateItemNote,
    removeItemFromAudit,
    handlePrintInventorySheetA4: handlePrintInventorySheet,
    handleConfirmAudit
  };
}
