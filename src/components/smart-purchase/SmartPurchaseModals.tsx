import React from 'react';
import { Modal, Button, ConfirmDialog } from '../ui';
import { Category, Product } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { formatProductStock } from '../../lib/utils';
import { BarcodeScanner } from '../BarcodeScanner';
import { QuickSupplierModal } from './modals/QuickSupplierModal';
import { QuickCreateProductModal } from './modals/QuickCreateProductModal';

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
      <QuickSupplierModal
        isOpen={isQuickSupplierModalOpen}
        onClose={() => setIsQuickSupplierModalOpen(false)}
        quickSupplierData={quickSupplierData}
        setQuickSupplierData={setQuickSupplierData}
        handleQuickSupplierSubmit={handleQuickSupplierSubmit}
      />

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="RÈGLEMENT FOURNISSEUR">
        <form onSubmit={(e) => { e.preventDefault(); handleSupplierPayment(paymentData); }} className="p-2 space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">Montant à verser (DA)</label>
            <input 
              required 
              type="text" 
              inputMode="decimal"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-indigo-500" 
              value={paymentData.amount === 0 ? '' : paymentData.amount} 
              onChange={e => {
                const normalized = e.target.value.replace(',', '.');
                if (/^[0-9]*\.?[0-9]*$/.test(normalized)) {
                  const val = parseFloat(normalized);
                  setPaymentData({ ...paymentData, amount: normalized.endsWith('.') ? (normalized as any) : (isNaN(val) ? 0 : val) });
                }
              }} 
              placeholder="0.00"
            />
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

      <QuickCreateProductModal
        isOpen={isQuickCreateOpen}
        onClose={() => { setIsQuickCreateOpen(false); setDraftItemToCreate(null); }}
        draftItemToCreate={draftItemToCreate}
        quickCreateForm={quickCreateForm}
        setQuickCreateForm={setQuickCreateForm}
        handleQuickCreateSubmit={handleQuickCreateSubmit}
        categories={categories}
      />

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
