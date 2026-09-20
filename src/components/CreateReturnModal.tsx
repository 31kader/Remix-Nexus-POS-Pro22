import React, { useState, useMemo } from 'react';
import { Search, Plus, RotateCcw, AlertCircle, Check, X, ArrowRight } from 'lucide-react';
import { Modal, Button, Card } from './ui';
import { Transaction, Product, CompanySettings, ProductReturn } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';
import { useCoreStore } from '../store/useCoreStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { generateLocalId } from '../lib/db-converters';
import { formatSafe, safeGetItems } from '../lib/utils';
import { localDb, enqueueStockAdjustment } from '../database';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  settings: CompanySettings;
}

export function CreateReturnModal({ isOpen, onClose, products = [], settings }: CreateReturnModalProps) {
  const transactions = useTransactionStore((s) => s.transactions);
  const currentProducts = useCoreStore((s) => s.products);
  const setProducts = useCoreStore((s) => s.setProducts);
  const user = useAuthStore((s) => s.user);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; reason: string }>>({});
  const [returnType, setReturnType] = useState<'refund' | 'credit_note'>('refund');
  const [globalReason, setGlobalReason] = useState('Retour client standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [showPinPrompt, setShowPinPrompt] = useState(false);

  // Recherche de transactions
  const searchedTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return transactions.filter(t => 
      (t.id || '').toLowerCase().includes(term) || 
      (t.customerName && t.customerName.toLowerCase().includes(term))
    );
  }, [transactions, searchTerm]);

  const handleToggleItem = (item: any) => {
    const itemId = item.productId || item.id;
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[itemId]) {
        delete copy[itemId];
      } else {
        copy[itemId] = { quantity: item.quantity || 1, reason: globalReason };
      }
      return copy;
    });
  };

  const handleUpdateItemQty = (itemId: string, maxQty: number, delta: number) => {
    setSelectedItems(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = Math.max(1, Math.min(maxQty, existing.quantity + delta));
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty }
      };
    });
  };

  const calculateTotalRefund = () => {
    if (!selectedTx) return 0;
    return safeGetItems(selectedTx).reduce((sum, item: any) => {
      const itemId = item.productId || item.id;
      const sel = selectedItems[itemId];
      if (!sel) return sum;
      return sum + ((Number(item.price) || 0) * (Number(sel.quantity) || 0));
    }, 0);
  };

  const handleConfirmReturn = async () => {
    if (!selectedTx) return;
    const selectedItemKeys = Object.keys(selectedItems);
    if (selectedItemKeys.length === 0) {
      toast.error("Veuillez sélectionner au moins un article à retourner.");
      return;
    }

    const totalRefund = calculateTotalRefund();
    const isHighAmount = totalRefund >= 5000;

    // Contrôle de sécurité par code PIN si montant élevé (>= 5000 DA) ou rôle non-admin
    if (isHighAmount && !showPinPrompt && user?.role !== 'admin') {
      setShowPinPrompt(true);
      return;
    }

    if (showPinPrompt) {
      const configuredPin = (settings as any).supervisorPin || (settings as any).adminPin || (settings as any).masterPin || '1234';
      let isPinValid = false;
      if (configuredPin.startsWith('$2a$') || configuredPin.startsWith('$2b$')) {
        try { isPinValid = bcrypt.compareSync(managerPinInput, configuredPin); } catch (_) {}
      } else {
        isPinValid = managerPinInput === configuredPin;
      }

      if (!isPinValid) {
        toast.error("Code PIN Superviseur incorrect.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const returnedItemsList: any[] = [];
      const totalRefund = calculateTotalRefund();

      // 1. Préparer les articles retournés
      safeGetItems(selectedTx).forEach((item: any) => {
        const itemId = item.productId || item.id;
        const sel = selectedItems[itemId];
        if (sel) {
          returnedItemsList.push({
            lineId: generateLocalId(),
            productId: itemId,
            name: item.name,
            quantity: sel.quantity,
            price: item.price,
            reason: sel.reason || globalReason
          });
        }
      });

      // 2. Créer l'enregistrement de retour
      const newReturn: ProductReturn = {
        id: `ret_${generateLocalId()}`,
        transactionId: selectedTx.id,
        items: returnedItemsList,
        totalRefund,
        refundAmount: totalRefund,
        type: returnType,
        reason: globalReason,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString(),
        userId: user?.id || 'offline_cashier',
        customerId: selectedTx.customerId || null
      };

      // 3. Sauvegarder le retour dans localDb
      await localDb.insert(`returns/${newReturn.id}`, newReturn);

      // 4. Si c'est un avoir client (credit_note), créditer le solde client
      if (returnType === 'credit_note' && selectedTx.customerId) {
        const allCustomers = usePeopleStore.getState().customers || [];
        const currentCust = allCustomers.find(c => c.id === selectedTx.customerId);
        if (currentCust) {
          const updatedBalance = (currentCust.balance || 0) + totalRefund;
          await localDb.insert(`customers/${currentCust.id}`, {
            ...currentCust,
            balance: updatedBalance,
            updatedAt: new Date().toISOString()
          });
          usePeopleStore.getState().setCustomers(allCustomers.map(c => 
            c.id === currentCust.id ? { ...c, balance: updatedBalance } : c
          ));
        }
      }

      // 5. Mettre à jour le stock des produits réintégrés dans Zustand et localDb avec synchronisation atomique
      const updatedProducts = currentProducts.map(p => {
        const matchItem = returnedItemsList.find(ri => ri.productId === p.id);
        if (matchItem) {
          const updatedStock = (p.stock || 0) + matchItem.quantity;
          localDb.update(`products/${p.id}`, { ...p, stock: updatedStock }).catch(() => {});
          enqueueStockAdjustment(p.id, matchItem.quantity);
          return { ...p, stock: updatedStock };
        }
        return p;
      });

      setProducts(updatedProducts);

      toast.success(returnType === 'credit_note' ? "Avoir client généré et stock réintégré !" : "Retour enregistré et stock mis à jour !");
      onClose();
      // Reset state
      setSelectedTx(null);
      setSelectedItems({});
      setSearchTerm('');
    } catch (err) {
      console.error("Erreur lors de la création du retour:", err);
      toast.error("Erreur lors de l'enregistrement du retour.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CRÉER UN RETOUR / REMBOURSEMENT">
      <div className="space-y-6">
        {!selectedTx ? (
          // Étape 1 : Sélection de la transaction
          <div className="space-y-4">
            <p className="text-xs text-industrial-400 font-mono">
              Recherchez la transaction initiale par son numéro de reçu ou le nom du client :
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={18} />
              <input 
                type="text"
                placeholder="Ex: TX-9482, Client Dupont..."
                className="w-full pl-10 pr-4 py-2 bg-industrial-950 border border-industrial-800 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-white font-mono text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {searchedTransactions.map(tx => (
                <div 
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-3 bg-industrial-900 hover:bg-industrial-800 border border-industrial-800 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-mono font-bold text-indigo-400">#{(tx.id || '').toUpperCase()}</p>
                    <p className="text-[10px] text-industrial-500 font-mono">
                      {formatSafe(tx.timestamp || (tx as any).date, 'dd/MM/yyyy HH:mm')} — {tx.customerName || 'Client de passage'}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-xs font-bold text-white font-mono">{tx.total.toFixed(2)} {settings.currency}</span>
                    <ArrowRight size={16} className="text-industrial-500" />
                  </div>
                </div>
              ))}
              {searchedTransactions.length === 0 && (
                <p className="text-center py-6 text-xs text-industrial-500 italic font-mono">
                  Aucune transaction trouvée.
                </p>
              )}
            </div>
          </div>
        ) : (
          // Étape 2 : Sélection des articles et détails
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-industrial-900 p-3 rounded-xl border border-industrial-800">
              <div>
                <p className="text-[10px] font-black text-industrial-500 uppercase">Transaction sélectionnée</p>
                <p className="text-xs font-mono font-bold text-indigo-400">#{(selectedTx?.id || '').toUpperCase()}</p>
              </div>
              <Button onClick={() => setSelectedTx(null)} className="industrial-button-secondary py-1 text-xs">
                Changer
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">
                Sélectionnez les articles à retourner
              </p>
              {safeGetItems(selectedTx).map((item: any, idx: number) => {
                const itemId = item.productId || item.id;
                const isSelected = !!selectedItems[itemId];
                const selectedData = selectedItems[itemId];

                return (
                  <div 
                    key={`tx-item-${idx}`}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-industrial-900 border-industrial-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item)}
                          className="w-4 h-4 rounded border-industrial-700 bg-industrial-950 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{item.name}</p>
                          <p className="text-[10px] text-industrial-500 font-mono">{item.price.toFixed(2)} {settings.currency} / unité</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleUpdateItemQty(itemId, item.quantity, -1)}
                            className="w-6 h-6 rounded-lg bg-industrial-800 text-white font-bold text-xs"
                          >-</button>
                          <span className="text-xs font-mono font-bold text-white px-2">{selectedData.quantity} / {item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => handleUpdateItemQty(itemId, item.quantity, 1)}
                            className="w-6 h-6 rounded-lg bg-industrial-800 text-white font-bold text-xs"
                          >+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modalité de remboursement */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-black text-industrial-500 uppercase mb-1">Type de Retour</label>
                <select 
                  className="w-full px-3 py-2 bg-industrial-950 border border-industrial-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  value={returnType}
                  onChange={(e: any) => setReturnType(e.target.value)}
                >
                  <option value="refund">Remboursement Espèces/CB</option>
                  <option value="credit_note">Note de Crédit Client</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-500 uppercase mb-1">Raison globale</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 bg-industrial-950 border border-industrial-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  value={globalReason}
                  onChange={(e) => setGlobalReason(e.target.value)}
                />
              </div>
            </div>

            {/* Total à rembourser */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Total à Rembourser</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {calculateTotalRefund().toFixed(2)} {settings.currency}
              </span>
            </div>

            {/* Prompt de validation PIN Manager si nécessaire */}
            {showPinPrompt && (
              <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-2 animate-fade-in">
                <p className="text-xs font-bold text-amber-400">Autorisation Manager requise (Montant {'>'} 50 {settings.currency})</p>
                <input 
                  type="password"
                  maxLength={4}
                  placeholder="Entrez le code PIN Manager (ex: 1234)"
                  className="w-full px-3 py-2 bg-industrial-950 border border-amber-500/50 rounded-xl text-xs text-white outline-none font-mono tracking-widest text-center"
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                />
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <Button onClick={() => setSelectedTx(null)} className="flex-1 industrial-button-secondary">
                Retour
              </Button>
              <Button 
                onClick={handleConfirmReturn} 
                disabled={isSubmitting || Object.keys(selectedItems).length === 0} 
                className="flex-1 industrial-button-primary"
              >
                {isSubmitting ? 'Validation...' : 'Valider le Retour'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
