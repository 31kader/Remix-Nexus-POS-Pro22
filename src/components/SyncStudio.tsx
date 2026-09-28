import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Cloud, CloudOff, Database, AlertTriangle, CheckCircle2, 
  Trash2, Download, Search, FileText, Package, ShoppingCart, Users, 
  ShieldAlert, Copy, Code, ChevronDown, ChevronUp, Zap, ArrowRight, Activity, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadPendingSyncQueue, processSyncQueue, clearSyncQueue, onBackgroundSyncStatus, SyncPayload, getFailedSyncQueue, clearFailedSyncQueue, retryFailedSyncItem, retryAllFailedSyncItems } from '../services/SyncService';
import { createBackupArchive } from '../services/backupRestoreService';
import { initAndSyncSupabase, supabase } from '../services/SupabaseSync';
import { isSupabaseConfigured } from '../supabase';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { toast } from 'sonner';
import { cn, formatSafe, sanitizeProductForSupabase } from '../lib/utils';
import { fetchProductsFromSupabase } from '../hooks/data-fetching/supabaseFetchHelper';
import { preparePayload } from '../lib/db-converters';
import { set as idbSet, del as idbDel, get as idbGet } from 'idb-keyval';

interface SyncStudioProps {
  setActiveTab?: (tab: string) => void;
}

