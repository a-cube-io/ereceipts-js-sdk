// Storage keys for AsyncStorage and SecureStore
export const STORAGE_KEYS = {
  // Authentication tokens
  ACCESS_TOKEN: 'acube_access_token',
  REFRESH_TOKEN: 'acube_refresh_token',
  TOKEN_EXPIRY: 'acube_token_expiry',
  USER_ROLE: 'acube_user_role',
  USER_EMAIL: 'acube_user_email',
  
  // mTLS Certificates (stored securely)
  MTLS_CERTIFICATE_PREFIX: 'acube_mtls_cert_',
  MTLS_PRIVATE_KEY_PREFIX: 'acube_mtls_key_',
  
  // Offline queue
  FAILED_REQUESTS_QUEUE: 'acube_failed_requests',
  LAST_SYNC_TIMESTAMP: 'acube_last_sync',
  
  // User preferences
  ENVIRONMENT: 'acube_environment',
  BASE_URL: 'acube_base_url',
  
  // Onboarding state
  ONBOARDING_STEP: 'acube_onboarding_step',
  MERCHANT_UUID: 'acube_merchant_uuid',
  CURRENT_POS_SERIAL: 'acube_current_pos_serial',
} as const;

// Security levels for different types of data
export const SECURITY_LEVELS = {
  // Use regular AsyncStorage for non-sensitive data
  REGULAR: 'regular',
  // Use SecureStore/Keychain for sensitive data
  SECURE: 'secure',
} as const;

// Define which keys require secure storage
export const SECURE_KEYS = new Set([
  STORAGE_KEYS.ACCESS_TOKEN,
  STORAGE_KEYS.REFRESH_TOKEN,
  STORAGE_KEYS.MTLS_CERTIFICATE_PREFIX,
  STORAGE_KEYS.MTLS_PRIVATE_KEY_PREFIX,
]);

export const getMTLSCertificateKey = (uuid: string): string => 
  `${STORAGE_KEYS.MTLS_CERTIFICATE_PREFIX}${uuid}`;

export const getMTLSPrivateKeyKey = (uuid: string): string => 
  `${STORAGE_KEYS.MTLS_PRIVATE_KEY_PREFIX}${uuid}`;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export type SecurityLevel = typeof SECURITY_LEVELS[keyof typeof SECURITY_LEVELS];