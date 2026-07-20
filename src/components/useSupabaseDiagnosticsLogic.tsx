import { demoCategories, demoBrands, demoProducts, demoOnlineOrders } from './supabaseDemoData';
import { sqlCreateTables, sqlDisableRLS, sqlEnableRLSPublic, sqlMigrationTables, sqlDropTables } from './supabaseDiagnosticQueries';
import React from 'react';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { initAndSyncSupabase } from '../services/SupabaseSync';
import { del as idbDel } from 'idb-keyval';
import { toast } from 'sonner';

export interface TableStatus {
  name: string;
  mappedName: string;
  pushed: boolean;
  count: number | null;
  error: string | null;
  loading: boolean;
}

export function useSupabaseDiagnosticsLogic() {
  const [tables, setTables] = useState<TableStatus[]>([
    { name: 'Catégories', mappedName: 'categories', pushed: false, count: null, error: null, loading: false },
    { name: 'Marques', mappedName: 'brands', pushed: false, count: null, error: null, loading: false },
    { name: 'Produits', mappedName: 'products', pushed: false, count: null, error: null, loading: false },
    { name: 'Clients', mappedName: 'customers', pushed: false, count: null, error: null, loading: false },
    { name: 'Transactions', mappedName: 'transactions', pushed: false, count: null, error: null, loading: false },
    { name: 'Employés', mappedName: 'employees', pushed: false, count: null, error: null, loading: false },
    { name: 'Sessions de Caisse', mappedName: 'cash_shifts', pushed: false, count: null, error: null, loading: false },
    { name: 'Dépenses', mappedName: 'expenses', pushed: false, count: null, error: null, loading: false },
    { name: 'Brouillons de la Caisse', mappedName: 'cart_drafts', pushed: false, count: null, error: null, loading: false },
    { name: 'Promotions', mappedName: 'promotions', pushed: false, count: null, error: null, loading: false },
    { name: 'Retours de Produits', mappedName: 'returns', pushed: false, count: null, error: null, loading: false },
    { name: 'Commandes en Ligne', mappedName: 'online_orders', pushed: false, count: null, error: null, loading: false },
    { name: 'Achats Fournisseurs', mappedName: 'purchases', pushed: false, count: null, error: null, loading: false },
    { name: 'Bons de Commande', mappedName: 'purchase_orders', pushed: false, count: null, error: null, loading: false },
    { name: 'Ajustements de Stock', mappedName: 'stock_adjustments', pushed: false, count: null, error: null, loading: false },
    { name: 'Paiements Fournisseurs', mappedName: 'supplier_payments', pushed: false, count: null, error: null, loading: false },
    { name: 'Audits de Stock', mappedName: 'audits', pushed: false, count: null, error: null, loading: false },
    { name: 'Logs d\'Audit', mappedName: 'audit_logs', pushed: false, count: null, error: null, loading: false },
    { name: 'Synchronisons Fournisseurs', mappedName: 'supplier_syncs', pushed: false, count: null, error: null, loading: false },
    { name: 'Articles Endommagés', mappedName: 'damaged_items', pushed: false, count: null, error: null, loading: false },
    { name: 'Avances sur Salaire', mappedName: 'advances', pushed: false, count: null, error: null, loading: false },
    { name: 'Bons d\'Achat', mappedName: 'vouchers', pushed: false, count: null, error: null, loading: false }
  ]);

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInsertingDemo, setIsInsertingDemo] = useState(false);
  const [diagnosticRunCount, setDiagnosticRunCount] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanupAIStudioFiles = async () => {
    setIsCleaning(true);
    let cleanedSettingsCount = 0;
    let cleanedProductsCount = 0;
    let cleanedCategoriesCount = 0;
    let cleanedBrandsCount = 0;

    const isBadUrl = (url: any) => {
      if (typeof url !== 'string') return false;
      const u = url.toLowerCase();
      return u.includes('aistudio.google.com') ||
             u.includes('/_/') ||
             u.includes('/upload/') ||
             u.includes('a07b672') ||
             u.includes('eb137f4a-fb23-4b8c-aec9-844aecbc242a');
    };

    try {
      // 1. Clean Local Emulated DB and Settings
      const settingsRaw = localStorage.getItem('nexus_supabase_emulator_db');
      if (settingsRaw) {
        let dbStateLocal = JSON.parse(settingsRaw);
        
        // Clean Settings (RTDB settings/company)
        if (dbStateLocal.settings?.company) {
          const comp = dbStateLocal.settings.company;
          if (isBadUrl(comp.logoUrl)) {
            comp.logoUrl = '';
            cleanedSettingsCount++;
          }
        }
        
        // Clean Products (RTDB products / emulator)
        if (dbStateLocal.products) {
          Object.keys(dbStateLocal.products).forEach(id => {
            const p = dbStateLocal.products[id];
            if (isBadUrl(p.imageUrl)) {
              p.imageUrl = '';
              cleanedProductsCount++;
            }
            if (isBadUrl(p.image)) {
              p.image = '';
              cleanedProductsCount++;
            }
          });
        }

        // Clean Categories (RTDB categories / emulator)
        if (dbStateLocal.categories) {
          Object.keys(dbStateLocal.categories).forEach(id => {
            const c = dbStateLocal.categories[id];
            if (isBadUrl(c.imageUrl)) {
              c.imageUrl = '';
              cleanedCategoriesCount++;
            }
            if (isBadUrl(c.image_url)) {
              c.image_url = '';
              cleanedCategoriesCount++;
            }
          });
        }

        // Clean Brands (RTDB brands / emulator)
        if (dbStateLocal.brands) {
          Object.keys(dbStateLocal.brands).forEach(id => {
            const b = dbStateLocal.brands[id];
            if (isBadUrl(b.logoUrl)) {
              b.logoUrl = '';
              cleanedBrandsCount++;
            }
            if (isBadUrl(b.logo_url)) {
              b.logo_url = '';
              cleanedBrandsCount++;
            }
          });
        }

        localStorage.setItem('nexus_supabase_emulator_db', JSON.stringify(dbStateLocal));
      }

      // Also clean in Supabase Cloud if configured
      if (isSupabaseConfigured) {
        // Fetch and update products
        const { data: prods } = await supabase.from('products').select('*');
        if (prods && prods.length > 0) {
          for (const bp of prods) {
            if (isBadUrl(bp.image_url) || isBadUrl(bp.imageUrl)) {
              await supabase.from('products').update({ image_url: '' }).eq('id', bp.id);
              cleanedProductsCount++;
            }
          }
        }

        // Fetch and update categories
        const { data: cats } = await supabase.from('categories').select('*');
        if (cats && cats.length > 0) {
          for (const bc of cats) {
            if (isBadUrl(bc.image_url) || isBadUrl(bc.imageUrl)) {
              await supabase.from('categories').update({ image_url: '' }).eq('id', bc.id);
              cleanedCategoriesCount++;
            }
          }
        }

        // Fetch and update brands
        const { data: brs } = await supabase.from('brands').select('*');
        if (brs && brs.length > 0) {
          for (const bb of brs) {
            if (isBadUrl(bb.logo_url) || isBadUrl(bb.logoUrl)) {
              await supabase.from('brands').update({ logo_url: '' }).eq('id', bb.id);
              cleanedBrandsCount++;
            }
          }
        }
      }

      // Clear IndexedDB Caches
      try {
        await idbDel('nexus_products_cache');
        await idbDel('nexus_categories_cache');
        await idbDel('nexus_brands_cache');
      } catch (err) {
        console.warn('Could not clear IndexedDB caches', err);
      }

      toast.success(
        `Nettoyage complété avec succès ! \n` +
        `• Logo entreprise nettoyé : ${cleanedSettingsCount}\n` +
        `• Images de produits nettoyées : ${cleanedProductsCount}\n` +
        `• Images de catégories nettoyées : ${cleanedCategoriesCount}\n` +
        `• Logos de marques nettoyés : ${cleanedBrandsCount}\n\n` +
        `L'application va se recharger automatiquement.`
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 3500);

    } catch (e: any) {
      toast.error(`Erreur de nettoyage : ${e.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  // Run database ping tests
  const runDiagnostics = async () => {
    if (!isSupabaseConfigured) return;
    
    setTables(prev => prev.map(t => ({ ...t, loading: true, error: null })));
    
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      try {
        const { data, count, error } = await supabase
          .from(t.mappedName)
          .select('*', { count: 'exact', head: true });
        
        setTables(prev => prev.map(item => {
          if (item.mappedName === t.mappedName) {
            return {
              ...item,
              loading: false,
              count: count !== undefined ? count : (data ? data.length : 0),
              error: error ? error.message : null
            };
          }
          return item;
        }));
      } catch (err: any) {
        setTables(prev => prev.map(item => {
          if (item.mappedName === t.mappedName) {
            return {
              ...item,
              loading: false,
              error: err?.message || 'Erreur inconnue'
            };
          }
          return item;
        }));
      }
    }
    setDiagnosticRunCount(prev => prev + 1);
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      runDiagnostics();
    }
  }, []);

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${title} copié dans le presse-papiers !`);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await initAndSyncSupabase();
      await runDiagnostics();
      toast.success("Synchronisation forcée effectuée ! Les données Supabase ont été chargées en mémoire.");
    } catch (e: any) {
      toast.error(`Erreur de synchronisation : ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const insertDemoData = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Veuillez d'abord configurer Supabase dans vos réglages globaux.");
      return;
    }

    setIsInsertingDemo(true);
    try {
      // 1. Insert Categories
      const { error: catErr } = await supabase.from('categories').upsert(demoCategories, { onConflict: 'id' });
      if (catErr) throw new Error(`Erreur Catégories : ${catErr.message}`);

      // 2. Insert Brands
      const { error: brandErr } = await supabase.from('brands').upsert(demoBrands, { onConflict: 'id' });
      if (brandErr) throw new Error(`Erreur Marques : ${brandErr.message}`);

      // 3. Insert Demo Products
      const { error: prodErr } = await supabase.from('products').upsert(demoProducts, { onConflict: 'id' });
      if (prodErr) throw new Error(`Erreur Produits : ${prodErr.message}`);

      // 4. Insert Demo Online Orders
      const { error: orderErr } = await supabase.from('online_orders').upsert(demoOnlineOrders, { onConflict: 'id' });
      // We don't throw on order error to avoid blocking the product demo successfully created, but we notify or logs it
      if (orderErr) {
        console.warn("Could not insert demo online orders:", orderErr.message);
      }

      toast.success("Catégories, Marques, Produits et Commandes de démonstration créés avec SUCCÈS sur votre base Supabase !");
      await handleSyncNow();
    } catch (e: any) {
      toast.error(
        <div className="flex flex-col gap-1">
          <p className="font-bold">Échec de création des données de démo</p>
          <p className="text-[11px] leading-snug">{e.message}</p>
          <p className="text-[10px] text-amber-400 mt-1">💡 Cela indique que vos tables ne sont pas encore créées sur Supabase or que le RLS bloque les modifications.</p>
        </div>,
        { duration: 10000 }
      );
    } finally {
      setIsInsertingDemo(false);
    }
  };

  // SQL code snippets for user help
  

  

  

  

  

  // Get active connection visual properties
  const isOk = isSupabaseConfigured && tables.every(t => !t.error);
  const anyError = tables.some(t => t.error !== null);
  const missingTables = tables.filter(t => t.error?.includes('42P01') || t.error?.includes('relation') || t.error?.includes('does not exist')).map(t => t.mappedName);

  useEffect(() => {
    if (anyError && activeSection === null) {
      setActiveSection('tables');
    }
  }, [anyError]);


  return {
    tables,
    setTables,
    activeSection,
    setActiveSection,
    isSyncing,
    setIsSyncing,
    isInsertingDemo,
    setIsInsertingDemo,
    diagnosticRunCount,
    setDiagnosticRunCount,
    isCleaning,
    setIsCleaning,
    sqlCreateTables,
    sqlDropTables,
    isOk,
    anyError,
    missingTables,
    handleCleanupAIStudioFiles,
    runDiagnostics,
    handleCopy,
    handleSyncNow,
    insertDemoData,
    sqlMigrationTables,
    sqlDisableRLS,
    sqlEnableRLSPublic
  };
}
