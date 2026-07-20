import React from 'react';
import { Modal, Button, ConfirmDialog } from '../ui';
import { Category, Product } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';
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
      <Modal isOpen={isQuickSupplierModalOpen} onClose={() => setIsQuickSupplierModalOpen(false)} title="NOUVEAU FOURNISSEUR RAPIDE">
        <form onSubmit={handleQuickSupplierSubmit} className="space-y-6 p-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Nom du fournisseur *</label>
            <input required className="industrial-input w-full" value={quickSupplierData.name} onChange={e => setQuickSupplierData({...quickSupplierData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Téléphone</label>
                <input className="industrial-input w-full" value={quickSupplierData.phone} onChange={e => setQuickSupplierData({...quickSupplierData, phone: e.target.value})} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">E-mail</label>
                <input className="industrial-input w-full" type="email" value={quickSupplierData.email} onChange={e => setQuickSupplierData({...quickSupplierData, email: e.target.value})} />
             </div>
          </div>
          <Button type="submit" className="w-full industrial-button-primary">CRÉER ET SÉLECTIONNER</Button>
        </form>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="RÈGLEMENT FOURNISSEUR">
        <form onSubmit={(e) => { e.preventDefault(); handleSupplierPayment(paymentData); }} className="p-2 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Montant à verser</label>
            <input required type="number" step="0.01" className="industrial-input w-full text-2xl font-mono text-emerald-400" value={paymentData.amount || ''} onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Date du versement</label>
            <input required type="date" className="industrial-input w-full" value={paymentData.date.split('T')[0]} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
          </div>
          <Button type="submit" className="w-full industrial-button-primary">CONFIRMER LE VERSEMENT</Button>
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
          <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-2xl">
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
            <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-2xl max-h-60 overflow-y-auto font-mono text-xs text-industrial-400 whitespace-pre-line leading-relaxed scrollbar-thin">
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
          <div className="divide-y divide-industrial-805 border border-industrial-800 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto bg-industrial-950">
            {products
              .filter(p => !quickCreateSearchFilter || p.name.toLowerCase().includes(quickCreateSearchFilter.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(quickCreateSearchFilter.toLowerCase())))
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
                    <p className="font-bold text-white text-xs uppercase truncate">{p.name}</p>
                    <p className="text-[10px] text-industrial-500 font-mono">SKU: {p.sku || 'N/A'} • Stock: {formatProductStock(p, products)}</p>
                  </div>
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 uppercase tracking-widest shrink-0">
                    Lier
                  </span>
                </button>
              ))}
            {products.filter(p => !quickCreateSearchFilter || p.name.toLowerCase().includes(quickCreateSearchFilter.toLowerCase())).length === 0 && (
              <p className="p-4 text-center text-xs text-industrial-500 italic">Aucun produit ne correspond à la recherche.</p>
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
