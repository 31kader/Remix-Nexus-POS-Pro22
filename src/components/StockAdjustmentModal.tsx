import React, { useState, useEffect } from 'react';
import { Package, AlignLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { convertKeysToSnake } from '../lib/db-converters';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { Product, CompanySettings } from '../types';
import { Button, Modal } from './ui';
import { toast } from 'sonner';
import { sanitizeProductForSupabase, cn } from '../lib/utils';

export function StockAdjustmentModal({ 
  isOpen, onClose, product, user, settings 
}: { 
  isOpen: boolean, onClose: () => void, product: Product | null, user: any, settings: CompanySettings 
}) {
  const [newStock, setNewStock] = useState<number | ''>('');
  const [localBatches, setLocalBatches] = useState<any[]>([]);
  const [reason, setReason] = useState('Ajustement manuel');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoss, setIsLoss] = useState(false);

  const isLossCheckboxVisible = product && newStock !== '' && (newStock as number) < (product.stock || 0);

  useEffect(() => {
    if (product) {
      setNewStock(product.stock || 0);
      setLocalBatches(product.batches ? product.batches.map(b => ({ ...b })) : []);
    }
  }, [product]);

  const handleLocalBatchStockChange = (index: number, value: string) => {
    const val = value === '' ? 0 : parseFloat(value);
    const updated = localBatches.map((b, i) => i === index ? { ...b, stock: isNaN(val) ? 0 : val } : b);
    setLocalBatches(updated);
    
    // Sum them up
    const total = updated.reduce((sum, item) => sum + item.stock, 0);
    setNewStock(total);
  };

  useEffect(() => {
    if (!isLossCheckboxVisible) {
      setIsLoss(false);
    }
  }, [isLossCheckboxVisible]);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStock === '' || newStock === (product.stock || 0)) return;
    if (!product.id || product.id === 'undefined') {
      toast.error("Impossible de modifier le stock : ID du produit manquant.");
      return;
    }

    setIsProcessing(true);
    try {
      const currentStock = product.stock || 0;
      const delta = (newStock as number) - currentStock;
      const isLossRecord = delta < 0 && isLoss;
      
      let earliestDate = product.expirationDate;
      let primaryBatch = product.batchNumber;
      if (product.useMultiExpiry && localBatches.length > 0) {
        const sorted = [...localBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
        earliestDate = sorted[0].expirationDate;
        primaryBatch = sorted[0].batchNumber;
      }

      // Update product stocks
      const updatedProduct = {
        ...product,
        stock: newStock,
        batches: product.useMultiExpiry ? localBatches : (product.batches || null),
        expirationDate: earliestDate,
        batchNumber: primaryBatch,
        damagedStock: isLossRecord ? (product.damagedStock || 0) + Math.abs(delta) : (product.damagedStock || 0),
        updatedAt: new Date().toISOString()
      };

      // Optimistic cache update for immediate local reflection
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProduct }));

      // Cleaned update for Supabase schema safety via sync queue
      enqueueStockAdjustment(product.id, delta);
      
      localDb.update(`products/${product.id}`, {
        damagedStock: updatedProduct.damagedStock,
        batches: updatedProduct.batches,
        expirationDate: updatedProduct.expirationDate,
        batchNumber: updatedProduct.batchNumber,
        updatedAt: updatedProduct.updatedAt
      });

      const adjustmentData = {
        id: Math.random().toString(36).substring(2, 10),
        productId: product.id,
        productName: product.name,
        oldQuantity: currentStock,
        newQuantity: newStock,
        adjustment: delta, // To match StockAdjustment interface
        quantity: delta, // Legacy compatibility
        type: delta > 0 ? 'found' : 'damage',
        reason: reason,
        userId: user.uid,
        userName: user.displayName || 'Inconnu',
        date: new Date().toISOString(), // Legacy compatibility
        timestamp: new Date().toISOString(), // To match StockAdjustment interface
        isLoss: isLossRecord
      };
      
      await localDb.insert(`stock_adjustments/${adjustmentData.id}`, adjustmentData);

      if (isLossRecord) {
        const damId = Math.random().toString(36).substring(2, 10);
        await localDb.insert(`damaged_items/${damId}`, {
          id: damId,
          productId: product.id,
          productName: product.name,
          quantity: Math.abs(delta),
          reason: reason || "Perte/casse via ajustement",
          date: new Date().toISOString(),
          userId: user.uid,
          userName: user.displayName || 'Inconnu',
          claimStatus: 'to_claim',
          costPrice: product.costPrice || 0
        });
      }

      onClose();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error("Erreur lors de l'ajustement: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CALIBRATION DES STOCKS"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-10 pt-4 bg-[#05070a] p-8 rounded-[3rem] ring-1 ring-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>

        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-2xl flex items-center justify-between ring-1 ring-white/5 relative group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-black/60 rounded-3xl shadow-inner flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-500">
              <Package className="text-indigo-400/60" size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">{product.name}</h4>
              <div className="flex items-center gap-3 mt-2">
                 <div className="bg-black/40 px-2 py-0.5 rounded-lg border border-white/5 shadow-inner">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">ACTUEL: <span className="text-indigo-400">{product.stock || 0} {product.unit || 'UNITÉS'}</span></p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1 flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-neon-indigo animate-pulse" />
               NOUVEAU COMPTAGE RÉEL {product.useMultiExpiry && <span className="text-indigo-400 lowercase italic">(AUTO-SUM)</span>}
            </label>
            <div className="relative group">
              <input 
                required
                type="number"
                step="0.01"
                value={newStock}
                disabled={product.useMultiExpiry}
                onChange={e => setNewStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className={cn(
                  "w-full p-8 bg-black/40 border rounded-[2rem] text-5xl font-black text-white focus:outline-none focus:ring-8 transition-all text-center shadow-inner italic font-mono tracking-tighter",
                  product.useMultiExpiry
                    ? "opacity-40 border-indigo-500/20 text-indigo-400 cursor-not-allowed bg-indigo-600/5 ring-1 ring-indigo-500/20"
                    : "border-white/10 group-hover:border-white/20 focus:ring-indigo-500/5 focus:border-indigo-500/40"
                )}
              />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 text-[11px] text-slate-700 font-black uppercase tracking-[0.4em] pointer-events-none group-focus-within:text-indigo-500/50 transition-colors italic">{product.unit || 'PCS'}</div>
            </div>
          </div>

          {product.useMultiExpiry && localBatches && localBatches.length > 0 && (
            <div className="space-y-5 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] ring-1 ring-white/5 shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] italic">
                  DÉTAIL DES STOCKS PAR LOTS (DLC)
                </span>
              </div>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-3 custom-scrollbar">
                {localBatches.map((batch, index) => (
                  <div key={batch.id || index} className="flex items-center justify-between gap-4 bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group/item shadow-inner">
                    <div className="flex-1">
                      <span className="font-mono text-xs font-black text-indigo-400 block tracking-widest uppercase italic">{batch.batchNumber}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1 block italic opacity-60">
                        EXP: {new Date(batch.expirationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                      </span>
                    </div>
                    <div className="w-28 relative group/inp">
                      <input 
                        type="number"
                        step="0.01"
                        value={batch.stock}
                        onChange={e => handleLocalBatchStockChange(index, e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-3 text-center text-sm font-black font-mono text-emerald-400 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 transition-all italic shadow-inner"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1 flex items-center gap-2">
              <AlignLeft size={12} /> JUSTIFICATION DE L'OPÉRATION
            </label>
            <textarea 
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="NOTES D'INVENTAIRE..."
              className="w-full p-6 bg-black/40 border border-white/10 rounded-[1.5rem] text-xs font-black text-white outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner placeholder:text-slate-800 uppercase italic tracking-widest"
            />
          </div>

          {isLossCheckboxVisible && (
            <div className="bg-rose-600/5 hover:bg-rose-600/10 border border-rose-500/20 p-6 rounded-[2rem] transition-all flex items-start gap-5 mx-1 ring-1 ring-rose-500/10 shadow-2xl animate-in zoom-in-95">
              <div className="relative">
                <input
                  id="check-loss"
                  type="checkbox"
                  checked={isLoss}
                  onChange={e => setIsLoss(e.target.checked)}
                  className="w-6 h-6 rounded-lg border-white/10 bg-black/60 text-rose-600 focus:ring-rose-500/20 focus:ring-8 mt-1 cursor-pointer accent-rose-600 transition-all shadow-inner"
                />
              </div>
              <label htmlFor="check-loss" className="flex-1 cursor-pointer select-none">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] italic leading-none">RÉPERTORIER COMME PERTE SÈCHE</p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed italic opacity-80 uppercase tracking-widest">Activer pour imputer cet écart négatif au rapport des rebuts et déduire la valeur du profit brut.</p>
              </label>
            </div>
          )}
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-7 rounded-[2rem] text-sm font-black uppercase tracking-[0.4em] bg-indigo-600 hover:bg-indigo-500 text-white shadow-neon-indigo transition-all active:scale-95 border border-indigo-400 ring-1 ring-white/20 italic group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
            {isProcessing ? "PROCESSING..." : "CONFIRMER CALIBRAGE SYSTÈME"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
