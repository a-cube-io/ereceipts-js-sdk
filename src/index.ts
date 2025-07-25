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
  useOnboardingFlow,
} from './hooks';

export type {
  AuthState,
  AuthActions,
  UseAuthReturn,
  QueueStats,
  UseRetryQueueReturn,
  OnboardingState,
  OnboardingStep,
  OnboardingRole,
  OnboardingCredentials,
  OnboardingMerchantInfo,
  OnboardingPOSInfo,
  OnboardingResult,
  UseOnboardingFlowInput,
  UseOnboardingFlowReturn,
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
  API_AUTH_ENDPOINTS,
  MF1_PATHS,
  MF2_PATHS,
  getBaseURL,
  getAuthBaseURL,
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
} from './api/types.convenience';

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
export const SDK_NAME = '@a-cube-io/ereceipts-js-sdk';

// =============================================================================
// React Provider
// =============================================================================
export {
  EReceiptsProvider,
  useEReceipts,
  withEReceipts,
} from './providers';

export type {
  EReceiptsProviderConfig,
  EReceiptsProviderProps,
  EReceiptsContextState,
} from './providers';

// =============================================================================
// Quick Start Helpers - User-Friendly API
// =============================================================================

/**
 * Initialize the E-Receipts SDK with configuration
 * Call this once at the start of your application
 * 
 * @example
 * ```typescript
 * import { initializeEReceipts } from '@a-cube-io/ereceipts-js-sdk';
 * 
 * await initializeEReceipts({
 *   environment: 'sandbox',
 *   enableLogging: true
 * });
 * ```
 */
export const initializeEReceipts = async (config?: Partial<import('./api/client').SDKConfig>) => {
  const { initializeAPIClient } = await import('./api/client');
  return initializeAPIClient(config);
};

// Keep backward compatibility
export const initSDK = initializeEReceipts;

/**
 * Login as Provider with user-friendly error handling
 * 
 * @example
 * ```typescript
 * const result = await loginAsProvider('provider@company.com', 'password');
 * if (result.success) {
 *   console.log('Logged in:', result.token);
 * } else {
 *   console.error('Login failed:', result.error);
 * }
 * ```
 */
export const loginAsProvider = async (email: string, password: string) => {
  try {
    const { loginProvider } = await import('./api/auth');
    const token = await loginProvider(email, password);
    return { success: true as const, token, error: null };
  } catch (error) {
    return { 
      success: false as const, 
      token: null, 
      error: error instanceof Error ? error : new Error('Login failed') 
    };
  }
};

/**
 * Login as Merchant with user-friendly error handling
 * 
 * @example
 * ```typescript
 * const result = await loginAsMerchant('merchant@restaurant.com', 'password');
 * if (result.success) {
 *   console.log('Logged in:', result.token);
 * } else {
 *   console.error('Login failed:', result.error);
 * }
 * ```
 */
export const loginAsMerchant = async (email: string, password: string) => {
  try {
    const { loginMerchant } = await import('./api/auth');
    const token = await loginMerchant(email, password);
    return { success: true as const, token, error: null };
  } catch (error) {
    return { 
      success: false as const, 
      token: null, 
      error: error instanceof Error ? error : new Error('Login failed') 
    };
  }
};

/**
 * Login as Cashier with user-friendly error handling
 * 
 * @example
 * ```typescript
 * const result = await loginAsCashier('cashier@store.com', 'password');
 * if (result.success) {
 *   console.log('Logged in:', result.token);
 * } else {
 *   console.error('Login failed:', result.error);
 * }
 * ```
 */
export const loginAsCashier = async (email: string, password: string) => {
  try {
    const { loginCashier } = await import('./api/auth');
    const token = await loginCashier(email, password);
    return { success: true as const, token, error: null };
  } catch (error) {
    return { 
      success: false as const, 
      token: null, 
      error: error instanceof Error ? error : new Error('Login failed') 
    };
  }
};

/**
 * Logout current user
 * 
 * @example
 * ```typescript
 * const result = await logoutUser();
 * if (result.success) {
 *   console.log('Logged out successfully');
 * }
 * ```
 */
export const logoutUser = async () => {
  try {
    const { logout } = await import('./api/auth');
    await logout();
    return { success: true as const, error: null };
  } catch (error) {
    return { 
      success: false as const, 
      error: error instanceof Error ? error : new Error('Logout failed') 
    };
  }
};

/**
 * Check if user is currently authenticated
 * 
 * @example
 * ```typescript
 * const isLoggedIn = await checkAuthentication();
 * console.log('User authenticated:', isLoggedIn);
 * ```
 */
export const checkAuthentication = async (): Promise<boolean> => {
  try {
    const { isAuthenticated } = await import('./api/auth');
    return await isAuthenticated();
  } catch {
    return false;
  }
};

/**
 * Get current user information
 * 
 * @example
 * ```typescript
 * const user = await getCurrentUserInfo();
 * if (user) {
 *   console.log('User:', user.email, 'Role:', user.role);
 * }
 * ```
 */
export const getCurrentUserInfo = async () => {
  try {
    const { getCurrentUser } = await import('./api/auth');
    return await getCurrentUser();
  } catch (error) {
    return null;
  }
};

/**
 * Check if SDK is properly configured and ready to use
 * 
 * @example
 * ```typescript
 * const ready = await checkSDKStatus();
 * if (ready) {
 *   console.log('SDK is ready to use!');
 * }
 * ```
 */
export const checkSDKStatus = async (): Promise<boolean> => {
  try {
    const { getAPIClient } = await import('./api/client');
    const client = getAPIClient();
    return client !== null;
  } catch {
    return false;
  }
};

// Keep backward compatibility
export const isSDKReady = checkSDKStatus;
export const quickLoginProvider = loginAsProvider;
export const quickLoginMerchant = loginAsMerchant;

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