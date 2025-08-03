import { IStorage } from './storage';

/**
 * Secure storage adapter interface for sensitive data like tokens
 * Extends IStorage with the same interface but different implementations
 * should use platform-specific secure storage mechanisms
 */
export interface ISecureStorage extends IStorage {
  /**
   * Check if secure storage is available on the platform
   * @returns true if secure storage is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the security level of the storage
   * @returns Security level description
   */
  getSecurityLevel(): Promise<string>;
}