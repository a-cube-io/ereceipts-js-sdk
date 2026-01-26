import { PlatformAdapters } from '@/application/ports/driven';
import { createPrefixedLogger, detectPlatform } from '@/shared/utils';

import { loadCacheAdapter } from './cache-loader';
import { loadMTLSAdapter } from './mtls-loader';
import { loadNetworkMonitor } from './network-loader';
import { loadStorageAdapters } from './storage-loader';

const log = createPrefixedLogger('ADAPTER-LOADER');

export interface MTLSAdapterConfig {
  baseUrl?: string;
  port?: number;
  timeout?: number;
  validateCertificate?: boolean;
  autoInitialize?: boolean;
}

export interface PlatformAdapterOptions {
  mtlsConfig?: MTLSAdapterConfig;
}

export function loadPlatformAdapters(options: PlatformAdapterOptions = {}): PlatformAdapters {
  const { mtlsConfig } = options;
  const { platform } = detectPlatform();

  log.debug('Loading adapters for platform:', platform);

  const storageAdapters = loadStorageAdapters(platform);
  const networkMonitor = loadNetworkMonitor(platform);
  const cache = loadCacheAdapter(platform);
  const mtls = loadMTLSAdapter(platform, mtlsConfig);

  log.debug('Adapters loaded:', {
    platform,
    hasStorage: !!storageAdapters.storage,
    hasSecureStorage: !!storageAdapters.secureStorage,
    hasNetworkMonitor: !!networkMonitor,
    hasCache: !!cache,
    hasMTLS: !!mtls,
  });

  return {
    ...storageAdapters,
    networkMonitor,
    cache,
    mtls: mtls || undefined,
  };
}

export function createACubeMTLSConfig(
  baseUrl: string,
  timeout?: number,
  autoInitialize = true,
  forcePort444 = true
): MTLSAdapterConfig {
  const mtlsBaseUrl =
    forcePort444 && !baseUrl.includes(':444') ? baseUrl.replace(/:\d+$/, '') + ':444' : baseUrl;

  return {
    baseUrl: mtlsBaseUrl,
    port: 444,
    timeout: timeout || 30000,
    validateCertificate: true,
    autoInitialize,
  };
}