export const SyncStudio: React.FC<SyncStudioProps> = ({ setActiveTab }) => {
  const [queue, setQueue] = useState<SyncPayload[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'transactions' | 'products' | 'customers' | 'adjustments'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'ok' | 'unauthorized' | 'error'>('checking');
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('');

  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const transactions = useTransactionStore(s => s.transactions);
  const customers = usePeopleStore(s => s.customers);

  const [failedQueue, setFailedQueue] = useState<any[]>([]);

  const refreshFailedQueue = async () => {
    try {
      const items = await getFailedSyncQueue();
      setFailedQueue(items || []);
    } catch (_) {}
  };

  const refreshQueue = () => {
    try {
      const items = loadPendingSyncQueue();
      setQueue(items || []);
      refreshFailedQueue();
    } catch (err) {
      console.error('[SyncStudio] Erreur de chargement de la file:', err);
    }
  };

  // Test de l'authentification Supabase
  const checkSupabaseAuth = async () => {
    setAuthStatus('checking');
    setAuthErrorMessage('');
    if (!supabase) {
      setAuthStatus('error');
      setAuthErrorMessage("Client Supabase non initialisé ou clés VITE_SUPABASE_URL manquantes");
      return;
    }
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401') || error.status === 401) {
          setAuthStatus('unauthorized');
          setAuthErrorMessage("Erreur 401 : Jeton Supabase expiré ou non autorisé. Veuillez rafraîchir la connexion.");
        } else if (error.status === 400 || error.code === '42P01') {
          setAuthStatus('error');
          setAuthErrorMessage(`Erreur 400 : Table manquante ou schéma invalide (${error.message})`);
        } else {
          setAuthStatus('error');
          setAuthErrorMessage(`Erreur Supabase : ${error.message}`);
        }
      } else {
        setAuthStatus('ok');
      }
    } catch (err: any) {
      setAuthStatus('error');
      setAuthErrorMessage(err?.message || "Erreur de connexion serveur");
    }
  };

  useEffect(() => {
    refreshQueue();
    checkSupabaseAuth();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onBackgroundSyncStatus(({ isSyncing: syncing, pendingCount }) => {
      setIsSyncing(syncing);
      refreshQueue();
      if (!syncing) {
        setLastSyncTime(new Date().toISOString());
      }
    });

    const interval = setInterval(() => {
      refreshQueue();
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleForceSync = async () => {
    if (!navigator.onLine) {
      toast.error("Impossible de synchroniser : Vous êtes actuellement hors-ligne.");
      return;
    }
    toast.loading("Synchronisation manuelle en cours...", { id: 'sync-studio-toast' });
    setIsSyncing(true);
    try {
      await processSyncQueue();
      refreshQueue();
      setLastSyncTime(new Date().toISOString());
      toast.success("Synchronisation terminée avec succès !", { id: 'sync-studio-toast' });
    } catch (err: any) {
      toast.error(`Erreur de synchronisation : ${err.message}`, { id: 'sync-studio-toast' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushLocalToSupabase = async () => {
    if (!navigator.onLine || !supabase) {
      toast.error("Connexion Supabase non disponible.");
      return;
    }
    const allProducts = useCoreStore.getState().products || [];
    const allCategories = useCoreStore.getState().categories || [];
    const allBrands = useCoreStore.getState().brands || [];
    const allCustomers = usePeopleStore.getState().customers || [];
    const allTransactions = useTransactionStore.getState().transactions || [];

    if (!confirm(`Voulez-vous pousser la totalité des données locales (${allProducts.length} produits, ${allTransactions.length} ventes, ${allCustomers.length} clients) vers Supabase Cloud ?`)) return;

    toast.loading(`Envoi complet vers Supabase en cours...`, { id: 'push-supabase-toast' });
    setIsSyncing(true);
    try {
      const BATCH_SIZE = 100;
      
      // 1. Catégories & Marques (Parents)
      if (allCategories.length > 0) {
        for (let i = 0; i < allCategories.length; i += BATCH_SIZE) {
          const chunk = allCategories.slice(i, i + BATCH_SIZE).map(c => ({ id: c.id, name: c.name, parent_id: c.parentId || null }));
          try {
            await supabase.from('categories').upsert(chunk, { onConflict: 'id' });
          } catch (_) {}
        }
      }

      if (allBrands.length > 0) {
        for (let i = 0; i < allBrands.length; i += BATCH_SIZE) {
          const chunk = allBrands.slice(i, i + BATCH_SIZE).map(b => ({ id: b.id, name: b.name }));
          try {
            await supabase.from('brands').upsert(chunk, { onConflict: 'id' });
          } catch (_) {}
        }
      }

      // 2. Produits avec validation des clés étrangères
      const validCatIds = new Set(allCategories.map(c => c.id));
      validCatIds.add('uncategorized');
      const validBrandIds = new Set(allBrands.map(b => b.id));

      let prodCount = 0;
      const validProducts = allProducts.filter(p => Boolean(p && p.name && String(p.name).trim().length > 0));
      if (validProducts.length > 0) {
        for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
          const chunk = validProducts.slice(i, i + BATCH_SIZE).map(p => {
            const clean = sanitizeProductForSupabase(p);
            if (!clean.category_id || !validCatIds.has(clean.category_id)) {
              clean.category_id = 'uncategorized';
            }
            if (clean.brand_id && !validBrandIds.has(clean.brand_id)) {
              clean.brand_id = null;
            }
            return clean;
          }).filter(clean => Boolean(clean.name && String(clean.name).trim().length > 0));

          if (chunk.length === 0) continue;

          try {
            const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
            if (!error) {
              prodCount += chunk.length;
            } else {
              // Fallback un par un
              for (const singleProd of chunk) {
                try {
                  const { error: sErr } = await supabase.from('products').upsert(singleProd, { onConflict: 'id' });
                  if (!sErr) prodCount++;
                } catch (_) {}
              }
            }
          } catch (_) {}
        }
      }

      // 3. Clients
      if (allCustomers.length > 0) {
        for (let i = 0; i < allCustomers.length; i += BATCH_SIZE) {
          const chunk = allCustomers.slice(i, i + BATCH_SIZE).map(c => ({
            id: c.id,
            name: c.name || 'Client',
            phone: c.phone || '',
            email: c.email || '',
            notes: c.notes || '',
            balance: Number(c.balance) || 0,
            loyalty_points: Number(c.loyaltyPoints ?? (c as any).loyalty_points) || 0,
            total_spent: Number(c.totalSpent ?? (c as any).total_spent) || 0,
            last_visit: c.lastVisit || (c as any).last_visit || null,
            join_date: c.joinDate || (c as any).join_date || new Date().toISOString().split('T')[0]
          }));
          try {
            await supabase.from('customers').upsert(chunk, { onConflict: 'id' });
          } catch (_) {}
        }
      }

      // 4. Transactions (Ventes) - Récupération Multi-Sources (Store + IDB nexus_db_transactions + nexus_transactions_cache)
      const localDbTxs = await idbGet<Record<string, any>>('nexus_db_transactions').catch(() => ({}));
      const cachedTxs = await idbGet<any[]>('nexus_transactions_cache').catch(() => []);
      
      const allTxMap = new Map<string, any>();
      if (localDbTxs) {
        Object.values(localDbTxs).forEach((t: any) => t && t.id && allTxMap.set(t.id, t));
      }
      if (cachedTxs) {
        cachedTxs.forEach((t: any) => t && t.id && allTxMap.set(t.id, t));
      }
      allTransactions.forEach((t: any) => t && t.id && allTxMap.set(t.id, t));

      const combinedTransactions = Array.from(allTxMap.values());

      let txCount = 0;
      if (combinedTransactions.length > 0) {
        for (let i = 0; i < combinedTransactions.length; i += BATCH_SIZE) {
          const chunk = combinedTransactions.slice(i, i + BATCH_SIZE).map(t => {
            const p = preparePayload('transactions', t.id, t);
            if (!p.created_at && p.timestamp) p.created_at = p.timestamp;
            if (!p.timestamp && p.created_at) p.timestamp = p.created_at;
            return p;
          });
          const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' });
          if (!error) {
            txCount += chunk.length;
          } else {
            // Fallback un par un
            for (const single of chunk) {
              const { error: sErr } = await supabase.from('transactions').upsert(single, { onConflict: 'id' });
              if (!sErr) txCount++;
            }
          }
        }
      }

      toast.success(`Synchro terminée ! ${prodCount} produits et ${txCount} ventes poussés vers Supabase Cloud.`, { id: 'push-supabase-toast' });
    } catch (err: any) {
      toast.error(`Erreur d'envoi : ${err.message}`, { id: 'push-supabase-toast' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFullProductReload = async () => {
    if (!navigator.onLine) {
      toast.error("Impossible de recharger : Vous êtes hors-ligne.");
      return;
    }
    toast.loading("Rechargement complet du catalogue depuis Supabase...", { id: 'full-reload-toast' });
    try {
      localStorage.removeItem('last_sync_timestamp');
      localStorage.removeItem('nexus_has_cached_products');
      await idbDel('nexus_products_cache');
      
      const fullDocs = await fetchProductsFromSupabase();
      if (fullDocs && fullDocs.length > 0) {
        useCoreStore.getState().setProducts(fullDocs);
        await idbSet('nexus_products_cache', fullDocs);
        localStorage.setItem('last_sync_timestamp', new Date().toISOString());
        localStorage.setItem('nexus_has_cached_products', 'true');
        toast.success(`Succès ! ${fullDocs.length} produits rechargés depuis Supabase.`, { id: 'full-reload-toast' });
      } else {
        toast.error("Aucun produit retourné par Supabase.", { id: 'full-reload-toast' });
      }
    } catch (err: any) {
      toast.error(`Erreur de rechargement : ${err.message}`, { id: 'full-reload-toast' });
    }
  };

  const handleCreateBackup = async () => {
    await createBackupArchive();
  };

  const handleClearQueue = () => {
    if (confirm("Êtes-vous sûr de vouloir vider la file d'attente ? Pensez à faire une sauvegarde avant.")) {
      clearSyncQueue();
      refreshQueue();
      toast.success("File d'attente réinitialisée.");
    }
  };

  const handlePurgeUnnamedProducts = async () => {
    if (!confirm("Voulez-vous supprimer tous les articles fantômes sans nom (Sans nom / Article Sans Nom) du cache local et de Supabase ?")) return;
    toast.loading("Nettoyage des articles sans nom...", { id: 'purge-toast' });
    try {
      const currentProducts = useCoreStore.getState().products || [];
      const ghostProducts = currentProducts.filter(p => !p.name || p.name === 'Sans nom' || p.name === 'Article Sans Nom' || !p.name.trim());
      
      if (ghostProducts.length === 0) {
        toast.success("Aucun article sans nom trouvé.", { id: 'purge-toast' });
        return;
      }

      const ghostIds = ghostProducts.map(p => p.id);
      const validProducts = currentProducts.filter(p => p.name && p.name !== 'Sans nom' && p.name !== 'Article Sans Nom' && p.name.trim() !== '');
      
      useCoreStore.getState().setProducts(validProducts);
      await idbSet('nexus_products_cache', validProducts).catch(() => {});

      if (supabase && isSupabaseConfigured) {
        await supabase.from('products').delete().in('id', ghostIds).catch(() => {});
      }

      toast.success(`${ghostIds.length} article(s) sans nom supprimé(s) avec succès !`, { id: 'purge-toast' });
    } catch (err: any) {
      toast.error(`Erreur lors du nettoyage: ${err.message}`, { id: 'purge-toast' });
    }
  };

  const handleRefreshAuth = async () => {
    toast.loading("Vérification de la session Supabase...", { id: 'auth-toast' });
    await initAndSyncSupabase();
    await checkSupabaseAuth();
    toast.success("Vérification effectuée.", { id: 'auth-toast' });
  };

  // Filtrage et catégorisation des données de la file d'attente
  const categorisedItems = useMemo(() => {
    const txItems: { item: SyncPayload; details?: any }[] = [];
    const prodItems: { item: SyncPayload; details?: any }[] = [];
    const custItems: { item: SyncPayload; details?: any }[] = [];
    const adjItems: { item: SyncPayload; details?: any }[] = [];
    const otherItems: { item: SyncPayload; details?: any }[] = [];

    (queue || []).forEach(item => {
      const payload = item.payload || {};
      const recordId = item.recordId || payload.id;

      if (item.table === 'transactions') {
        const fullTx = transactions.find(t => t.id === recordId) || payload;
        txItems.push({ item, details: fullTx });
      } else if (item.table === 'products') {
        const fullProd = products.find(p => p.id === recordId) || payload;
        prodItems.push({ item, details: fullProd });
      } else if (item.table === 'customers') {
        const fullCust = customers.find(c => c.id === recordId) || payload;
        custItems.push({ item, details: fullCust });
      } else if (item.table === 'stock_adjustments') {
        adjItems.push({ item, details: payload });
      } else {
        otherItems.push({ item, details: payload });
      }
    });

    return { txItems, prodItems, custItems, adjItems, otherItems };
  }, [queue, transactions, products, customers]);

  const filteredList = useMemo(() => {
    let list: { item: SyncPayload; details?: any }[] = [];
    if (activeCategory === 'transactions') list = categorisedItems.txItems;
    else if (activeCategory === 'products') list = categorisedItems.prodItems;
    else if (activeCategory === 'customers') list = categorisedItems.custItems;
    else if (activeCategory === 'adjustments') list = categorisedItems.adjItems;
    else list = [...categorisedItems.txItems, ...categorisedItems.prodItems, ...categorisedItems.custItems, ...categorisedItems.adjItems, ...categorisedItems.otherItems];

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(({ item, details }) => {
      const idMatch = (item.recordId || '').toLowerCase().includes(query);
      const tableMatch = (item.table || '').toLowerCase().includes(query);
      const nameMatch = (details?.name || details?.customerName || '').toLowerCase().includes(query);
      const totalMatch = (details?.total || details?.price || '').toString().includes(query);
      return idMatch || tableMatch || nameMatch || totalMatch;
    });
  }, [activeCategory, categorisedItems, searchQuery]);

  return (
    <div className="min-h-full p-4 lg:p-5 bg-[#05070a] text-slate-100 space-y-8 overflow-y-auto no-scrollbar">
      {/* En-tête principal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xs">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-white ">
                Studio de Synchronisation
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Inspecteur et centre de contrôle en temps réel des données locales et Supabase
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'action globale */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleCreateBackup}
            className="flex-1 md:flex-none px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            title="Télécharger une archive de secours .nexus-backup"
          >
            <Download size={16} className="text-emerald-400" />
            <span>Sauvegarde (.nexus-backup)</span>
          </button>

          <button
            onClick={handlePushLocalToSupabase}
            disabled={isSyncing || !isOnline}
            className="flex-1 md:flex-none px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            title="Envoyer l'intégralité des produits locaux vers le cloud Supabase"
          >
            <Cloud size={16} className="text-emerald-400" />
            <span>Envoyer Tout vers Supabase (Push)</span>
          </button>

          <button
            onClick={handleFullProductReload}
            disabled={!isOnline}
            className="flex-1 md:flex-none px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            title="Effacer le cache delta et forcer le téléchargement de TOUS les produits depuis Supabase"
          >
            <Package size={16} className="text-amber-400" />
            <span>Recharger Catalogue Supabase</span>
          </button>

          <button
            onClick={handlePurgeUnnamedProducts}
            className="flex-1 md:flex-none px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-300 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            title="Nettoyer et supprimer tous les articles fantômes sans nom du cache local et de Supabase"
          >
            <Trash2 size={16} className="text-rose-400" />
            <span>Purger Articles Sans Nom</span>
          </button>

          <button
            onClick={handleForceSync}
            disabled={isSyncing || !isOnline}
            className={cn(
              "flex-1 md:flex-none px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95",
              isSyncing ? "bg-indigo-700 opacity-70" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
            )}
          >
            <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Synchro en cours..." : "Synchroniser Maintenant"}</span>
          </button>
        </div>
      </div>

      {/* Bandeau Pilote Automatique & Contrôle des Notifications en bas à droite */}
      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              Pilote Automatique Cloud Actif — Aucune action manuelle requise au quotidien
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">100% Auto</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Toutes vos ventes, stocks, clients et dépenses se synchronisent désormais automatiquement en arrière-plan avec Supabase. Ce Studio ne sert plus que de <strong>boîte à outils de secours</strong> (sauvegarde manuelle <code>.nexus-backup</code> ou diagnostic réseau).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={async () => {
              const current = (settings as any)?.silentSyncNotifications !== false;
              const nextVal = !current;
              const updated = { ...settings, silentSyncNotifications: nextVal } as any;
              useCoreStore.getState().setSettings(updated);
              const { localDb } = await import('../services/LocalDatabase');
              await localDb.insert('settings/company', updated);
              toast.success(nextVal ? 'Notifications en bas à droite masquées (Mode Silencieux)' : 'Notifications de synchronisation réactivées');
            }}
            className={cn(
              "px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
              (settings as any)?.silentSyncNotifications !== false
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700"
            )}
          >
            {(settings as any)?.silentSyncNotifications !== false
              ? "🔕 Notifications bas-droite : Masquées (Silencieux)"
              : "🔔 Notifications bas-droite : Visibles"}
          </button>

          <button
            type="button"
            onClick={async () => {
              const updated = { ...settings, hideSyncStudioInSidebar: true } as any;
              useCoreStore.getState().setSettings(updated);
              const { localDb } = await import('../services/LocalDatabase');
              await localDb.insert('settings/company', updated);
              toast.success('Studio de Synchro masqué du menu latéral (réactivable dans Paramètres > Sécurité)');
              if (setActiveTab) setActiveTab('settings');
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:border-indigo-500 transition-all cursor-pointer"
          >
            👁️‍🗨️ Masquer ce Studio du menu latéral
          </button>
        </div>
      </div>

      {/* Cartes de Diagnostic et d'État */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Carte 1 : État Réseau */}
        <div className="p-5 rounded-xl bg-black/40 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">État Réseau</span>
            <div className={cn("p-2 rounded-xl border", isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30")}>
              {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
            </div>
          </div>
          <p className="text-xl font-black text-white mt-3  uppercase">
            {isOnline ? "Connecté (En Ligne)" : "Hors-Ligne (Offline)"}
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">
            {isOnline ? "Prêt à échanger avec Supabase" : "Les données restent sécurisées localement"}
          </p>
        </div>

        {/* Carte 2 : File d'attente non synchronisée */}
        <div className="p-5 rounded-xl bg-black/40 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">En Attente de Synchro</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Database size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-3 font-mono">
            {queue.length} <span className="text-xs font-bold text-slate-400 uppercase font-sans">éléments</span>
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">
            {queue.length === 0 ? "Toutes les données sont synchronisées" : `${categorisedItems.txItems.length} ventes et ${categorisedItems.prodItems.length} produits`}
          </p>
        </div>

        {/* Carte 3 : Authentification Supabase */}
        <div className="p-5 rounded-xl bg-black/40 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authentification Supabase</span>
            <button 
              onClick={handleRefreshAuth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Tester l'authentification"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {authStatus === 'ok' && (
              <>
                <CheckCircle2 size={20} className="text-emerald-400" />
                <span className="text-base font-black text-emerald-400 uppercase ">Valide (200 OK)</span>
              </>
            )}
            {authStatus === 'unauthorized' && (
              <>
                <ShieldAlert size={20} className="text-rose-400 animate-pulse" />
                <span className="text-base font-black text-rose-400 uppercase ">Erreur 401 (Non Autorisé)</span>
              </>
            )}
            {authStatus === 'error' && (
              <>
                <AlertTriangle size={20} className="text-amber-400" />
                <span className="text-base font-black text-amber-400 uppercase ">Alerte Serveur</span>
              </>
            )}
            {authStatus === 'checking' && (
              <span className="text-sm font-bold text-slate-400 uppercase ">Test en cours...</span>
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-500 mt-1 truncate">
            {authErrorMessage || "Session active et autorisée"}
          </p>
        </div>

        {/* Carte 4 : Dernière Synchronisation */}
        <div className="p-5 rounded-xl bg-black/40 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dernière Synchro</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-lg font-black text-white mt-3 font-mono">
            {lastSyncTime ? formatSafe(lastSyncTime, 'HH:mm:ss') : "En attente"}
          </p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">
            {lastSyncTime ? formatSafe(lastSyncTime, 'dd/MM/yyyy') : "Aucune synchro récente"}
          </p>
        </div>
      </div>

      {/* Alerte si Erreur 401 détectée */}
      {authStatus === 'unauthorized' && (
        <div className="p-5 rounded-xl bg-rose-950/60 border-2 border-rose-500/50 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-rose-200">Session Supabase Expirée (Erreur 401)</h4>
              <p className="text-xs text-rose-300/80 mt-0.5 max-w-2xl">
                Supabase a rejeté la synchronisation des données locales. Vos ventes et stocks restent 100% en sécurité dans l'application. Reconnectez-vous ou réinitialisez la session.
              </p>
            </div>
          </div>
          <button
            onClick={handleRefreshAuth}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
          >
            Rafraîchir la Session
          </button>
        </div>
      )}

      {/* Section Dead Letter Queue (Éléments en Échec) */}
      {failedQueue.length > 0 && (
        <div className="p-5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-white space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-amber-200">
                  {failedQueue.length} Élément(s) en Échec (Dead Letter Queue)
                </h4>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  Éléments ayant dépassé 6 essais de synchronisation. Vous pouvez retenter l'envoi ou purger.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await retryAllFailedSyncItems();
                  refreshQueue();
                  toast.success("Tous les éléments ont été réintégrés dans la file.");
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-all shadow cursor-pointer"
              >
                Tout Réessayer
              </button>
              <button
                onClick={async () => {
                  if (confirm("Vider définitivement la liste des échecs ?")) {
                    await clearFailedSyncQueue();
                    refreshQueue();
                    toast.success("Dead Letter Queue vidée.");
                  }
                }}
                className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Vider la Liste
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {failedQueue.map((item, idx) => (
              <div key={idx} className="p-3 bg-black/40 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold uppercase text-[10px]">
                      {item.table}
                    </span>
                    <span className="font-mono text-slate-300 truncate">#{item.recordId || item.payload?.id}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Échoué le : {item.failedAt ? formatSafe(item.failedAt, 'dd/MM/yyyy HH:mm:ss') : 'Récemment'}
                  </p>
                </div>

                <button
                  onClick={async () => {
                    await retryFailedSyncItem(idx);
                    refreshQueue();
                    toast.success("Élément réintégré dans la file de synchronisation.");
                  }}
                  className="px-3 py-1.5 bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-lg text-xs transition-all shadow cursor-pointer shrink-0"
                >
                  Réessayer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de Filtres et Recherche de la File */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Filtres par Onglets */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                activeCategory === 'all' ? "bg-indigo-600 text-white shadow-xs" : "bg-black/40 text-slate-400 hover:text-white"
              )}
            >
              <span>Tous</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{queue.length}</span>
            </button>

            <button
              onClick={() => setActiveCategory('transactions')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                activeCategory === 'transactions' ? "bg-emerald-600 text-white shadow-xs" : "bg-black/40 text-slate-400 hover:text-white"
              )}
            >
              <ShoppingCart size={14} />
              <span>Ventes / Transactions</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{categorisedItems.txItems.length}</span>
            </button>

            <button
              onClick={() => setActiveCategory('products')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                activeCategory === 'products' ? "bg-amber-600 text-white shadow-md" : "bg-black/40 text-slate-400 hover:text-white"
              )}
            >
              <Package size={14} />
              <span>Produits</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{categorisedItems.prodItems.length}</span>
            </button>

            <button
              onClick={() => setActiveCategory('customers')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                activeCategory === 'customers' ? "bg-indigo-600 text-white" : "bg-black/40 text-slate-400 hover:text-white"
              )}
            >
              <Users size={14} />
              <span>Clients</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">{categorisedItems.custItems.length}</span>
            </button>
          </div>

          {/* Recherche et Nettoyage */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher ID, nom, table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            {queue.length > 0 && (
              <button
                onClick={handleClearQueue}
                className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Vider la file d'attente (après sauvegarde)"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste Détaillée des Éléments Non Synchronisés */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-6 text-center bg-black/30 border border-white/5 rounded-xl space-y-3">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-black text-white uppercase ">Aucun élément en attente</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Toutes les transactions, modifications de produits et données de cette catégorie sont parfaitement synchronisées avec la base de données.
            </p>
          </div>
        ) : (
          filteredList.map(({ item, details }, index) => {
            const isExpanded = expandedItemId === (item.recordId || index.toString());
            const itemId = item.recordId || item.payload?.id || `item-${index}`;

            return (
              <div 
                key={itemId}
                className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-indigo-500/30 transition-all space-y-3 shadow-lg ring-1 ring-white/5"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black text-slate-500">#{index + 1}</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono",
                      item.table === 'transactions' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
                      item.table === 'products' && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                      item.table === 'customers' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30",
                      item.table === 'stock_adjustments' && "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    )}>
                      {item.table}
                    </span>

                    <div>
                      <h4 className="text-sm font-bold text-white uppercase ">
                        {details?.name || details?.customerName || item.recordId || "Élément sans nom"}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        ID: {itemId} • Action: {item.action}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {/* Détails spécifiques selon le type */}
                    {item.table === 'transactions' && details?.total !== undefined && (
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {Number(details.total).toFixed(2)} {settings?.currency || 'DA'}
                        </span>
                        <p className="text-[9px] text-slate-500 uppercase">{details?.items?.length || 0} articles</p>
                      </div>
                    )}

                    {item.table === 'products' && details?.price !== undefined && (
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400 font-mono">
                          {Number(details.price).toFixed(2)} {settings?.currency || 'DA'}
                        </span>
                        <p className="text-[9px] text-slate-500 uppercase">Stock: {details?.stock ?? 0}</p>
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedItemId(isExpanded ? null : (item.recordId || index.toString()))}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                      title="Inspecter le contenu JSON brut"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Inspecteur de payload JSON étendu */}
                {isExpanded && (
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 font-mono flex items-center gap-1.5">
                        <Code size={12} /> Payload JSON brut envoyé à Supabase
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(item.payload, null, 2));
                          toast.success("Contenu JSON copié dans le presse-papier !");
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 font-bold flex items-center gap-1"
                      >
                        <Copy size={10} /> Copier JSON
                      </button>
                    </div>
                    <pre className="p-3 bg-black/80 rounded-xl text-[11px] font-mono text-emerald-400/90 overflow-x-auto border border-white/5">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
