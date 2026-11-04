import React, { useState } from 'react';
import { useStockTransfers } from '../../hooks/useStockTransfers';
import { StockTransfer } from '../../types/warehouseTypes';
import { CreateTransferModal } from './CreateTransferModal';
import { ReceiveTransferModal } from './ReceiveTransferModal';
import {
  Truck,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Warehouse as WarehouseIcon,
  XCircle
} from 'lucide-react';

export const StockTransfersTab: React.FC = () => {
  const {
    transfers,
    warehouses,
    activeWarehouseId,
    setActiveWarehouse,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    createTransfer,
    receiveTransfer,
    cancelTransfer,
    printTransfer
  } = useStockTransfers();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransfer | null>(null);

  const getStatusBadge = (t: StockTransfer) => {
    switch (t.status) {
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" /> En Transit
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Réceptionné
          </span>
        );
      case 'partially_received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Écart constaté
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <XCircle className="w-3.5 h-3.5" /> Annulé
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête avec sélecteur de magasin actif et création de BLT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Bons de Transfert & Multi-Magasins
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestion logistique des mouvements inter-dépôts (BLT) et stock en transit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <WarehouseIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Point de Vente :</span>
            <select
              value={activeWarehouseId}
              onChange={(e) => setActiveWarehouse(e.target.value)}
              className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="dark:bg-slate-900 dark:text-white">
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau Transfert (BLT)
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher N° BLT, article, dépôt..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white"
          />
        </div>

        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl self-stretch sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'in_transit', label: 'En transit' },
            { id: 'received', label: 'Réceptionnés' },
            { id: 'partially_received', label: 'Écarts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des transferts */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        {transfers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="text-sm font-semibold">Aucun transfert inter-dépôts enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-4 font-bold">N° BLT</th>
                  <th className="p-4 font-bold">Origine & Destination</th>
                  <th className="p-4 font-bold text-center">Statut</th>
                  <th className="p-4 font-bold text-center">Articles</th>
                  <th className="p-4 font-bold">Date & Chauffeur</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {t.transferNumber}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                        <span>{t.sourceWarehouseName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-indigo-600 dark:text-indigo-400">{t.destinationWarehouseName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {t.items.length} référence(s) distincte(s)
                      </div>
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(t)}</td>
                    <td className="p-4 text-center">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        {t.totalReceivedQuantity} / {t.totalSentQuantity}
                      </div>
                      {t.hasDiscrepancy && (
                        <div className="text-[10px] text-rose-500 font-bold">Écart: {t.totalReceivedQuantity - t.totalSentQuantity}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(t.dispatchedAt || t.createdAt).toLocaleDateString('fr-DZ')}
                      </div>
                      <div className="text-[10px] text-slate-400">{t.carrierName || 'Interne'}</div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => printTransfer(t)}
                        title="Imprimer BLT A4"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Printer className="w-4 h-4 inline" />
                      </button>

                      {t.status === 'in_transit' && (
                        <>
                          <button
                            onClick={() => setReceivingTransfer(t)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                          >
                            Réceptionner
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Annuler le transfert ${t.transferNumber} et réintégrer le stock source ?`)) {
                                cancelTransfer(t.id, 'Annulation utilisateur');
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded"
                            title="Annuler le transfert"
                          >
                            <XCircle className="w-4 h-4 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateTransferModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        warehouses={warehouses}
        onConfirm={createTransfer}
      />

      <ReceiveTransferModal
        isOpen={!!receivingTransfer}
        onClose={() => setReceivingTransfer(null)}
        transfer={receivingTransfer}
        onConfirm={receiveTransfer}
      />
    </div>
  );
};
