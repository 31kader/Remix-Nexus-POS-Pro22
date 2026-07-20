import React from 'react';
import { Tag, Calendar, BarChart3, Trash2 } from 'lucide-react';
import { Promotion, CompanySettings } from '../../types';
import { Card, Button } from '../ui';
import { cn, formatSafe } from '../../lib/utils';

interface PromotionsGridProps {
  paginatedPromotions: Promotion[];
  filteredPromotions: Promotion[];
  settings: CompanySettings;
  getPromoStatus: (promo: Promotion) => { label: string; color: string };
  setViewingPerformancePromo: (promo: Promotion | null) => void;
  setIsPerformanceModalOpen: (val: boolean) => void;
  setEditingPromotion: (promo: Promotion | null) => void;
  setIsModalOpen: (val: boolean) => void;
  handleDelete: (id: string) => void;
}

export function PromotionsGrid({
  paginatedPromotions,
  filteredPromotions,
  settings,
  getPromoStatus,
  setViewingPerformancePromo,
  setIsPerformanceModalOpen,
  setEditingPromotion,
  setIsModalOpen,
  handleDelete
}: PromotionsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {paginatedPromotions.map((promo: Promotion) => {
        const status = getPromoStatus(promo);
        return (
          <Card key={promo.id} className={cn("p-6 border-l-4 transition-all hover:shadow-md", promo.isActive ? "border-l-indigo-500" : "border-l-slate-300")}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-800">{promo.name}</h4>
                <p className="text-xs text-slate-500 font-mono">{promo.code || 'Remise automatique'}</p>
              </div>
              <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", status.color)}>
                {status.label}
              </span>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type:</span>
                <span className="font-medium text-slate-700 capitalize">{promo.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Valeur:</span>
                <span className="font-bold text-indigo-600">
                  {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value}${settings.currency}`}
                </span>
              </div>
              {promo.minPurchase && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Min. Achat:</span>
                  <span className="font-medium text-slate-700">{promo.minPurchase}{settings.currency}</span>
                </div>
              )}
              {(promo.startDate || promo.endDate) && (
                <div className="pt-2 mt-2 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Période de validité</p>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar size={12} />
                    <span>
                      {promo.startDate ? formatSafe(promo.startDate, 'dd/MM/yy') : 'Début'} 
                      {' → '} 
                      {promo.endDate ? formatSafe(promo.endDate, 'dd/MM/yy') : 'Fin'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <button 
                  onClick={() => { setViewingPerformancePromo(promo); setIsPerformanceModalOpen(true); }}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  title="Performance de la promotion"
                >
                  <BarChart3 size={18} />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="p-2 text-xs" onClick={() => { setEditingPromotion(promo); setIsModalOpen(true); }}>
                  Modifier
                </Button>
                <button onClick={() => handleDelete(promo.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </Card>
        );
      })}
      {filteredPromotions.length === 0 && (
        <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag size={32} />
          </div>
          <h4 className="font-bold text-slate-800">Aucune promotion trouvée</h4>
          <p className="text-sm text-slate-500">Ajustez votre recherche ou créez une nouvelle offre.</p>
        </div>
      )}
    </div>
  );
}
