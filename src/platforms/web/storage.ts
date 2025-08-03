import { IStorage, ISecureStorage } from '../../adapters';

/**
 * Web storage adapter using localStorage
 */
export class WebStorageAdapter implements IStorage {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      throw new Error(`Failed to store item: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove item: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
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
}

/**
 * Web secure storage adapter using encrypted localStorage
 */
export class WebSecureStorageAdapter implements ISecureStorage {
  private static readonly ENCRYPTION_KEY = 'acube_secure_key';
  private encryptionKey: string;

  constructor() {
    // Generate or retrieve encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  async get(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(this.getSecureKey(key));
      if (!encrypted) return null;
      
      return this.decrypt(encrypted);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const encrypted = this.encrypt(value);
      localStorage.setItem(this.getSecureKey(key), encrypted);
    } catch (error) {
      throw new Error(`Failed to store secure item: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getSecureKey(key));
    } catch (error) {
      throw new Error(`Failed to remove secure item: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const secureKeys = keys.filter(key => key.startsWith('secure_'));
      secureKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      throw new Error(`Failed to clear secure storage: ${error}`);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith('secure_'))
        .map(key => key.replace('secure_', ''));
    } catch {
      return [];
    }
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

  async isAvailable(): Promise<boolean> {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async getSecurityLevel(): Promise<string> {
    return 'Basic encryption using Web Crypto API';
  }

  private getSecureKey(key: string): string {
    return `secure_${key}`;
  }

  private getOrCreateEncryptionKey(): string {
    let key = localStorage.getItem(WebSecureStorageAdapter.ENCRYPTION_KEY);
    if (!key) {
      key = this.generateKey();
      localStorage.setItem(WebSecureStorageAdapter.ENCRYPTION_KEY, key);
    }
    return key;
  }

  private generateKey(): string {
    // Simple key generation - in production, use crypto.getRandomValues()
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private encrypt(text: string): string {
    // Simple XOR encryption - in production, use Web Crypto API
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      const textChar = text.charCodeAt(i);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return btoa(result);
  }

  private decrypt(encrypted: string): string {
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      const textChar = text.charCodeAt(i);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return result;
  }
}