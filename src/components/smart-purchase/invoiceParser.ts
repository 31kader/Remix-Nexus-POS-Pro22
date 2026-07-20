import { Product, Supplier } from '../../types';
import { extractQtyAndPrice, cleanAndExtractOcrNumbers, isFuzzyNameMatch } from '../../utils/ocrUtils';

export const parseRawInvoiceText = (rawText: string, suppliers: Supplier[], products: Product[]) => {
    const text = rawText.replace(/\r/g, '');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    let supplierName = '';
    const matchedSupplier = suppliers.find(s => 
      text.toLowerCase().includes(s.name.toLowerCase()) || 
      (s.email && text.toLowerCase().includes(s.email.toLowerCase()))
    );
    if (matchedSupplier) {
      supplierName = matchedSupplier.name;
    } else {
      const supplierLine = lines.find(l => /fournisseur|supplier|vendu par|grossiste|société/i.test(l));
      if (supplierLine) {
        supplierName = supplierLine.replace(/fournisseur|supplier|vendu par|grossiste|société|:|#/gi, '').trim();
      } else {
        supplierName = lines[0] || "Fournisseur Hors-ligne";
      }
    }

    let invoiceNumber = '';
    const numRegexes = [
      /facture\s*(?:n[°o]?|num[eé]ro)?\s*[:#-]?\s*([a-zA-Z0-9-]+)/i,
      /facture\s+([a-zA-Z0-9-]+)/i,
      /ticket\s*(?:n[°o]?|num[eé]ro)?\s*[:#-]?\s*([a-zA-Z0-9-]+)/i,
      /ref\s*[:#-]?\s*([a-zA-Z0-9-]+)/i,
      /n[°o]\s*([a-zA-Z0-9-]+)/i
    ];
    for (let rx of numRegexes) {
      const match = text.match(rx);
      if (match && match[1]) {
        invoiceNumber = match[1].trim();
        break;
      }
    }
    if (!invoiceNumber) {
      invoiceNumber = "FA-" + new Date().getFullYear() + Math.random().toString().substring(2,6);
    }

    let receptionDate = new Date().toISOString().split('T')[0];
    const dateMatch = text.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/);
    if (dateMatch) {
      const year = dateMatch[3];
      const month = dateMatch[2];
      const day = dateMatch[1];
      receptionDate = `${year}-${month}-${day}`;
    }

    let totalAmount = 0;
    const balanceRegexes = [
      /total\s*[:#-]?\s*([\d\s,.]+)/i,
      /net[^:]*[:#-]?\s*([\d\s,.]+)/i,
      /montant[^:]*[:#-]?\s*([\d\s,.]+)/i,
      /rs\s*([\d\s,.]+)/i
    ];
    for (let rx of balanceRegexes) {
      const match = text.match(rx);
      if (match && match[1]) {
        const valStr = match[1].replace(/\s/g, '').replace(',', '.');
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > totalAmount) {
          totalAmount = val;
        }
      }
    }

    const isPosScreenshot = text.toLowerCase().includes("ticket") || text.toLowerCase().includes("caisse");

    const extractedItems: any[] = [];
    const itemStartRegex = /qte|quantite|designation|article|prix|p\.u/i;
    let inItemSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (itemStartRegex.test(line)) {
        inItemSection = true;
        continue;
      }
    }

    const detectedProductIds = new Set<string>();

    const isUiNoiseLine = (lineStr: string): boolean => {
      const lower = lineStr.toLowerCase();
      const noiseKeywords = [
        'wifi', 'lte', '4g', '5g', 'bluetooth', 'volte', 'battery', '%',
        'am', 'pm', 'clock', 'home', 'back', 'recent', 'sim', 'volet',
        'camera', 'flash', 'settings', 'message', 'call', 'app',
        'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'
      ];
      return noiseKeywords.some(kw => lower.includes(kw)) || /^\d{2}:\d{2}/.test(lineStr);
    };

    const matchSkuInLine = (sku: string, lineText: string): boolean => {
      if (!sku) return false;
      const cleanSku = sku.trim().toLowerCase();
      const cleanLine = lineText.trim().toLowerCase();
      
      if (cleanSku.length <= 3) {
        const tokens = cleanLine.split(/[\s,.;:!?()\[\]]/).filter(Boolean);
        return tokens.includes(cleanSku);
      }
      
      if (cleanSku.length >= 8 && /\d/.test(cleanSku)) {
        const tokens = cleanLine.split(/[\s,;:!?()\[\]]/).filter(Boolean);
        for(const token of tokens) {
          const cleanToken = token.replace(/\.+$/, '');
          if (cleanToken === cleanSku) return true;
        }
      }

      const escapedSku = cleanSku.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\b' + escapedSku + '\\b');
      return regex.test(cleanLine);
    };

    const findNumericRelation = (values: number[]) => {
      if (values.length < 2) return null;
      if (values.length === 2 && values[0] > 0 && values[1] > 0) {
        return { qty: Math.min(values[0], values[1]), price: Math.max(values[0], values[1]) };
      }
      
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values.length; j++) {
          if (i === j) continue;
          const product = values[i] * values[j];
          for (let k = 0; k < values.length; k++) {
            if (k === i || k === j) continue;
            
            const diff = Math.abs(product - values[k]);
            const pctDiff = product > 0 ? diff / product : 0;
            
            if (pctDiff < 0.05) { 
              const qtyVal = Math.min(values[i], values[j]);
              const priceVal = Math.max(values[i], values[j]);
              return { qty: qtyVal, price: priceVal };
            }
          }
        }
      }
      
      const sorted = [...values].sort((a, b) => a - b);
      if (sorted.length >= 3) {
        let bestQty = sorted[0];
        let bestPrice = sorted[sorted.length - 2]; 
        for (let n of sorted) {
          if (n > 0 && n < 100 && Number.isInteger(n)) bestQty = n;
        }
        return { qty: bestQty, price: bestPrice };
      }
      
      return null;
    };


    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isUiNoiseLine(line)) continue;
      if (line.match(/^\s*[\d.]{1,5}\s*$/)) continue; 

      const lowerLine = line.toLowerCase();
      const matchingProduct = products.find(p => {
        if (p.sku && matchSkuInLine(p.sku, line)) return true;
        if (p.barcode && matchSkuInLine(p.barcode, line)) return true;
        
        if (isFuzzyNameMatch(p.name, line)) {
          const hasCurrency = lowerLine.includes("da") || lowerLine.includes("dinar") || lowerLine.includes("rs");
          const hasDecimalValue = /,\d{2}\b|\.\d{2}\b/.test(line);
          const hasCodeOrQty = /\b\d{6,}\b|\b1,00\b/.test(line);
          if (hasCurrency || hasDecimalValue || hasCodeOrQty || rawText.length < 500) {
            return true;
          }
        }
        return false;
      });

      if (matchingProduct && !detectedProductIds.has(matchingProduct.id)) {
        const values = cleanAndExtractOcrNumbers(line);
        if (values.length === 0 && i < lines.length - 1) {
          const nextVal = cleanAndExtractOcrNumbers(lines[i+1]);
          const valuesFiltered = nextVal.filter(v => v !== parseFloat(matchingProduct.sku || '0') && v !== parseFloat(matchingProduct.barcode || '0'));
          
          if (valuesFiltered.length > 0) values.push(...valuesFiltered);
        }

        const referencePrice = matchingProduct.costPrice || matchingProduct.price;
        const ocrMetrics = extractQtyAndPrice(values, referencePrice);
        
        extractedItems.push({
          productId: matchingProduct.id,
          name: matchingProduct.name,
          qty: ocrMetrics.qty,
          price: ocrMetrics.price,
          stockTendu: false
        });
        detectedProductIds.add(matchingProduct.id);
      } else {
        const values = cleanAndExtractOcrNumbers(line);
        if (values.length >= 2) {
          const nameTokens = line
            .split(/\s+/)
            .filter(t => isNaN(parseFloat(t.replace(',', '.'))) && !t.toLowerCase().match(/^(da|dinar|dzd|qte|prix|total|ref|rs)$/i));
          
          if (nameTokens.length > 0 && nameTokens.join(' ').length > 3) {
            const candidateName = nameTokens.join(' ');
            
            const isAlreadyAdded = extractedItems.some(item => isFuzzyNameMatch(candidateName, item.name));
            if (!isAlreadyAdded) {
              const relation = findNumericRelation(values);
              const qty = relation?.qty || (values[0] < values[1] ? values[0] : values[1]);
              const price = relation?.price || (values[0] > values[1] ? values[0] : values[1]);
              
              extractedItems.push({
                productId: Math.random().toString(), 
                name: candidateName,
                qty: Math.max(1, qty),
                price: Math.max(1, price),
                stockTendu: false,
                isDraft: true
              });
            }
          }
        }
      }
    }

    return {
      supplierName,
      invoiceNumber,
      receptionDate,
      totalAmount,
      items: extractedItems,
      isPosScreenshot
    };
  };
