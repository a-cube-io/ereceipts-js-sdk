/**
 * Unified Storage Interface for A-Cube SDK
 * Provides cross-platform storage abstraction with type safety and encryption support
 */

import type { 
  ReceiptId, 
  CashierId, 
  PEMId, 
  MerchantId, 
  CashRegisterId,
 
} from '../types/branded';

// Storage Key Types (branded for type safety)
declare const __storageKeyBrand: unique symbol;
export type StorageKey = string & { [__storageKeyBrand]: 'StorageKey' };
export const createStorageKey = (key: string): StorageKey => key as StorageKey;

// Storage Value Types
export type StorageValue = 
  | string 
  | number 
  | boolean 
  | object 
  | Array<any> 
  | null
  | undefined;

// Serializable data with metadata
export interface StorageEntry<T = StorageValue> {
  readonly data: T;
  readonly metadata: {
    readonly key: StorageKey;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly expiresAt?: number;
    readonly encrypted: boolean;
    readonly compressed: boolean;
    readonly version: string;
    readonly checksum?: string;
  };
}

// Storage operation options
export interface StorageOptions {
  readonly encrypt?: boolean;
  readonly compress?: boolean;
  readonly ttl?: number; // Time to live in milliseconds
  readonly namespace?: string;
  readonly version?: string;
}

// Query options for bulk operations
export interface QueryOptions {
  readonly keyPrefix?: string; // Added for compatibility with existing code
  readonly prefix?: string;
  readonly namespace?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly includeExpired?: boolean;
  readonly sortBy?: 'key' | 'createdAt' | 'updatedAt';
  readonly sortOrder?: 'asc' | 'desc';
}

// Storage transaction for atomic operations
export interface StorageTransaction {
  readonly id: string;
  set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
  get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
  delete(key: StorageKey): Promise<boolean>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  readonly isActive: boolean;
}

// Storage adapter interface that all implementations must follow
export interface StorageAdapter {
  readonly name: string;
  readonly isAvailable: boolean;
  readonly capabilities: {
    readonly supportsTransactions: boolean;
    readonly supportsIndexing: boolean;
    readonly maxKeyLength: number;
    readonly maxValueSize: number;
    readonly supportsCompression: boolean;
    readonly supportsEncryption: boolean;
    readonly supportsTTL: boolean;
  };

  // Core operations
  set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
  get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
  delete(key: StorageKey): Promise<boolean>;
  exists(key: StorageKey): Promise<boolean>;
  clear(namespace?: string): Promise<void>;

  // Bulk operations
  setMany<T extends StorageValue>(entries: Array<{ key: StorageKey; value: T; options?: StorageOptions }>): Promise<void>;
  getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>>;
  deleteMany(keys: StorageKey[]): Promise<number>;

  // Query operations
  keys(options?: QueryOptions): Promise<StorageKey[]>;
  values<T extends StorageValue>(options?: QueryOptions): Promise<Array<StorageEntry<T>>>;
  entries<T extends StorageValue>(options?: QueryOptions): Promise<Array<StorageEntry<T>>>;
  count(options?: QueryOptions): Promise<number>;

  // Transaction support
  beginTransaction(): Promise<StorageTransaction>;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Maintenance
  cleanup(): Promise<number>; // Returns number of cleaned entries
  optimize(): Promise<void>;
  getStats(): Promise<StorageStats>;
}

// Storage statistics
export interface StorageStats {
  readonly totalKeys: number;
  readonly totalSize: number; // In bytes
  readonly namespaces: string[];
  readonly oldestEntry: number; // Timestamp
  readonly newestEntry: number; // Timestamp
  readonly expiredEntries: number;
  readonly encryptedEntries: number;
  readonly compressedEntries: number;
}

// Mutable version for internal storage adapter use
export interface InternalStorageStats {
  totalKeys: number;
  totalSize: number; // In bytes
  namespaces: string[];
  oldestEntry: number; // Timestamp
  newestEntry: number; // Timestamp
  expiredEntries: number;
  encryptedEntries: number;
  compressedEntries: number;
}

// Unified storage interface with high-level operations
export interface UnifiedStorage extends StorageAdapter {
  // Specialized methods for e-receipt entities
  setReceipt(id: ReceiptId, receipt: any, options?: StorageOptions): Promise<void>;
  getReceipt(id: ReceiptId): Promise<any | null>;
  deleteReceipt(id: ReceiptId): Promise<boolean>;

  setCashier(id: CashierId, cashier: any, options?: StorageOptions): Promise<void>;
  getCashier(id: CashierId): Promise<any | null>;
  deleteCashier(id: CashierId): Promise<boolean>;

  setMerchant(id: MerchantId, merchant: any, options?: StorageOptions): Promise<void>;
  getMerchant(id: MerchantId): Promise<any | null>;
  deleteMerchant(id: MerchantId): Promise<boolean>;

  setPEM(id: PEMId, pem: any, options?: StorageOptions): Promise<void>;
  getPEM(id: PEMId): Promise<any | null>;
  deletePEM(id: PEMId): Promise<boolean>;

