import { IMTLSAdapter, MTLSConnectionConfig } from '../../adapters';
// Static imports for all platforms
import { ReactNativeMTLSAdapter } from '../../platforms/react-native/mtls';
import { WebMTLSAdapter } from '../../platforms/web/mtls';
import { Platform, detectPlatform } from '../platform-detector';

/**
 * Load and optionally initialize a platform-specific mTLS adapter
 */
export function loadMTLSAdapter(
  platform: Platform,
  debugEnabled = false,
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
        adapter = loadReactNativeMTLSAdapter(debugEnabled);
        break;
      case 'node':
        adapter = loadNodeMTLSAdapter(debugEnabled);
        break;
      case 'web':
        adapter = loadWebMTLSAdapter(debugEnabled);
        break;
      default:
        // Fallback to web adapter for unknown platforms
        adapter = loadWebMTLSAdapter(debugEnabled);
        break;
    }

    // Auto-initialize if configuration is provided and requested
    if (config?.autoInitialize && config.baseUrl) {
      const mtlsConfig: MTLSConnectionConfig = {
        baseUrl: config.baseUrl,
        port: config.port || 444,
        timeout: config.timeout || 30000,
        validateCertificate: config.validateCertificate ?? true,
      };

      // Initialize asynchronously in the background - don't block adapter creation
      void initializeAdapterAsync(adapter, mtlsConfig, debugEnabled);
    }

    return adapter;
  } catch (error) {
    if (debugEnabled) {
      console.warn(`[MTLS-LOADER] mTLS adapter not available for platform ${platform}:`, error);
    }
    return null;
  }
}

/**
 * Initialize the adapter asynchronously without blocking
 */
async function initializeAdapterAsync(
  adapter: IMTLSAdapter,
  config: MTLSConnectionConfig,
  debugEnabled: boolean
): Promise<void> {
  try {
    const isSupported = await adapter.isMTLSSupported();

    if (isSupported) {
      await adapter.initialize(config);

      if (debugEnabled) {
        const platformInfo = adapter.getPlatformInfo();
        console.log('[MTLS-LOADER] mTLS adapter initialized:', {
          platform: platformInfo.platform,
          mtlsSupported: platformInfo.mtlsSupported,
          certificateStorage: platformInfo.certificateStorage,
          baseUrl: config.baseUrl,
        });
      }
    } else {
      if (debugEnabled) {
        console.log('[MTLS-LOADER] mTLS not supported on current platform, JWT-only mode');
      }
    }
  } catch (error) {
    if (debugEnabled) {
      console.warn('[MTLS-LOADER] Failed to initialize mTLS adapter:', error);
    }
  }
}

/**
 * Load React Native mTLS adapter (Expo mTLS-based)
 */
function loadReactNativeMTLSAdapter(debugEnabled = false): IMTLSAdapter {
  return new ReactNativeMTLSAdapter(debugEnabled);
}

/**
 * Load Node.js mTLS adapter (https.Agent + axios-based)
 * Only loaded dynamically to avoid bundling Node.js code in non-Node environments
 */
function loadNodeMTLSAdapter(debugEnabled = false): IMTLSAdapter {
  try {
    // Dynamic import to avoid bundling Node.js code in React Native/Web builds
    const { NodeMTLSAdapter } = require('../../platforms/node/mtls');
    return new NodeMTLSAdapter(debugEnabled);
  } catch (error) {
    console.warn('Node.js mTLS adapter not available, falling back to Web adapter');
    return loadWebMTLSAdapter(debugEnabled);
  }
}

/**
 * Load Web mTLS adapter (graceful fallback - JWT only)
 */
function loadWebMTLSAdapter(debugEnabled = false): IMTLSAdapter {
  return new WebMTLSAdapter(debugEnabled);
}

/**
 * Detect current platform for mTLS adapter loading
 * @deprecated Use detectPlatform() from platform-detector instead
 */
export function detectPlatformForMTLS(): 'react-native' | 'node' | 'web' {
  const { platform } = detectPlatform();
  return platform === 'unknown' ? 'web' : (platform as 'react-native' | 'node' | 'web');
}

/**
 * mTLS adapter configuration by platform
 */
export const MTLS_CONFIG_BY_PLATFORM = {
  'react-native': {
    mtlsSupported: true,
    certificateStorage: 'keychain',
    fallbackToJWT: true,
    defaultTimeout: 30000,
    description: 'Uses @a-cube-io/expo-mutual-tls for native mTLS support',
  },
  node: {
    mtlsSupported: true,
    certificateStorage: 'filesystem',
    fallbackToJWT: true,
    defaultTimeout: 30000,
    description: 'Uses https.Agent with client certificates + axios',
  },
  web: {
    mtlsSupported: false,
    certificateStorage: 'browser-managed',
    fallbackToJWT: true,
    defaultTimeout: 30000,
    description: 'Browser security model prevents programmatic mTLS - uses JWT only',
  },
} as const;

/**
 * Check if mTLS is supported on the current platform
 */
export function isMTLSSupported(platform?: string): boolean {
  const detectedPlatform = platform || detectPlatformForMTLS();
  const config = MTLS_CONFIG_BY_PLATFORM[detectedPlatform as keyof typeof MTLS_CONFIG_BY_PLATFORM];
  return config?.mtlsSupported || false;
}

/**
 * Get mTLS configuration for platform
 */
export function getMTLSConfig(platform?: string) {
  const detectedPlatform = platform || detectPlatformForMTLS();
  return MTLS_CONFIG_BY_PLATFORM[detectedPlatform as keyof typeof MTLS_CONFIG_BY_PLATFORM];
}
