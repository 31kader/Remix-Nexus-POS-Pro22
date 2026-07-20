import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DamagedRecord, Product } from '../../../types';
import { formatSafe } from '../../../lib/utils';
import { Card } from '../../ui';

interface LossReportTableProps {
  filteredRecords: DamagedRecord[];
  products: Product[];
}

export function LossReportTable({ filteredRecords, products }: LossReportTableProps) {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/5 p-0 rounded-[2.5rem]">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
              <th className="p-6">Date & Heure</th>
              <th className="p-6">Produit</th>
              <th className="p-6">Quantité</th>
              <th className="p-6">Raison / Note</th>
              <th className="p-6">Valeur Perdue</th>
              <th className="p-6">Opérateur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {filteredRecords.map((record) => {
                const product = products.find(p => p.id === record.productId);
                return (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={record.id} 
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <Clock size={14} className="text-white/20" />
                        <span className="text-xs font-mono text-white/60">{formatSafe(record.date, 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase tracking-tight">{record.productName}</span>
                        <span className="text-[10px] text-white/20 font-black uppercase">{product?.sku || '---'}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-black text-rose-400">
                        {record.quantity} {product?.unit || 'unité(s)'}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className="text-xs text-white/40 italic">"{record.reason}"</span>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-rose-500 font-mono">
                          -{(record.quantity * (product?.price || 0)).toLocaleString()} CFA
                        </span>
                        <span className="text-[9px] text-white/20 font-black uppercase tracking-tighter">
                          Coût: -{(record.quantity * (product?.costPrice || 0)).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400">
                          {record.userName.charAt(0)}
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase">{record.userName}</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="p-32 text-center text-white/10">
                  <Trash2 size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-xs">Aucune perte enregistrée sur cette période</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
