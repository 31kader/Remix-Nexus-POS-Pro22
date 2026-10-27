import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Boxes, Package, Search, Plus, Edit2, Trash2, Barcode, 
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, ShoppingCart, 
  Camera, ScanLine, Filter, ArrowUpDown, X, Eye, RefreshCw, 
  Layers, Sparkles, Tag, ArrowRight, ShieldCheck, ChevronRight,
  History, FileText, Info
} from 'lucide-react';
import { Product } from '../../types';
import { 
  CartonTemplate, 
  getCartonTemplates, 
  saveCartonTemplate, 
  deleteCartonTemplate, 
  quickAdjustCartonStock,
  compressCartonImage,
  detectBarcodeFromImage
} from '../../services/cartonIntakeService';
import { useCoreStore } from '../../store/useCoreStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { ProductHistoryModal } from './ProductHistoryModal';
import { ProductFormModal } from '../ProductFormModal';
import { BarcodeScanner } from '../BarcodeScanner';
import { SafeImage } from '../ui';
import { toast } from 'sonner';
import { uploadImageBlobToStorage } from '../../supabase';

interface CartonInventoryManagerProps {
  products?: Product[];
  onAddToCartDirectly?: (item: any) => void;
  onSwitchToScanner?: () => void;
}

export const CartonInventoryManager: React.FC<CartonInventoryManagerProps> = ({
  products: initialProducts = [],
  onAddToCartDirectly,
  onSwitchToScanner
}) => {
  const storeProducts = useCoreStore(s => s.products);
  const products = useMemo(() => {
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    return storeProducts || [];
  }, [initialProducts, storeProducts]);

  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const currentUserName = (profile as any)?.fullName || (profile as any)?.full_name || (profile as any)?.name || user?.email?.split('@')[0] || 'Admin';

  const transactions = useTransactionStore(s => s.transactions) || [];
  const purchases = useFinanceStore(s => s.purchases) || [];
  const settings = useCoreStore(s => s.settings) || ({} as any);
  const categories = useCoreStore(s => s.categories) || [];
  const brands = useCoreStore(s => s.brands) || [];

  // Modal Historique Ventes & Achats
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Modal Fiche Complète Produit
  const [editingProductSheet, setEditingProductSheet] = useState<Product | null>(null);
  const [isProductSheetModalOpen, setIsProductSheetModalOpen] = useState<boolean>(false);

  const [templates, setTemplates] = useState<CartonTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'carton_stock' | 'updated'>('updated');

  // Modal Création / Édition de carton
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<CartonTemplate | null>(null);

  // Modal Ajustement Rapide de Stock Carton
  const [adjustingTemplate, setAdjustingTemplate] = useState<CartonTemplate | null>(null);
  const [cartonDeltaInput, setCartonDeltaInput] = useState<number>(1);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  // Modal Zoom Image
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Scanner de code-barres pour le formulaire
  const [isFormScannerOpen, setIsFormScannerOpen] = useState<boolean>(false);

  // Champs du formulaire
  const [formProductId, setFormProductId] = useState<string>('');
  const [formProductSearch, setFormProductSearch] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formSku, setFormSku] = useState<string>('');
  const [formUnitsPerCarton, setFormUnitsPerCarton] = useState<number>(12);
  const [formCartonCostPrice, setFormCartonCostPrice] = useState<number>(0);
  const [formRetailPrice, setFormRetailPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');
  const [isFormSaving, setIsFormSaving] = useState<boolean>(false);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);

  // Charger les modèles de carton
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getCartonTemplates();
      setTemplates(list);
    } catch (err) {
      console.error('Erreur chargement carton templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Produit lié sélectionné dans le formulaire
  const formSelectedProduct = useMemo(() => {
    if (!formProductId) return null;
    return products.find(p => p.id === formProductId) || null;
  }, [formProductId, products]);

  // Produits filtrés pour l'autocomplétion du formulaire
  const filteredProductOptions = useMemo(() => {
    if (!formProductSearch.trim()) return products.slice(0, 15);
    const q = formProductSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [products, formProductSearch]);

  // Ouvrir le formulaire en mode création
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormProductId('');
    setFormProductSearch('');
    setFormBarcode('');
    setFormSku('');
    setFormUnitsPerCarton(12);
    setFormCartonCostPrice(0);
    setFormRetailPrice(0);
    setFormWholesalePrice(0);
    setFormPhotoUrl('');
    setIsEditModalOpen(true);
  };

  // Ouvrir le formulaire en mode édition
  const handleOpenEdit = (tmpl: CartonTemplate) => {
    setEditingTemplate(tmpl);
    setFormProductId(tmpl.productId);
    setFormProductSearch(tmpl.productName);
    setFormBarcode(tmpl.barcode || '');
    setFormSku(tmpl.sku || '');
    setFormUnitsPerCarton(tmpl.unitsPerCarton || 12);
    setFormCartonCostPrice(tmpl.cartonCostPrice || 0);
    setFormRetailPrice(tmpl.retailPrice || 0);
    setFormWholesalePrice(tmpl.wholesalePrice || 0);
    setFormPhotoUrl(tmpl.cartonPhotoUrl || '');
    setIsEditModalOpen(true);
  };

  // Quand un produit est sélectionné dans le formulaire, pré-remplir intelligemment les prix
  const handleSelectProductInForm = (p: Product) => {
    setFormProductId(p.id);
    setFormProductSearch(p.name);
    const colisage = Number(p.unitsPerParent) || formUnitsPerCarton || 12;
    setFormUnitsPerCarton(colisage);

    const unitCost = Number(p.costPrice) || Number(p.cost_price) || 0;
    const unitPrice = Number(p.price) || 0;
    const unitWholesale = Number(p.wholesalePrice) || Number(p.wholesale_price) || (unitPrice * 0.9);

    if (formCartonCostPrice === 0 && unitCost > 0) {
      setFormCartonCostPrice(Number((unitCost * colisage).toFixed(2)));
    }
    if (formRetailPrice === 0 && unitPrice > 0) {
      setFormRetailPrice(Number((unitPrice * colisage).toFixed(2)));
    }
    if (formWholesalePrice === 0 && unitWholesale > 0) {
      setFormWholesalePrice(Number((unitWholesale * colisage).toFixed(2)));
    }
    if (!formPhotoUrl && (p as any).cartonPhotoUrl) {
      setFormPhotoUrl((p as any).cartonPhotoUrl);
    }
    if (!formSku) {
      setFormSku(`CART-${p.sku || p.barcode || p.id.slice(0, 6)}`);
    }
  };

  // Traiter la photo du carton dans le formulaire
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("Compression et téléversement de l'image...", { id: 'photo-proc' });
      const compressed = await compressCartonImage(file, 1024, 0.85);

      // Tenter de lire un code-barres s'il est visible sur la photo et si formBarcode est vide
      if (!formBarcode) {
        const detected = await detectBarcodeFromImage(compressed);
        if (detected) {
          setFormBarcode(detected);
          toast.success(`Code-barres détecté : ${detected}`);
        }
      }

      // Téléversement dans le bucket dédié 'cartons' de Supabase Storage
      let targetUrl = compressed;
      try {
        const blob = await (await fetch(compressed)).blob();
        const uploadedUrl = await uploadImageBlobToStorage(blob, 'cartons', 'image/webp');
        if (uploadedUrl) {
          targetUrl = uploadedUrl;
        }
      } catch (uploadErr) {
        console.warn('[CartonStorage] Upload échoué, utilisation du fallback local Base64:', uploadErr);
      }

      setFormPhotoUrl(targetUrl);
      toast.dismiss('photo-proc');
    } catch (err) {
      toast.error("Erreur lors du traitement de l'image", { id: 'photo-proc' });
    }
  };

  // Enregistrer le carton
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) {
      toast.error("Veuillez sélectionner le produit unitaire lié");
      return;
    }

    const linkedProd = products.find(p => p.id === formProductId);
    const prodName = linkedProd?.name || editingTemplate?.productName || 'Produit';

    setIsFormSaving(true);
    try {
      const saved = await saveCartonTemplate({
        id: editingTemplate?.id,
        productId: formProductId,
        productName: prodName,
        unitsPerCarton: Number(formUnitsPerCarton) || 12,
        cartonCostPrice: Number(formCartonCostPrice) || 0,
        unitCostPrice: Number((Number(formCartonCostPrice) / (Number(formUnitsPerCarton) || 12)).toFixed(2)),
        retailPrice: Number(formRetailPrice) || 0,
        wholesalePrice: Number(formWholesalePrice) || 0,
        sku: formSku.trim() || undefined,
        cartonPhotoUrl: formPhotoUrl,
        barcode: formBarcode.trim() || undefined,
        productBarcode: linkedProd?.barcode
      });

      toast.success(editingTemplate ? "Modèle de carton mis à jour !" : "Nouveau carton enregistré avec succès !");
      setIsEditModalOpen(false);
      await loadTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement du carton");
    } finally {
      setIsFormSaving(false);
    }
  };

  // Supprimer un carton
  const handleDeleteTemplate = async (tmpl: CartonTemplate) => {
    if (!window.confirm(`Supprimer le modèle de carton pour "${tmpl.productName}" ? Le produit unitaire restera dans l'inventaire.`)) {
      return;
    }
    try {
      await deleteCartonTemplate(tmpl.id);
      toast.success("Modèle de carton supprimé.");
      await loadTemplates();
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  // Exécuter l'ajustement rapide de stock
  const handleQuickAdjust = async () => {
    if (!adjustingTemplate || cartonDeltaInput === 0) return;
    const linkedProd = products.find(p => p.id === adjustingTemplate.productId);
    if (!linkedProd) {
      toast.error("Produit lié introuvable.");
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await quickAdjustCartonStock(
        adjustingTemplate,
        cartonDeltaInput,
        linkedProd,
        user?.uid,
        currentUserName
      );
      toast.success(`Stock mis à jour : ${res.newCartonStock} cartons disponibles (${res.newUnitsStock} pièces)`);
      setAdjustingTemplate(null);
      setCartonDeltaInput(1);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ajustement du stock.");
    } finally {
      setIsAdjusting(false);
    }
  };

  // Liste enrichie avec stock calculé en temps réel
  const enrichedCartons = useMemo(() => {
    return templates.map(t => {
      const linkedProd = products.find(p => p.id === t.productId);
      const units = Number(linkedProd?.stock) || 0;
      const colisage = Number(t.unitsPerCarton) || Number(linkedProd?.unitsPerParent) || 12;
      const cartonsInStock = Math.floor(units / colisage);
      const remainingUnits = units % colisage;

      const cost = Number(t.cartonCostPrice) || 0;
      const retail = Number(t.retailPrice) || 0;
      const wholesale = Number(t.wholesalePrice) || 0;

      // Calcul des marges
      const retailMarginPct = cost > 0 && retail > cost ? Math.round(((retail - cost) / retail) * 100) : 0;
      const wholesaleMarginPct = cost > 0 && wholesale > cost ? Math.round(((wholesale - cost) / wholesale) * 100) : 0;

      return {
        ...t,
        product: linkedProd,
        unitsStock: units,
        cartonsStock: cartonsInStock,
        remainingUnits,
        retailMarginPct,
        wholesaleMarginPct,
        totalCostValue: cartonsInStock * cost,
        totalRetailValue: cartonsInStock * retail
      };
    });
  }, [templates, products]);

  // Filtrage et Tri
  const filteredCartons = useMemo(() => {
    let list = [...enrichedCartons];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.productName.toLowerCase().includes(q) ||
        (c.barcode && c.barcode.toLowerCase().includes(q)) ||
        (c.productBarcode && c.productBarcode.toLowerCase().includes(q)) ||
        (c.sku && c.sku.toLowerCase().includes(q))
      );
    }

    if (stockFilter === 'in_stock') {
      list = list.filter(c => c.cartonsStock > 0);
    } else if (stockFilter === 'low_stock') {
      list = list.filter(c => c.cartonsStock > 0 && c.cartonsStock <= 2);
    } else if (stockFilter === 'out_of_stock') {
      list = list.filter(c => c.cartonsStock === 0);
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.productName.localeCompare(b.productName);
      if (sortBy === 'carton_stock') return b.cartonsStock - a.cartonsStock;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [enrichedCartons, searchQuery, stockFilter, sortBy]);

  // KPIs
  const totalCartonModels = templates.length;
  const totalCartonsInStock = enrichedCartons.reduce((acc, c) => acc + c.cartonsStock, 0);
  const totalStockCostValue = enrichedCartons.reduce((acc, c) => acc + c.totalCostValue, 0);
  const totalStockRetailValue = enrichedCartons.reduce((acc, c) => acc + c.totalRetailValue, 0);
  const outOfStockCount = enrichedCartons.filter(c => c.cartonsStock === 0).length;

  return (
    <div className="space-y-4">
      {/* Barre supérieure KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Modèles Cartons</span>
            <Boxes size={16} className="text-amber-400" />
          </div>
          <div className="text-xl font-black text-white">{totalCartonModels}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Cartons mémorisés & liés</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Stock Total Cartons</span>
            <Package size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{totalCartonsInStock} <span className="text-xs font-bold text-slate-400">cartons</span></div>
          <p className="text-[10px] text-slate-500 mt-0.5">Calculé depuis l'inventaire pièces</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Valeur Stock (Achat)</span>
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div className="text-xl font-black text-white">{totalStockCostValue.toLocaleString()} <span className="text-xs font-bold text-slate-400">DA</span></div>
          <p className="text-[10px] text-slate-500 mt-0.5">Détail : ~{totalStockRetailValue.toLocaleString()} DA</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Ruptures Cartons</span>
            <AlertTriangle size={16} className={outOfStockCount > 0 ? "text-rose-400" : "text-slate-500"} />
          </div>
          <div className={`text-xl font-black ${outOfStockCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
            {outOfStockCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">&lt; 1 carton plein en réserve</p>
        </div>
      </div>

      {/* Barre d'outils : Recherche, Filtres & Boutons d'action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par produit, code-barres carton, SKU..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Filtres de Stock */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold shrink-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${stockFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${stockFilter === 'in_stock' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              En stock
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${stockFilter === 'out_of_stock' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Rupture
            </button>
          </div>

          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 shrink-0"
          >
            <option value="updated">Récents</option>
            <option value="carton_stock">Stock Cartons</option>
            <option value="name">Nom Produit</option>
          </select>

          {/* Switch vers Scanner Réception */}
          {onSwitchToScanner && (
            <button
              type="button"
              onClick={onSwitchToScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold shrink-0 transition-colors cursor-pointer"
              title="Passer au scanner photo de réception"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Scanner Réception</span>
            </button>
          )}

          {/* Bouton Nouveau Carton */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 shrink-0 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Nouveau Carton</span>
          </button>
        </div>
      </div>

      {/* Grille / Liste des Cartons */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs">
          <RefreshCw size={20} className="animate-spin mr-2 text-amber-400" />
          Chargement de l'inventaire des cartons...
        </div>
      ) : filteredCartons.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Boxes size={28} />
          </div>
          <h3 className="font-bold text-sm text-white">Aucun carton trouvé</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? "Aucun modèle de carton ne correspond à votre recherche." 
              : "Vous n'avez pas encore configuré de modèle de carton. Cliquez sur '+ Nouveau Carton' ou prenez un carton en photo dans le scanner de réception pour le lier."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
          >
            <Plus size={16} />
            Créer un modèle de carton
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCartons.map(carton => (
            <div 
              key={carton.id} 
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all group"
            >
              {/* Entête Carte : Photo + Identifiants */}
              <div className="flex items-start gap-3">
                {/* Photo du Carton / SKU Visuel */}
                <div className="relative shrink-0">
                  {carton.cartonPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setZoomedImage({ url: carton.cartonPhotoUrl, title: carton.productName })}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 relative group/img cursor-zoom-in"
                    >
                      <img
                        src={carton.cartonPhotoUrl}
                        alt={carton.productName}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Eye size={16} />
                      </div>
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                      <Boxes size={24} />
                    </div>
                  )}
                  {carton.dHash && (
                    <span 
                      className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-amber-500/90 text-slate-950 text-[9px] font-black tracking-tight"
                      title="Empreinte visuelle IA active"
                    >
                      IA
                    </span>
                  )}
                </div>

                {/* Nom Produit & Codes */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-400 transition-colors" title={carton.productName}>
                      {carton.productName}
                    </h4>
                    {/* Badge Stock Cartons */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                      carton.cartonsStock > 2 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : carton.cartonsStock > 0 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {carton.cartonsStock} CT
                    </span>
                  </div>

                  {/* SKU & Code-barres Carton */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {carton.barcode ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        <Barcode size={11} className="text-amber-400" />
                        {carton.barcode}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 italic">
                        Sans code-barres
                      </span>
                    )}
                    {carton.sku && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                        {carton.sku}
                      </span>
                    )}
                  </div>

                  {/* Colisage & Stock en vrac */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="font-bold text-indigo-400">
                      {carton.unitsPerCarton} pcs/carton
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>
                      Total : <strong className="text-slate-200">{carton.unitsStock} pcs</strong>
                      {carton.remainingUnits > 0 && ` (+${carton.remainingUnits} vrac)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grille des Prix Carton (Achat, Détail, Gros) */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Achat Carton</div>
                  <div className="text-xs font-black text-slate-300">
                    {carton.cartonCostPrice > 0 ? `${carton.cartonCostPrice.toLocaleString()} DA` : '—'}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {carton.unitCostPrice > 0 ? `${carton.unitCostPrice} DA/pc` : ''}
                  </div>
                </div>

                <div className="space-y-0.5 border-x border-slate-800/80">
                  <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">Prix Détail</div>
                  <div className="text-xs font-black text-amber-400">
                    {carton.retailPrice && carton.retailPrice > 0 ? `${carton.retailPrice.toLocaleString()} DA` : '—'}
                  </div>
                  {carton.retailMarginPct > 0 && (
                    <div className="text-[9px] text-emerald-400 font-semibold">
                      +{carton.retailMarginPct}% mg
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold">Prix Gros</div>
                  <div className="text-xs font-black text-indigo-400">
                    {carton.wholesalePrice && carton.wholesalePrice > 0 ? `${carton.wholesalePrice.toLocaleString()} DA` : '—'}
                  </div>
                  {carton.wholesaleMarginPct > 0 && (
                    <div className="text-[9px] text-indigo-400/80 font-semibold">
                      +{carton.wholesaleMarginPct}% mg
                    </div>
                  )}
                </div>
              </div>

              {/* Informations Détaillées de la Fiche Produit Associée */}
              {carton.product && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-300">
                  {carton.product.supplier && (
                    <span className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500 font-bold">Fournisseur:</span>
                      <strong className="text-slate-200">{carton.product.supplier}</strong>
                    </span>
                  )}
                  {carton.product.categoryId && (
                    <span className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500 font-bold">Rayon:</span>
                      <span>{categories.find(c => c.id === carton.product?.categoryId)?.name || carton.product.categoryId}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                    <span className="text-slate-500 font-bold">Vente Pièce:</span>
                    <strong className="text-amber-400">{carton.product.price} DA</strong>
                  </span>
                  {carton.product.barcode && (
                    <span className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                      <span className="text-slate-500 font-bold">CB Pièce:</span>
                      <span>{carton.product.barcode}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Actions Rapides au bas de la carte */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex flex-wrap items-center gap-1">
                  {/* Bouton Historique Ventes & Achats */}
                  <button
                    type="button"
                    onClick={() => {
                      if (carton.product) {
                        setHistoryProduct(carton.product);
                        setIsHistoryModalOpen(true);
                      } else {
                        toast.error("Aucun article unitaire associé trouvé pour afficher l'historique.");
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold transition-colors cursor-pointer"
                    title="Historique des ventes & achats de cet article"
                  >
                    <History size={13} />
                    <span>Historique</span>
                  </button>

                  {/* Bouton Fiche Produit Complète */}
                  <button
                    type="button"
                    onClick={() => {
                      if (carton.product) {
                        setEditingProductSheet(carton.product);
                        setIsProductSheetModalOpen(true);
                      } else {
                        toast.error("Aucun article unitaire associé trouvé pour afficher la fiche.");
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-colors cursor-pointer"
                    title="Ouvrir la fiche complète de l'article"
                  >
                    <FileText size={13} />
                    <span className="hidden sm:inline">Fiche Article</span>
                  </button>

                  {/* Bouton Ajustement Rapide */}
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustingTemplate(carton);
                      setCartonDeltaInput(1);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition-colors cursor-pointer"
                    title="Ajuster le stock en cartons (+/- cartons)"
                  >
                    <Layers size={13} className="text-amber-400" />
                    <span>Ajuster</span>
                  </button>

                  {/* Bouton Vente / Ajout Panier Direct */}
                  {onAddToCartDirectly && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCartDirectly({
                          productId: carton.productId,
                          productName: `${carton.productName} (Carton ${carton.unitsPerCarton}pcs)`,
                          quantity: carton.unitsPerCarton,
                          price: carton.retailPrice ? carton.retailPrice / carton.unitsPerCarton : carton.product?.price,
                          costPrice: carton.unitCostPrice,
                          cartonCount: 1,
                          unitsPerCarton: carton.unitsPerCarton,
                          cartonCostPrice: carton.cartonCostPrice,
                          cartonPhotoUrl: carton.cartonPhotoUrl,
                          imageUrl: carton.product?.imageUrl
                        });
                        toast.success(`1 Carton de ${carton.productName} ajouté au panier !`);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
                      title="Ajouter 1 carton au panier POS"
                    >
                      <ShoppingCart size={13} />
                      <span className="hidden sm:inline">Vendre</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Bouton Modifier */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(carton)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Modifier la fiche carton"
                  >
                    <Edit2 size={15} />
                  </button>

                  {/* Bouton Supprimer */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(carton)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Supprimer ce carton"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulaire Carton (Création & Édition) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Entête Modal */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Boxes size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {editingTemplate ? "Modifier la Fiche Carton" : "Nouveau Modèle de Carton"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configuration des prix détail, gros, achat et code-barres
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corps du Formulaire */}
            <form onSubmit={handleSaveForm} className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
              {/* Photo du Carton & SKU Visuel */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="block text-xs font-bold text-slate-300">
                  Photo du Carton / Emballage (Identité Visuelle IA)
                </label>
                <div className="flex items-center gap-3">
                  {formPhotoUrl ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                      <img src={formPhotoUrl} alt="Carton" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormPhotoUrl('')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-rose-400 hover:text-rose-300"
                        title="Supprimer la photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-900 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 shrink-0">
                      <Camera size={22} />
                      <span className="text-[9px] mt-1">Photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={formFileInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => formFileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera size={15} />
                      <span>{formPhotoUrl ? "Changer la photo" : "Prendre / Choisir Photo"}</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      La photo sert d'empreinte visuelle pour reconnaître automatiquement le carton à la caméra.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sélection du Produit Unitaire Lié */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Produit Unitaire Lié dans l'Inventaire <span className="text-amber-400">*</span>
                </label>
                
                {formSelectedProduct ? (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {formSelectedProduct.imageUrl ? (
                        <img src={formSelectedProduct.imageUrl} alt={formSelectedProduct.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Package size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">{formSelectedProduct.name}</h4>
                        <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2">
                          <span>Stock unitaire : <strong className="text-emerald-400">{formSelectedProduct.stock || 0} pcs</strong></span>
                          <span>•</span>
                          <span>Prix détail : <strong className="text-amber-400">{formSelectedProduct.price} DA</strong></span>
                          {formSelectedProduct.supplier && (
                            <>
                              <span>•</span>
                              <span>Fournisseur : <strong className="text-slate-300">{formSelectedProduct.supplier}</strong></span>
                            </>
                          )}
                          {formSelectedProduct.barcode && (
                            <>
                              <span>•</span>
                              <span className="font-mono">CB : {formSelectedProduct.barcode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductSheet(formSelectedProduct);
                          setIsProductSheetModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Ouvrir la fiche complète du produit"
                      >
                        <FileText size={12} />
                        <span>Fiche Produit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormProductId('');
                          setFormProductSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-bold cursor-pointer"
                      >
                        Changer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formProductSearch}
                        onChange={(e) => setFormProductSearch(e.target.value)}
                        placeholder="Chercher un article par nom, référence ou code-barres..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-slate-950 border border-slate-800 p-1">
                      {filteredProductOptions.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProductInForm(p)}
                          className="w-full p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {p.barcode ? `CB: ${p.barcode}` : 'Sans CB'} • Stock: {p.stock || 0} pcs
                            </div>
                          </div>
                          <span className="text-xs font-black text-amber-400 shrink-0">{p.price} DA</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code-barres Carton & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Code-barres Carton
                    </label>
                    <span className="text-[10px] text-slate-500">Facultatif</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="Ex: 3760123456789"
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsFormScannerOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1"
                      title="Scanner le code-barres carton"
                    >
                      <ScanLine size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    SKU du Carton
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Ex: CART-COCA-33"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Colisage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Colisage (Nombre de pièces par carton) <span className="text-amber-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={formUnitsPerCarton}
                    onChange={(e) => setFormUnitsPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1">
                    {[6, 12, 24, 48].map(qty => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setFormUnitsPerCarton(qty)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          formUnitsPerCarton === qty 
                            ? 'bg-amber-500 text-slate-950 border-amber-500' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Les 3 Prix : Achat, Détail, Gros */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={14} />
                  Tarification Complète du Carton
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Prix d'Achat Carton */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Prix d'Achat Carton
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formCartonCostPrice || ''}
                        onChange={(e) => setFormCartonCostPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">DA</span>
                    </div>
                    {formCartonCostPrice > 0 && formUnitsPerCarton > 0 && (
                      <p className="text-[10px] text-slate-500">
                        = {(formCartonCostPrice / formUnitsPerCarton).toFixed(1)} DA / pc
                      </p>
                    )}
                  </div>

                  {/* Prix Détail Carton */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-300">
                        Prix Détail Carton
                      </label>
                      {formSelectedProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = formSelectedProduct.price || 0;
                            setFormRetailPrice(Number((p * formUnitsPerCarton).toFixed(2)));
                          }}
                          className="text-[9px] text-amber-400 hover:underline cursor-pointer"
                        >
                          x{formUnitsPerCarton}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formRetailPrice || ''}
                        onChange={(e) => setFormRetailPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 font-bold">DA</span>
                    </div>
                    {formRetailPrice > formCartonCostPrice && formCartonCostPrice > 0 && (
                      <p className="text-[10px] text-emerald-400 font-semibold">
                        Marge : +{Math.round(((formRetailPrice - formCartonCostPrice) / formRetailPrice) * 100)}%
                      </p>
                    )}
                  </div>

                  {/* Prix Gros Carton */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-indigo-300">
                        Prix Gros Carton
                      </label>
                      {formSelectedProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            const wp = formSelectedProduct.wholesalePrice || formSelectedProduct.wholesale_price || (formSelectedProduct.price * 0.9);
                            setFormWholesalePrice(Number((wp * formUnitsPerCarton).toFixed(2)));
                          }}
                          className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                        >
                          x{formUnitsPerCarton}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formWholesalePrice || ''}
                        onChange={(e) => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 font-bold">DA</span>
                    </div>
                    {formWholesalePrice > formCartonCostPrice && formCartonCostPrice > 0 && (
                      <p className="text-[10px] text-indigo-400 font-semibold">
                        Marge : +{Math.round(((formWholesalePrice - formCartonCostPrice) / formWholesalePrice) * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton de soumission */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isFormSaving || !formProductId}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isFormSaving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingTemplate ? "Mettre à jour le carton" : "Enregistrer le carton"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Scanner de Code-barres pour le Formulaire */}
      {isFormScannerOpen && (
        <BarcodeScanner
          onScan={(code) => {
            setFormBarcode(code);
            setIsFormScannerOpen(false);
            toast.success(`Code-barres carton scanné : ${code}`);
          }}
          onClose={() => setIsFormScannerOpen(false)}
        />
      )}

      {/* Modal Ajustement Rapide de Stock Carton */}
      {adjustingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Ajuster Stock Carton</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{adjustingTemplate.productName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingTemplate(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-center p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Colisage</span>
                <div className="text-base font-black text-amber-400">
                  {adjustingTemplate.unitsPerCarton} pièces par carton
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nombre de cartons à ajouter (+) ou retirer (-) :
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCartonDeltaInput(prev => prev - 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={cartonDeltaInput}
                    onChange={(e) => setCartonDeltaInput(parseInt(e.target.value) || 0)}
                    className="flex-1 py-2 text-center rounded-xl bg-slate-950 border border-slate-800 text-lg font-black text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCartonDeltaInput(prev => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <div className="flex justify-between">
                  <span>Impact sur le stock produit :</span>
                  <strong className={cartonDeltaInput >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {cartonDeltaInput >= 0 ? `+${cartonDeltaInput * adjustingTemplate.unitsPerCarton}` : `${cartonDeltaInput * adjustingTemplate.unitsPerCarton}`} pièces
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustingTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isAdjusting || cartonDeltaInput === 0}
                onClick={handleQuickAdjust}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isAdjusting && <RefreshCw size={14} className="animate-spin" />}
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom Image */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-xl max-h-[85vh] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
            <img src={zoomedImage.url} alt={zoomedImage.title} className="w-full h-full object-contain max-h-[80vh]" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white">
              <h4 className="font-bold text-sm">{zoomedImage.title}</h4>
              <p className="text-[11px] text-slate-300">Photo / Empreinte Visuelle Carton</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique des Ventes & Achats du Carton / Produit */}
      {isHistoryModalOpen && historyProduct && (
        <ProductHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryProduct(null);
          }}
          viewingHistoryProduct={historyProduct}
          setViewingHistoryProduct={setHistoryProduct}
          transactions={transactions}
          purchases={purchases}
          settings={settings}
          setViewingPurchaseVoucher={() => {}}
        />
      )}

      {/* Modal Fiche Complète du Produit Associé */}
      {isProductSheetModalOpen && editingProductSheet && (
        <ProductFormModal
          isOpen={isProductSheetModalOpen}
          onClose={() => {
            setIsProductSheetModalOpen(false);
            setEditingProductSheet(null);
          }}
          editingProduct={editingProductSheet}
          products={products}
          categories={categories}
          settings={settings}
          user={user}
          brands={brands}
        />
      )}
    </div>
  );
};
