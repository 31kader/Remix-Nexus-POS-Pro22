/**
 * 🧵 NEXUS POS PRO - Off-thread Search & Barcode Worker
 * Handles token-based search indexing and O(1) barcode resolution off the main thread.
 */

export interface WorkerProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  reference?: string;
  supplier?: string;
  description?: string;
  price: number;
  costPrice?: number;
  stock: number;
  status?: string;
  categoryId?: string;
  brandId?: string;
  imageUrl?: string;
  tags?: string[];
  [key: string]: any;
}

interface IndexedItem {
  product: WorkerProduct;
  searchStr: string;
}

let productsList: WorkerProduct[] = [];
let indexedItems: IndexedItem[] = [];
const exactMap = new Map<string, WorkerProduct>();
const normalizedMap = new Map<string, WorkerProduct>();

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function rebuildIndex(products: WorkerProduct[]) {
  productsList = products || [];
  exactMap.clear();
  normalizedMap.clear();
  indexedItems = [];

  for (let i = 0; i < productsList.length; i++) {
    const p = productsList[i];
    if (!p) continue;

    // 1. Barcode / SKU maps for instant lookup
    const rawSku = (p.sku || '').trim().toLowerCase();
    const rawBc = (p.barcode || '').trim().toLowerCase();
    const rawRef = (p.reference || '').trim().toLowerCase();
    const rawId = (p.id || '').trim().toLowerCase();

    if (rawSku) exactMap.set(rawSku, p);
    if (rawBc) exactMap.set(rawBc, p);
    if (rawRef) exactMap.set(rawRef, p);
    if (rawId) exactMap.set(rawId, p);

    const normSku = rawSku.replace(/[^a-z0-9]/g, '');
    const normBc = rawBc.replace(/[^a-z0-9]/g, '');

    if (normSku) {
      normalizedMap.set(normSku, p);
    }
    if (normBc) {
      normalizedMap.set(normBc, p);
    }

    // 2. Tokenized search string for text search
    if (p.status !== 'inactive') {
      const searchStr = normalizeText(
        `${p.name || ''} ${p.sku || ''} ${p.barcode || ''} ${p.reference || ''} ${p.supplier || ''} ${p.description || ''} ${(p.tags || []).join(' ')}`
      );
      indexedItems.push({ product: p, searchStr });
    }
  }
}

function upsertSingleProduct(p: WorkerProduct) {
  if (!p || !p.id) return;
  const idx = productsList.findIndex(item => item.id === p.id);
  if (idx > -1) {
    productsList[idx] = p;
  } else {
    productsList.unshift(p);
  }

  const rawSku = (p.sku || '').trim().toLowerCase();
  const rawBc = (p.barcode || '').trim().toLowerCase();
  const rawRef = (p.reference || '').trim().toLowerCase();
  const rawId = (p.id || '').trim().toLowerCase();

  if (rawSku) exactMap.set(rawSku, p);
  if (rawBc) exactMap.set(rawBc, p);
  if (rawRef) exactMap.set(rawRef, p);
  if (rawId) exactMap.set(rawId, p);

  const normSku = rawSku.replace(/[^a-z0-9]/g, '');
  const normBc = rawBc.replace(/[^a-z0-9]/g, '');

  if (normSku) {
    normalizedMap.set(normSku, p);
  }
  if (normBc) {
    normalizedMap.set(normBc, p);
  }

  const itemIdx = indexedItems.findIndex(i => i.product.id === p.id);
  if (p.status !== 'inactive') {
    const searchStr = normalizeText(
      `${p.name || ''} ${p.sku || ''} ${p.barcode || ''} ${p.reference || ''} ${p.supplier || ''} ${p.description || ''} ${(p.tags || []).join(' ')}`
    );
    if (itemIdx > -1) {
      indexedItems[itemIdx] = { product: p, searchStr };
    } else {
      indexedItems.unshift({ product: p, searchStr });
    }
  } else if (itemIdx > -1) {
    indexedItems.splice(itemIdx, 1);
  }
}

