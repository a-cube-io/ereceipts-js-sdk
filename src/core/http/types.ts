import { AxiosRequestConfig } from 'axios';
import { AuthMode } from './auth/mtls-handler';
import { CacheConfig } from './cache/cache-handler';

/**
 * Extended request configuration with simplified cache and mTLS options
 */
export interface HttpRequestConfig extends AxiosRequestConfig, CacheConfig {
  /** Authentication mode for this request */
  authMode?: AuthMode;
  /** Skip mTLS fallback to JWT */
  noFallback?: boolean;
}