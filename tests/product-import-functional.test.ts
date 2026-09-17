import { describe, it, expect } from 'vitest';
import { parseNumericValue, calculateDefaultCostPrice } from '../src/hooks/useProductImport';

describe('Product CSV & Excel Numeric Parsing', () => {
  it('correctly parses international and local currency number formats', () => {
    // English/Excel comma thousand separator + dot decimal
    expect(parseNumericValue('378,480.00')).toBe(378480);
    expect(parseNumericValue('1,050.00')).toBe(1050);
    expect(parseNumericValue('1,558,398,160.29 DA ')).toBe(1558398160.29);

    // Standard decimals and floats
    expect(parseNumericValue('686.07')).toBe(686.07);
    expect(parseNumericValue('440.00')).toBe(440);
    expect(parseNumericValue('130.00')).toBe(130);

    // European dot thousand separator + comma decimal
    expect(parseNumericValue('1.250,50')).toBe(1250.50);
    expect(parseNumericValue('130,00')).toBe(130);

    // Empty or zero
    expect(parseNumericValue('')).toBe(0);
    expect(parseNumericValue(null)).toBe(0);
    expect(parseNumericValue(undefined)).toBe(0);
    expect(parseNumericValue(0)).toBe(0);
  });

  it('correctly applies the automatic default cost price rule (Selling Price - 10%)', () => {
    // 100 DA -> 90 DA (-10%)
    expect(calculateDefaultCostPrice(100)).toBe(90);

    // 1500 DA -> 1350 DA (-10%)
    expect(calculateDefaultCostPrice(1500)).toBe(1350);

    // 250.50 DA -> 225.45 DA (-10%)
    expect(calculateDefaultCostPrice(250.50)).toBe(225.45);

    // 0 DA or negative -> 0
    expect(calculateDefaultCostPrice(0)).toBe(0);
    expect(calculateDefaultCostPrice(-50)).toBe(0);
  });
});
