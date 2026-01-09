import { IMTLSPort as IMTLSAdapter, MTLSConnectionConfig } from '@/application/ports/driven';
import { ReactNativeMTLSAdapter } from '@/infrastructure/driven/platforms/react-native/mtls';
import { WebMTLSAdapter } from '@/infrastructure/driven/platforms/web/mtls';
import { Platform, createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('MTLS-LOADER');

export function loadMTLSAdapter(
  platform: Platform,
  config?: {
    baseUrl?: string;
    port?: number;
    timeout?: number;
    validateCertificate?: boolean;
    autoInitialize?: boolean;
  }
): IMTLSAdapter | null {
  try {
    let adapter: IMTLSAdapter;

    switch (platform) {
      case 'react-native':
        adapter = new ReactNativeMTLSAdapter();
        break;
      case 'node':
        try {
          const { NodeMTLSAdapter } = require('@/infrastructure/driven/platforms/node/mtls');
          adapter = new NodeMTLSAdapter();
        } catch {
          adapter = new WebMTLSAdapter();
        }
        break;
      case 'web':
      default:
        adapter = new WebMTLSAdapter();
        break;
    }

    if (config?.autoInitialize && config.baseUrl) {
      const mtlsConfig: MTLSConnectionConfig = {
        baseUrl: config.baseUrl,
        port: config.port || 444,
        timeout: config.timeout || 30000,
        validateCertificate: config.validateCertificate ?? true,
      };

      void initializeAdapterAsync(adapter, mtlsConfig);
    }

    return adapter;
  } catch (error) {
    log.warn(`mTLS adapter not available for platform ${platform}:`, error);
    return null;
  }
}

async function initializeAdapterAsync(
  adapter: IMTLSAdapter,
  config: MTLSConnectionConfig
): Promise<void> {
  try {
    const isSupported = await adapter.isMTLSSupported();

    if (isSupported) {
      await adapter.initialize(config);

      const platformInfo = adapter.getPlatformInfo();
      log.debug('mTLS adapter initialized:', {
        platform: platformInfo.platform,
        mtlsSupported: platformInfo.mtlsSupported,
        certificateStorage: platformInfo.certificateStorage,
        baseUrl: config.baseUrl,
      });
    }
  } catch (error) {
    log.warn('Failed to initialize mTLS adapter:', error);
  }
}

export function isMTLSSupported(platform: string): boolean {
  const config = MTLS_CONFIG_BY_PLATFORM[platform as keyof typeof MTLS_CONFIG_BY_PLATFORM];
  return config?.mtlsSupported || false;
}

export function getMTLSConfig(platform: string) {
  return MTLS_CONFIG_BY_PLATFORM[platform as keyof typeof MTLS_CONFIG_BY_PLATFORM];
}

export const MTLS_CONFIG_BY_PLATFORM = {
  'react-native': {
    mtlsSupported: true,
    certificateStorage: 'keychain',
    fallbackToJWT: true,
    defaultTimeout: 30000,
  },
  node: {
    mtlsSupported: true,
    certificateStorage: 'filesystem',
    fallbackToJWT: true,
    defaultTimeout: 30000,
  },
  web: {
    mtlsSupported: false,
    certificateStorage: 'browser-managed',
    fallbackToJWT: true,
    defaultTimeout: 30000,
  },
} as const;
