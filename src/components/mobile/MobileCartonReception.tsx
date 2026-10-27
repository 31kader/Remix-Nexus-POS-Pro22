import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Package, Camera, Search, Plus, Minus, Check, CheckCircle2, 
  ArrowLeft, RotateCcw, ShoppingCart, ChevronRight, X, ScanLine, 
  Boxes, PlusCircle, AlertCircle, Barcode, Tag, Sparkles, Zap,
  BookOpen, Trash2
} from 'lucide-react';
import { Product, Supplier } from '../../types';
import { SafeImage } from '../ui';
import { 
  compressCartonImage, 
  addCartonIntake, 
  directValidateCartonReception, 
  CartonIntakeItem,
  saveCartonTemplate,
  getCartonTemplates,
  deleteCartonTemplate,
  recognizeCarton,
  resolveBarcodeOrCarton,
  CartonTemplate,
  CartonRecognitionResult
} from '../../services/cartonIntakeService';
import { useCoreStore } from '../../store/useCoreStore';
import { localDb } from '../../services/LocalDatabase';
import { generateUniqueId } from '../../lib/utils';
import { BarcodeScanner } from '../BarcodeScanner';
import { toast } from 'sonner';
import { CartonInventoryManager } from '../inventory/CartonInventoryManager';
import { uploadImageBlobToStorage } from '../../supabase';

interface MobileCartonReceptionProps {
  products?: Product[];
  suppliers?: Supplier[];
  onBackToPos?: () => void;
  onAddToCartDirectly?: (item: any) => void;
  currentUserId?: string;
  currentUserName?: string;
  isStandalone?: boolean;
}

