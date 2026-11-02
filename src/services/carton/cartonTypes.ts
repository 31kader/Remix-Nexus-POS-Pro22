import { Product } from '../../types';

export interface CartonIntakeItem {
  id: string;
  productId: string;
  productName: string;
  cartonPhotoUrl: string;
  cartonCount: number;         // e.g. 5 cartons
  unitsPerCarton: number;      // e.g. 12 pieces/carton
  totalUnits: number;          // e.g. 60 units (cartonCount * unitsPerCarton)
  cartonCostPrice: number;     // Purchase price per carton (e.g. 1200 DA)
  unitCostPrice: number;       // Purchase price per piece (e.g. 100 DA)
  totalCostAmount: number;     // e.g. 6000 DA
  timestamp: string;
  agentName?: string;
  notes?: string;
}

export interface CartonTemplate {
  id: string;
  productId: string;
  productName: string;
  unitsPerCarton: number;      // e.g. 12
  cartonCostPrice: number;     // e.g. 1200 DA (Prix d'achat par carton)
  unitCostPrice: number;       // e.g. 100 DA (Prix d'achat unitaire)
  retailPrice?: number;        // e.g. 1500 DA (Prix de détail par carton)
  wholesalePrice?: number;     // e.g. 1350 DA (Prix de gros par carton)
  sku?: string;                // e.g. CART-001 ou visuel
  cartonPhotoUrl: string;      // Photo du carton / pack (SKU visuel)
  barcode?: string;            // Code-barres imprimé sur le carton (ITF-14 / EAN-13, facultatif)
  productBarcode?: string;     // Code-barres de l'article individuel
  dHash?: string;              // Empreinte visuelle 64 bits (Difference Hash)
  colorSignature?: [number, number, number]; // Moyenne [R, G, B]
  updatedAt: string;
  usageCount: number;
}

export interface CartonRecognitionResult {
  template: CartonTemplate;
  product: Product;
  confidence: number;
  method: 'barcode' | 'visual_hash' | 'product_barcode';
  detectedBarcode?: string;
}

export interface CartonBarcodeMatch {
  type: 'carton';
  template: CartonTemplate;
  product: Product;
  multiplier: number;
  cartonCount: number;
  unitsPerCarton: number;
  cartonCostPrice: number;
  unitCostPrice: number;
  cartonPhotoUrl: string;
  imageUrl: string;
}

export interface ProductBarcodeMatch {
  type: 'product';
  product: Product;
  multiplier: number;
}

export type BarcodeResolutionResult = CartonBarcodeMatch | ProductBarcodeMatch | null;
