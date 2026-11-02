import { Product, CompanySettings } from '../../types';
import { CatalogPrintSettings, SocialTarget } from './catalogTypes';
import { buildCatalogHtml } from './catalogHtmlBuilder';

/**
 * Exporte le catalogue sous forme de fichier HTML autonome téléchargeable
 */
export const exportCatalogAsHtml = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings
): Promise<void> => {
  const html = await buildCatalogHtml(products, companySettings, printSettings);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `catalogue-${(companySettings.name || 'produits').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * Partage le catalogue via Web Share API native ou liens sociaux (WhatsApp, Telegram, Email)
 */
export const shareCatalog = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings,
  target: SocialTarget
): Promise<{ success: boolean; message: string }> => {
  const catalogName = printSettings.title || companySettings.name || 'Notre Catalogue';
  const shareText = `📦 ${catalogName}\n${printSettings.subtitle || ''}\n\n${products.length} article(s) disponible(s). Catalogue généré le ${new Date().toLocaleDateString('fr-FR')}.`;

  if (target === 'download') {
    await exportCatalogAsHtml(products, companySettings, printSettings);
    return { success: true, message: 'Catalogue téléchargé' };
  }

  if (target === 'webshare') {
    if (navigator.share) {
      try {
        const html = await buildCatalogHtml(products, companySettings, printSettings);
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], `catalogue-${Date.now()}.html`, { type: 'text/html' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: catalogName, text: shareText, files: [file] });
        } else {
          await navigator.share({ title: catalogName, text: shareText });
        }
        return { success: true, message: 'Catalogue partagé' };
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          return { success: false, message: 'Partage annulé ou non supporté' };
        }
        return { success: false, message: 'Partage annulé' };
      }
    } else {
      return { success: false, message: 'Partage natif non supporté sur ce navigateur' };
    }
  }

  const encodedText = encodeURIComponent(shareText);
  let url = '';
  
  if (target === 'whatsapp') {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  } else if (target === 'telegram') {
    url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedText}`;
  } else if (target === 'email') {
    const subject = encodeURIComponent(`Catalogue Produits - ${catalogName}`);
    url = `mailto:?subject=${subject}&body=${encodedText}`;
  }

  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true, message: 'Lien de partage ouvert' };
  }

  return { success: false, message: 'Cible de partage inconnue' };
};
