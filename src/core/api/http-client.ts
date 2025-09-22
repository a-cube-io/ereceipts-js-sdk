// Re-export from the new modular HTTP client
export { 
  HttpClient
} from '../http';

export type { 
  HttpRequestConfig,
  AuthMode
} from '../http';

// Backward compatibility of type aliases
import type { HttpRequestConfig as _HttpRequestConfig } from '../http';
export type CacheRequestConfig = _HttpRequestConfig;