function deleteSingleProduct(id: string) {
  if (!id) return;
  const p = productsList.find(x => x.id === id);
  productsList = productsList.filter(x => x.id !== id);
  indexedItems = indexedItems.filter(x => x.product.id !== id);
  if (p) {
    const rawSku = (p.sku || '').trim().toLowerCase();
    const rawBc = (p.barcode || '').trim().toLowerCase();
    const rawRef = (p.reference || '').trim().toLowerCase();
    const rawId = (p.id || '').trim().toLowerCase();
    if (rawSku) exactMap.delete(rawSku);
    if (rawBc) exactMap.delete(rawBc);
    if (rawRef) exactMap.delete(rawRef);
    if (rawId) exactMap.delete(rawId);

    const normSku = rawSku.replace(/[^a-z0-9]/g, '');
    const normBc = rawBc.replace(/[^a-z0-9]/g, '');
    if (normSku) {
      normalizedMap.delete(normSku);
    }
    if (normBc) {
      normalizedMap.delete(normBc);
    }
  }
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data || {};
  const id = data.id;
  const type = data.type;
  const payload = data.payload;

  try {
    switch (type) {
      case 'INDEX_PRODUCTS': {
        rebuildIndex(payload.products);
        self.postMessage({ id, type: 'INDEX_COMPLETE', count: productsList.length });
        break;
      }

      case 'UPSERT_SINGLE_PRODUCT': {
        if (payload && payload.product) {
          upsertSingleProduct(payload.product);
          self.postMessage({ id, type: 'INDEX_COMPLETE', count: productsList.length });
        }
        break;
      }

      case 'DELETE_SINGLE_PRODUCT': {
        if (payload && payload.id) {
          deleteSingleProduct(payload.id);
          self.postMessage({ id, type: 'INDEX_COMPLETE', count: productsList.length });
        }
        break;
      }

      case 'BATCH_DELETE_PRODUCTS': {
        if (payload && Array.isArray(payload.ids)) {
          payload.ids.forEach((delId: string) => deleteSingleProduct(delId));
          self.postMessage({ id, type: 'INDEX_COMPLETE', count: productsList.length });
        }
        break;
      }

      case 'SEARCH': {
        const query = normalizeText(payload.query || '');
        const limit = payload.limit || 80;

        if (!query) {
          const defaultResults = productsList
            .filter(p => p && p.status !== 'inactive')
            .slice(0, limit);
          self.postMessage({ id, type: 'SEARCH_RESULTS', results: defaultResults });
          return;
        }

        const tokens = query.split(/\s+/).filter(Boolean);
        const matches: WorkerProduct[] = [];
        const rawSearch = (payload.query || '').trim().toLowerCase();

        for (let i = 0; i < indexedItems.length; i++) {
          const item = indexedItems[i];
          const p = item.product;

          // Exact SKU / Barcode priority
          const bc = (p.barcode || '').trim().toLowerCase();
          const sku = (p.sku || '').trim().toLowerCase();
          if (bc === rawSearch || sku === rawSearch) {
            matches.unshift(p);
            continue;
          }

          let allTokensMatch = true;
          for (let j = 0; j < tokens.length; j++) {
            if (!item.searchStr.includes(tokens[j])) {
              allTokensMatch = false;
              break;
            }
          }

          if (allTokensMatch) {
            matches.push(p);
            if (matches.length >= limit) break;
          }
        }

        self.postMessage({ id, type: 'SEARCH_RESULTS', results: matches });
        break;
      }

      case 'LOOKUP_BARCODE': {
        const barcode = (payload.barcode || '').trim().toLowerCase();
        const normalized = barcode.replace(/[^a-z0-9]/g, '');

        let match = exactMap.get(barcode);
        if (!match && normalized) match = normalizedMap.get(normalized);

        self.postMessage({ id, type: 'LOOKUP_RESULT', product: match || null });
        break;
      }

      default:
        self.postMessage({ id, error: `Unknown action: ${type}` });
    }
  } catch (err: any) {
    self.postMessage({ id, error: err.message || 'Worker error' });
  }
};
