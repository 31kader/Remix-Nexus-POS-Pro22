import React, { useState } from 'react';
import { OnlineOrder } from '../../../types';
import { Button } from '../../ui';
import { CheckCircle2, Package, Truck, Printer, Edit3, X, Loader2 } from 'lucide-react';

export interface OrderActionButtonsProps {
  order: OnlineOrder;
  updateOrderStatus: (order: OnlineOrder, status: any) => Promise<void> | void;
  handlePrintOrder: (order: any) => void;
  setIsEditingItems: (v: boolean) => void;
  handleYassirRequest: (order: any) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export function OrderActionButtons({
  order,
  updateOrderStatus,
  handlePrintOrder,
  setIsEditingItems,
  handleYassirRequest,
  onClose,
  t
}: OrderActionButtonsProps) {
  const [isPending, setIsPending] = useState(false);

  const handleStatusChange = async (targetStatus: OnlineOrder['status']) => {
    if (isPending) return;
    setIsPending(true);
    try {
      await updateOrderStatus(order, targetStatus);
    } catch (err) {
      console.error('[OrderActionButtons] Erreur mise à jour statut:', err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-2 pt-2">
      {/* A. Action Principale Contextuelle (CTA Majeur) */}
      {order.status === 'pending' && (
        <Button 
          onClick={() => handleStatusChange('confirmed')} 
          disabled={isPending}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Confirmation en cours...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} /> Confirmer la commande
            </>
          )}
        </Button>
      )}

      {order.status === 'confirmed' && (
        <Button 
          onClick={() => handleStatusChange('processing')} 
          disabled={isPending}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Mise à jour...
            </>
          ) : (
            <>
              <Package size={18} /> Passer en préparation
            </>
          )}
        </Button>
      )}

      {order.status === 'processing' && (
        <Button 
          onClick={() => handleStatusChange(order.deliveryMethod === 'delivery' ? 'shipped' : 'delivered')} 
          disabled={isPending}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Mise à jour...
            </>
          ) : order.deliveryMethod === 'delivery' ? (
            <>
              <Truck size={18} /> Remettre au livreur / Expédier
            </>
          ) : (
            <>
              <CheckCircle2 size={18} /> Prête & Retirée par le client
            </>
          )}
        </Button>
      )}

      {order.status === 'shipped' && (
        <Button 
          onClick={() => handleStatusChange('delivered')} 
          disabled={isPending}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Finalisation...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} /> Marquer comme Livrée
            </>
          )}
        </Button>
      )}

      {/* B. Actions Utilitaires (Ticket, Modifier, Annuler) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button 
          variant="secondary" 
          onClick={() => handlePrintOrder(order)} 
          disabled={isPending}
          className="py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
        >
          <Printer size={15} /> Imprimer Ticket
        </Button>

        {order.status === 'pending' && (
          <Button 
            variant="secondary" 
            onClick={() => setIsEditingItems(true)} 
            disabled={isPending}
            className="py-2.5 text-xs font-semibold rounded-xl text-amber-300 hover:text-amber-200 border-amber-500/30 flex items-center justify-center gap-1.5"
          >
            <Edit3 size={15} /> Modifier
          </Button>
        )}

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button 
            type="button" 
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) {
                handleStatusChange('cancelled');
              }
            }} 
            className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <X size={15} /> Annuler Cde
          </button>
        )}
      </div>

      {/* C. Option Partenaire Yassir Livreur */}
      {order.deliveryMethod === 'delivery' && order.assignedEmployeeId !== 'YASSIR_EXT' && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <button 
          type="button"
          disabled={isPending}
          onClick={() => handleYassirRequest(order)} 
          className="w-full flex items-center justify-center gap-2 bg-[#f2ec24] text-black hover:bg-[#dcd01b] disabled:opacity-50 font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Truck size={17} /> {t("Demander livreur Yassir")}
        </button>
      )}

      {/* D. Bouton Fermer Évident pour Mobile */}
      <div className="pt-2">
        <Button 
          variant="secondary" 
          onClick={onClose} 
          className="w-full py-3 text-xs font-bold rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
        >
          Fermer la boîte
        </Button>
      </div>
    </div>
  );
}
