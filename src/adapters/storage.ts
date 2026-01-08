/**
 * Storage adapter interface for cross-platform storage operations
 */
export interface IStorage {
  /**
   * Get a value from storage
   * @param key The storage key
   * @returns The stored value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in storage
   * @param key The storage key
   * @param value The value to store
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Remove a value from storage
   * @param key The storage key
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all values from storage
   */
  clear(): Promise<void>;

  /**
   * Get all keys in storage
   * @returns Array of storage keys
   */
  getAllKeys(): Promise<string[]>;

  /**
   * Get multiple values from storage
   * @param keys Array of storage keys
   * @returns Object with key-value pairs
   */
  multiGet(keys: string[]): Promise<Record<string, string | null>>;

  /**
   * Set multiple values in storage
   * @param items Object with key-value pairs
   */
  multiSet(items: Record<string, string>): Promise<void>;

  /**
   * Remove multiple values from storage
   * @param keys Array of storage keys
   */
  multiRemove(keys: string[]): Promise<void>;
}
