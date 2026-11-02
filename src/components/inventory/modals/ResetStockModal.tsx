import React, { useState } from 'react';
import { AlertOctagon, Loader2 } from 'lucide-react';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { Modal, Button } from '../../ui';
import { useCoreStore } from '../../../store/useCoreStore';
import { supabase, isSupabaseConfigured } from '../../../supabase';

interface ResetStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

export function ResetStockModal({ isOpen, onClose, products }: ResetStockModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirmReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ZERO') {
      toast.error("Veuillez taper exactement 'ZERO' pour confirmer.");
      return;
    }
    setIsResetting(true);
    try {
      const nowIso = new Date().toISOString();
      const zeroed = products.map((p: any) => ({ ...p, stock: 0, updatedAt: nowIso }));
      useCoreStore.getState().setProducts(zeroed);
      await idbSet('nexus_products_cache', zeroed).catch(() => {});
      if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
        await supabase.from('products').update({ stock: 0, updated_at: nowIso }).neq('stock', 0);
      }
      toast.success(`Quantité mise à 0 sur tous les ${products.length} articles !`);
      setConfirmInput('');
      onClose();
    } catch (err: any) {
      toast.error("Erreur lors de la remise à zéro des stocks : " + (err.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isResetting && onClose()}
      title="⚠️ Remise à zéro totale du stock"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 p-2 text-slate-800 dark:text-slate-200">
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
          <AlertOctagon className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
          <div className="text-xs space-y-1">
            <p className="font-bold text-rose-700 dark:text-rose-300">
              Action critique & irréversible
            </p>
            <p className="text-rose-600/90 dark:text-rose-400/90">
              Cette action va remettre le stock de l'ensemble des <strong>{products.length} articles</strong> du catalogue à <strong>0</strong> (sur le terminal local et sur Supabase Cloud).
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
            Pour confirmer, tapez le mot <span className="text-rose-600 dark:text-rose-400 font-mono font-black">ZERO</span> ci-dessous :
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Tapez ZERO"
            disabled={isResetting}
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isResetting}
            onClick={onClose}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={confirmInput.trim().toUpperCase() !== 'ZERO' || isResetting}
            onClick={handleConfirmReset}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black"
          >
            {isResetting ? <Loader2 size={16} className="animate-spin" /> : "Remettre à 0"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
