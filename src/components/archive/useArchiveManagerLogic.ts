import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { localDb } from '../../services/LocalDatabase';
import { convertKeysToCamel } from '../../lib/db-converters';
import { getLocalValue } from '../../lib/local-db';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { del as idbDel } from 'idb-keyval';
import { format } from 'date-fns';

interface UseArchiveManagerLogicProps {
  user: any;
  settings: any;
}

export interface ArchiveStatusMessage {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  confirmAction?: () => void;
}

const getItemDateMs = (item: any, dateField: string): number => {
  if (!item) return 0;
  const raw = item[dateField] || item.timestamp || item.date || item.createdAt || item.created_at || item.returnDate;
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const time = new Date(raw).getTime();
  return isNaN(time) ? 0 : time;
};

export function useArchiveManagerLogic({ user: _user, settings }: UseArchiveManagerLogicProps) {
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deleteAfterArchive, setDeleteAfterArchive] = useState(true);
  const [compressArchive, setCompressArchive] = useState(true);
  const [progress, setProgress] = useState<{ step: string; count?: number; total?: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<ArchiveStatusMessage | null>(null);

  const collectionsToArchive = [
    { name: 'transactions', dateField: 'timestamp' },
    { name: 'purchases', dateField: 'date' },
    { name: 'expenses', dateField: 'date' },
    { name: 'returns', dateField: 'timestamp' },
    { name: 'stock_adjustments', dateField: 'timestamp' },
    { name: 'supplier_payments', dateField: 'date' },
    { name: 'online_orders', dateField: 'timestamp' }
  ];

  const executeArchiveTask = async () => {
    setIsArchiving(true);
    setProgress({ step: 'Récupération des données...' });
    
    try {
      const archiveData: Record<string, any[]> = {};
      const endDateTime = endDate + 'T23:59:59.999Z';
      const targetDateLimit = new Date(endDateTime).getTime();

      for (const col of collectionsToArchive) {
        setProgress({ step: `Récupération de ${col.name}...` });
        const itemMap = new Map<string, any>();

        // 1. Fetch local records from local-db memory
        const rawLocal = getLocalValue(col.name);
        if (rawLocal && typeof rawLocal === 'object') {
          const localItems = Array.isArray(rawLocal) ? rawLocal : Object.values(rawLocal);
          localItems.forEach((item: any) => {
            if (!item || !item.id) return;
            const itemDate = getItemDateMs(item, col.dateField);
            if (itemDate <= targetDateLimit) {
              itemMap.set(String(item.id), item);
            }
          });
        }

        // 2. Fetch Supabase records if configured
        if (isSupabaseConfigured) {
          try {
            const { data } = await supabase
              .from(col.name)
              .select('*')
              .lte(col.dateField, endDateTime);

            if (data && Array.isArray(data)) {
              data.forEach((item: any) => {
                if (item && item.id) {
                  itemMap.set(String(item.id), item);
                }
              });
            }
          } catch (err) {
            console.warn(`[Archive] Supabase query skipped for ${col.name}:`, err);
          }
        }

        archiveData[col.name] = Array.from(itemMap.values());
      }

      // Add metadata
      const exportObject = {
        meta: {
          version: '1.0',
          type: 'monthly_closure_archive',
          createdAt: new Date().toISOString(),
          endDate: endDate,
          company: settings?.companyName || 'Mon Entreprise'
        },
        data: archiveData
      };

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      let downloadBlob = blob;
      let downloadFileName = `cloture_archive_${endDate}.json`;

      if (compressArchive && typeof CompressionStream !== 'undefined') {
        try {
          const compressedStream = blob.stream().pipeThrough(new CompressionStream('gzip'));
          downloadBlob = await new Response(compressedStream).blob();
          downloadFileName = `cloture_archive_${endDate}.json.gz`;
        } catch (compErr) {
          console.warn('[ArchiveManager] Compression failed, falling back to raw JSON:', compErr);
        }
      }

      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (deleteAfterArchive) {
        setProgress({ step: 'Suppression des données archivées...' });
        for (const col of collectionsToArchive) {
          const items = archiveData[col.name];
          if (!items || items.length === 0) continue;
          
          const ids = items.map((item: any) => String(item.id));
          
          // Delete from localDb
          for (const id of ids) {
            await localDb.delete(`${col.name}/${id}`);
          }

          // Delete from Supabase if connected
          if (isSupabaseConfigured) {
            try {
              await supabase.from(col.name).delete().in('id', ids);
            } catch (supErr) {
              console.warn(`[Archive] Supabase deletion skipped for ${col.name}:`, supErr);
            }
          }
        }

        // Update Zustand Stores in Real-Time
        const purgedReturns = new Set((archiveData['returns'] || []).map(r => String(r.id)));
        const purgedTransactions = new Set((archiveData['transactions'] || []).map(t => String(t.id)));
        const purgedPurchases = new Set((archiveData['purchases'] || []).map(p => String(p.id)));
        const purgedExpenses = new Set((archiveData['expenses'] || []).map(e => String(e.id)));

        if (purgedReturns.size > 0) {
          useTransactionStore.getState().setReturns(prev => (prev || []).filter(r => !purgedReturns.has(String(r.id))));
        }
        if (purgedTransactions.size > 0) {
          useTransactionStore.getState().setTransactions(prev => (prev || []).filter(t => !purgedTransactions.has(String(t.id))));
        }

        const currentPurchases = useFinanceStore.getState().purchases || [];
        const currentExpenses = useFinanceStore.getState().expenses || [];
        if (purgedPurchases.size > 0) {
          useFinanceStore.getState().setPurchases(currentPurchases.filter(p => !purgedPurchases.has(String(p.id))));
        }
        if (purgedExpenses.size > 0) {
          useFinanceStore.getState().setExpenses(currentExpenses.filter(e => !purgedExpenses.has(String(e.id))));
        }

        // Clear IndexedDB & LocalStorage caches
        try {
          await idbDel('nexus_returns_cache');
          await idbDel('nexus_transactions_cache');
          await idbDel('nexus_purchases_cache');
          await idbDel('nexus_expenses_cache');
        } catch (_) {}

        try {
          localStorage.removeItem('nexus_returns_cache');
          localStorage.removeItem('nexus_transactions_cache');
          localStorage.removeItem('nexus_purchases_cache');
          localStorage.removeItem('nexus_expenses_cache');
        } catch (_) {}

        // Trigger local-db reload event across components
        window.dispatchEvent(new CustomEvent('local-db-reload'));
      }

      setStatusMessage({ title: "Succès", message: "Clôture et archivage terminés avec succès!", type: "success" });
    } catch (e: any) {
      console.error(e);
      const errMsg = "Une erreur est survenue lors de l'archivage: " + e.message;
      setStatusMessage({ title: "Erreur", message: errMsg, type: "error" });
    } finally {
      setIsArchiving(false);
      setProgress(null);
    }
  };

  const handleArchive = async () => {
    if (!endDate) {
      setStatusMessage({ title: "Action requise", message: "Veuillez sélectionner une date de fin.", type: "info" });
      return;
    }
    
    if (deleteAfterArchive) {
      setStatusMessage({ 
        title: "Confirmation de suppression", 
        message: "Êtes-vous sûr de vouloir cloturer et SUPPRIMER l'historique jusqu'à cette date ? Assurez-vous de bien garder le fichier de sauvegarde qui sera téléchargé.", 
        type: "info",
        confirmAction: executeArchiveTask
      });
    } else {
      await executeArchiveTask();
    }
  };

  const executeRestoreTask = async (file: File) => {
    setIsRestoring(true);
    setProgress({ step: 'Lecture du fichier...' });

    try {
      let text: string;
      if ((file.name.endsWith('.gz') || file.type.includes('gzip')) && typeof DecompressionStream !== 'undefined') {
        const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
        text = await new Response(stream).text();
      } else {
        text = await file.text();
      }
      const parsed = JSON.parse(text);

      if (parsed.meta?.type !== 'monthly_closure_archive' || !parsed.data) {
        throw new Error("Format de fichier non valide pour la restauration d'archive.");
      }

      const archiveData = parsed.data;
      
      for (const col of collectionsToArchive) {
        const items = archiveData[col.name];
        if (!items || items.length === 0) continue;

        setProgress({ step: `Restauration de ${col.name} (${items.length} éléments)...` });
        
        const batchRecords: Record<string, any> = {};
        items.forEach((item: any) => {
          const camelItem = convertKeysToCamel(item);
          batchRecords[camelItem.id] = camelItem;
        });
        await localDb.insertBatch(col.name, batchRecords);
      }

      setStatusMessage({ title: "Succès", message: "Restauration réussie!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ title: "Erreur", message: err.message || "Erreur lors de la lecture ou restauration du fichier.", type: "error" });
    } finally {
      setIsRestoring(false);
      setProgress(null);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage({
      title: "Confirmation de restauration",
      message: "Vous êtes sur le point de restaurer des données d'archives. Ces données réintégreront votre historique en cours (sans modifier les stocks et soldes actuels). Continuer ?",
      type: "info",
      confirmAction: () => executeRestoreTask(file)
    });
    
    e.target.value = '';
  };

  return {
    endDate,
    setEndDate,
    isArchiving,
    isRestoring,
    deleteAfterArchive,
    setDeleteAfterArchive,
    compressArchive,
    setCompressArchive,
    progress,
    statusMessage,
    setStatusMessage,
    handleArchive,
    handleRestore,
  };
}
