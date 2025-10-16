import { PlatformAdapters } from '../adapters';
import { detectPlatform } from './platform-detector';
import { 
  loadCacheAdapter, 
  loadStorageAdapters, 
  loadNetworkMonitor,
  loadMTLSAdapter
} from './loaders';
import {loadBackgroundTask} from "./loaders/background-task-loader";

/**
 * Configuration for mTLS adapter initialization
 */
export interface MTLSAdapterConfig {
  baseUrl?: string;
  port?: number;
  timeout?: number;
  validateCertificate?: boolean;
  autoInitialize?: boolean;
}

/**
 * Options for platform adapter loading
 */
export interface PlatformAdapterOptions {
  debugEnabled?: boolean;
  mtlsConfig?: MTLSAdapterConfig;
}

/**
 * Dynamically load platform-specific adapters with enhanced mTLS support
 */
export function loadPlatformAdapters(
  optionsOrDebug: PlatformAdapterOptions | boolean = {}
): PlatformAdapters {
  // Handle legacy boolean parameter for backward compatibility
  const options: PlatformAdapterOptions = typeof optionsOrDebug === 'boolean' 
    ? { debugEnabled: optionsOrDebug }
    : optionsOrDebug;
    
  const { debugEnabled = false, mtlsConfig } = options;
  const { platform } = detectPlatform();
  
  if (debugEnabled) {
    console.log('[ADAPTER-LOADER] Loading adapters for platform:', platform);
  }
  
  // Load all adapters using dedicated loaders
  const storageAdapters = loadStorageAdapters(platform);
  const networkMonitor = loadNetworkMonitor(platform);
  const cache = loadCacheAdapter(platform);
  const backgroundTask = loadBackgroundTask(platform)
  
  // Load mTLS adapter with optional configuration
  const mtls = loadMTLSAdapter(platform, debugEnabled, mtlsConfig ? {
    baseUrl: mtlsConfig.baseUrl,
    port: mtlsConfig.port,
    timeout: mtlsConfig.timeout,
    validateCertificate: mtlsConfig.validateCertificate,
    autoInitialize: mtlsConfig.autoInitialize
  } : undefined);
  
  if (debugEnabled) {
    console.log('[ADAPTER-LOADER] Adapters loaded:', {
      platform,
      hasStorage: !!storageAdapters.storage,
      hasSecureStorage: !!storageAdapters.secureStorage,
      hasNetworkMonitor: !!networkMonitor,
      hasBackgroundTask: !!backgroundTask,
      hasCache: !!cache,
      hasMTLS: !!mtls,
      mtlsAutoInitialize: mtlsConfig?.autoInitialize || false,
      baseUrl: mtlsConfig?.baseUrl || 'N/A',
    });
  }
  
  return {
    ...storageAdapters,
    networkMonitor,
    cache,
    mtls: mtls || undefined,
    backgroundTask
  };
}

/**
 * Create mTLS configuration for A-Cube endpoints
 * Note: Port modification is now handled dynamically by HttpClient based on authentication matrix
 */
export function createACubeMTLSConfig(
  baseUrl: string,
  timeout?: number,
  autoInitialize = true,
  forcePort444 = true
): MTLSAdapterConfig {
  
  const mtlsBaseUrl = forcePort444 && !baseUrl.includes(':444')
    ? (baseUrl.includes(':444')
        ? baseUrl.replace(':444', ':444')
        : baseUrl.replace(/:\d+$/, '') + ':444')
    : baseUrl;

  return {
    baseUrl: mtlsBaseUrl,
    port: 444,
    timeout: timeout || 30000,
    validateCertificate: true,
    autoInitialize
  };
}