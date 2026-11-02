import { toast } from 'sonner';
import { Product } from '../../types';
import { resolveBarcodeOrCarton, CartonTemplate } from '../../services/cartonIntakeService';

export function handlePurchaseBarcodeResolution(
  barcode: string,
  products: Product[],
  cartonTemplates: CartonTemplate[],
  addToCart: (item: any) => void,
  setIsPurchaseScannerOpen: (isOpen: boolean) => void
): void {
  const res = resolveBarcodeOrCarton(barcode, products, cartonTemplates);

  if (res?.type === 'carton') {
    addToCart({
      productId: res.product.id,
      productName: res.product.name,
      cartonCount: res.cartonCount,
      unitsPerCarton: res.unitsPerCarton,
      cartonCostPrice: res.cartonCostPrice,
      costPrice: res.unitCostPrice,
      cartonPhotoUrl: res.cartonPhotoUrl,
      imageUrl: res.cartonPhotoUrl || res.product.imageUrl
    });
    toast.success(`📦 Carton ajouté : ${res.product.name} (${res.cartonCount} ct × ${res.unitsPerCarton} = ${res.cartonCount * res.unitsPerCarton} pcs)`);
  } else if (res?.type === 'product') {
    addToCart({ ...res.product, quantity: res.multiplier || 1 });
    toast.success(`Produit ajouté : ${res.product.name}`);
  } else {
    toast.error(`Aucun produit ni carton trouvé avec le code-barres : ${barcode}`);
  }
  setIsPurchaseScannerOpen(false);
}
