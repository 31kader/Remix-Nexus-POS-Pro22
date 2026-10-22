import React from 'react';
import { Modal, Button, ConfirmDialog } from '../ui';
import { Category, Product } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { formatProductStock } from '../../lib/utils';
import { BarcodeScanner } from '../BarcodeScanner';

interface SmartPurchaseModalsProps {
  isQuickSupplierModalOpen: boolean;
  setIsQuickSupplierModalOpen: (v: boolean) => void;
  quickSupplierData: any;
  setQuickSupplierData: (d: any) => void;
  handleQuickSupplierSubmit: (e: React.FormEvent) => void;

  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (v: boolean) => void;
  paymentData: any;
  setPaymentData: (d: any) => void;
  handleSupplierPayment: (data: any) => void;

  purchaseToDelete: string | null;
  setPurchaseToDelete: (id: string | null) => void;
  handleDeletePurchase: (id: string) => void;

  isOcrInspectorOpen: boolean;
  setIsOcrInspectorOpen: (v: boolean) => void;
  detectedOcrType: 'pos' | 'standard';
  rawOcrText: string;

  isQuickCreateOpen: boolean;
  setIsQuickCreateOpen: (v: boolean) => void;
  setDraftItemToCreate: (v: PurchaseCartItem | null) => void;
  draftItemToCreate: PurchaseCartItem | null;
  quickCreateForm: any;
  setQuickCreateForm: (v: any) => void;
  handleQuickCreateSubmit: (e: React.FormEvent) => void;
  categories: Category[];

  isLinkModalOpen: boolean;
  setIsLinkModalOpen: (v: boolean) => void;
  setLinkingItem: (v: PurchaseCartItem | null) => void;
  linkingItem: PurchaseCartItem | null;
  quickCreateSearchFilter: string;
  setQuickCreateSearchFilter: (v: string) => void;
  products: Product[];
  linkDraftToProduct: (lineId: string, matchedProduct: Product) => void;

  isPurchaseScannerOpen: boolean;
  setIsPurchaseScannerOpen: (v: boolean) => void;
  handlePurchaseBarcodeScan: (code: string) => void;
}

