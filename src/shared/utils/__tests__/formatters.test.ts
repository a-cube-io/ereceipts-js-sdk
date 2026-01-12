import { formatDecimal } from '../formatters';

describe('formatDecimal', () => {
  it('should return undefined for undefined input', () => {
    const result = formatDecimal(undefined);

    expect(result).toBeUndefined();
  });

  it('should format "1" to "1.00"', () => {
    const result = formatDecimal('1');

    expect(result).toBe('1.00');
  });

  it('should format "10" to "10.00"', () => {
    const result = formatDecimal('10');

    expect(result).toBe('10.00');
  });

  it('should format "1.5" to "1.50"', () => {
    const result = formatDecimal('1.5');

    expect(result).toBe('1.50');
  });

  it('should round "1.567" to "1.57"', () => {
    const result = formatDecimal('1.567');

    expect(result).toBe('1.57');
  });

  it('should format with 3 decimals when specified', () => {
    const result = formatDecimal('1', 3);

    expect(result).toBe('1.000');
  });

  it('should preserve non-numeric string "abc" (NaN case)', () => {
    const result = formatDecimal('abc');

    expect(result).toBe('abc');
  });

  it('should format "0" to "0.00"', () => {
    const result = formatDecimal('0');

    expect(result).toBe('0.00');
  });

  it('should format negative numbers correctly', () => {
    const result = formatDecimal('-10.5');

    expect(result).toBe('-10.50');
  });

  it('should handle very large numbers', () => {
    const result = formatDecimal('1234567890.1');

    expect(result).toBe('1234567890.10');
  });

  it('should handle numbers with many decimal places', () => {
    const result = formatDecimal('3.14159265359');

    expect(result).toBe('3.14');
  });

  it('should round correctly (2.555 -> 2.56)', () => {
    // Note: JavaScript toFixed has quirks with certain floating-point values
    // 2.555 rounds correctly unlike 1.555 due to binary representation
    const result = formatDecimal('2.555');

    expect(result).toBe('2.56');
  });

  it('should round down correctly (1.554 -> 1.55)', () => {
    const result = formatDecimal('1.554');

    expect(result).toBe('1.55');
  });

  it('should handle empty string as NaN (preserve it)', () => {
    const result = formatDecimal('');

    // parseFloat('') returns NaN, so the original value is returned
    expect(result).toBe('');
  });

  it('should format with 0 decimals when specified', () => {
    const result = formatDecimal('1.99', 0);

    expect(result).toBe('2');
  });

  it('should format with 4 decimals when specified', () => {
    const result = formatDecimal('1.5', 4);

    expect(result).toBe('1.5000');
  });
});
