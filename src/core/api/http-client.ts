// Backward compatibility of type aliases
import type { HttpRequestConfig as _HttpRequestConfig } from '../http';

// Re-export from the new modular HTTP client
export { HttpClient } from '../http';

export type { HttpRequestConfig, AuthMode } from '../http';

export type CacheRequestConfig = _HttpRequestConfig;
