/**
 * Object utility functions
 */

/**
 * Removes all keys with null, undefined, or empty string values from an object
 * @param obj - The object to clean
 * @returns A new object with cleaned values
 */
export function clearObject<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return {} as Partial<T>;
  }

  const cleaned: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip null, undefined, or empty string values
    if (value !== null && value !== undefined && value !== '') {
      // Handle nested objects recursively
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = clearObject(value);
        // Only add nested object if it has properties after cleaning
        if (Object.keys(cleanedNested).length > 0) {
          (cleaned as any)[key] = cleanedNested;
        }
      } else {
        (cleaned as any)[key] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Removes all keys with null, undefined, or empty string values from an object (shallow)
 * @param obj - The object to clean
 * @returns A new object with cleaned values (only top-level cleaning)
 */
export function clearObjectShallow<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return {} as Partial<T>;
  }

  const cleaned: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip null, undefined, or empty string values
    if (value !== null && value !== undefined && value !== '') {
      (cleaned as any)[key] = value;
    }
  }

  return cleaned;
}

/**
 * Checks if a value is considered "empty" (null, undefined, or empty string)
 * @param value - The value to check
 * @returns True if the value is considered empty
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Checks if an object has any non-empty values
 * @param obj - The object to check
 * @returns True if the object has at least one non-empty value
 */
export function hasNonEmptyValues<T extends Record<string, any>>(obj: T): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return Object.values(obj).some(value => !isEmpty(value));
}