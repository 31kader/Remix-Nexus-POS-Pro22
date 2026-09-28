import React, { useState, useMemo, memo } from 'react';
import {
  Plus,
  Search,
  Package,
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  Eye,
  Trash2,
  ClipboardCheck,
  Layers
} from 'lucide-react';
import { InventoryAudit as InventoryAuditType, Product, CompanySettings } from '../types';
import { localDb } from '../services/LocalDatabase';
import { formatSafe, cn, generateUniqueId, safeGetItems } from '../lib/utils';
import { Button, Card, Modal, ConfirmDialog } from './ui';
import { toast } from 'sonner';

interface InventoryAuditProps {
  audits: InventoryAuditType[];
  products: Product[];
  user: any;
  settings: CompanySettings;
}

export const InventoryAudit = memo(function InventoryAudit({
  audits = [],
  products = [],
  user,
  settings
}: InventoryAuditProps) {
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
      .filter(p => (Number(p.stock) || 0) <= (Number(p.lowStockThreshold) || 5) && !existingIds.has(p.id))
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

  const handlePrintInventorySheetA4 = () => {
    if (auditItems.length === 0) {
      toast.error("Ajoutez d'abord des articles à la fiche d'inventaire avant d'imprimer.");
      return;
    }
    const win = window.open('', '_blank', 'width=1050,height=800');
    if (!win) return;

    const rowsHtml = auditItems
      .map((item, idx) => {
        const prod = products.find(p => p.id === item.productId);
        const ref = item.sku || prod?.sku || prod?.barcode || '-';
        return `
          <tr>
            <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${idx + 1}</td>
            <td style="padding:7px 8px;border:1px solid #94a3b8;font-family:monospace;font-size:11px;">${ref}</td>
            <td style="padding:7px 8px;border:1px solid #94a3b8;font-weight:bold;font-size:11px;">${item.productName}</td>
            <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;font-weight:bold;">
              ${blindCountMode ? '🔒 Masqué' : item.expectedStock}
            </td>
            <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:12px;font-weight:bold;">
              ${blindCountMode ? '_________' : item.actualStock}
            </td>
            <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;font-weight:bold;">
              ${blindCountMode ? '_________' : (item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy)}
            </td>
            <td style="padding:7px 8px;border:1px solid #94a3b8;font-size:11px;">${item.notes || ''}</td>
          </tr>
        `;
      })
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Fiche d'Inventaire Physique A4 — ${settings.name || 'Nexus POS Pro'}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            .header { border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #1e293b; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; border: 1px solid #1e293b; }
            .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin:0;text-transform:uppercase;">FICHE D'INVENTAIRE PHYSIQUE & COMPTAGE</h2>
              <p style="margin:4px 0 0;font-size:12px;color:#475569;">
                Établissement : <strong>${settings.name || 'Magasin'}</strong> • Mode : <strong>${blindCountMode ? 'Comptage à l’aveugle (Stock théorique masqué)' : 'Fiche de Réconciliation Complète'}</strong>
              </p>
            </div>
            <div style="text-align:right;font-size:12px;">
              <div>Date : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></div>
              <div>Références : <strong>${auditItems.length} article(s)</strong></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:35px;">N°</th>
                <th style="width:110px;">Réf / SKU</th>
                <th>Désignation de l'Article</th>
                <th style="width:90px;">Stock Théorique</th>
                <th style="width:100px;">Stock Compté</th>
                <th style="width:80px;">Écart</th>
                <th style="width:150px;">Emplacement / Notes</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">
            <div>Compté par (Nom & Signature) : ___________________________</div>
            <div>Validé par le Responsable : ___________________________</div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleConfirmAudit = async () => {
    if (!activeAudit) return;
    try {
      const totalDiscrepancyValue = auditItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + item.discrepancy * (product?.costPrice || item.costPrice || 0);
      }, 0);

      await localDb.update(`audits/${activeAudit.id}`, {
        status: 'completed',
        endDate: new Date().toISOString(),
        items: auditItems,
        totalDiscrepancyValue
      });

      for (const item of auditItems) {
        if (item.discrepancy !== 0 && item.productId) {
          await localDb.update(`products/${item.productId}`, {
            stock: item.actualStock,
            updatedAt: new Date().toISOString()
          });

          const adjData = {
            id: generateUniqueId(),
            productId: item.productId,
            productName: item.productName,
            oldQuantity: item.expectedStock,
            newQuantity: item.actualStock,
            adjustment: item.discrepancy,
            reason: item.notes || "Audit d'inventaire physique",
            timestamp: new Date().toISOString(),
            userId: user?.uid || 'admin'
          };
          await localDb.insert(`stock_adjustments/${adjData.id}`, adjData);
        }
      }

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-left">
      {/* En-tête de la Fiche d'Inventaire */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Fiches d'Inventaire Physique & Réconciliation Stock
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Créez une fiche de comptage par rayon, imprimez la feuille A4 (avec ou sans stock théorique) et validez les écarts
            </p>
          </div>
        </div>

        <Button
          onClick={startNewAudit}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Plus size={18} /> Nouvelle Fiche d'Inventaire
        </Button>
      </div>

      {/* 4 KPIs Synthétiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400">Sessions d'Inventaire</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{globalKpis.totalSessions}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Références Contrôlées</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{globalKpis.totalRefs}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Écarts Détectés</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{globalKpis.totalDisc}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Impact Financier Net</span>
          <p
            className={cn(
              'text-2xl font-black mt-1',
              globalKpis.totalImpact < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {globalKpis.totalImpact >= 0 ? '+' : ''}
            {globalKpis.totalImpact.toFixed(0)} {currency}
          </p>
        </div>
      </div>

      {/* Liste des Fiches d'Inventaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {audits.length === 0 ? (
          <div className="col-span-full py-16 bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
            <Package size={42} className="mb-3 text-indigo-400 opacity-60" />
            <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Aucune fiche d'inventaire enregistrée</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Cliquez sur « + Nouvelle Fiche d'Inventaire » pour démarrer un comptage physique.
            </p>
          </div>
        ) : (
          audits.map(audit => {
            const auditRecords = safeGetItems(audit);
            const discrepanciesCount = auditRecords.filter((i: any) => Number(i.discrepancy) !== 0).length;
            return (
              <Card
                key={audit.id}
                className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/40 transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fiche du</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {formatSafe(audit.startDate, 'dd/MM/yyyy à HH:mm')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-black uppercase border',
                      audit.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {audit.status === 'completed' ? 'Validée' : 'En cours'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700">
                  <div>
                    <span className="block text-[9px] font-black uppercase text-slate-400">Articles Comptés</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{auditRecords.length} Réf.</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase text-slate-400">Écarts Détectés</span>
                    <span
                      className={cn(
                        'text-sm font-black',
                        discrepanciesCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {discrepanciesCount} écart(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                  {audit.status === 'completed' && audit.totalDiscrepancyValue !== undefined ? (
                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400">Impact Valorisé</span>
                      <span
                        className={cn(
                          'text-base font-black',
                          audit.totalDiscrepancyValue < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {audit.totalDiscrepancyValue >= 0 ? '+' : ''}
                        {audit.totalDiscrepancyValue.toFixed(2)} {currency}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Comptage ouvert</span>
                  )}

                  <Button
                    variant="secondary"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white cursor-pointer"
                    onClick={() => {
                      setActiveAudit(audit);
                      setAuditItems(safeGetItems(audit));
                      setIsModalOpen(true);
                    }}
                  >
                    {audit.status === 'completed' ? 'Ouvrir / Réimprimer' : 'Continuer la Fiche'}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL : FICHE D'INVENTAIRE RÉORGANISÉE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="FICHE D'INVENTAIRE OPÉRATIONNELLE & FEUILLE DE COMPTAGE A4"
        maxWidth="max-w-7xl"
      >
        <div className="space-y-4">
          {/* Barre supérieure de la Fiche : Recherche + Ajout Rayon + Impression A4 */}
          <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Recherche d'article à ajouter */}
              <div className="lg:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                <input
                  type="text"
                  placeholder="Scanner code-barres ou chercher un produit à compter..."
                  className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-slate-900 dark:text-white"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}

                {search.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-40 divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400">Aucun produit trouvé.</p>
                    ) : (
                      filteredProducts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            addProductToAudit(p);
                            setSearch('');
                          }}
                          className="w-full p-2.5 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-[10px] text-slate-500">
                              SKU: {p.sku || p.barcode || 'N/A'} • Stock théorique: <strong>{p.stock}</strong>
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold">
                            + Ajouter
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Ajout rapide par Rayon / Catégorie */}
              <div className="lg:col-span-4 flex items-center gap-2">
                <select
                  value={categoryToAdd}
                  onChange={e => setCategoryToAdd(e.target.value)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  <option value="">+ Charger tout un Rayon / Catégorie...</option>
                  {uniqueCategories.map(c => (
                    <option key={c} value={c}>
                      Rayon : {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!categoryToAdd}
                  onClick={handleAddCategoryToAudit}
                  className="px-3.5 py-2.5 rounded-xl bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Charger
                </button>
              </div>

              {/* Ajout rapide Alertes Stock */}
              <div className="lg:col-span-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddLowStockProducts}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers size={14} /> + Articles en Alerte Stock
                </button>
              </div>
            </div>

            {/* Sous-barre : Filtres Écarts + Mode Aveugle + Bouton Impression Fiche A4 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `Tous (${auditItems.length})` },
                  {
                    id: 'discrepancy',
                    label: `🔴 Avec Écart (${auditItems.filter(i => Number(i.discrepancy) !== 0).length})`
                  },
                  {
                    id: 'ok',
                    label: `🟢 Conformes (${auditItems.filter(i => Number(i.discrepancy) === 0).length})`
                  }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setItemFilter(f.id as any)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                      itemFilter === f.id
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBlindCountMode(v => !v)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all',
                    blindCountMode
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                  )}
                  title="Masque le stock théorique sur la feuille imprimée pour obliger le magasinier à compter réellement"
                >
                  {blindCountMode ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{blindCountMode ? 'Comptage à l’aveugle : Actif' : 'Comptage à l’aveugle : Inactif'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintInventorySheetA4}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:opacity-90 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} /> Imprimer Fiche de Comptage A4
                </button>
              </div>
            </div>
          </div>

          {/* Tableau Réorganisé de la Fiche d'Inventaire */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-[52vh] overflow-y-auto">
            {visibleAuditItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                Aucun article dans cette vue. Recherchez un article ou chargez un rayon ci-dessus.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400">Article & Réf</th>
                    <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-center">
                      Stock Théorique
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-center">
                      Stock Physique Compté
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-center">
                      Écart Quantité
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 text-right">
                      Valeur Écart ({currency})
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400">
                      Emplacement / Motif
                    </th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {visibleAuditItems.map(item => {
                    const prod = products.find(p => p.id === item.productId);
                    const cost = Number(prod?.costPrice || item.costPrice) || 0;
                    const impactVal = (Number(item.discrepancy) || 0) * cost;
                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40">
                        <td className="p-3">
                          <p className="text-xs font-black text-slate-900 dark:text-white">{item.productName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {item.sku || prod?.sku || prod?.barcode || 'Sans Réf'}
                          </p>
                        </td>

                        <td className="p-3 text-center font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                          {blindCountMode ? '🔒 Masqué' : item.expectedStock}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateActualStock(item.productId, Math.max(0, Number(item.actualStock) - 1))}
                              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-white font-black text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.actualStock}
                              onChange={e => updateActualStock(item.productId, parseInt(e.target.value) || 0)}
                              className="w-20 h-8 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-center font-mono font-black text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateActualStock(item.productId, Number(item.actualStock) + 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-white font-black text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-black font-mono inline-block',
                              item.discrepancy === 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : item.discrepancy > 0
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            )}
                          >
                            {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                          </span>
                        </td>

                        <td
                          className={cn(
                            'p-3 text-right font-mono text-xs font-bold',
                            impactVal < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : impactVal > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          )}
                        >
                          {impactVal >= 0 ? '+' : ''}
                          {impactVal.toFixed(0)} {currency}
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Rayon / Observation..."
                            value={item.notes || ''}
                            onChange={e => updateItemNote(item.productId, e.target.value)}
                            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-white outline-none"
                          />
                        </td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeItemFromAudit(item.productId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pied de la Fiche d'Inventaire */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600 dark:text-zinc-400">
                Total Références : <strong className="text-slate-900 dark:text-white">{auditItems.length}</strong>
              </span>
              <span className="text-slate-600 dark:text-zinc-400">
                Impact Financier Estimé :{' '}
                <strong
                  className={
                    currentAuditDiscrepancyValue < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {currentAuditDiscrepancyValue >= 0 ? '+' : ''}
                  {currentAuditDiscrepancyValue.toFixed(2)} {currency}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold">
                Fermer
              </Button>
              {activeAudit?.status !== 'completed' && (
                <Button
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={auditItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  <CheckCircle2 size={15} /> Valider l'Inventaire & Mettre à jour les Stocks
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAudit}
        title="Valider la Fiche d'Inventaire Physique"
        message={`Voulez-vous appliquer ces ${auditItems.length} comptages physiques et ajuster automatiquement les stocks en base de données ?`}
        confirmText="Valider et Ajuster le Stock"
        cancelText="Annuler"
      />
    </div>
  );
});
