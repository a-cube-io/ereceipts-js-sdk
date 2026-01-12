import { BaseSecureStorageAdapter, BaseStorageAdapter } from '../shared';

/**
 * Node.js storage adapter using in-memory storage (for testing)
 */
export class NodeStorageAdapter extends BaseStorageAdapter {
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
}

/**
 * Node.js secure storage adapter using in-memory storage (for testing)
 * In production, this should use OS-specific secure storage
 */
export class NodeSecureStorageAdapter extends BaseSecureStorageAdapter {
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

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getSecurityLevel(): Promise<string> {
    return 'In-memory storage (testing only - not secure)';
  }
}
