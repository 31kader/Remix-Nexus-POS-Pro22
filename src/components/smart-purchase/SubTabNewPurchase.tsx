import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Printer, CheckCircle2, X, AlertCircle, ShoppingBag, 
  Upload, Sparkles, RefreshCw, Eye, Brain, FileText, Clock, Search, Camera, Package
} from 'lucide-react';
import { Card, Button, SafeImage } from '../ui';
import { Product, Supplier, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { PurchaseCartTable } from './PurchaseCartTable';
import { PurchaseScanArea } from './components/PurchaseScanArea';
import { PurchaseSummaryFooter } from './components/PurchaseSummaryFooter';

interface SubTabNewPurchaseProps {
  mode: 'manual' | 'scan';
  setMode: (v: 'manual' | 'scan') => void;
  scanMethod: 'ai' | 'ocr';
  setScanMethod: (v: 'ai' | 'ocr') => void;
  error: string | null;
  setError: (v: string | null) => void;
  autoMargin: boolean;
  setAutoMargin: (v: boolean) => void;
  setEditingProduct: (v: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isScanning: boolean;
  isOfflineScanning: boolean;
  processFile: (file: File) => void;
  processFileOffline: (file: File) => void;
  offlineScanProgress: string;
  showMockOption: boolean;
  file: File | null;
  simulateInvoiceScanning: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (v: string) => void;
  setIsPurchaseScannerOpen: (v: boolean) => void;
  filteredProducts: Product[];
  addToCart: (p: Product) => void;
  settings: CompanySettings;
  selectedSupplierId: string;
  setSelectedSupplierId: (v: string) => void;
  suppliers: Supplier[];
  setIsQuickSupplierModalOpen: (v: boolean) => void;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  setPurchaseStatus: (v: 'draft' | 'ordered' | 'completed') => void;
  rawOcrText: string;
  setIsOcrInspectorOpen: (v: boolean) => void;
  detectedOcrType: 'pos' | 'standard';
  invoiceNumber: string;
  setInvoiceNumber: (v: string) => void;
  receptionDate: string;
  setReceptionDate: (v: string) => void;
  cart: PurchaseCartItem[];
  products: Product[];
  openQuickCreateModal: (item: PurchaseCartItem) => void;
  setLinkingItem: (item: PurchaseCartItem) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  updateItemField: (id: string, field: keyof PurchaseCartItem, value: any) => void;
  updateQuantity: (id: string, qty: number) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  paidAmount: number;
  setPaidAmount: (v: number) => void;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  setPaymentMethod: (v: 'cash' | 'card' | 'transfer' | 'check') => void;
  resetForm: () => void;
  globalDiscount: number;
  setGlobalDiscount: (v: number) => void;
  globalTax: number;
  setGlobalTax: (v: number) => void;
  isProcessing: boolean;
  confirmPurchase: () => void;
  editingPurchaseId: string | null;
}

export function SubTabNewPurchase({
  mode, setMode, scanMethod, setScanMethod, error, setError, autoMargin, setAutoMargin,
  setEditingProduct, setIsProductModalOpen, fileInputRef, handleFileChange, isScanning,
  isOfflineScanning, processFile, processFileOffline, offlineScanProgress, showMockOption,
  file, simulateInvoiceScanning, searchInputRef, search, setSearch, setIsPurchaseScannerOpen,
  filteredProducts, addToCart, settings, selectedSupplierId, setSelectedSupplierId, suppliers,
  setIsQuickSupplierModalOpen, purchaseStatus, setPurchaseStatus, rawOcrText, setIsOcrInspectorOpen,
  detectedOcrType, invoiceNumber, setInvoiceNumber, receptionDate, setReceptionDate,
  cart, products, openQuickCreateModal, setLinkingItem, setIsLinkModalOpen,
  updateItemField, updateQuantity, quantityInputRefs, paidAmount, setPaidAmount,
  paymentMethod, setPaymentMethod, resetForm, globalDiscount, setGlobalDiscount,
  globalTax, setGlobalTax, isProcessing, confirmPurchase, editingPurchaseId
}: SubTabNewPurchaseProps) {
  return (
        <div className="space-y-6">
          <Card className="p-0 industrial-card overflow-hidden">
            <div className="p-6 bg-industrial-800/50 border-b border-industrial-800">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex bg-industrial-950 p-1 rounded-xl border border-industrial-800 flex-wrap md:flex-nowrap gap-0.5">
                  <button 
                    type="button"
                    onClick={() => { setMode('manual'); setError(null); }} 
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none", 
                      mode === 'manual' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
                    )}
                  >
                    Saisie Manuelle
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setMode('scan'); setScanMethod('ai'); setError(null); }} 
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none", 
                      (mode === 'scan' && scanMethod === 'ai') ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-100"
                    )}
                  >
                    <Brain size={12} className={cn((mode === 'scan' && scanMethod === 'ai') ? "text-indigo-300 animate-pulse" : "")} />
                    Scan IA (Gemini Cloud)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setMode('scan'); setScanMethod('ocr'); setError(null); }} 
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none", 
                      (mode === 'scan' && scanMethod === 'ocr') ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-industrial-500 hover:text-industrial-100"
                    )}
                  >
                    <FileText size={12} className={cn((mode === 'scan' && scanMethod === 'ocr') ? "text-emerald-300" : "")} />
                    OCR Direct (Local de secours)
                  </button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Marge Auto.</span>
                    <button 
                      onClick={() => setAutoMargin(!autoMargin)}
                      className={cn("w-12 h-6 rounded-full relative transition-all shadow-inner", autoMargin ? "bg-emerald-500" : "bg-industrial-700")}
                    >
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md", autoMargin ? "left-7" : "left-1")} />
                    </button>
                  </div>
                  <Button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} size="sm" className="industrial-button-primary bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black py-2 px-4 shadow-none">
                    <Plus size={14} className="mr-2" /> Nouveau Produit
                  </Button>
                </div>
              </div>

              {/* Mode Selection */}
              {mode === 'scan' ? (
                <PurchaseScanArea 
                  scanMethod={scanMethod}
                  isScanning={isScanning}
                  isOfflineScanning={isOfflineScanning}
                  offlineScanProgress={offlineScanProgress}
                  error={error}
                  showMockOption={showMockOption}
                  file={file}
                  fileInputRef={fileInputRef}
                  handleFileChange={handleFileChange}
                  processFile={processFile}
                  processFileOffline={processFileOffline}
                  simulateInvoiceScanning={simulateInvoiceScanning}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">Rechercher Article (F3)</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-industrial-500" size={18} />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="NOM, SKU, CODE BARRE..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          const val = e.currentTarget.value;
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (val.trim() !== '') {
                              const exactProduct = products.find(p => 
                                (p.barcode && p.barcode.trim().toLowerCase() === val.trim().toLowerCase()) ||
                                (p.sku && p.sku.trim().toLowerCase() === val.trim().toLowerCase())
                              );
                              if (exactProduct) {
                                addToCart(exactProduct);
                                setSearch('');
                                toast.success(`Produit ajouté : ${exactProduct.name}`);
                              } else if (filteredProducts.length > 0) {
                                addToCart(filteredProducts[0]);
                                setSearch('');
                              } else {
                                toast.error(`Aucun produit trouvé pour : ${val}`);
                              }
                              
                              setTimeout(() => {
                                setSearch('');
                              }, 50);
                            }
                          }
                        }}
                        className="w-full pl-12 pr-12 py-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl bg-industrial-950 text-white font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                      />
                      <button 
                        type="button" 
                        onClick={() => setIsPurchaseScannerOpen(true)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-indigo-400 transition-colors"
                      >
                        <Camera size={20} />
                      </button>

                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {search && filteredProducts.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-[100] left-0 right-0 mt-2 bg-industrial-950 border border-industrial-700 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
                          >
                            {filteredProducts.map(p => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  addToCart(p);
                                  setSearch('');
                                }}
                                className="w-full flex items-center gap-4 p-4 hover:bg-industrial-800 transition-colors border-b border-industrial-800 last:border-0 text-left group"
                              >
                                  <div className="w-12 h-12 rounded-lg bg-industrial-900 border border-industrial-800 flex items-center justify-center overflow-hidden">
                                    {(() => {
                                      const imgSource = p.imageUrl || (p.imageUrls && p.imageUrls[0]) || p.image || '';
                                      return imgSource ? (
                                        <SafeImage 
                                          src={imgSource} 
                                          className="w-full h-full object-cover" 
                                          fallback={<Package size={20} className="text-industrial-600"/>}
                                        />
                                      ) : <Package size={20} className="text-industrial-600"/>;
                                    })()}
                                  </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-white uppercase truncate tracking-tight group-hover:text-indigo-400 transition-colors">{p.name}</p>
                                  <p className="text-[10px] font-mono text-industrial-500 uppercase tracking-widest">{p.sku || p.id}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-indigo-400 font-mono text-xs">{p.costPrice.toFixed(2)} {settings.currency}</p>
                                  <p className="text-[10px] font-black text-industrial-600 uppercase">Stock: {p.stock}</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                        {search && filteredProducts.length === 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute z-[100] left-0 right-0 mt-2 p-8 bg-industrial-950 border border-industrial-700 rounded-2xl shadow-2xl text-center"
                          >
                            <p className="text-industrial-500 font-black uppercase text-xs tracking-[0.2em]">Aucun produit trouvé</p>
                            <button 
                              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                              className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline"
                            >
                              + Créer ce produit
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">Fournisseur</label>
                    <div className="flex items-center gap-2">
                      <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="w-full flex-1 p-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl bg-industrial-950 text-white text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner">
                        <option value="">SÉLECTIONNER...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                      </select>
                      <button onClick={() => setIsQuickSupplierModalOpen(true)} className="p-3 bg-industrial-800 text-indigo-400 rounded-2xl hover:bg-industrial-700 hover:text-indigo-300 transition-all border border-industrial-800 active:scale-95"><Plus size={20} /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">Statut Initial</label>
                    <select value={purchaseStatus} onChange={(e) => setPurchaseStatus(e.target.value as any)} className="w-full p-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl bg-industrial-950 text-white text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner">
                      <option value="draft">BROUILLON</option>
                      <option value="ordered">COMMANDÉ</option>
                      <option value="completed">REÇU (MISE EN STOCK)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-industrial-900 p-6 border-b border-industrial-800 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <h4 className="font-black flex items-center gap-3 text-sm text-white uppercase tracking-widest">
                  <ShoppingBag size={20} className="text-indigo-500"/> Articles dans le Bon
                </h4>
                {rawOcrText && (
                  <button
                    type="button"
                    onClick={() => setIsOcrInspectorOpen(true)}
                    className="py-1.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Eye size={12} className="text-indigo-400 animate-pulse" />
                    Inspecter l'OCR {detectedOcrType === 'pos' ? '🖥️ (Mode POS)' : ''}
                  </button>
                )}
              </div>
              <div className="flex gap-4 items-center">
                <input type="text" placeholder="N° BON" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="p-2 bg-industrial-950 border border-industrial-700 rounded-xl text-white font-mono text-xs w-32 outline-none focus:ring-2 focus:ring-indigo-500/50" />
                <input type="date" value={receptionDate} onChange={(e) => setReceptionDate(e.target.value)} className="p-2 bg-industrial-950 border border-industrial-700 rounded-xl text-white font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
            </div>
            
            <PurchaseCartTable
              cart={cart}
              products={products}
              settings={settings}
              selectedSupplierId={selectedSupplierId}
              openQuickCreateModal={openQuickCreateModal}
              setLinkingItem={setLinkingItem}
              setIsLinkModalOpen={setIsLinkModalOpen}
              updateItemField={updateItemField}
              updateQuantity={updateQuantity}
              quantityInputRefs={quantityInputRefs}
              setEditingProduct={setEditingProduct}
              setIsProductModalOpen={setIsProductModalOpen}
            />

            {cart.length > 0 && (
              <PurchaseSummaryFooter
                cart={cart}
                settings={settings}
                selectedSupplierId={selectedSupplierId}
                suppliers={suppliers}
                paidAmount={paidAmount}
                setPaidAmount={setPaidAmount}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                resetForm={resetForm}
                globalDiscount={globalDiscount}
                setGlobalDiscount={setGlobalDiscount}
                globalTax={globalTax}
                setGlobalTax={setGlobalTax}
                isProcessing={isProcessing}
                confirmPurchase={confirmPurchase}
                editingPurchaseId={editingPurchaseId}
                purchaseStatus={purchaseStatus}
              />
            )}
          </Card>
        </div>
  );
}
