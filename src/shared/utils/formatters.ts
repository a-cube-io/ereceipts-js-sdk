/**
 * Formats a numeric string value to have exactly the specified number of decimal places.
 * E.g., "1" → "1.00", "10" → "10.00", "1.5" → "1.50"
 * Returns undefined for undefined input (preserves optional fields).
 *
 * @param value - The string value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string or undefined if input is undefined
 */
export function formatDecimal(value: string | undefined, decimals: number = 2): string | undefined {
  if (value === undefined) return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(decimals);
}
