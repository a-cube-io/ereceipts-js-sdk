export type Cleaned<T> = T extends (infer U)[]
  ? Cleaned<U>[]
  : T extends object
    ? {
        [K in keyof T as T[K] extends null | undefined | '' ? never : K]: Cleaned<T[K]>;
      }
    : T;

export function clearObject<T>(input: T): Cleaned<T> {
  if (input === null || input === undefined || input === '') {
    return undefined as unknown as Cleaned<T>;
  }

  if (Array.isArray(input)) {
    const cleanedArray = input
      .map((item) => clearObject(item))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);
    return cleanedArray as unknown as Cleaned<T>;
  }

  if (typeof input === 'object' && input.constructor === Object) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const cleanedValue = clearObject(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned as Cleaned<T>;
  }

  return input as Cleaned<T>;
}

export type CleanedShallow<T> = {
  [K in keyof T as T[K] extends null | undefined | '' ? never : K]: T[K];
};

export function clearObjectShallow<T extends Record<string, unknown>>(obj: T): CleanedShallow<T> {
  if (!obj || typeof obj !== 'object') {
    return {} as CleanedShallow<T>;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned as CleanedShallow<T>;
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function hasNonEmptyValues<T extends Record<string, unknown>>(obj: T): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return Object.values(obj).some((value) => !isEmpty(value));
}
