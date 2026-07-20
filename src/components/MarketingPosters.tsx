import React, { useState, useRef } from 'react';
import { Printer, X, Tag, Star, Zap, ShoppingCart, ArrowDown, Download, Share2, Copy } from 'lucide-react';
import { Card, Button, Modal } from './ui';
import { Product, CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { toPng, toBlob } from 'html-to-image';
import { toast } from 'sonner';

interface MarketingPostersProps {
  products: Product[];
  settings: CompanySettings;
}

type PosterType = 'promo' | 'new' | 'flash' | 'clearance';

export const MarketingPosters: React.FC<MarketingPostersProps> = ({ products, settings }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [posterType, setPosterType] = useState<PosterType>('promo');
  const [customText, setCustomText] = useState('');
  const [search, setSearch] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  const handlePrint = () => {
    if (!selectedProduct) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = {
      promo: { bg: '#ef4444', text: '#ffffff', sub: '#fee2e2', accent: '#fef3c7' },
      new: { bg: '#4f46e5', text: '#ffffff', sub: '#e0e7ff', accent: '#c7d2fe' },
      flash: { bg: '#f59e0b', text: '#000000', sub: '#fffbeb', accent: '#fef3c7' },
      clearance: { bg: '#000000', text: '#ffffff', sub: '#f3f4f6', accent: '#ffffff' }
    };

    const s = styles[posterType];
    const originalPrice = (selectedProduct.price * 1.25).toFixed(2);

    const html = `
      <html>
        <head>
          <title>Affiche - ${selectedProduct.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap');
            @page { size: A4; margin: 0; }
            body { 
              margin: 0; 
              font-family: 'Inter', sans-serif; 
              background: ${s.bg}; 
              color: ${s.text}; 
              height: 100vh;
              display: flex;
              flex-direction: column;
              padding: 60px;
              box-sizing: border-box;
            }
            .badge {
              background: ${s.accent};
              color: black;
              padding: 15px 40px;
              font-weight: 900;
              font-size: 40px;
              text-transform: uppercase;
              align-self: flex-start;
              border-radius: 10px;
              transform: rotate(-3deg);
              margin-bottom: 50px;
            }
            .product-name {
              font-size: 100px;
              font-weight: 900;
              line-height: 0.9;
              text-transform: uppercase;
              margin-bottom: 40px;
              word-break: break-word;
            }
            .description {
              font-size: 30px;
              opacity: 0.9;
              max-width: 80%;
              margin-bottom: auto;
            }
            .price-container {
              display: flex;
              align-items: baseline;
              gap: 30px;
              margin-top: 40px;
            }
            .old-price {
              font-size: 60px;
              text-decoration: line-through;
              opacity: 0.6;
              font-weight: 400;
            }
            .price {
              font-size: 220px;
              font-weight: 900;
              line-height: 1;
            }
            .currency {
              font-size: 80px;
              font-weight: 900;
              margin-left: 10px;
              opacity: 0.8;
            }
            .footer {
              margin-top: 60px;
              padding-top: 40px;
              border-top: 10px solid ${s.sub};
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .store-name {
              font-size: 40px;
              font-weight: 900;
            }
            .promo-text {
              font-size: 24px;
              font-weight: 700;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="badge">
            ${posterType === 'promo' ? 'Offre Spéciale' : posterType === 'new' ? 'Nouveauté' : posterType === 'flash' ? 'Vente Flash' : 'Liquidation'}
          </div>
          <div class="product-name">${selectedProduct.name}</div>
          <div class="description">${customText || selectedProduct.description || 'Profitez de nos meilleurs tarifs en magasin.'}</div>
          
          <div class="price-container">
            ${posterType === 'promo' || posterType === 'clearance' ? `<div class="old-price">${originalPrice}</div>` : ''}
            <div class="price">
              ${selectedProduct.price.toFixed(2)}<span class="currency">${settings.currency}</span>
            </div>
          </div>

          <div class="footer">
            <div>
              <div class="store-name">${settings.name}</div>
              <div class="promo-text">${settings.address || ''}</div>
            </div>
            <div class="promo-text">Valable jusqu'à épuisement des stocks</div>
          </div>
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    if (!previewRef.current || !selectedProduct) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: posterType === 'promo' ? '#ef4444' :
                         posterType === 'new' ? '#4f46e5' :
                         posterType === 'flash' ? '#fbbf24' : '#0f172a',
      });
      const link = document.createElement('a');
      link.download = `affiche_${selectedProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image téléchargée avec succès !");
    } catch (err) {
      console.error("Error generating image:", err);
      toast.error("Erreur lors de la génération de l'image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!previewRef.current || !selectedProduct) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const blob = await toBlob(previewRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: posterType === 'promo' ? '#ef4444' :
                         posterType === 'new' ? '#4f46e5' :
                         posterType === 'flash' ? '#fbbf24' : '#0f172a',
      });

      if (!blob) {
        toast.error("Échec de la génération de l'image pour le partage.");
        return;
      }

      const file = new File([blob], 'poster.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Affiche Promotionnelle - ${selectedProduct.name}`,
          text: `Découvrez ${selectedProduct.name} chez ${settings.name} !`
        });
        toast.success("Partagé avec succès !");
      } else {
        setIsShareModalOpen(true);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      setIsShareModalOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageToClipboard = async () => {
    if (!previewRef.current) return;
    try {
      const blob = await toBlob(previewRef.current, {
        quality: 0.95,
        backgroundColor: posterType === 'promo' ? '#ef4444' :
                         posterType === 'new' ? '#4f46e5' :
                         posterType === 'flash' ? '#fbbf24' : '#0f172a',
      });
      if (blob) {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        toast.success("Image copiée ! Vous pouvez la coller directement (Ctrl+V) sur WhatsApp, Telegram, etc.");
        setIsShareModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Votre navigateur ne supporte pas la copie d'images directes.");
    }
  };

  const shareToSocial = (platform: string) => {
    const text = encodeURIComponent(`Promo sur ${selectedProduct?.name || 'produit'} chez ${settings.name} !`);
    const url = encodeURIComponent(window.location.origin);
    let shareUrl = '';
    
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
    } else if (platform === 'whatsapp') {
      shareUrl = `https://api.whatsapp.com/send?text=${text}`;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
      toast.success("Redirection vers le réseau social...");
      setIsShareModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Affiches & Marketing</h3>
          <p className="text-sm text-white/40">Créez des visuels d'impact pour vos rayons et les réseaux sociaux.</p>
        </div>
        <Button variant="secondary" className="gap-2 border-white/10 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => setSelectedProduct(null)}>
          <X size={16} /> Réinitialiser
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <div className="space-y-6">
          <Card className="p-6 space-y-6 bg-white/5 border border-white/10 rounded-[2.5rem]">
            <div className="space-y-4">
              <label className="text-xs font-black text-white/40 uppercase tracking-widest block">1. Choisir le produit</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="w-full p-3.5 pl-11 bg-[#0a0a0f] border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-sm font-bold text-white transition-all placeholder:text-white/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              </div>
              
              {search && (
                <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 bg-[#0a0a0f] shadow-2xl">
                  {filteredProducts.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setSearch(''); }}
                      className="w-full p-4 text-left hover:bg-white/5 flex items-center justify-between transition-colors text-white"
                    >
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{p.name}</p>
                        <p className="text-xs text-white/40 font-mono mt-0.5">{p.sku}</p>
                      </div>
                      <p className="font-black text-indigo-400 font-mono text-sm">{p.price.toFixed(2)} {settings.currency}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedProduct && (
                <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 flex items-center justify-between text-white animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#0a0a0f] rounded-xl flex items-center justify-center border border-white/10">
                      <Star size={24} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase">{selectedProduct.name}</p>
                      <p className="text-xs text-indigo-400 font-medium">Prix: {selectedProduct.price.toFixed(2)} {settings.currency}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-indigo-400 hover:text-white transition-colors p-2"><X size={20} /></button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-white/40 uppercase tracking-widest block">2. Style de l'affiche</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'promo', label: 'Promotion', icon: Tag, color: 'bg-rose-500' },
                  { id: 'new', label: 'Nouveauté', icon: Star, color: 'bg-indigo-500' },
                  { id: 'flash', label: 'Vente Flash', icon: Zap, color: 'bg-amber-500' },
                  { id: 'clearance', label: 'Liquidation', icon: ArrowDown, color: 'bg-slate-900' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setPosterType(type.id as PosterType)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer",
                      posterType === type.id 
                        ? "border-indigo-500 ring-4 ring-indigo-500/15 bg-indigo-500/10" 
                        : "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg", type.color)}>
                      <type.icon size={20} />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-tight leading-none">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase tracking-widest block">3. Texte personnalisé (optionnel)</label>
              <textarea 
                placeholder="Ex: Qualité premium, stock limité..."
                className="w-full p-4 bg-[#0a0a0f] border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-sm font-bold text-white transition-all placeholder:text-white/20 h-24"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Button 
                className="w-full py-4 text-base font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
                disabled={!selectedProduct || isGenerating}
                onClick={handlePrint}
              >
                <Printer size={18} className="mr-2" /> Imprimer Format A4
              </Button>
              
              {selectedProduct && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                  <Button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                    variant="secondary"
                    className="py-3 text-xs font-black uppercase tracking-widest bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20 rounded-2xl"
                  >
                    <Download size={14} className="mr-2" /> Image PNG
                  </Button>
                  <Button 
                    onClick={handleShare}
                    disabled={isGenerating}
                    variant="secondary"
                    className="py-3 text-xs font-black uppercase tracking-widest bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 rounded-2xl"
                  >
                    <Share2 size={14} className="mr-2" /> Partager
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center justify-center p-4">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Aperçu du visuel</label>
          <div 
            ref={previewRef}
            className={cn(
              "w-[350px] aspect-[0.707] rounded-3xl shadow-2xl p-8 flex flex-col transition-all duration-500 relative overflow-hidden select-none border border-white/5",
              posterType === 'promo' ? 'bg-rose-500 text-white shadow-rose-500/5' :
              posterType === 'new' ? 'bg-indigo-600 text-white shadow-indigo-500/5' :
              posterType === 'flash' ? 'bg-amber-400 text-black shadow-amber-500/5' :
              'bg-slate-900 text-white shadow-slate-950'
            )}
          >
            {/* Dynamic Abstract Shapes for Premium Feeling */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

            <div className={cn(
              "self-start px-4 py-1.5 text-[10px] font-black uppercase rounded-lg mb-6 rotate-[-2deg] shadow-md border",
              posterType === 'flash' ? 'bg-black text-white border-black/10' : 'bg-white text-black border-white/10'
            )}>
              {posterType === 'promo' ? 'Offre Spéciale' : posterType === 'new' ? 'Nouveauté' : posterType === 'flash' ? 'Vente Flash' : 'Liquidation'}
            </div>
            
            <h4 className="text-3xl font-black uppercase leading-tight mb-4 text-wrap tracking-tighter drop-shadow-md">
              {selectedProduct?.name || 'Nom du Produit'}
            </h4>
            
            <p className="text-xs opacity-90 leading-relaxed mb-auto font-medium">
              {customText || selectedProduct?.description || 'Profitez de nos meilleurs tarifs en magasin aujourd\'hui.'}
            </p>

            <div className="mt-6 flex items-baseline gap-4">
               {(posterType === 'promo' || posterType === 'clearance') && (
                 <span className="text-xl line-through opacity-50 font-black font-mono">
                   {(selectedProduct ? selectedProduct.price * 1.25 : 129.99).toFixed(2)}
                 </span>
               )}
               <div className="text-6xl font-black tracking-tighter font-mono drop-shadow-md">
                 {selectedProduct?.price.toFixed(2) || '0.00'}<span className="text-2xl font-bold ml-1">{settings.currency}</span>
               </div>
            </div>

            <div className="mt-8 pt-5 border-t-2 border-white/10 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{settings.name}</p>
                <p className="text-[8px] opacity-60 leading-none">{settings.address || 'nexuspospro.com'}</p>
              </div>
              <ShoppingCart size={24} className="opacity-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <Modal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          title="Partager le visuel"
        >
          <div className="space-y-6 text-center print:hidden">
            <p className="text-sm text-slate-400 leading-relaxed">Sélectionnez le réseau social pour exporter ou copier l'image.</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={copyImageToClipboard}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-black uppercase text-xs tracking-wider flex flex-col items-center gap-3 cursor-pointer"
              >
                <Copy size={20} />
                WhatsApp / Clip
              </button>
              <button 
                onClick={() => shareToSocial('facebook')}
                className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-black uppercase text-xs tracking-wider flex flex-col items-center gap-3 cursor-pointer"
              >
                <span className="text-xl leading-none">🔵</span>
                Facebook
              </button>
              <button 
                onClick={() => shareToSocial('twitter')}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-black uppercase text-xs tracking-wider flex flex-col items-center gap-3 cursor-pointer"
              >
                <span className="text-xl leading-none">⚫</span>
                Twitter / X
              </button>
              <button 
                onClick={copyImageToClipboard}
                className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 transition-all font-black uppercase text-xs tracking-wider flex flex-col items-center gap-3 cursor-pointer"
              >
                <span className="text-xl leading-none">📸</span>
                Instagram
              </button>
            </div>
            <Button onClick={() => setIsShareModalOpen(false)} className="w-full py-3 text-xs font-black uppercase tracking-wider rounded-2xl">
              Fermer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