export function MobileCartonReception({
  products: initialProducts = [],
  suppliers = [],
  onBackToPos,
  onAddToCartDirectly,
  currentUserId,
  currentUserName,
  isStandalone = false
}: MobileCartonReceptionProps) {
  // Store global de secours si initialProducts est vide ou non transmis
  const storeProducts = useCoreStore(s => s.products);
  const effectiveProducts = useMemo(() => {
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    return storeProducts || [];
  }, [initialProducts, storeProducts]);

  // Si aucun produit n'est chargé en mémoire, tenter un réveil depuis IndexedDB
  useEffect(() => {
    if (effectiveProducts.length === 0) {
      localDb.get('products').then(snap => {
        if (snap?.exists() && snap.val()) {
          const list = Object.values(snap.val()) as Product[];
          if (list.length > 0) {
            useCoreStore.getState().setProducts(list);
          }
        }
      }).catch(() => {});
    }
  }, [effectiveProducts.length]);

  // Mode d'affichage : Inventaire des Cartons vs Scanner Réception
  const [viewMode, setViewMode] = useState<'inventory' | 'scanner'>('inventory');

  // --- Étape 1 : Photo du carton ---
  const [cartonPhoto, setCartonPhoto] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Étape 2 : Recherche, Scanner & Produit sélectionné ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Modal rapide de création de produit à la volée si inexistant
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState<boolean>(false);
  const [quickName, setQuickName] = useState<string>('');
  const [quickBarcode, setQuickBarcode] = useState<string>('');
  const [quickCostPrice, setQuickCostPrice] = useState<number>(0);
  const [quickSellingPrice, setQuickSellingPrice] = useState<number>(0);
  const [quickUnitsPerCarton, setQuickUnitsPerCarton] = useState<number>(12);

  // --- Étape 3 : Colisage, Nombre de cartons, Prix d'achat ---
  const [unitsPerCarton, setUnitsPerCarton] = useState<number>(12); // 12 par défaut (spécification utilisateur)
  const [cartonCount, setCartonCount] = useState<number>(1);
  const [cartonCostPrice, setCartonCostPrice] = useState<number>(0);
  const [unitCostPrice, setUnitCostPrice] = useState<number>(0);

  // État de validation / chargement
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recentIntakes, setRecentIntakes] = useState<CartonIntakeItem[]>([]);

  // --- Reconnaissance Automatique & Mémoire Visuelle ---
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognitionResult, setRecognitionResult] = useState<CartonRecognitionResult | null>(null);

  // Mode "Ajout direct au panier sur reconnaissance"
  const [autoAddToCart, setAutoAddToCart] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_carton_auto_add') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAutoAddToCart = () => {
    const nextVal = !autoAddToCart;
    setAutoAddToCart(nextVal);
    try {
      localStorage.setItem('nexus_carton_auto_add', String(nextVal));
    } catch {}
    if (nextVal) {
      toast.success("⚡ Mode 'Ajout direct au panier' activé ! Dès qu'un carton est reconnu, il est mis au panier.");
    } else {
      toast.info("Mode 'Ajout direct' désactivé. Vous confirmerez manuellement chaque carton.");
    }
  };

  // Liste des cartons mémorisés (Templates)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [savedTemplates, setSavedTemplates] = useState<CartonTemplate[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
      const list = await getCartonTemplates();
      setSavedTemplates(list);
    } catch {}
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Quand un produit est sélectionné, pré-remplir le colisage et le prix d'achat
  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    // Colisage : unitsPerParent s'il existe, sinon 12
    const colisage = Number(product.unitsPerParent) || 12;
    setUnitsPerCarton(colisage);

    // Prix d'achat
    const unitCost = Number(product.costPrice) || Number(product.cost_price) || 0;
    setUnitCostPrice(unitCost);
    setCartonCostPrice(Number((unitCost * colisage).toFixed(2)));

    // Vibration haptique sur smartphone
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  // Détection et sélection automatique via Code-barres scanné
  const handleBarcodeScan = useCallback(async (barcodeData: string) => {
    if (!barcodeData) return;
    const clean = barcodeData.trim();
    setIsScannerOpen(false);

    const templates = await getCartonTemplates();
    const res = resolveBarcodeOrCarton(clean, effectiveProducts, templates);

    if (res?.type === 'carton') {
      handleSelectProduct(res.product);
      setUnitsPerCarton(res.unitsPerCarton);
      setCartonCostPrice(res.cartonCostPrice);
      setUnitCostPrice(res.unitCostPrice);
      if (res.cartonPhotoUrl) {
        setCartonPhoto(res.cartonPhotoUrl);
      }
      setSearchQuery('');
      toast.success(`🎯 Carton reconnu : ${res.product.name} (${res.unitsPerCarton} pcs/ct)`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      return;
    }

    if (res?.type === 'product') {
      handleSelectProduct(res.product);
      setSearchQuery('');
      toast.success(`🎯 Produit reconnu : ${res.product.name}`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      return;
    }

    setSearchQuery(clean);
    setQuickBarcode(clean);
    setQuickName(clean);
    toast.info(`Code scanné : ${clean}. Aucun article ni carton associé trouvé.`);
  }, [effectiveProducts, handleSelectProduct]);

  // Support douchette physique USB / Bluetooth
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ne pas intercepter si l'utilisateur saisit dans un champ de formulaire spécifique
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScan]);

  // Synchronisation du prix carton <--> prix unitaire
  const handleCartonCostChange = (val: number) => {
    setCartonCostPrice(val);
    if (unitsPerCarton > 0) {
      setUnitCostPrice(Number((val / unitsPerCarton).toFixed(2)));
    }
  };

  const handleUnitCostChange = (val: number) => {
    setUnitCostPrice(val);
    setCartonCostPrice(Number((val * unitsPerCarton).toFixed(2)));
  };

  const handleUnitsPerCartonChange = (val: number) => {
    const safeVal = Math.max(1, val);
    setUnitsPerCarton(safeVal);
    // Réajuster le prix carton selon le prix unitaire actuel
    if (unitCostPrice > 0) {
      setCartonCostPrice(Number((unitCostPrice * safeVal).toFixed(2)));
    } else if (cartonCostPrice > 0) {
      setUnitCostPrice(Number((cartonCostPrice / safeVal).toFixed(2)));
    }
  };

  // Normalisation intelligente et recherche multi-mots
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      // Afficher les 8 premiers produits comme suggestions rapides
      return (effectiveProducts || []).slice(0, 8);
    }
    const cleanQuery = normalize(searchQuery);
    const terms = cleanQuery.split(/\s+/).filter(Boolean);
    const rawLower = searchQuery.trim().toLowerCase();

    return (effectiveProducts || [])
      .filter(p => {
        const nameNorm = normalize(p.name);
        const skuNorm = (p.sku || '').toLowerCase();
        const barcodeNorm = (p.barcode || '').toLowerCase();
        const refNorm = (p.reference || '').toLowerCase();
        const catNorm = normalize(p.category || '');

        // Correspondance directe par code ou référence
        if (barcodeNorm.includes(rawLower) || skuNorm.includes(rawLower) || refNorm.includes(rawLower)) {
          return true;
        }

        // Correspondance multi-mots sur le nom et la catégorie
        const combined = `${nameNorm} ${catNorm} ${skuNorm} ${barcodeNorm}`;
        return terms.every(term => combined.includes(term));
      })
      .slice(0, 20);
  }, [effectiveProducts, searchQuery]);

  // Prise de photo du carton + Reconnaissance Automatique Visuelle
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setRecognitionResult(null);

      const compressedDataUrl = await compressCartonImage(file, 1280, 0.85);
      setCartonPhoto(compressedDataUrl);

      // Téléversement dans le bucket dédié 'cartons' de Supabase Storage
      (async () => {
        try {
          const blob = await (await fetch(compressedDataUrl)).blob();
          const uploadedUrl = await uploadImageBlobToStorage(blob, 'cartons', 'image/webp');
          if (uploadedUrl) {
            setCartonPhoto(uploadedUrl);
          }
        } catch (_) {}
      })();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }

      setIsCompressing(false);
      setIsRecognizing(true);

      // Reconnaissance automatique d'après la mémoire visuelle & code-barres
      const match = await recognizeCarton(compressedDataUrl, effectiveProducts);

      if (match) {
        setRecognitionResult(match);
        handleSelectProduct(match.product);

        const colisage = match.template.unitsPerCarton || Number(match.product.unitsPerParent) || 12;
        const cartonCost = match.template.cartonCostPrice || 0;
        const unitCost = match.template.unitCostPrice || Number(match.product.costPrice) || 0;

        setUnitsPerCarton(colisage);
        setCartonCostPrice(cartonCost);
        setUnitCostPrice(unitCost);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 100]);
        }

        // Si l'option d'ajout direct au panier est activée
        if (autoAddToCart) {
          const totalUnitsDirect = 1 * colisage;

          if (onAddToCartDirectly) {
            onAddToCartDirectly({
              productId: match.product.id,
              productName: match.product.name,
              quantity: totalUnitsDirect,
              costPrice: unitCost,
              cartonCount: 1,
              unitsPerCarton: colisage,
              cartonCostPrice: cartonCost,
              cartonPhotoUrl: compressedDataUrl,
              imageUrl: match.product.imageUrl
            });
          }

          const saved = await addCartonIntake({
            productId: match.product.id,
            productName: match.product.name,
            cartonPhotoUrl: compressedDataUrl,
            cartonCount: 1,
            unitsPerCarton: colisage,
            totalUnits: totalUnitsDirect,
            cartonCostPrice: cartonCost,
            unitCostPrice: unitCost,
            totalCostAmount: cartonCost,
            agentName: currentUserName || 'Agent Dépôt'
          });

          setRecentIntakes(prev => [saved, ...prev.slice(0, 4)]);
          loadTemplates();

          toast.success(`⚡ Carton reconnu & direct au panier : ${match.product.name} (1 carton de ${colisage} pcs) !`);
          resetForm();
        } else {
          toast.success(`✨ Carton reconnu : ${match.product.name} (${colisage} pcs/carton) !`);
        }
      } else {
        toast.info("💡 Nouveau carton : associez-le ci-dessous pour qu'il soit mémorisé pour les prochains arrivages !");
      }
    } catch {
      toast.error("Impossible de traiter la photo du carton.");
    } finally {
      setIsCompressing(false);
      setIsRecognizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Création rapide d'un article à la volée si inexistant
  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error("Veuillez renseigner le nom de l'article.");
      return;
    }

    try {
      const newId = generateUniqueId();
      const newProduct: Product = {
        id: newId,
        name: quickName.trim(),
        barcode: quickBarcode.trim() || undefined,
        sku: `ART-${Date.now().toString().slice(-6)}`,
        costPrice: Number(quickCostPrice) || 0,
        price: Number(quickSellingPrice) || Number((quickCostPrice * 1.3).toFixed(2)) || 0,
        stock: 0,
        minStock: 5,
        taxRate: 0,
        categoryId: 'uncategorized',
        supplier: '',
        unit: 'piece',
        status: 'active',
        unitsPerParent: Number(quickUnitsPerCarton) || 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await localDb.insert(`products/${newId}`, newProduct);
      useCoreStore.getState().setProducts(prev => [newProduct, ...(prev || [])]);

      handleSelectProduct(newProduct);
      setIsQuickCreateOpen(false);
      setSearchQuery('');
      toast.success(`✨ Article "${newProduct.name}" créé et lié avec succès !`);
    } catch {
      toast.error("Erreur lors de la création de l'article.");
    }
  };

  // Calculs totaux
  const totalUnits = cartonCount * unitsPerCarton;
  const totalCostAmount = Number((cartonCostPrice * cartonCount).toFixed(2));

  // Réinitialisation du formulaire pour le carton suivant
  const resetForm = () => {
    setCartonPhoto('');
    setSelectedProduct(null);
    setSearchQuery('');
    setCartonCount(1);
    setUnitsPerCarton(12);
    setCartonCostPrice(0);
    setUnitCostPrice(0);
    setRecognitionResult(null);
  };

  // Action A : Envoyer au Panier d'Approvisionnement
  const handleSendToCart = async () => {
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit existant.");
      return;
    }
    if (cartonCount <= 0 || unitsPerCarton <= 0) {
      toast.error("Quantités invalides.");
      return;
    }

    try {
      setIsSubmitting(true);

      const intakePayload = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        cartonPhotoUrl: cartonPhoto,
        cartonCount,
        unitsPerCarton,
        totalUnits,
        cartonCostPrice,
        unitCostPrice,
        totalCostAmount,
        agentName: currentUserName || 'Agent Dépôt'
      };

      if (onAddToCartDirectly) {
        onAddToCartDirectly({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: totalUnits,
          costPrice: unitCostPrice,
          cartonCount,
          unitsPerCarton,
          cartonCostPrice,
          cartonPhotoUrl: cartonPhoto,
          imageUrl: selectedProduct.imageUrl
        });
      }

      const saved = await addCartonIntake(intakePayload);
      setRecentIntakes(prev => [saved, ...prev.slice(0, 4)]);

      // Mémoriser le carton dans les templates pour les futures reconnaissances
      if (cartonPhoto && selectedProduct) {
        const unitRetail = Number(selectedProduct.price) || 0;
        const unitWholesale = Number(selectedProduct.wholesalePrice) || Number(selectedProduct.wholesale_price) || (unitRetail * 0.9);
        saveCartonTemplate({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          unitsPerCarton,
          cartonCostPrice,
          unitCostPrice,
          retailPrice: Number((unitRetail * unitsPerCarton).toFixed(2)),
          wholesalePrice: Number((unitWholesale * unitsPerCarton).toFixed(2)),
          sku: `CART-${selectedProduct.sku || selectedProduct.barcode || selectedProduct.id.slice(0, 6)}`,
          cartonPhotoUrl: cartonPhoto,
          productBarcode: selectedProduct.barcode
        }).then(() => loadTemplates()).catch(() => {});
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }

      toast.success(`📦 Ajouté au panier : ${cartonCount} cartons (${totalUnits} unités) de ${selectedProduct.name} !`);
      resetForm();
    } catch {
      toast.error("Erreur lors de l'envoi au panier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action B : Valider la Réception Immédiate (+X en stock)
  const handleDirectValidate = async () => {
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit existant.");
      return;
    }
    if (cartonCount <= 0 || unitsPerCarton <= 0) {
      toast.error("Quantités invalides.");
      return;
    }

    try {
      setIsSubmitting(true);

      const intakePayload: CartonIntakeItem = {
        id: '',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        cartonPhotoUrl: cartonPhoto,
        cartonCount,
        unitsPerCarton,
        totalUnits,
        cartonCostPrice,
        unitCostPrice,
        totalCostAmount,
        timestamp: new Date().toISOString(),
        agentName: currentUserName || 'Agent Dépôt'
      };

      const result = await directValidateCartonReception(
        intakePayload,
        selectedProduct,
        currentUserId,
        currentUserName
      );

      // Mémoriser également dans les templates
      if (cartonPhoto && selectedProduct) {
        const unitRetail = Number(selectedProduct.price) || 0;
        const unitWholesale = Number(selectedProduct.wholesalePrice) || Number(selectedProduct.wholesale_price) || (unitRetail * 0.9);
        saveCartonTemplate({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          unitsPerCarton,
          cartonCostPrice,
          unitCostPrice,
          retailPrice: Number((unitRetail * unitsPerCarton).toFixed(2)),
          wholesalePrice: Number((unitWholesale * unitsPerCarton).toFixed(2)),
          sku: `CART-${selectedProduct.sku || selectedProduct.barcode || selectedProduct.id.slice(0, 6)}`,
          cartonPhotoUrl: cartonPhoto,
          productBarcode: selectedProduct.barcode
        }).then(() => loadTemplates()).catch(() => {});
      }

      setSelectedProduct(prev => prev ? { ...prev, stock: result.newStock } : null);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      toast.success(`⚡ Réception enregistrée ! Nouveau stock : ${result.newStock} unités.`);
      resetForm();
    } catch {
      toast.error("Erreur lors de la validation directe du stock.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`font-sans select-none ${
      isStandalone 
        ? "min-h-screen bg-industrial-950 text-white flex flex-col pb-12" 
        : "w-full text-slate-900 dark:text-white space-y-4"
    }`}>
      {/* Scanner Caméra Plein Écran */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Modal d'inspection de la Mémoire de Cartons */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Mémoire Visuelle des Cartons</h3>
                  <p className="text-[11px] text-slate-400">{savedTemplates.length} cartons appris et reconnus automatiquement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {savedTemplates.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Aucun carton mémorisé pour le moment.<br />
                  Prenez en photo un carton et associez-le à un produit : Nexus s'en souviendra automatiquement !
                </div>
              ) : (
                savedTemplates.map(tmpl => (
                  <div key={tmpl.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {tmpl.cartonPhotoUrl ? (
                        <img
                          src={tmpl.cartonPhotoUrl}
                          alt={tmpl.productName}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-white">{tmpl.productName}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                            {tmpl.unitsPerCarton} pcs/carton
                          </span>
                          {tmpl.cartonCostPrice > 0 && (
                            <span>{tmpl.cartonCostPrice} DA</span>
                          )}
                          {tmpl.barcode && (
                            <span className="font-mono text-slate-500">#{tmpl.barcode}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCartonTemplate(tmpl.id);
                        await loadTemplates();
                        toast.success("Modèle de carton oublié.");
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Oublier ce carton"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Rapide Produit */}
      {isQuickCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <PlusCircle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Création Rapide de l'Article</h3>
                  <p className="text-[11px] text-slate-400">Ajout instantané au catalogue et association</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Désignation / Nom de l'article *
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Ex: Eau Minérale Ifri 12x0.5L"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Code-barres (EAN)
                  </label>
                  <input
                    type="text"
                    value={quickBarcode}
                    onChange={(e) => setQuickBarcode(e.target.value)}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Colisage (Pièces/Carton)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickUnitsPerCarton}
                    onChange={(e) => setQuickUnitsPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Prix d'achat unitaire (DA)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quickCostPrice || ''}
                    onChange={(e) => setQuickCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Prix de vente (DA)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quickSellingPrice || ''}
                    onChange={(e) => setQuickSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Créer et Lier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header : Dédié Mobile ou Bannière Intégrée Inventaire */}
      {isStandalone ? (
        <header className="sticky top-0 z-30 bg-industrial-900/95 backdrop-blur-md border-b border-industrial-800 pt-[max(env(safe-area-inset-top,0px),12px)] pl-[max(env(safe-area-inset-left,0px),16px)] pr-[max(env(safe-area-inset-right,0px),16px)] pb-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBackToPos) {
                  onBackToPos();
                } else {
                  window.location.hash = '';
                  window.location.reload();
                }
              }}
              className="w-10 h-10 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              aria-label="Retour"
              title="Retour au POS"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-industrial-950">
                <Boxes size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight uppercase text-white flex items-center gap-2">
                  Réception Cartons
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    DÉPÔT
                  </span>
                </h1>
                <p className="text-[10px] text-industrial-400 font-medium">
                  {currentUserName ? `Agent : ${currentUserName}` : 'Mode Mobile Android'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAutoAddToCart}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer border ${
                autoAddToCart
                  ? "bg-amber-500 text-industrial-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-industrial-800 text-industrial-300 border-industrial-700"
              }`}
              title="Ajout automatique direct au panier dès que le carton est reconnu par sa photo"
            >
              <Zap size={13} className={autoAddToCart ? "fill-current" : ""} />
              <span>{autoAddToCart ? "⚡ Direct: ON" : "⚡ Direct: OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => { loadTemplates(); setIsTemplatesModalOpen(true); }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-industrial-800 hover:bg-industrial-700 text-industrial-300 border border-industrial-700 flex items-center gap-1 cursor-pointer transition-colors"
              title="Consulter les cartons mémorisés"
            >
              <BookOpen size={13} />
              <span>Mémoire ({savedTemplates.length})</span>
            </button>
          </div>
        </header>
      ) : (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <Boxes size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  Réception Cartons & Colisage Rapide
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                  Dépôt / Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prenez la photo du carton : Nexus le reconnaît automatiquement et le met directement au panier !
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleAutoAddToCart}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
                autoAddToCart
                  ? "bg-amber-500 text-industrial-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              }`}
              title="Ajout automatique direct au panier dès que le carton est reconnu par sa photo"
            >
              <Zap size={14} className={autoAddToCart ? "fill-current" : ""} />
              <span>{autoAddToCart ? "⚡ Ajout Direct Panier : ACTIF" : "⚡ Ajout Direct Panier : OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => { loadTemplates(); setIsTemplatesModalOpen(true); }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Consulter les cartons mémorisés"
            >
              <BookOpen size={14} />
              <span>Cartons Mémorisés ({savedTemplates.length})</span>
            </button>

            {onBackToPos && (
              <button
                type="button"
                onClick={onBackToPos}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all"
              >
                <ArrowLeft size={15} />
                <span>Retour aux articles</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sélecteur de Navigation : Inventaire Cartons vs Scanner Réception */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setViewMode('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'inventory'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes size={16} />
          <span>Gestion & Inventaire Cartons</span>
          {savedTemplates.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${viewMode === 'inventory' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
              {savedTemplates.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setViewMode('scanner')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'scanner'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera size={16} />
          <span>Scanner & Réception Rapide</span>
        </button>
      </div>

      {viewMode === 'inventory' ? (
        <CartonInventoryManager
          products={effectiveProducts}
          onAddToCartDirectly={onAddToCartDirectly}
          onSwitchToScanner={() => setViewMode('scanner')}
        />
      ) : (
        /* Contenu Principal (Grille 2 Colonnes sur PC, 1 Colonne sur Mobile) */
        <main className={`w-full ${
          isStandalone 
            ? "p-4 max-w-lg mx-auto space-y-4" 
            : "grid grid-cols-1 lg:grid-cols-12 gap-5"
        }`}>
        
        {/* COLONNE GAUCHE (Étape 1 & Étape 2) */}
        <div className={`${isStandalone ? "space-y-4" : "lg:col-span-6 space-y-4"}`}>
          
          {/* ─── ÉTAPE 1 : PHOTO DU CARTON PHYSIQUE ─── */}
          <section className="bg-slate-50 dark:bg-industrial-900/70 rounded-2xl border border-slate-200 dark:border-industrial-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-industrial-950 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-industrial-200">
                  Photo du Carton Physique
                </span>
              </div>
              {cartonPhoto && (
                <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Photo enregistrée
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="mobile-carton-camera-input"
            />

            {!cartonPhoto ? (
              <label
                htmlFor="mobile-carton-camera-input"
                className="w-full py-6 sm:py-8 px-4 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 active:scale-[0.99] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-inner">
                  {isCompressing ? (
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={26} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                    Prendre en photo le Carton
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-industrial-400 mt-0.5">
                    Photographiez l'emballage / colisage pour preuve visuelle d'arrivage
                  </p>
                </div>
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-industrial-700 bg-industrial-950 group">
                <img
                  src={cartonPhoto}
                  alt="Carton reçu"
                  className="w-full h-44 sm:h-52 object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-industrial-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                  <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
                    📦 Carton capturé
                  </span>
                  <label
                    htmlFor="mobile-carton-camera-input"
                    className="px-3 py-1.5 rounded-lg bg-industrial-900/90 hover:bg-industrial-800 text-white border border-industrial-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform"
                  >
                    <RotateCcw size={12} />
                    Reprendre
                  </label>
                </div>
              </div>
            )}

            {/* Indicateur d'Analyse / Scan Visuel */}
            {isRecognizing && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-xs font-black">🔍 Reconnaissance visuelle en cours...</p>
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Recherche de code-barres et d'empreinte dHash dans la mémoire des cartons</p>
                </div>
              </div>
            )}

            {/* Bannière de Carton Reconnu Automatiquement */}
            {recognitionResult && !autoAddToCart && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-teal-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/30">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        ✨ Carton Reconnu ({recognitionResult.confidence}%)
                      </span>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white mt-0.5">
                        {recognitionResult.product.name}
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                    {unitsPerCarton} pcs/carton
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    {recognitionResult.method === 'barcode' 
                      ? `Code-barres carton reconnu (${recognitionResult.detectedBarcode}). Colisage et prix pré-remplis !`
                      : `Empreinte visuelle reconnue dans votre mémoire de cartons. Tout est prêt !`}
                  </span>
                </div>

                {/* Boutons d'Action Directe en 1 Clic */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendToCart}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <ShoppingCart size={15} />
                    <span>Ajouter direct au Panier (+{totalUnits} pcs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectValidate}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <Zap size={15} />
                    <span>Réception Stock Immédiate (+{totalUnits})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Indication Nouveau Carton si photo prise mais non encore appris */}
            {cartonPhoto && !recognitionResult && !isRecognizing && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-2">
                <Sparkles size={16} className="shrink-0 text-indigo-500" />
                <span>
                  <strong>Nouveau carton détecté :</strong> Associez l'article ci-dessous. Dès validation, Nexus retiendra ce carton pour le reconnaître automatiquement la prochaine fois !
                </span>
              </div>
            )}
          </section>

          {/* ─── ÉTAPE 2 : LIER AU PRODUIT EXISTANT EN BASE + SCANNER ─── */}
          <section className="bg-slate-50 dark:bg-industrial-900/70 rounded-2xl border border-slate-200 dark:border-industrial-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-industrial-200">
                  Associer au Produit Existant
                </span>
              </div>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                >
                  Changer de produit
                </button>
              )}
            </div>

            {!selectedProduct ? (
              <div className="space-y-3">
                {/* Barre de Recherche + Bouton Scanner Code-barres */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-industrial-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher par nom (ex: Ifri), code-barres..."
                      className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-indigo-500 text-slate-900 dark:text-white text-xs sm:text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-industrial-500 shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-industrial-500 dark:hover:text-white"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Bouton Scanner Code-barres (Caméra Mobile / Webcam) */}
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer shrink-0 transition-transform"
                    title="Scanner le code-barres avec la caméra"
                  >
                    <ScanLine size={16} className="stroke-[2.5]" />
                    <span className="hidden sm:inline">Scanner</span>
                  </button>
                </div>

                {/* Indication Douchette / Articles disponibles */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-industrial-400 px-1">
                  <span>
                    {searchQuery.trim() ? "Résultats trouvés :" : "Articles récents en inventaire :"}
                  </span>
                  <span className="font-mono text-[10px]">
                    {effectiveProducts.length} articles en base
                  </span>
                </div>

                {/* Liste des résultats de recherche */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-industrial-800/80 rounded-xl border border-slate-200 dark:border-industrial-800 bg-white dark:bg-industrial-950 shadow-inner">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 sm:p-5 text-center space-y-3">
                      <p className="text-xs text-slate-500 dark:text-industrial-400">
                        Aucun produit trouvé pour <strong className="text-slate-800 dark:text-white">"{searchQuery}"</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickName(searchQuery);
                          setQuickBarcode('');
                          setIsQuickCreateOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer transition-all active:scale-95"
                      >
                        <PlusCircle size={14} />
                        <span>Créer l'article "{searchQuery}"</span>
                      </button>
                    </div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full p-2.5 sm:p-3 text-left hover:bg-slate-50 dark:hover:bg-industrial-800/50 flex items-center gap-3 transition-colors active:bg-indigo-50 dark:active:bg-indigo-950/30 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-industrial-900 border border-slate-200 dark:border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
                          {p.imageUrl ? (
                            <SafeImage src={p.imageUrl} className="w-full h-full object-cover" fallback={<Package size={18} className="text-slate-400 dark:text-industrial-600"/>}/>
                          ) : (
                            <Package size={18} className="text-slate-400 dark:text-industrial-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase truncate leading-tight">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-industrial-400 font-mono">
                            {p.barcode && <span className="flex items-center gap-0.5"><Barcode size={10} /> {p.barcode}</span>}
                            <span>Stock : <strong className="text-indigo-600 dark:text-indigo-400">{p.stock || 0}</strong></span>
                            {p.costPrice ? <span>P.U : {p.costPrice} DA</span> : null}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 dark:text-industrial-600 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Carte Produit Sélectionné */
              <div className="p-3.5 rounded-xl bg-white dark:bg-industrial-950 border border-emerald-500/40 flex items-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-industrial-900 border border-slate-200 dark:border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedProduct.imageUrl ? (
                    <SafeImage src={selectedProduct.imageUrl} className="w-full h-full object-cover" fallback={<Package size={20} className="text-slate-400 dark:text-industrial-600"/>}/>
                  ) : (
                    <Package size={20} className="text-slate-400 dark:text-industrial-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase truncate">
                      {selectedProduct.name}
                    </p>
                    <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      ✓ Lié
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-industrial-400 font-mono">
                    <span>Stock actuel : <strong className="text-emerald-600 dark:text-emerald-400">{selectedProduct.stock || 0}</strong> pcs</span>
                    {selectedProduct.sku && <span>REF : {selectedProduct.sku}</span>}
                    {selectedProduct.barcode && <span>EAN : {selectedProduct.barcode}</span>}
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>

        {/* COLONNE DROITE (Étape 3 : Colisage, Quantité, Prix & Validation) */}
        <div className={`${isStandalone ? "space-y-4" : "lg:col-span-6 space-y-4"}`}>
          {selectedProduct ? (
            <section className="bg-slate-50 dark:bg-industrial-900/70 rounded-2xl border border-slate-200 dark:border-industrial-800 p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-industrial-200">
                    Colisage, Quantité & Prix d'Achat
                  </span>
                </div>
              </div>

              {/* Colisage : Pièces par carton */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-industrial-300">
                    Quantité dans le carton (Colisage) :
                  </span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                    {unitsPerCarton} pièces / carton
                  </span>
                </div>
                
                {/* Presets rapides colisage */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[6, 12, 20, 24, 30, 48].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleUnitsPerCartonChange(qty)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        unitsPerCarton === qty
                          ? 'bg-amber-500 text-industrial-950 shadow-md shadow-amber-500/20'
                          : 'bg-white dark:bg-industrial-950 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 hover:border-amber-500/50'
                      }`}
                    >
                      {qty} pcs
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  value={unitsPerCarton}
                  onChange={(e) => handleUnitsPerCartonChange(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 py-2 px-3 rounded-lg bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-800 text-slate-900 dark:text-white font-mono text-xs focus:border-amber-500 outline-none"
                  placeholder="Autre colisage personnalisé..."
                />
              </div>

              {/* Stepper : Nombre de cartons reçus */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-industrial-300">
                    Nombre de cartons reçus :
                  </span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {cartonCount} carton(s)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCartonCount(prev => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-800 hover:bg-slate-100 dark:hover:bg-industrial-800 text-slate-900 dark:text-white flex items-center justify-center font-black active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={cartonCount}
                    onChange={(e) => setCartonCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-12 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-indigo-500 text-slate-900 dark:text-white text-center font-mono font-black text-lg outline-none shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setCartonCount(prev => prev + 1)}
                    className="w-12 h-12 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-800 hover:bg-slate-100 dark:hover:bg-industrial-800 text-slate-900 dark:text-white flex items-center justify-center font-black active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Presets rapides cartons */}
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 5, 10, 20].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCartonCount(c)}
                      className="flex-1 py-1 rounded bg-white dark:bg-industrial-950 border border-slate-200 dark:border-industrial-800 text-[11px] font-mono text-slate-600 dark:text-industrial-400 hover:text-indigo-600 dark:hover:text-white cursor-pointer"
                    >
                      {c} ct
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix d'Achat : Carton & Pièce */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-industrial-800/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-industrial-400 uppercase block mb-1">
                    Prix d'Achat Carton (DA)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={cartonCostPrice || ''}
                    onChange={(e) => handleCartonCostChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full py-2 px-3 rounded-lg bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-emerald-500 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-industrial-400 uppercase block mb-1">
                    Prix Unitaire Pièce (DA)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={unitCostPrice || ''}
                    onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full py-2 px-3 rounded-lg bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-emerald-500 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* Synthèse Visuelle Récapitulative */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-100 dark:via-industrial-900 to-indigo-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-industrial-300 font-bold">Total Réceptionné :</span>
                  <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-300 font-mono">
                    {cartonCount} cartons × {unitsPerCarton} = {totalUnits} unités
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-industrial-400">Montant Total Achat :</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {totalCostAmount.toLocaleString('fr-DZ')} DA
                  </span>
                </div>
              </div>

              {/* ─── ÉTAPE 4 : ACTIONS ─── */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSendToCart}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ShoppingCart size={16} />
                  <span>Envoyer au Panier d'Approvisionnement</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDirectValidate}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>Valider la Réception Immédiate (+{totalUnits} en stock)</span>
                </button>
              </div>
            </section>
          ) : (
            <div className="bg-slate-50 dark:bg-industrial-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-industrial-800 p-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-industrial-800 text-slate-400 dark:text-industrial-500 flex items-center justify-center">
                <Boxes size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-industrial-300">
                  En attente de sélection d'article
                </h3>
                <p className="text-xs text-slate-500 dark:text-industrial-400 max-w-sm mt-1">
                  Recherchez un produit ou scannez son code-barres à gauche pour configurer le colisage et valider la réception en stock.
                </p>
              </div>
            </div>
          )}

          {/* Historique des derniers cartons enregistrés */}
          {recentIntakes.length > 0 && (
            <section className="bg-slate-50 dark:bg-industrial-900/50 rounded-2xl border border-slate-200 dark:border-industrial-800/80 p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 dark:text-industrial-400 uppercase tracking-wider">
                Derniers Cartons Traités
              </h3>
              <div className="space-y-2">
                {recentIntakes.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-industrial-950 border border-slate-200 dark:border-industrial-800/80 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.cartonPhotoUrl ? (
                        <img src={item.cartonPhotoUrl} alt="Carton" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-industrial-900 flex items-center justify-center text-slate-400 dark:text-industrial-500">
                          <Package size={14} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate text-xs">{item.productName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">
                          {item.cartonCount} cartons × {item.unitsPerCarton} = {item.totalUnits} pcs
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      {item.totalCostAmount} DA
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

      </main>
      )}
    </div>
  );
}
