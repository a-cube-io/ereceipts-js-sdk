import { createPrefixedLogger } from '@/shared/utils';

import { IMTLSPort, PlatformDetector } from '../../../application/ports/driven/mtls.port';

const log = createPrefixedLogger('MTLS-FACTORY');

export class MTLSAdapterFactory {
  static async createAdapter(): Promise<IMTLSPort | null> {
    const platform = PlatformDetector.detectPlatform();

    log.debug('Creating adapter for platform:', platform);

    try {
      switch (platform) {
        case 'react-native': {
          const { ReactNativeMTLSAdapter } = await import('./react-native/mtls');
          return new ReactNativeMTLSAdapter();
        }
        case 'node': {
          const { NodeMTLSAdapter } = await import('./node/mtls');
          return new NodeMTLSAdapter();
        }
        case 'web': {
          const { WebMTLSAdapter } = await import('./web/mtls');
          return new WebMTLSAdapter();
        }
        default: {
          log.warn('Unknown platform, falling back to web adapter');
          const { WebMTLSAdapter: FallbackAdapter } = await import('./web/mtls');
          return new FallbackAdapter();
        }
      }
    } catch (error) {
      log.error('Failed to create mTLS adapter:', error);
      return null;
    }
  }

  static getPlatform(): string {
    return PlatformDetector.detectPlatform();
  }

  static async isMTLSSupported(): Promise<boolean> {
    try {
      const adapter = await this.createAdapter();
      if (!adapter) return false;
      return await adapter.isMTLSSupported();
    } catch {
      return false;
    }
  }
}
