import { describe, it, expect } from "vitest";
import { calculateMargin } from "./margin";

describe("calculateMargin", () => {
  it("calcula margem positiva corretamente", () => {
    const result = calculateMargin({
      purchaseValue: 78000,
      additionalCosts: 2000,
      salePrice: 99900,
    });

    expect(result.totalCost).toBe(80000);
    expect(result.marginValue).toBe(19900);
    expect(result.marginPercent).toBeCloseTo(24.875, 2);
  });

  it("calcula margem negativa quando o preço de venda é menor que o custo", () => {
    const result = calculateMargin({
      purchaseValue: 50000,
      additionalCosts: 5000,
      salePrice: 48000,
    });

    expect(result.marginValue).toBe(-7000);
    expect(result.marginPercent).toBeLessThan(0);
  });

  it("não divide por zero quando não há custo", () => {
    const result = calculateMargin({ purchaseValue: 0, additionalCosts: 0, salePrice: 1000 });
    expect(result.marginPercent).toBe(0);
  });
});
