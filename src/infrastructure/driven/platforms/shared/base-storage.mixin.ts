import { ISecureStoragePort, IStoragePort } from '@/application/ports/driven';

/**
 * Base interface for storage adapters that implement get/set/remove
 */
interface StorageBase {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Mixin that adds multiGet, multiSet, multiRemove to any storage adapter
 * Eliminates duplicate code across Node, Web, and React Native adapters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withMultiOperations<T extends new (...args: any[]) => StorageBase>(Base: T) {
  return class extends Base {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
    }

    async multiGet(keys: string[]): Promise<Record<string, string | null>> {
      const result: Record<string, string | null> = {};
      for (const key of keys) {
        result[key] = await this.get(key);
      }
      return result;
    }

    async multiSet(items: Record<string, string>): Promise<void> {
      for (const [key, value] of Object.entries(items)) {
        await this.set(key, value);
      }
    }

    async multiRemove(keys: string[]): Promise<void> {
      for (const key of keys) {
        await this.remove(key);
      }
    }
  };
}

/**
 * Abstract base class for standard storage adapters
 * Implements multi-operations, subclasses implement core operations
 */
export abstract class BaseStorageAdapter implements IStoragePort {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getAllKeys(): Promise<string[]>;

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    return result;
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }
}

/**
 * Abstract base class for secure storage adapters
 * Implements multi-operations, subclasses implement core operations
 */
export abstract class BaseSecureStorageAdapter implements ISecureStoragePort {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getAllKeys(): Promise<string[]>;
  abstract isAvailable(): Promise<boolean>;
  abstract getSecurityLevel(): Promise<string>;

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    return result;
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }
}
