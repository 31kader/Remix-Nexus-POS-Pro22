import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { localDb, getDeletedRecordIds } from '../../services/LocalDatabase';
import { replaceTableState } from '../../lib/local-db';
import { OnlineOrder } from '../../types';
import { escapeHtml } from '../../lib/utils';
import { convertKeysToCamel } from '../../lib/db-converters';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTransactionStore } from '../../store/useTransactionStore';
import { set as idbSet } from 'idb-keyval';

export interface UseOrdersPrintAndSyncParams {
  settings?: any;
  syncOrder?: (order: OnlineOrder) => Promise<void> | void;
  t: (key: string) => string;
}

export function useOrdersPrintAndSync({ settings = {}, syncOrder = () => {}, t }: UseOrdersPrintAndSyncParams) {
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // SUPABASE-FIRST: Fetch on mount
  const refreshFromSupabase = async (showNotification = false) => {
    if (!isSupabaseConfigured) {
      if (showNotification) toast.error("Supabase n'est pas configuré. Vérifiez vos variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
      return;
    }

    // Check if we're online first
    if (!navigator.onLine) {
      if (showNotification) {
        toast.error("Vous êtes hors-ligne. La synchronisation nécessite une connexion Internet.", { icon: '📡', duration: 5000 });
      }
      return;
    }

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select('*')
        .order('id', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (data && Array.isArray(data)) {
        const deletedOrderIds = getDeletedRecordIds('online_orders');
        const parsed = data
          .filter((item: any) => item && item.id && !deletedOrderIds.has(String(item.id)))
          .map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch(e) {}
            }
            return convertKeysToCamel(item) as OnlineOrder;
          });

        useTransactionStore.getState().setOnlineOrders(parsed);
        await idbSet('nexus_online_orders_cache', parsed);
        
        // 🛡️ Purge et synchronisation immédiate de la base locale interne
        replaceTableState('online_orders', parsed);

        if (showNotification) {
          toast.success(`${parsed.length} commandes synchronisées depuis Supabase.`, { icon: '✅' });
        }
      }
    } catch (e: any) {
      console.error('[Supabase Orders Refresh Failed]', e);
      const errMsg = e?.message || 'Erreur inconnue';
      const isNetworkError = errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ENOTFOUND') || errMsg.includes('ERR_NETWORK') || !navigator.onLine;

      if (showNotification) {
        if (isNetworkError) {
          toast.error("Connexion Internet indisponible. Les commandes seront synchronisées automatiquement quand la connexion reviendra.", { icon: '📡', duration: 6000 });
        } else {
          toast.error(`Erreur Supabase: ${errMsg}`, { duration: 5000 });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshFromSupabase(false);
  }, []);

  const handleManualSync = async (order: OnlineOrder) => {
    setIsSyncing(order.id);
    await syncOrder(order);
    setIsSyncing(null);
  };

  const handleYassirRequest = async (order: OnlineOrder) => {
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('online_orders')
          .update({ 
              assigned_employee_id: 'YASSIR_EXT',
              assigned_employee_name: 'Yassir Express'
          })
          .eq('id', order.id);
      }

      useTransactionStore.getState().setOnlineOrders(prev => 
        (Array.isArray(prev) ? prev : []).map(o => o.id === order.id ? { 
          ...o, 
          assignedEmployeeId: 'YASSIR_EXT', 
          assignedEmployeeName: 'Yassir Express' 
        } : o)
      );

      await localDb.update(`onlineOrders/${order.id}`, {
        assignedEmployeeId: 'YASSIR_EXT',
        assignedEmployeeName: 'Yassir Express'
      });

      toast.success(t("Commande assignée à Yassir Express sur Supabase."));
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'assignation");
    }
  };

  const handlePrintOrder = (order: OnlineOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px 0;">${escapeHtml(item.name)} x${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right;">${(item.price || 0).toFixed(2)} ${escapeHtml(settings.currency || 'DA')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Commande #${escapeHtml(order.externalOrderId || String(order.id || '').slice(0, 8))}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { max-width: 100px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logoUrl ? `<img src="${escapeHtml(settings.logoUrl)}" class="logo" />` : ''}
            <h2>${escapeHtml(settings.name || 'NEXUS POS')}</h2>
            <p>COMMANDE EN LIGNE</p>
            <p>#${escapeHtml(order.externalOrderId || String(order.id || '').slice(0, 8))}</p>
            <p>Type: ${order.deliveryMethod === 'delivery' ? 'LIVRAISON' : 'RETRAIT'}</p>
            <p>${format(new Date(order.timestamp || Date.now()), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div class="divider"></div>
          <div style="font-size: 0.9em; margin-bottom: 10px;">
            <p><strong>Client:</strong> ${escapeHtml(order.customerName || 'N/A')}</p>
            <p><strong>Tél:</strong> ${escapeHtml(order.customerPhone || 'N/A')}</p>
            <p><strong>Adresse:</strong> ${escapeHtml(order.shippingAddress || 'N/A')}</p>
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between;" class="total">
            <span>TOTAL</span>
            <span>${(order.total || 0).toFixed(2)} ${escapeHtml(settings.currency || 'DA')}</span>
          </div>
          <div class="footer">
            <p>${escapeHtml(settings.footerText || 'Merci de votre confiance !')}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return {
    isSyncing,
    setIsSyncing,
    isRefreshing,
    setIsRefreshing,
    refreshFromSupabase,
    handleManualSync,
    handleYassirRequest,
    handlePrintOrder
  };
}
