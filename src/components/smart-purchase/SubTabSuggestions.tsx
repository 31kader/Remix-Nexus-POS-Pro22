import React from 'react';
import { Sparkles, ShoppingCart, Package } from 'lucide-react';
import { Card, Button, SafeImage } from '../ui';
import { Product } from '../../types';

export function SubTabSuggestions({
  suggestedProducts,
  addSuggestionsToCart,
  addToCart,
}: {
  suggestedProducts: Product[];
  addSuggestionsToCart: () => void;
  addToCart: (p: Product) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
        <div>
          <h4 className="font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <Sparkles className="text-amber-500" size={24}/> Réapprovisionnement IA
          </h4>
          <p className="text-[10px] text-industrial-500 font-black uppercase tracking-widest">Articles en stock bas suggérés par l'IA.</p>
        </div>
        <Button onClick={addSuggestionsToCart} className="industrial-button-primary bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20 gap-3">
          <ShoppingCart size={18}/> TOUT AJOUTER
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {suggestedProducts.map(p => (
          <Card key={p.id} className="p-6 industrial-card hover:border-indigo-500/40 transition-all group relative">
            <div className="flex gap-6 mb-6">
              <div className="w-16 h-16 bg-industrial-950 border border-industrial-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                {p.imageUrl ? (
                  <SafeImage 
                    src={p.imageUrl} 
                    className="w-full h-full object-cover" 
                    fallback={<Package size={24} className="text-industrial-600"/>}
                  />
                ) : <Package size={24} className="text-industrial-600"/>}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-black text-white uppercase tracking-tight truncate mb-1">{p.name}</h5>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-black text-rose-500 tracking-widest uppercase">Stock Actuel: {p.stock}</p>
                  <p className="text-[10px] text-industrial-500 font-mono">SEUIL MIN: {p.minStock}</p>
                </div>
              </div>
            </div>
            <Button variant="secondary" className="w-full industrial-button-primary py-3 py-2 bg-industrial-800 text-industrial-300 border border-industrial-700 hover:bg-industrial-700 shadow-none text-[10px]" onClick={() => addToCart(p)}>
              AJOUTER AU PANIER
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
