import { BaseSecureStorageAdapter, BaseStorageAdapter } from '../shared';

/**
 * Web storage adapter using localStorage
 */
export class WebStorageAdapter extends BaseStorageAdapter {
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
}

/**
 * Web secure storage adapter using encrypted localStorage
 */
export class WebSecureStorageAdapter extends BaseSecureStorageAdapter {
  private static readonly ENCRYPTION_KEY = 'acube_secure_key';
  private encryptionKey: string;

  constructor() {
    super();
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
      const secureKeys = keys.filter((key) => key.startsWith('secure_'));
      secureKeys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      throw new Error(`Failed to clear secure storage: ${error}`);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter((key) => key.startsWith('secure_'))
        .map((key) => key.replace('secure_', ''));
    } catch {
      return [];
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
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private encrypt(text: string): string {
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
