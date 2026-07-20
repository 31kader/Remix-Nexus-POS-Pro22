import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Supplier, Product, CompanySettings, DamagedRecord } from '../../types';
import { cn, formatSafe } from '../../lib/utils';

interface SupplierDamagedTabProps {
  damagedItems: DamagedRecord[];
  products: Product[];
  viewingDetailsSupplier: Supplier;
  settings: CompanySettings;
  setSelectedProductForDamage: (p: Product | null) => void;
  setDamageData: (v: any) => void;
  setIsDamageModalOpen: (v: boolean) => void;
  handleUpdateClaimStatus: (recordId: string, status: string) => Promise<void>;
}

export function SupplierDamagedTab({
  damagedItems,
  products,
  viewingDetailsSupplier,
  settings,
  setSelectedProductForDamage,
  setDamageData,
  setIsDamageModalOpen,
  handleUpdateClaimStatus
}: SupplierDamagedTabProps) {
  const supplierDamaged = damagedItems.filter(
    d => products.find(p => p.id === d.productId)?.supplier === viewingDetailsSupplier.name
  );
  
  const totalLoss = supplierDamaged.reduce((acc, d) => {
    const cost = d.costPrice || products.find(p => p.id === d.productId)?.costPrice || 0;
    return acc + (d.quantity * cost);
  }, 0);

  const totalRecovered = supplierDamaged.reduce((acc, d) => {
    if (d.claimStatus !== 'refunded' && d.claimStatus !== 'replaced') return acc;
    const cost = d.costPrice || products.find(p => p.id === d.productId)?.costPrice || 0;
    return acc + (d.quantity * cost);
  }, 0);

  const totalPendingClaim = supplierDamaged.reduce((acc, d) => {
    if (d.claimStatus !== 'to_claim' && d.claimStatus !== 'claimed' && d.claimStatus !== undefined) return acc;
    const cost = d.costPrice || products.find(p => p.id === d.productId)?.costPrice || 0;
    return acc + (d.quantity * cost);
  }, 0);

  return (
    <div className="space-y-6 text-left">
      {/* Claims Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[1.5rem] shadow-xl">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">💸 Valeur Totale des Pertes</span>
          <p className="text-2xl font-black text-rose-400 font-mono">{totalLoss.toFixed(2)} {settings.currency}</p>
          <span className="text-[10px] text-slate-500 font-mono italic">{supplierDamaged.length} articles défectueux enregistrés</span>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-900/30 p-6 rounded-[1.5rem] shadow-xl">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">💵 Remboursé / Résolu</span>
          <p className="text-2xl font-black text-emerald-450 font-mono">{totalRecovered.toFixed(2)} {settings.currency}</p>
          <span className="text-[10px] text-emerald-600 font-mono italic">Pertes récupérées de ce fournisseur</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-900/30 p-6 rounded-[1.5rem] shadow-xl">
          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">⏳ Dossiers en Cours / À Réclamer</span>
          <p className="text-2xl font-black text-amber-500 font-mono">{totalPendingClaim.toFixed(2)} {settings.currency}</p>
          <span className="text-[10px] text-amber-500 font-mono italic">Montants réclamés ou en attente d'action</span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4 text-slate-900 text-left animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h4 className="text-base font-black text-slate-900 uppercase tracking-wider font-sans">Suivi des Réclamations & Pertes</h4>
            <p className="text-xs text-slate-400 mt-1">Gérez le statut des articles défectueux à retourner ou à réclamer auprès de ce fournisseur.</p>
          </div>
           
          <div>
            <select 
              className="p-3 text-xs font-black uppercase text-slate-800 border border-slate-250 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const prod = products.find(p => p.id === e.target.value);
                if (prod) {
                  setSelectedProductForDamage(prod);
                  setDamageData({quantity: 1, reason: ''});
                  setIsDamageModalOpen(true);
                }
                e.target.value = ""; // Reset
              }}
            >
              <option value="">➕ Article Défectueux...</option>
              {products
                .filter(p => p.supplier === viewingDetailsSupplier.name)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name.toUpperCase()} (STOCK: {p.stock})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {supplierDamaged.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Aucune perte de stock enregistrée chez ce fournisseur</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-left">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Produit</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Qté</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 font-sans">Coût U.</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 font-sans">Total Perte</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Motif</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Statut Réclamation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {supplierDamaged.map(record => {
                  const itemCost = record.costPrice || products.find(p => p.id === record.productId)?.costPrice || 0;
                  const claimStatusVal = record.claimStatus || 'to_claim';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-xs font-bold text-slate-700">{formatSafe(record.date, 'dd/MM/yy')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{record.productName}</p>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">Ref: {record.productId.slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100">{record.quantity}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                        {itemCost.toFixed(2)} {settings.currency}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-black text-rose-500">
                        {(record.quantity * itemCost).toFixed(2)} {settings.currency}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={record.reason}>
                        {record.reason}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={claimStatusVal}
                          onChange={(e) => handleUpdateClaimStatus(record.id, e.target.value)}
                          className={cn(
                            "px-2.5 py-1.5 text-[10px] font-black uppercase rounded-lg border outline-none cursor-pointer transition-colors focus:ring-1 focus:ring-slate-450",
                            claimStatusVal === 'to_claim' && "bg-amber-50 border-amber-200 text-amber-700",
                            claimStatusVal === 'claimed' && "bg-blue-50 border-blue-200 text-blue-700",
                            claimStatusVal === 'refunded' && "bg-emerald-50 border-emerald-200 text-emerald-700",
                            claimStatusVal === 'replaced' && "bg-indigo-50 border-indigo-200 text-indigo-700",
                            claimStatusVal === 'rejected' && "bg-rose-50 border-rose-200 text-rose-700"
                          )}
                        >
                          <option value="to_claim">⏳ À réclamer</option>
                          <option value="claimed">📣 Réclamé</option>
                          <option value="refunded">💵 Remboursé</option>
                          <option value="replaced">🔄 Échangé (U)</option>
                          <option value="rejected">❌ Sans suite</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
