import React, { useState } from 'react';
import { Button } from '../../ui';
import { OnlineOrder, CompanySettings } from '../../../types';
import { Edit3 } from 'lucide-react';

export interface EditOrderItemsProps {
  order: OnlineOrder;
  onSave: (order: OnlineOrder, items: OnlineOrder['items']) => void;
  onCancel: () => void;
  settings: CompanySettings;
}

export function EditOrderItems({ order, onSave, onCancel, settings }: EditOrderItemsProps) {
  const parseItems = (raw: any) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (_) { return []; }
    }
    return [];
  };

  const [items, setItems] = useState<OnlineOrder['items']>(parseItems(order?.items));

  const updateQuantity = (productId: string, delta: number) => {
    setItems((items || []).map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Edit3 size={15} className="text-amber-400" /> Modifier les articles
        </h4>
        <span className="text-xs text-white/50">{(items || []).length} article(s)</span>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {(items || []).map((item, idx) => (
          <div key={`order-item-${idx}`} className="flex items-center justify-between p-3.5 bg-zinc-800/80 border border-zinc-700/80 rounded-xl">
            <div className="flex-1 text-left pr-3">
              <p className="text-sm font-bold text-white tracking-tight leading-snug">{item.name}</p>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{(item.price || 0).toFixed(2)} {settings?.currency || 'DA'} × {item.quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => updateQuantity(item.productId, -1)}
                className="w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >-</button>
              <span className="text-sm font-black w-8 text-center text-white font-mono">{item.quantity || 0}</span>
              <button 
                type="button"
                onClick={() => updateQuantity(item.productId, 1)}
                className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1 py-3 text-xs font-bold rounded-xl">
          Annuler
        </Button>
        <Button onClick={() => onSave(order, items)} className="flex-1 py-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30">
          Sauvegarder les modifications
        </Button>
      </div>
    </div>
  );
}
