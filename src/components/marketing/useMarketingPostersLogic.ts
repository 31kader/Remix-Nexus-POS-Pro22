import { useState, useRef, useMemo } from 'react';
import { Product, CompanySettings } from '../../types';
import { toPng, toBlob } from 'html-to-image';
import { toast } from 'sonner';
import { PosterType, PosterFormat, MARKETING_THEMES } from './marketingTypes';
import { printMarketingPoster } from './services/marketingPosterPrintHtml';

export interface UseMarketingPostersLogicProps {
  products: Product[];
  settings: CompanySettings;
}

export function useMarketingPostersLogic({ products, settings }: UseMarketingPostersLogicProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [posterType, setPosterType] = useState<PosterType>('promo');
  const [posterFormat, setPosterFormat] = useState<PosterFormat>('a4-portrait');
  const [customText, setCustomText] = useState('');
  const [customBadge, setCustomBadge] = useState('');
  const [search, setSearch] = useState('');
  
  // Image & QR Toggles
  const [showImage, setShowImage] = useState(true);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrContent, setQrContent] = useState('');

  // Discount & Pricing
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [customOldPrice, setCustomOldPrice] = useState<string>('');
  const [showOldPrice, setShowOldPrice] = useState<boolean>(true);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customProductImage, setCustomProductImage] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  }, [products, search]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCustomProductImage('');
    setSearch('');
    const basePrice = Number(product.price) || 0;
    const initialOld = basePrice > 0 ? (basePrice * 1.25).toFixed(2) : '';
    setCustomOldPrice(initialOld);
    if (!qrContent) {
      setQrContent(settings.phone || settings.name || 'https://nexuspospro.com');
    }
  };

  const applyDiscountPercent = (pct: number) => {
    setDiscountPercent(pct);
    if (!selectedProduct) return;
    const currentPrice = Number(selectedProduct.price) || 0;
    if (pct > 0 && currentPrice > 0) {
      const calculatedOld = (currentPrice / (1 - pct / 100)).toFixed(2);
      setCustomOldPrice(calculatedOld);
      setShowOldPrice(true);
    } else {
      setShowOldPrice(false);
    }
  };

  const activeTheme = MARKETING_THEMES[posterType];
  const currentBadgeText = customBadge.trim() || activeTheme.badgeDefault;
  const safePrice = Number(selectedProduct?.price) || 0;
  const safeOldPrice = Number(customOldPrice) || (safePrice > 0 ? safePrice * 1.25 : 0);
  const currency = settings.currency || 'DA';
  const productImage = customProductImage || (selectedProduct?.imageUrl || (selectedProduct as any)?.image) || '';

  const handlePrint = () => {
    if (!selectedProduct) return;
    printMarketingPoster({
      product: selectedProduct,
      posterType,
      posterFormat,
      currentBadgeText,
      customText,
      showOldPrice,
      safeOldPrice,
      safePrice,
      currency,
      showImage,
      productImage,
      settings
    });
  };

  const handleDownload = async () => {
    if (!previewRef.current || !selectedProduct) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 120));
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: activeTheme.bgHex
      });
      const link = document.createElement('a');
      link.download = `affiche_${posterFormat}_${(selectedProduct?.name || 'produit').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image HD téléchargée avec succès !");
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
      await new Promise(r => setTimeout(r, 120));
      const blob = await toBlob(previewRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: activeTheme.bgHex
      });

      if (!blob) {
        toast.error("Échec de la génération de l'image.");
        return;
      }

      const file = new File([blob], 'affiche_promo.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${currentBadgeText} - ${selectedProduct.name}`,
          text: `Découvrez ${selectedProduct.name} chez ${settings.name || 'notre magasin'} !`
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
        backgroundColor: activeTheme.bgHex
      });
      if (blob) {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        toast.success("Image copiée ! Vous pouvez la coller directement (Ctrl+V) sur WhatsApp, Telegram, etc.");
        setIsShareModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Votre navigateur ne supporte pas la copie directe d'images.");
    }
  };

  const shareToSocial = (platform: string) => {
    const text = encodeURIComponent(`📢 ${currentBadgeText} : ${selectedProduct?.name || 'Produit'} chez ${settings.name} ! Prix : ${safePrice.toFixed(2)} ${currency}`);
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

  return {
    selectedProduct,
    setSelectedProduct,
    posterType,
    setPosterType,
    posterFormat,
    setPosterFormat,
    customText,
    setCustomText,
    customBadge,
    setCustomBadge,
    search,
    setSearch,
    showImage,
    setShowImage,
    showQrCode,
    setShowQrCode,
    qrContent,
    setQrContent,
    discountPercent,
    setDiscountPercent,
    customOldPrice,
    setCustomOldPrice,
    showOldPrice,
    setShowOldPrice,
    isShareModalOpen,
    setIsShareModalOpen,
    isGenerating,
    previewRef,
    filteredProducts,
    handleSelectProduct,
    applyDiscountPercent,
    activeTheme,
    currentBadgeText,
    safePrice,
    safeOldPrice,
    currency,
    productImage,
    setCustomProductImage,
    handlePrint,
    handleDownload,
    handleShare,
    copyImageToClipboard,
    shareToSocial
  };
}
