import React from 'react';
import { 
  Search, X, ShoppingCart, Package, Users, Layers, ChevronDown, ChevronUp, Copy, CheckCircle2, RotateCcw, Trash2, AlertTriangle 
} from 'lucide-react';
import { SyncPayload } from '../../../services/sync/types';
import { toast } from 'sonner';

interface SyncStudioQueueTableProps {
  activeCategory: 'all' | 'transactions' | 'products' | 'customers' | 'adjustments';
  setActiveCategory: (cat: 'all' | 'transactions' | 'products' | 'customers' | 'adjustments') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredQueue: SyncPayload[];
  expandedItemId: string | null;
  setExpandedItemId: (id: string | null) => void;
  failedQueue: any[];
  handleRetryFailedItem: (index: number) => Promise<void>;
  handleRetryAllFailed: () => Promise<void>;
  handleClearFailedQueue: () => Promise<void>;
}

export function SyncStudioQueueTable({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  filteredQueue,
  expandedItemId,
  setExpandedItemId,
  failedQueue,
  handleRetryFailedItem,
  handleRetryAllFailed,
  handleClearFailedQueue
}: SyncStudioQueueTableProps) {
  const categories = [
    { id: 'all', label: 'Toutes', icon: Layers },
    { id: 'transactions', label: 'Ventes & Retours', icon: ShoppingCart },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'customers', label: 'Clients', icon: Users },
    { id: 'adjustments', label: 'Ajustements Stock', icon: Layers }
  ] as const;

  return (
    <div className="space-y-4">
      {/* Barre de filtres et recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par table, ID, champ..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Liste des éléments de la file active */}
      {filteredQueue.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="font-bold text-sm text-white">File d'attente vide</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Aucune opération en attente dans la file pour ce filtre. Vos données sont synchronisées.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQueue.map((item, idx) => {
            const key = `${item.table}:${item.recordId || item.opId || idx}`;
            const isExpanded = expandedItemId === key;

            return (
              <div
                key={key}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <div
                  onClick={() => setExpandedItemId(isExpanded ? null : key)}
                  className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase font-mono ${
                      item.action === 'DELETE' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {item.action || 'UPSERT'}
                    </span>
                    <span className="font-bold text-xs text-white font-mono">
                      {item.table}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                      #{item.recordId || item.payload?.id || 'auto-id'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.retryCount && item.retryCount > 0 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        {item.retryCount} essai(s)
                      </span>
                    ) : null}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Opération OpID : <strong className="text-slate-300 font-mono">{item.opId || 'N/A'}</strong></span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(JSON.stringify(item.payload, null, 2));
                          toast.success("Payload JSON copié !");
                        }}
                        className="flex items-center gap-1 text-indigo-400 hover:underline font-bold cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>Copier JSON</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-56">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dead Letter Queue (Échecs persistants) */}
      {failedQueue.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={18} />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Dead Letter Queue ({failedQueue.length} rejets permanents)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetryAllFailed}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Tout réintégrer</span>
              </button>
              <button
                type="button"
                onClick={handleClearFailedQueue}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>Purger DLQ</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {failedQueue.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <span className="font-mono text-[11px] text-slate-300">
                  {item.table} #{item.recordId}
                </span>
                <button
                  type="button"
                  onClick={() => handleRetryFailedItem(idx)}
                  className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-bold"
                >
                  Réessayer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
