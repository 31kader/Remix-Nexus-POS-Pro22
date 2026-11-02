import { Customer, Transaction, CompanySettings } from '../../types';
import { printCustomerStatement } from '../../services/documentPrintService';
import { toast } from 'sonner';

export function executePrintCustomerStatement(
  customer: Customer,
  transactions: Transaction[],
  settings: CompanySettings
) {
  if (!customer) return;
  printCustomerStatement(customer, transactions, settings);
  toast.success(`Génération du relevé de compte pour ${customer.name}`);
}

export function executeOpenCustomerWhatsApp(
  phone: string,
  templateOrText: string | undefined,
  customer: Customer | undefined,
  settings: CompanySettings
) {
  if (!phone) {
    toast.error("Numéro de téléphone non renseigné.");
    return;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  let text = '';
  const storeName = settings.name || 'Nexus POS Pro';
  const curr = settings.currency || 'DA';

  if (templateOrText === 'debt' && customer) {
    const debtAmount = Math.abs(Number(customer.balance) || 0).toFixed(2);
    text = `Bonjour ${customer.name || ''},\n\nNous vous informons que votre solde débiteur auprès de *${storeName}* est actuellement de *${debtAmount} ${curr}*.\n\nMerci de bien vouloir passer au magasin pour régulariser votre compte.\nCordialement,\n${storeName}`;
  } else if (templateOrText === 'points' && customer) {
    text = `Bonjour ${customer.name || ''},\n\nVous disposez actuellement de *${customer.loyaltyPoints || 0} points fidélité* chez *${storeName}* ! 🎉\nMerci pour votre fidélité et à bientôt dans notre magasin !`;
  } else if (templateOrText && templateOrText !== 'custom') {
    text = templateOrText;
  }

  const url = text 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${cleanPhone}`;
  window.open(url, '_blank');
}
