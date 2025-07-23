// A-Cube SDK - Main Entry Point
// Professional TypeScript SDK for A-Cube e-receipt system integration

// =============================================================================
// API Client & Configuration
// =============================================================================
export {
  initializeAPIClient,
  getAPIClient,
  configureSDK,
  APIClient,
} from './api/client';
export type { SDKConfig } from './api/client';

// =============================================================================
// Authentication
// =============================================================================
export {
  loginProvider,
  loginMerchant,
  loginCashier,
  logout,
  isAuthenticated,
  getCurrentUser,
  refreshToken,
  hasRole,
  AuthenticationError,
} from './api/auth';

// =============================================================================
// API Endpoints
// =============================================================================

// MF1 - Core e-receipt functionality
export {
  // Cashiers
  createCashier,
  getCashiers,
  getCashierById,
  getCurrentCashier,
  deleteCashier,
  
  // Point of Sales
  getPointOfSales,
  getPointOfSaleBySerial,
  activatePointOfSale,
  createInactivityPeriod,
  setPointOfSaleOffline,
  closeJournal,
  
  // Receipts
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptDetails,
  voidReceipt,
  voidReceiptWithProof,
  returnReceiptItems,
  returnReceiptItemsWithProof,
  
  // Cash Registers
  createCashRegister,
  getCashRegisters,
  getCashRegisterById,
  getMTLSCertificate,
} from './api/mf1';

// MF2 - Merchant management
export {
  createMerchant,
  getMerchants,
  getMerchantById,
  updateMerchant,
} from './api/mf2';

// =============================================================================
// React Hooks
// =============================================================================
export {
  useAuth,
  useRetryQueue,
  useProviderFlow,
} from './hooks';

export type {
  AuthState,
  AuthActions,
  UseAuthReturn,
  QueueStats,
  UseRetryQueueReturn,
  ProviderFlowState,
  UseProviderFlowReturn,
} from './hooks';

// =============================================================================
// UI Components (Cross-platform React/React Native)
// =============================================================================
export {
  Button,
  FormInput,
} from './components';

export type {
  ButtonProps,
  FormInputProps,
} from './components';

// =============================================================================
// Storage & Security
// =============================================================================
export {
  SecureTokenStorage,
  CertificateStorage,
  RequestQueue,
} from './storage';

export type {
  MTLSCertificate,
  QueuedRequest,
} from './storage';

// =============================================================================
// Utilities
// =============================================================================
export {
  // Network
  getNetworkState,
  isConnected,
  addNetworkListener,
  removeNetworkListener,
  checkInternetConnectivity,
  waitForConnection,
  
  // Retry
  retryAsync,
  withRetry,
  AxiosRetryInterceptor,
  isRetryableError,
  calculateRetryDelay,
  calculateJitteredDelay,
  
  // Validation
  validateEmail,
  validatePassword,
  validateFiscalId,
  validateZipCode,
  validateProvinceCode,
  validateAddress,
  validateReceiptItem,
  validateMoneyAmount,
  combineValidationResults,
  validateRequired,
  
  // Logging
  logError,
  logWarn,
  logInfo,
  logDebug,
  apiLogger,
  authLogger,
  storageLogger,
  networkLogger,
  uiLogger,
} from './utils';

export type {
  NetworkState,
  NetworkStateChangeHandler,
  RetryConfig,
  ValidationError,
  ValidationResult,
  LogLevel,
  LogEntry,
} from './utils';

// =============================================================================
// Constants & Configuration
// =============================================================================
export {
  API_ENDPOINTS,
  MF1_PATHS,
  MF2_PATHS,
  getBaseURL,
  STORAGE_KEYS,
  SECURE_KEYS,
  getMTLSCertificateKey,
  getMTLSPrivateKeyKey,
  UserRole,
  ROLE_PERMISSIONS,
  hasPermission,
  isProvider,
  isMerchant,
  isCashier,
} from './constants';

export type {
  Environment,
  StorageKey,
  SecurityLevel,
} from './constants';

// =============================================================================
// Types
// =============================================================================

// Generated API types
export type {
  // Core entities
  Address,
  MerchantCreateInput,
  MerchantOutput,
  MerchantUpdateInput,
  CashRegisterCreate,
  CashRegisterOutput,
  CashierCreateInput,
  CashierOutput,
  ReceiptInput,
  ReceiptOutput,
  ReceiptDetailsOutput,
  ReceiptItem,
  PEMPublic,
  
  // Enums
  PEMStatus,
  ReceiptType,
  GoodOrService,
  
  // API responses
  ApiResponse,
  PaginatedResponse,
  AuthToken,
  JWTPayload,
  LoginRequest,
} from './api/types.generated';

// SDK-specific types
export type {
  LoginCredentials,
  TokenInfo,
  UserProfile,
  MerchantInfo,
  AddressInfo,
  PointOfSaleInfo,
  CashRegisterInfo,
  ReceiptInfo,
  ReceiptItemInfo,
} from './types';

// =============================================================================
// Version & Metadata
// =============================================================================
export const SDK_VERSION = '1.0.0';
export const SDK_NAME = 'a-cube-io/ereceipts-js-sdk';

// =============================================================================
// Quick Start Helpers
// =============================================================================

/**
 * Initialize the A-Cube SDK with configuration
 * Call this once at the start of your application
 */
export const initSDK = async (config?: Partial<import('./api/client').SDKConfig>) => {
  const { initializeAPIClient } = await import('./api/client');
  return initializeAPIClient(config);
};

/**
 * Quick login helper for providers
 */
export const quickLoginProvider = async (email: string, password: string) => {
  try {
    const { loginProvider } = await import('./api/auth');
    const token = await loginProvider(email, password);
    return { success: true, token };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Quick login helper for merchants
 */
export const quickLoginMerchant = async (email: string, password: string) => {
  try {
    const { loginMerchant } = await import('./api/auth');
    const token = await loginMerchant(email, password);
    return { success: true, token };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Check if SDK is properly configured
 */
export const isSDKReady = async (): Promise<boolean> => {
  try {
    const { getAPIClient } = await import('./api/client');
    const client = getAPIClient();
    return client !== null;
  } catch {
    return false;
  }
};

// =============================================================================
// Development Helpers (only available in development)
// =============================================================================
declare const __DEV__: boolean | undefined;
declare const process: { env?: { NODE_ENV?: string } } | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const global: any;

if ((typeof __DEV__ !== 'undefined' && __DEV__) || 
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')) {
  // Export additional debugging utilities
  if (typeof global !== 'undefined') {
    (global).__ACUBE_SDK__ = {
      getAPIClient: async () => {
        const { getAPIClient } = await import('./api/client');
        return getAPIClient();
      },
      version: SDK_VERSION,
      clearAllData: async () => {
        const { SecureTokenStorage } = await import('./storage/token');
        const { RequestQueue } = await import('./storage/queue');
        await SecureTokenStorage.clearAll();
        await RequestQueue.clearQueue();
      },
    };
  }
}