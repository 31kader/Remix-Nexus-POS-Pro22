import React, { useState, useMemo } from 'react';
import { Truck, RefreshCw, Phone, Mail, Package, Trash2, Search, Wallet, LayoutGrid, List, Edit3 } from 'lucide-react';
import { Supplier } from '../../types';
import { Card, Button } from '../ui';
import { cn, formatPrice } from '../../lib/utils';

interface SupplierListProps {
  suppliers: Supplier[];
  isSyncing: string | null;
  handleSync: (supplier: Supplier) => Promise<void> | void;
  setViewingDetailsSupplier: (supplier: Supplier | null) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (val: boolean) => void;
  setSupplierToDelete: (supplier: Supplier | null) => void;
  setIsDeleteConfirmOpen: (val: boolean) => void;
  setEditingSupplier: (supplier: Supplier | null) => void;
  setIsModalOpen: (val: boolean) => void;
  onQuickPaySupplier?: (supplier: Supplier) => void;
  currency?: string;
}

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function SupplierList({
  suppliers,
  isSyncing,
  handleSync,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen,
  setSupplierToDelete,
  setIsDeleteConfirmOpen,
  setEditingSupplier,
  setIsModalOpen,
  onQuickPaySupplier,
  currency = 'DA'
}: SupplierListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'debt' | 'settled' | 'today' | 'top_rated'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'debt_desc' | 'rating_desc'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const todayName = FRENCH_DAYS[new Date().getDay()];

  const getRating = (s: Supplier) => ((s.ratingQuality ?? 5) + (s.ratingDelivery ?? 5) + (s.ratingPrice ?? 5)) / 3;

  const counts = useMemo(() => {
    let debt = 0;
    let settled = 0;
    let today = 0;
    let topRated = 0;
    (suppliers || []).forEach(s => {
      const bal = Number(s?.balance) || 0;
      if (bal > 0) debt++;
      else settled++;
      if (s?.preSaleDays?.includes(todayName) || s?.deliveryDays?.includes(todayName) || s?.paymentDays?.includes(todayName)) {
        today++;
      }
      if (getRating(s) >= 4) topRated++;
    });
    return { all: (suppliers || []).length, debt, settled, today, topRated };
  }, [suppliers, todayName]);

  const filteredSuppliers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = (suppliers || []).filter(s => {
      if (!s) return false;
      const matchesSearch = !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.contactName || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const bal = Number(s.balance) || 0;
      if (quickFilter === 'debt') return bal > 0;
      if (quickFilter === 'settled') return bal <= 0;
      if (quickFilter === 'today') {
        return Boolean(
          s.preSaleDays?.includes(todayName) ||
          s.deliveryDays?.includes(todayName) ||
          s.paymentDays?.includes(todayName)
        );
      }
      if (quickFilter === 'top_rated') return getRating(s) >= 4;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'debt_desc') return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      if (sortBy === 'rating_desc') return getRating(b) - getRating(a);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [suppliers, searchTerm, quickFilter, sortBy, todayName]);

  return (
    <div className="space-y-4 text-left">
      {/* Barre de Recherche, Filtres Rapides et Options d'Affichage */}
      <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur (Nom, Contact, Téléphone, Email, Wilaya)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="name">Trier par : Nom (A-Z)</option>
              <option value="debt_desc">Trier par : Dette la plus élevée</option>
              <option value="rating_desc">Trier par : Meilleure Note</option>
            </select>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all",
                  viewMode === 'grid' ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400"
                )}
                title="Affichage en cartes"
              >
                <LayoutGrid size={14} /> Cartes
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all",
                  viewMode === 'table' ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400"
                )}
                title="Affichage en tableau"
              >
                <List size={14} /> Tableau
              </button>
            </div>
          </div>
        </div>

        {/* Boutons Filtres Rapides */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: 'all', label: `Tous (${counts.all})`, activeClass: 'bg-indigo-600 text-white border-indigo-600' },
            { id: 'debt', label: `🔴 Avec Dette (${counts.debt})`, activeClass: 'bg-rose-600 text-white border-rose-600' },
            { id: 'settled', label: `🟢 Soldés 0 ${currency} (${counts.settled})`, activeClass: 'bg-emerald-600 text-white border-emerald-600' },
            { id: 'today', label: `📅 Passent Aujourd'hui (${counts.today})`, activeClass: 'bg-amber-600 text-white border-amber-600' },
            { id: 'top_rated', label: `⭐ Top Note ≥ 4/5 (${counts.topRated})`, activeClass: 'bg-purple-600 text-white border-purple-600' },
          ].map(f => {
            const isActive = quickFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuickFilter(f.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                  isActive
                    ? f.activeClass
                    : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* VUE TABLEAU COMPACT */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Fournisseur</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Contact / Tél</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Jours Planning</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 text-right">Solde / Dette</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSuppliers.map((supplier) => {
                  const debt = Number(supplier.balance) || 0;
                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <p className="font-black text-slate-900 dark:text-white text-xs uppercase">{supplier.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{supplier.contactName || 'Contact standard'}</p>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {supplier.phone || '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(supplier.deliveryDays || []).map(d => (
                            <span key={`del-${d}`} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">
                              🚚 {d.slice(0, 3)}
                            </span>
                          ))}
                          {(supplier.paymentDays || []).map(d => (
                            <span key={`pay-${d}`} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase">
                              💳 {d.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-xs">
                        <span className={debt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {formatPrice(debt)} {currency}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onQuickPaySupplier && (
                            <button
                              type="button"
                              onClick={() => onQuickPaySupplier(supplier)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                            >
                              💳 Verser
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setViewingDetailsSupplier(supplier); setActiveDetailsTab('purchases'); setIsDetailsModalOpen(true); }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                          >
                            Détails
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* VUE GRILLE DE CARTES PRO */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {filteredSuppliers.map((supplier: Supplier) => {
            const debt = Number(supplier.balance) || 0;
            const avg = getRating(supplier);

            return (
              <Card
                key={supplier.id}
                className="p-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl hover:border-indigo-500/50 transition-all group overflow-hidden relative flex flex-col justify-between text-left"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* En-tête de la carte : Nom, Note et Badge Dette */}
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shrink-0">
                        <Truck size={22} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 dark:text-white text-base tracking-tight uppercase truncate">
                          {supplier.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-amber-500 text-xs font-bold select-none">
                            {"★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg))}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            {avg.toFixed(1)}/5
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate mt-0.5">
                          {supplier.contactName || 'Contact Principal'}
                        </p>
                      </div>
                    </div>

                    {/* Badge Dette / Solde */}
                    <div className={cn(
                      "px-2.5 py-1.5 rounded-xl border text-right shrink-0",
                      debt > 0
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400"
                        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                    )}>
                      <span className="text-[9px] font-black uppercase block leading-none">
                        {debt > 0 ? 'Dette à payer' : 'Soldé'}
                      </span>
                      <span className="text-xs font-mono font-black tabular-nums mt-0.5 block">
                        {formatPrice(debt)} {currency}
                      </span>
                    </div>
                  </div>

                  {/* Coordonnées Téléphone & Email */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2.5 min-w-0">
                      <Phone size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Téléphone</span>
                        <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                          {supplier.phone || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2.5 min-w-0">
                      <Mail size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">E-mail</span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                          {supplier.email || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agenda Opérationnel */}
                  {((supplier.preSaleDays && supplier.preSaleDays.length > 0) || 
                    (supplier.deliveryDays && supplier.deliveryDays.length > 0) || 
                    (supplier.paymentDays && supplier.paymentDays.length > 0)) && (
                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5 text-left">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">📌 Jours de Passage</span>
                      <div className="space-y-1 text-[10px]">
                        {supplier.preSaleDays && supplier.preSaleDays.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">📝 Commande</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold uppercase">{supplier.preSaleDays.map(d => d.substring(0, 3)).join(', ')}</span>
                          </div>
                        )}
                        {supplier.deliveryDays && supplier.deliveryDays.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">🚚 Livraison</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold uppercase">{supplier.deliveryDays.map(d => d.substring(0, 3)).join(', ')}</span>
                          </div>
                        )}
                        {supplier.paymentDays && supplier.paymentDays.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">💳 Règlement</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold uppercase">{supplier.paymentDays.map(d => d.substring(0, 3)).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pied de carte : Actions Rapides */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => { setViewingDetailsSupplier(supplier); setActiveDetailsTab('purchases'); setIsDetailsModalOpen(true); }}
                      className="px-3 py-2 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase cursor-pointer"
                      title="Voir les achats, produits et paiements de ce fournisseur"
                    >
                      <Package size={15} /> Fiche & Achats
                    </button>

                    {onQuickPaySupplier && (
                      <button
                        type="button"
                        onClick={() => onQuickPaySupplier(supplier)}
                        className="px-3 py-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase cursor-pointer"
                        title="Enregistrer un versement / règlement rapide"
                      >
                        <Wallet size={15} /> Verser
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {supplier.feedUrl && (
                      <button 
                        type="button"
                        onClick={() => handleSync(supplier)}
                        disabled={isSyncing === supplier.id}
                        className={cn(
                          "p-2 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer",
                          isSyncing === supplier.id ? "bg-indigo-600 text-white animate-spin" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white"
                        )}
                        title="Synchroniser le flux"
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white text-[10px] font-black uppercase transition-all cursor-pointer"
                    >
                      Modifier
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setSupplierToDelete(supplier); setIsDeleteConfirmOpen(true); }}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                      title="Supprimer ce fournisseur"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
