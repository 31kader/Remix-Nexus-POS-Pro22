export function calculateCartonCostChange(
  val: number,
  unitsPerCarton: number
): { cartonCostPrice: number; unitCostPrice: number } {
  const cartonCostPrice = val;
  const unitCostPrice = unitsPerCarton > 0 ? Number((val / unitsPerCarton).toFixed(2)) : 0;
  return { cartonCostPrice, unitCostPrice };
}

export function calculateUnitCostChange(
  val: number,
  unitsPerCarton: number
): { cartonCostPrice: number; unitCostPrice: number } {
  const unitCostPrice = val;
  const cartonCostPrice = Number((val * unitsPerCarton).toFixed(2));
  return { cartonCostPrice, unitCostPrice };
}

export function calculateUnitsPerCartonChange(
  val: number,
  unitCostPrice: number,
  cartonCostPrice: number
): { unitsPerCarton: number; cartonCostPrice: number; unitCostPrice: number } {
  const safeVal = Math.max(1, val);
  let newCartonCost = cartonCostPrice;
  let newUnitCost = unitCostPrice;

  if (unitCostPrice > 0) {
    newCartonCost = Number((unitCostPrice * safeVal).toFixed(2));
  } else if (cartonCostPrice > 0) {
    newUnitCost = Number((cartonCostPrice / safeVal).toFixed(2));
  }

  return { unitsPerCarton: safeVal, cartonCostPrice: newCartonCost, unitCostPrice: newUnitCost };
}