  setCashRegister(id: CashRegisterId, cashRegister: any, options?: StorageOptions): Promise<void>;
  getCashRegister(id: CashRegisterId): Promise<any | null>;
  deleteCashRegister(id: CashRegisterId): Promise<boolean>;

  // Cache operations with TTL support
  setCache<T extends StorageValue>(key: string, value: T, ttl?: number): Promise<void>;
  getCache<T extends StorageValue>(key: string): Promise<T | null>;
  invalidateCache(pattern?: string): Promise<number>;

  // Session storage (auto-expires when app closes)
  setSession<T extends StorageValue>(key: string, value: T): Promise<void>;
  getSession<T extends StorageValue>(key: string): Promise<T | null>;
  clearSession(): Promise<void>;

  // Secure storage for sensitive data (always encrypted)
  setSecure<T extends StorageValue>(key: string, value: T): Promise<void>;
  getSecure<T extends StorageValue>(key: string): Promise<T | null>;
  deleteSecure(key: string): Promise<boolean>;
  
  // Configuration storage
  setConfig<T extends StorageValue>(key: string, value: T): Promise<void>;
  getConfig<T extends StorageValue>(key: string): Promise<T | null>;
  deleteConfig(key: string): Promise<boolean>;

  // Backup and restore
  exportData(namespace?: string): Promise<string>; // Returns JSON string
  importData(data: string): Promise<number>; // Returns number of imported entries
  
  // Query operations with keyPrefix support
  query<T extends StorageValue>(options: QueryOptions): Promise<Array<{ key: StorageKey; value: T }>>;
  
  // Initialization and cleanup
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // Event listeners
  on(event: 'set' | 'get' | 'delete' | 'clear' | 'error', listener: (...args: any[]) => void): void;
  off(event: 'set' | 'get' | 'delete' | 'clear' | 'error', listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

// Error types for storage operations
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly key?: StorageKey,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageConnectionError extends StorageError {
  constructor(adapter: string, cause?: Error) {
    super(
      `Failed to connect to storage adapter: ${adapter}`,
      'STORAGE_CONNECTION_ERROR',
      'connect',
      undefined,
      cause
    );
  }
}

export class StorageCapacityError extends StorageError {
  constructor(key: StorageKey, size: number, maxSize: number) {
    super(
      `Storage capacity exceeded for key ${key}: ${size} > ${maxSize}`,
      'STORAGE_CAPACITY_ERROR',
      'set',
      key
    );
  }
}

export class StorageEncryptionError extends StorageError {
  constructor(key: StorageKey, operation: string, cause?: Error) {
    super(
      `Encryption/decryption failed for key ${key}`,
      'STORAGE_ENCRYPTION_ERROR',
      operation,
      key,
      cause
    );
  }
}

export class StorageTransactionError extends StorageError {
  constructor(transactionId: string, operation: string, cause?: Error) {
    super(
      `Transaction ${transactionId} failed during ${operation}`,
      'STORAGE_TRANSACTION_ERROR',
      operation,
      undefined,
      cause
    );
  }
}

// Storage events
export interface StorageEventMap {
  set: [key: StorageKey, value: StorageValue, options?: StorageOptions];
  get: [key: StorageKey, value: StorageValue | null];
  delete: [key: StorageKey, success: boolean];
  clear: [namespace?: string];
  error: [error: StorageError];
}

// Default storage options
export const DEFAULT_STORAGE_OPTIONS: Required<StorageOptions> = {
  encrypt: false,
  compress: false,
  ttl: 0, // No expiration
  namespace: 'default',
  version: '1.0.0',
} as const;

// Predefined namespaces for different data types
export const STORAGE_NAMESPACES = {
  RECEIPTS: 'receipts',
  CASHIERS: 'cashiers',
  MERCHANTS: 'merchants',
  PEMS: 'pems',
  CASH_REGISTERS: 'cash_registers',
  CACHE: 'cache',
  SESSION: 'session',
  SECURE: 'secure',
  CONFIG: 'config',
  OFFLINE_QUEUE: 'offline_queue',
  ANALYTICS: 'analytics',
  AUDIT: 'audit',
} as const;

// Type-safe storage key generators
export const createReceiptKey = (id: ReceiptId): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.RECEIPTS}:${id}`);

export const createCashierKey = (id: CashierId): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.CASHIERS}:${id}`);

export const createMerchantKey = (id: MerchantId): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.MERCHANTS}:${id}`);

export const createPEMKey = (id: PEMId): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.PEMS}:${id}`);

export const createCashRegisterKey = (id: CashRegisterId): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.CASH_REGISTERS}:${id}`);

export const createCacheKey = (key: string): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.CACHE}:${key}`);

export const createSessionKey = (key: string): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.SESSION}:${key}`);

export const createSecureKey = (key: string): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.SECURE}:${key}`);

export const createConfigKey = (key: string): StorageKey => 
  createStorageKey(`${STORAGE_NAMESPACES.CONFIG}:${key}`);