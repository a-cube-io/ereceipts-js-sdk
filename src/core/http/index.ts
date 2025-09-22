// Main HTTP client
export { HttpClient } from './http-client';

// Types
export type { HttpRequestConfig } from './types';
export type { AuthMode } from './auth/mtls-handler';
export type { CacheConfig } from './cache/cache-handler';

// Handlers (for advanced usage)
export { MTLSHandler } from './auth/mtls-handler';
export { CacheHandler } from './cache/cache-handler';

// Utilities
export { transformError } from './utils/error-transformer';