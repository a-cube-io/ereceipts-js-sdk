import { IStorage, ISecureStorage } from '../../adapters';

/**
 * Node.js storage adapter using in-memory storage (for testing)
 */
export class NodeStorageAdapter implements IStorage {
  private storage: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    keys.forEach(key => {
      result[key] = this.storage.get(key) || null;
    });
    return result;
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    Object.entries(items).forEach(([key, value]) => {
      this.storage.set(key, value);
    });
  }

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => {
      this.storage.delete(key);
    });
  }
}

/**
 * Node.js secure storage adapter using in-memory storage (for testing)
 * In production, this should use OS-specific secure storage
 */
export class NodeSecureStorageAdapter implements ISecureStorage {
  private secureStorage: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.secureStorage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.secureStorage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.secureStorage.delete(key);
  }

  async clear(): Promise<void> {
    this.secureStorage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.secureStorage.keys());
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    keys.forEach(key => {
      result[key] = this.secureStorage.get(key) || null;
    });
    return result;
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    Object.entries(items).forEach(([key, value]) => {
      this.secureStorage.set(key, value);
    });
  }

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => {
      this.secureStorage.delete(key);
    });
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getSecurityLevel(): Promise<string> {
    return 'In-memory storage (testing only - not secure)';
  }
}