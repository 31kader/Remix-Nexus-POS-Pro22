import React from 'react';
import { Card, Button } from '../ui';
import { CheckCircle2 } from 'lucide-react';
import { UpdatePricesView } from '../UpdatePricesView';
import { Product, CompanySettings } from '../../types';

interface SmartPurchaseStepViewsProps {
  step: string;
  lastPurchaseItems: any[];
  settings: CompanySettings;
  products: Product[];
  onReset: () => void;
  onCompleteUpdatePrices: () => void;
}

export const SmartPurchaseStepViews: React.FC<SmartPurchaseStepViewsProps> = ({
  step,
  lastPurchaseItems,
  settings,
  products,
  onReset,
  onCompleteUpdatePrices,
}) => {
  if (step === 'updatePrices') {
    if (!lastPurchaseItems || lastPurchaseItems.length === 0 || !lastPurchaseItems.some(i => i.productId)) {
      return (
        <Card className="p-6 text-center space-y-6 industrial-card">
          <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Achat enregistré !</h2>
            <p className="text-industrial-500 mt-2 font-mono text-sm uppercase">Le stock a été mis à jour avec succès.</p>
          </div>
          <Button onClick={onReset} className="mx-auto industrial-button-primary">
            Nouvel achat
          </Button>
        </Card>
      );
    }

    return (
      <div className="relative">
        <div className="blur-[3px] pointer-events-none select-none transition-all duration-500">
          <Card className="p-6 text-center space-y-6 industrial-card">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Achat enregistré !</h2>
              <p className="text-industrial-500 mt-2 font-mono text-sm uppercase">Le stock a été mis à jour avec succès.</p>
            </div>
            <Button disabled className="mx-auto industrial-button-primary opacity-40">
              Nouvel achat
            </Button>
          </Card>
        </div>
        <UpdatePricesView 
          items={lastPurchaseItems} 
          onComplete={onCompleteUpdatePrices} 
          settings={settings} 
          products={products} 
        />
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <Card className="p-6 text-center space-y-6 industrial-card">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Achat enregistré !</h2>
          <p className="text-industrial-500 mt-2 font-mono text-sm uppercase">Le stock a été mis à jour avec succès.</p>
        </div>
        <Button onClick={onReset} className="mx-auto industrial-button-primary">
          Nouvel achat
        </Button>
      </Card>
    );
  }

  return null;
};
