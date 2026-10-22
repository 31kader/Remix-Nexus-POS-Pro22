import React, { useState, useEffect } from 'react';
import { 
  X, Plus, PackagePlus, Barcode, Building2, 
  Layers, AlertTriangle, FileText, Check 
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { Supplier } from '../../../types';
import { Button } from '../../ui';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface AddCustomShortageModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  initialBarcode?: string;
}

export const AddCustomShortageModal: React.FC<AddCustomShortageModalProps> = ({
  isOpen,
  onClose,
  suppliers = [],
  initialBarcode = ''
}) => {
  const customLists = useShortageStore(s => s.customLists);
  const activeListId = useShortageStore(s => s.activeListId);
  const addCustomItem = useShortageStore(s => s.addCustomItem);

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setBarcode(initialBarcode || '');
      setName('');
      setQuantity(1);
      setCostPrice('');
      setSelectedSupplierId('');
      setCustomSupplierName('');
      setPriority('normal');
      setNotes('');
      // Si une liste spécifique est active, la pré-sélectionner
      if (activeListId !== 'all') {
        setSelectedListIds([activeListId]);
      } else {
        setSelectedListIds([]);
      }
    }
  }, [isOpen, initialBarcode, activeListId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Veuillez renseigner le nom de l\'article.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Détermination du nom du fournisseur
      let supplierId = '';
      let supplierName = '';

      if (selectedSupplierId === '__custom__') {
        supplierName = customSupplierName.trim();
      } else if (selectedSupplierId) {
        const found = suppliers.find(s => s.id === selectedSupplierId);
        if (found) {
          supplierId = found.id;
          supplierName = found.name;
        }
      }

      const parsedCost = parseFloat(costPrice.replace(',', '.'));
      const validCost = !isNaN(parsedCost) && parsedCost >= 0 ? parsedCost : 0;

      await addCustomItem({
        name: name.trim(),
        barcode: barcode.trim(),
        quantityNeeded: Math.max(1, quantity),
        costPrice: validCost,
        supplierId,
        supplierName,
        listIds: selectedListIds,
        priority,
        notes: notes.trim(),
        unit: 'pcs'
      });

      toast.success(`"${name.trim()}" ajouté au cahier des manques`);
      onClose();
    } catch (err: any) {
      console.error('Erreur ajout article hors-catalogue:', err);
      toast.error(err?.message || 'Erreur lors de l\'ajout de l\'article');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleListSelection = (listId: string) => {
    setSelectedListIds(prev => 
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-industrial-950 border border-industrial-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-custom-title"
      >
        {/* En-tête de la Modale */}
        <div className="flex items-center justify-between p-5 border-b border-industrial-800 bg-industrial-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <PackagePlus size={20} />
            </div>
            <div>
              <h2 id="modal-add-custom-title" className="text-lg font-black text-white uppercase tracking-tight">
                Noter un Produit Hors-Catalogue
              </h2>
              <p className="text-xs text-industrial-400 font-mono">
                Ajoutez un article manquant non répertorié dans votre inventaire
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire Défilant */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Alerte contextuelle si code scanné inconnu */}
          {initialBarcode && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Code-barres inconnu scanné :</span>{' '}
                <span className="font-mono bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-500/40 text-white font-bold">
                  {initialBarcode}
                </span>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Renseignez sa désignation pour l'enregistrer dans votre cahier des manques.
                </p>
              </div>
            </div>
          )}

          {/* 1. Nom de l'Article */}
          <div>
            <label className="block text-[11px] font-mono text-industrial-300 uppercase tracking-wider mb-1">
              Désignation du produit <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Eau Minérale Lalla Khedidja 1.5L, Ariel 3kg..."
              className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-industrial-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* 2. Code-barres & Priorité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Barcode size={12} /> Code-barres (optionnel)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: 613000000000"
                className="w-full bg-industrial-900 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-industrial-600 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
                Degré de priorité
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border text-center",
                    priority === 'normal'
                      ? "bg-industrial-800 border-industrial-600 text-white shadow-sm"
                      : "bg-industrial-950 border-industrial-800 text-industrial-500 hover:text-white"
                  )}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border flex items-center justify-center gap-1",
                    priority === 'urgent'
                      ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-sm shadow-rose-900/40"
                      : "bg-industrial-950 border-industrial-800 text-industrial-500 hover:text-rose-400"
                  )}
                >
                  <span>🔥</span>
                  <span>Urgent</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Quantité & Prix d'achat unitaire estimé */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
                Quantité souhaitée <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center text-sm font-bold disabled:opacity-40"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 text-center bg-industrial-900 border border-industrial-700 rounded-xl py-2 text-sm font-black font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  {[6, 12, 24].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setQuantity(q => q + step)}
                      className="px-2 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-[10px] font-mono font-bold text-industrial-400 hover:text-indigo-300 hover:border-indigo-500/40"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
                Prix d'achat estimé (DA)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-industrial-900 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-industrial-600 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 text-xs font-mono text-industrial-500 font-bold">
                  DA
                </span>
              </div>
            </div>
          </div>

          {/* 4. Fournisseur */}
          <div>
            <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 size={12} /> Fournisseur d'approvisionnement
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">-- Sans fournisseur spécifique --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
              <option value="__custom__">Autre fournisseur (saisie libre)...</option>
            </select>

            {selectedSupplierId === '__custom__' && (
              <input
                type="text"
                value={customSupplierName}
                onChange={(e) => setCustomSupplierName(e.target.value)}
                placeholder="Nom du fournisseur ou grossiste libre"
                className="w-full mt-2 bg-industrial-900 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-industrial-600 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* 5. Affectation aux Listes Personnalisées */}
          {customLists.length > 0 && (
            <div>
              <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers size={12} /> Affecter à une ou plusieurs listes
              </label>
              <div className="flex flex-wrap gap-2">
                {customLists.map((list) => {
                  const isSelected = selectedListIds.includes(list.id);
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => toggleListSelection(list.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all",
                        isSelected
                          ? "bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-sm"
                          : "bg-industrial-900/60 border-industrial-800 text-industrial-400 hover:text-white"
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: list.color || '#6366f1' }}
                      />
                      <span>{list.name}</span>
                      {isSelected && <Check size={12} className="text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Remarque / Note Libre */}
          <div>
            <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText size={12} /> Remarque / Note pour la commande
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Demandé par 3 clients, prendre le pack de 12 si possible"
              className="w-full bg-industrial-900 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-industrial-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-industrial-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="bg-industrial-900 border-industrial-700 text-industrial-300 hover:text-white font-mono text-xs px-4 py-2 rounded-xl"
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>{isSubmitting ? 'Ajout en cours...' : 'Ajouter au Cahier des Manques'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