export function SmartPurchaseModals({
  isQuickSupplierModalOpen, setIsQuickSupplierModalOpen, quickSupplierData, setQuickSupplierData, handleQuickSupplierSubmit,
  isPaymentModalOpen, setIsPaymentModalOpen, paymentData, setPaymentData, handleSupplierPayment,
  purchaseToDelete, setPurchaseToDelete, handleDeletePurchase,
  isOcrInspectorOpen, setIsOcrInspectorOpen, detectedOcrType, rawOcrText,
  isQuickCreateOpen, setIsQuickCreateOpen, setDraftItemToCreate, draftItemToCreate, quickCreateForm, setQuickCreateForm, handleQuickCreateSubmit, categories,
  isLinkModalOpen, setIsLinkModalOpen, setLinkingItem, linkingItem, quickCreateSearchFilter, setQuickCreateSearchFilter, products, linkDraftToProduct,
  isPurchaseScannerOpen, setIsPurchaseScannerOpen, handlePurchaseBarcodeScan
}: SmartPurchaseModalsProps) {
  return (
    <>
      <Modal isOpen={isQuickSupplierModalOpen} onClose={() => setIsQuickSupplierModalOpen(false)} title="NOUVEAU FOURNISSEUR RAPIDE" maxWidth="max-w-xl">
        <form onSubmit={handleQuickSupplierSubmit} className="space-y-4 p-1 text-left">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm">
              🚚
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Création Express Partenaire</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Le fournisseur sera immédiatement créé dans votre base et sélectionné pour cette réception.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                Nom de la Société / Fournisseur *
              </label>
              <input
                required
                placeholder="Ex: SARL DISTRI-ALGER / GROSSISTE..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={quickSupplierData.name || ''}
                onChange={e => setQuickSupplierData({ ...quickSupplierData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                Nom du Contact / Commercial
              </label>
              <input
                placeholder="Ex: Amine / Représentant"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={quickSupplierData.contactName || ''}
                onChange={e => setQuickSupplierData({ ...quickSupplierData, contactName: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                Téléphone / WhatsApp
              </label>
              <input
                placeholder="Ex: 0550 00 00 00"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={quickSupplierData.phone || ''}
                onChange={e => setQuickSupplierData({ ...quickSupplierData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                Adresse / Wilaya
              </label>
              <input
                placeholder="Ex: Zone Industrielle Rouiba, Alger"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={quickSupplierData.address || ''}
                onChange={e => setQuickSupplierData({ ...quickSupplierData, address: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                Solde / Dette Initiale (DA)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00 DA"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-amber-600 dark:text-amber-400 outline-none focus:ring-2 focus:ring-indigo-500"
                value={quickSupplierData.balance ?? ''}
                onChange={e => setQuickSupplierData({ ...quickSupplierData, balance: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                E-mail (Optionnel)
              </label>
              <input
                type="email"
                placeholder="contact@fournisseur.dz"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={quickSupplierData.email || ''}
                onChange={e => setQuickSupplierData({ ...quickSupplierData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2 sm:col-span-2 pt-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 block">
                🚚 Jours habituels de Livraison (Optionnel - pour le Tableau de Bord des Activités)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => {
                  const selectedDays: string[] = Array.isArray(quickSupplierData.deliveryDays) ? quickSupplierData.deliveryDays : [];
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = isSelected ? selectedDays.filter(d => d !== day) : [...selectedDays, day];
                        setQuickSupplierData({ ...quickSupplierData, deliveryDays: next });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsQuickSupplierModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6">
              ✓ Créer & Sélectionner ce Fournisseur
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="RÈGLEMENT FOURNISSEUR">
        <form onSubmit={(e) => { e.preventDefault(); handleSupplierPayment(paymentData); }} className="p-2 space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">Montant à verser (DA)</label>
            <input required type="number" step="0.01" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-indigo-500" value={paymentData.amount || ''} onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">Date du versement</label>
            <input required type="date" className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={(paymentData.date || '').split('T')[0]} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 font-black uppercase">CONFIRMER LE VERSEMENT</Button>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={!!purchaseToDelete} 
        onClose={() => setPurchaseToDelete(null)} 
        onConfirm={() => purchaseToDelete && handleDeletePurchase(purchaseToDelete)} 
        title="Supprimer la réception" 
        message="Cette action est irréversible. Le stock ne sera pas automatiquement réajusté." 
      />

      <Modal isOpen={isOcrInspectorOpen} onClose={() => setIsOcrInspectorOpen(false)} title="INSPECTEUR DE NUMÉRISATION (OCR LOCAL)">
        <div className="p-2 space-y-6">
          <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-xl">
            {detectedOcrType === 'pos' ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
                  🖥️ Capture d'écran POS Détectée
                </div>
                <p className="text-xs text-industrial-300 leading-relaxed">
                  Le système a détecté que l'image analysée provient d'un écran de Point de Vente (POS). Ces images contiennent des boutons de sélection d'articles rapides à gauche (ex: <strong>"BESBASSA 1.5L"</strong>, <strong>"GUEDILA"</strong>) et une seule ligne d'article actif dans le tableau central.
                </p>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase leading-relaxed">
                  💡 Protection POS Activée : Les boutons latéraux statiques ont été automatiquement filtrés et ignorés pour conserver uniquement l'article actif présent dans le panier de caisse !
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                  📄 Facture Standard Détectée
                </div>
                <p className="text-xs text-industrial-300 leading-relaxed">
                  L'image ou le PDF a été traité comme un document standard (bon de livraison, facture). L'algorithme extrait les articles de manière tabulaire avec correspondances par base de données.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1 block">
              Texte Brut Extrait par le moteur OCR (100% Réel)
            </label>
            <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-xl max-h-60 overflow-y-auto font-mono text-xs text-industrial-400 whitespace-pre-line leading-relaxed scrollbar-thin">
              {rawOcrText || "Aucun texte détecté."}
            </div>
            <p className="text-[10px] text-industrial-500 px-1">
              * Ce texte est généré localement dans votre navigateur via Tesseract.js sans aucun simulateur ou serveur externe.
            </p>
          </div>

          <Button onClick={() => setIsOcrInspectorOpen(false)} className="w-full industrial-button-primary">
            FERMER L'INSPECTEUR
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isQuickCreateOpen} onClose={() => { setIsQuickCreateOpen(false); setDraftItemToCreate(null); }} title="CRÉATION RAPIDE PRODUIT (IMAGE/OCR)">
        <form onSubmit={handleQuickCreateSubmit} className="space-y-4 p-2 text-left">
          <p className="text-xs text-industrial-400">
            Ajoutez le produit <strong className="text-amber-400">"{draftItemToCreate?.productName}"</strong> à l'inventaire en pré-remplissant ses informations d'achat :
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Nom du produit *</label>
            <input required className="industrial-input w-full uppercase" value={quickCreateForm.name} onChange={e => setQuickCreateForm({...quickCreateForm, name: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Prix d'Achat (HT)</label>
              <input required type="number" step="0.01" className="industrial-input w-full font-mono text-white" value={quickCreateForm.costPrice} onChange={e => setQuickCreateForm({...quickCreateForm, costPrice: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Prix de Vente (TTC) *</label>
              <input required type="number" step="0.01" className="industrial-input w-full font-mono text-emerald-400 font-bold focus:text-emerald-300" value={quickCreateForm.price} onChange={e => setQuickCreateForm({...quickCreateForm, price: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Quantité Initiale</label>
              <input required type="number" step="any" className="industrial-input w-full font-mono text-white" value={quickCreateForm.stock} onChange={e => setQuickCreateForm({...quickCreateForm, stock: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">TVA (%)</label>
              <select className="industrial-input w-full text-white bg-industrial-950" value={quickCreateForm.taxRate} onChange={e => setQuickCreateForm({...quickCreateForm, taxRate: e.target.value})}>
                <option value="0">0% (Exonré)</option>
                <option value="9">9% (Réduit)</option>
                <option value="19">19% (Standard)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Catégorie *</label>
              <select required className="industrial-input w-full text-white bg-industrial-950" value={quickCreateForm.categoryId} onChange={e => setQuickCreateForm({...quickCreateForm, categoryId: e.target.value})}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">SKU / Code-barres</label>
              <input className="industrial-input w-full font-mono text-white" value={quickCreateForm.sku} onChange={e => setQuickCreateForm({...quickCreateForm, sku: e.target.value})} />
            </div>
          </div>

          <Button type="submit" className="w-full industrial-button-primary mt-4">CRÉER ET CONFIRMER</Button>
        </form>
      </Modal>

      <Modal isOpen={isLinkModalOpen} onClose={() => { setIsLinkModalOpen(false); setLinkingItem(null); }} title="CONCORDANCE DE PRODUIT EXISTANT">
        <div className="space-y-4 p-2 text-left">
          <p className="text-xs text-industrial-400">
            Associez la ligne extraite <strong className="text-amber-400">"{linkingItem?.productName}"</strong> à un des produits présents dans l'inventaire actuel :
          </p>
          <input
            type="text"
            placeholder="Rechercher par nom ou code-barres..."
            value={quickCreateSearchFilter}
            onChange={e => setQuickCreateSearchFilter(e.target.value)}
            className="industrial-input w-full"
          />
          <div className="divide-y divide-industrial-805 border border-industrial-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-industrial-950">
            {products
              .filter(p => !quickCreateSearchFilter || (p?.name && p.name.toLowerCase().includes(quickCreateSearchFilter.toLowerCase())) || (p?.sku && p.sku.toLowerCase().includes(quickCreateSearchFilter.toLowerCase())))
              .slice(0, 50)
              .map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (linkingItem) {
                      linkDraftToProduct(linkingItem.lineId, p);
                    }
                    setIsLinkModalOpen(false);
                    setLinkingItem(null);
                    setQuickCreateSearchFilter('');
                  }}
                  className="w-full p-3 text-left hover:bg-industrial-800/40 flex justify-between items-center transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-xs uppercase truncate">{p.name || 'SANS NOM'}</p>
                    <p className="text-[10px] text-industrial-500 font-mono">SKU: {p.sku || 'N/A'} • Stock: {formatProductStock(p, products)}</p>
                  </div>
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 uppercase tracking-widest shrink-0">
                    Lier
                  </span>
                </button>
              ))}
            {products.filter(p => !quickCreateSearchFilter || (p?.name && p.name.toLowerCase().includes(quickCreateSearchFilter.toLowerCase()))).length === 0 && (
              <p className="p-4 text-center text-xs text-industrial-500 ">Aucun produit ne correspond à la recherche.</p>
            )}
          </div>
        </div>
      </Modal>

      {isPurchaseScannerOpen && (
        <BarcodeScanner
          onScan={handlePurchaseBarcodeScan}
          onClose={() => setIsPurchaseScannerOpen(false)}
        />
      )}
    </>
  );
}
