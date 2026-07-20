import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DamagedRecord, Product } from '../../../types';
import { formatSafe } from '../../../lib/utils';

interface UseLossReportLogicProps {
  damagedRecords: DamagedRecord[];
  products: Product[];
}

export function useLossReportLogic({ damagedRecords, products }: UseLossReportLogicProps) {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    return damagedRecords
      .filter(r => {
        const product = products.find(p => p.id === r.productId);
        const matchesSearch = r.productName.toLowerCase().includes(search.toLowerCase()) || 
                             r.reason.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || (product && product.categoryId === selectedCategory);
        const matchesDate = r.date >= new Date(dateRange.start).toISOString() && 
                           r.date <= new Date(dateRange.end + 'T23:59:59').toISOString();
        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [damagedRecords, search, selectedCategory, dateRange, products]);

  const stats = useMemo(() => {
    const totalValue = filteredRecords.reduce((sum, r) => {
      const product = products.find(p => p.id === r.productId);
      return sum + (Number(r.quantity) * (product?.price || 0));
    }, 0);

    const totalCost = filteredRecords.reduce((sum, r) => {
      const product = products.find(p => p.id === r.productId);
      return sum + (Number(r.quantity) * (product?.costPrice || 0));
    }, 0);

    const count = filteredRecords.length;
    const itemsCount = filteredRecords.reduce((sum, r) => sum + Number(r.quantity), 0);

    return { totalValue, totalCost, count, itemsCount };
  }, [filteredRecords, products]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Produit / SKU',
      'Quantite',
      'Unite',
      'Raison / Notes',
      'Prix de Vente Unitaire (CFA)',
      'Prix de Cout Unitaire (CFA)',
      'Valeur de Vente Perdue (CFA)',
      'Cout dAchat Perdu (CFA)',
      'Operateur'
    ];

    const rows = filteredRecords.map(r => {
      const product = products.find(p => p.id === r.productId);
      const salePrice = product?.price || 0;
      const costPrice = product?.costPrice || 0;
      return [
        formatSafe(r.date, 'yyyy-MM-dd HH:mm'),
        `${r.productName} (${product?.sku || '---'})`,
        r.quantity,
        product?.unit || 'unite',
        r.reason,
        salePrice,
        costPrice,
        r.quantity * salePrice,
        r.quantity * costPrice,
        r.userName
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(';'))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport_pertes_${dateRange.start}_a_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    if (!doc) return;
    
    const iframeDoc = (doc as any).document || doc;

    const itemsHtml = filteredRecords.map(r => {
      const product = products.find(p => p.id === r.productId);
      const saleVal = r.quantity * (product?.price || 0);
      const costVal = r.quantity * (product?.costPrice || 0);
      
      return `
        <tr style="border-bottom: 1px solid #efefef;">
          <td style="padding: 10px 8px; font-size: 11px;">
            <span style="font-weight: bold; color: #111;">${r.productName}</span>
            <div style="font-size: 9px; color: #888; font-family: monospace;">SKU: ${product?.sku || '---'}</div>
          </td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center;">${formatSafe(r.date, 'dd/MM/yyyy HH:mm')}</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center; font-weight: bold; color: #e11d48;">${r.quantity} ${product?.unit || 'unites'}</td>
          <td style="padding: 10px 8px; font-size: 11px; color: #555;">${r.reason}</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: right; font-family: monospace; color: #e11d48; font-weight: bold;">-${saleVal.toLocaleString()} CFA</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: right; font-family: monospace; color: #666;">-${costVal.toLocaleString()} CFA</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center; color: #666;">${r.userName}</td>
        </tr>
      `;
    }).join('');

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Rapport de Pertes - Nexus POS</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
              background: white;
              padding: 0;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e11d48; padding-bottom: 15px; margin-bottom: 20px; align-items: flex-end;">
               <div>
                  <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; color: #111; font-weight: 900; letter-spacing: 1px;">RAPPORT DE PERTES</h1>
                  <p style="margin: 4px 0 0 0; color: #666; font-size: 10px; letter-spacing: 0.5px; font-weight: bold;">Période: du ${format(new Date(dateRange.start), 'dd/MM/yyyy')} au ${format(new Date(dateRange.end), 'dd/MM/yyyy')}</p>
               </div>
               <div style="text-align: right;">
                  <div style="font-weight: 900; font-size: 15px; text-transform: uppercase; color: #e11d48;">NEXUS POS PRO</div>
                  <div style="font-size: 10px; color: #555; margin-top: 2px;">Rapport de Démarque / Casse</div>
               </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px;">
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">VALEUR VENTE PERDUE</div>
                <div style="font-size: 14px; font-weight: 900; color: #e11d48; margin-top: 3px;">${stats.totalValue.toLocaleString()} CFA</div>
              </div>
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">COÛT ACHAT PERDU</div>
                <div style="font-size: 14px; font-weight: 900; color: #e11d48; margin-top: 3px;">${stats.totalCost.toLocaleString()} CFA</div>
              </div>
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">ARTICLES</div>
                <div style="font-size: 14px; font-weight: 900; color: #111; margin-top: 3px;">${stats.itemsCount}</div>
              </div>
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">NBRE RAPPORTS</div>
                <div style="font-size: 14px; font-weight: 900; color: #111; margin-top: 3px;">${stats.count}</div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
               <thead>
                  <tr style="background-color: #e11d48; color: white;">
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: left; font-weight: 900; letter-spacing: 0.5px; width: 30%;">Article</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 15%;">Date & Heure</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Quantité</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: left; font-weight: 900; letter-spacing: 0.5px; width: 18%;">Raison</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: right; font-weight: 900; letter-spacing: 0.5px; width: 13%;">Vente Perdue</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: right; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Coût Perdu</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Opérateur</th>
                   </tr>
               </thead>
               <tbody>
                  ${itemsHtml}
               </tbody>
            </table>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
               <div style="font-size: 9px; color: #aaa;">Généré via Nexus POS Pro - Logiciel certifié de Gestion de Caisse</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              try {
                window.focus();
                window.print();
              } catch (e) {
                console.error("Print failed:", e);
              }
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 15000);
  };

  return {
    search,
    setSearch,
    dateRange,
    setDateRange,
    selectedCategory,
    setSelectedCategory,
    filteredRecords,
    stats,
    handleExportCSV,
    handlePrintPDF
  };
}
