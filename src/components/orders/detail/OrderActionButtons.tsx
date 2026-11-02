import React from 'react';
import { OnlineOrder } from '../../../types';
import { Button } from '../../ui';
import { CheckCircle2, Package, Truck, Printer, Edit3, X } from 'lucide-react';

export interface OrderActionButtonsProps {
  order: OnlineOrder;
  updateOrderStatus: (order: OnlineOrder, status: any) => void;
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
  return (
    <div className="space-y-2 pt-2">
      {/* A. Action Principale Contextuelle (CTA Majeur) */}
      {order.status === 'pending' && (
        <Button 
          onClick={() => updateOrderStatus(order, 'confirmed')} 
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} /> Confirmer la commande
        </Button>
      )}

      {order.status === 'confirmed' && (
        <Button 
          onClick={() => updateOrderStatus(order, 'processing')} 
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          <Package size={18} /> Passer en préparation
        </Button>
      )}

      {order.status === 'processing' && (
        <Button 
          onClick={() => updateOrderStatus(order, order.deliveryMethod === 'delivery' ? 'shipped' : 'delivered')} 
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
        >
          {order.deliveryMethod === 'delivery' ? (
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
          onClick={() => updateOrderStatus(order, 'delivered')} 
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} /> Marquer comme Livrée
        </Button>
      )}

      {/* B. Actions Utilitaires (Ticket, Modifier, Annuler) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button 
          variant="secondary" 
          onClick={() => handlePrintOrder(order)} 
          className="py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
        >
          <Printer size={15} /> Imprimer Ticket
        </Button>

        {order.status === 'pending' && (
          <Button 
            variant="secondary" 
            onClick={() => setIsEditingItems(true)} 
            className="py-2.5 text-xs font-semibold rounded-xl text-amber-300 hover:text-amber-200 border-amber-500/30 flex items-center justify-center gap-1.5"
          >
            <Edit3 size={15} /> Modifier
          </Button>
        )}

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button 
            type="button" 
            onClick={() => {
              if (window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) {
                updateOrderStatus(order, 'cancelled');
              }
            }} 
            className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <X size={15} /> Annuler Cde
          </button>
        )}
      </div>

      {/* C. Option Partenaire Yassir Livreur */}
      {order.deliveryMethod === 'delivery' && order.assignedEmployeeId !== 'YASSIR_EXT' && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <button 
          type="button"
          onClick={() => handleYassirRequest(order)} 
          className="w-full flex items-center justify-center gap-2 bg-[#f2ec24] text-black hover:bg-[#dcd01b] font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
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
