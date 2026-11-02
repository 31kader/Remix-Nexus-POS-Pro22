import { format } from 'date-fns';
import { toast } from 'sonner';

export function exportExpiryCsv(analyzedProducts: any[]): void {
  const headers = [
    'SKU/Code-barre',
    'Produit',
    'Date de peremption',
    'No de Lot / Batch',
    'Jours restants',
    'Statut',
    'Stock',
    'Unite',
    'Prix de Vente (DA)',
    'Prix d Purchase (DA)',
    'Valeur de Vente a risque (DA)',
    'Cout d Purchase a risque (DA)'
  ];

  const rows = analyzedProducts.map(p => [
    p.sku || '',
    p.name,
    p.expirationDate && p.expiryDate ? format(p.expiryDate, 'yyyy-MM-dd') : 'Non définie',
    p.batchNumber || '',
    p.hasExpiryDate ? p.daysLeft : 'N/A',
    p.expiryStatus === 'expired' ? 'Expire' : p.expiryStatus === 'critical' ? 'Critique' : p.expiryStatus === 'warning' ? 'A surveiller' : p.hasExpiryDate ? 'Normal' : 'Sans Date',
    p.stock,
    p.unit || '',
    p.price,
    p.costPrice || 0,
    p.stock * p.price,
    p.stock * (p.costPrice || 0)
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(r => r.map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(';'))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Rapport_Peremptions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  toast.success("Rapport CSV exporté avec succès !");
}
