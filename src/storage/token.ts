import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { SECURE_KEYS, STORAGE_KEYS } from '../constants/keys';
import { AuthToken, JWTPayload } from '../api/types.generated';

//@TODO: for Web use IndexedDB with encryption
//@TODO: React Native, use Keychain for secure storage with encryption

// Platform detection
const isWeb = typeof window !== 'undefined' && !!window?.document;
const isReactNative = !isWeb;

// Web storage fallback for secure data
class WebSecureStorage {
  static async setItem(key: string, value: string): Promise<void> {
    // In production, consider using IndexedDB with encryption
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async operation
    localStorage.setItem(`secure_${key}`, value);
  }

  static async getItem(key: string): Promise<string | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return localStorage.getItem(`secure_${key}`);
  }

  static async removeItem(key: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    localStorage.removeItem(`secure_${key}`);
  }
}

// Cross-platform storage utilities
export class SecureTokenStorage {
  // Store data securely based on platform
  private static async setSecureItem(key: string, value: string): Promise<void> {
    if (isReactNative) {
      await Keychain.setInternetCredentials(key, key, value);
    } else {
      await WebSecureStorage.setItem(key, value);
    }
  }

  private static async getSecureItem(key: string): Promise<string | null> {
    try {
      if (isReactNative) {
        const credentials = await Keychain.getInternetCredentials(key);
        return credentials ? credentials.password : null;
      } else {
        return await WebSecureStorage.getItem(key);
      }
    } catch (error) {
      console.warn(`Failed to get secure item ${key}:`, error);
      return null;
    }
  }

  private static async removeSecureItem(key: string): Promise<void> {
    try {
      if (isReactNative) {
        await Keychain.resetInternetCredentials(key);
      } else {
        await WebSecureStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Failed to remove secure item ${key}:`, error);
    }
  }

  // Store data using appropriate method based on sensitivity
  static async setItem(key: string, value: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isSecure = SECURE_KEYS.has(key as any);
    
    if (isSecure) {
      await this.setSecureItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isSecure = SECURE_KEYS.has(key as any);
    
    if (isSecure) {
      return await this.getSecureItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  }

  static async removeItem(key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isSecure = SECURE_KEYS.has(key as any);
    
    if (isSecure) {
      await this.removeSecureItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  // Token-specific methods
  static async storeToken(token: AuthToken): Promise<void> {
    await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token.access_token);
    
    if (token.expires_in) {
      const expiryTime = Date.now() + (token.expires_in * 1000);
      await this.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    }
  }

  static async getToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  static async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    const expiryStr = await this.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiryStr) return true; // No expiry set, assume valid

    const expiry = parseInt(expiryStr, 10);
    return Date.now() < expiry;
  }

  static async removeToken(): Promise<void> {
    await Promise.all([
      this.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      this.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
      this.removeItem(STORAGE_KEYS.USER_ROLE),
      this.removeItem(STORAGE_KEYS.USER_EMAIL),
    ]);
  }

  // JWT payload extraction
  static parseJWT(token: string): JWTPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => `%${  (`00${  c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.warn('Failed to parse JWT:', error);
      return null;
    }
  }

  // Store user info from JWT
  static async storeUserInfo(token: string): Promise<void> {
    const payload = this.parseJWT(token);
    if (payload) {
      await this.setItem(STORAGE_KEYS.USER_ROLE, payload.role);
      await this.setItem(STORAGE_KEYS.USER_EMAIL, payload.email);
    }
  }

  static async getUserRole(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.USER_ROLE);
  }

  static async getUserEmail(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.USER_EMAIL);
  }

  // Clear all stored data
  static async clearAll(): Promise<void> {
    const keysToRemove = Object.values(STORAGE_KEYS);
    await Promise.all(keysToRemove.map(key => this.removeItem(key)));
  }
}