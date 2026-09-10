export interface MarginInput {
  purchaseValue: number;
  additionalCosts: number;
  salePrice: number;
}

export interface MarginResult {
  totalCost: number;
  marginValue: number;
  marginPercent: number;
}

export function calculateMargin({ purchaseValue, additionalCosts, salePrice }: MarginInput): MarginResult {
  const totalCost = purchaseValue + additionalCosts;
  const marginValue = salePrice - totalCost;
  const marginPercent = totalCost > 0 ? (marginValue / totalCost) * 100 : 0;

  return { totalCost, marginValue, marginPercent };
}
