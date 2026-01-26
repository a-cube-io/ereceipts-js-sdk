import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NetworkInfo } from '@/application/ports/driven';
import { createPrefixedLogger, detectPlatform } from '@/shared/utils';

import { NetworkBase } from '../shared/network-base';

const log = createPrefixedLogger('RN-NETWORK');

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type?: string;
  details?: {
    cellularGeneration?: string;
    downlink?: number;
    rtt?: number;
  };
}

interface NetInfoModule {
  fetch(): Promise<NetworkState>;
  getNetworkStateAsync(): Promise<NetworkState>;
  addEventListener(callback: (state: NetworkState) => void): () => void;
  addNetworkStateListener(callback: (state: NetworkState) => void): () => void;
}

/**
 * React Native network monitor using RxJS
 * Supports both @react-native-community/netinfo and expo-network
 */
export class ReactNativeNetworkMonitor extends NetworkBase {
  private netInfoModule: NetInfoModule | null = null;
  private nativeUnsubscribe: (() => void) | null = null;
  private readonly isExpo: boolean;
  private readonly moduleReady$ = new Subject<void>();

  constructor() {
    super(true, 500); // Higher debounce for mobile networks
    this.isExpo = detectPlatform().isExpo;

    this.init().catch((error) => {
      log.error('Network monitor initialization failed:', error);
    });
  }

  private async init(): Promise<void> {
    if (this.isExpo) {
      await this.loadExpoModule();
    } else {
      await this.loadRNModule();
    }

    await this.fetchInitialState();
    this.subscribeToStateChanges();

    this.moduleReady$.next();
    this.moduleReady$.complete();
  }

  private async loadRNModule(): Promise<void> {
    try {
      const module = require('@react-native-community/netinfo');
      this.netInfoModule = module.default || module;
      log.debug('Loaded @react-native-community/netinfo module');
    } catch (error) {
      log.error('Failed to load React Native NetInfo module:', error);
      this.netInfoModule = null;
    }
  }

  private async loadExpoModule(): Promise<void> {
    try {
      const module = require('expo-network');
      this.netInfoModule = module.default || module;
      log.debug('Loaded expo-network module');
    } catch (error) {
      log.error('Failed to load Expo Network module:', error);
      this.netInfoModule = null;
    }
  }

  private async fetchInitialState(): Promise<void> {
    if (!this.netInfoModule) return;

    try {
      let state: NetworkState;
      if (this.isExpo) {
        state = await this.netInfoModule.getNetworkStateAsync();
      } else {
        state = await this.netInfoModule.fetch();
      }

      const online = !!(state.isConnected && state.isInternetReachable !== false);
      this.updateStatus(online);
      log.debug('Initial network state:', online ? 'online' : 'offline');
    } catch (error) {
      log.warn('Could not fetch initial network state:', error);
    }
  }

  private subscribeToStateChanges(): void {
    if (!this.netInfoModule) return;

    log.debug('Subscribing to network state changes');

    const handleState = (state: NetworkState): void => {
      const online = !!(state.isConnected && (state.isInternetReachable ?? true));
      this.updateStatus(online);
    };

    if (this.isExpo) {
      this.nativeUnsubscribe = this.netInfoModule.addNetworkStateListener(handleState);
    } else {
      this.nativeUnsubscribe = this.netInfoModule.addEventListener(handleState);
    }

    // Cleanup native listener when destroy$ emits
    this.destroy$.pipe(takeUntil(this.destroy$)).subscribe({
      complete: () => {
        if (this.nativeUnsubscribe) {
          this.nativeUnsubscribe();
          this.nativeUnsubscribe = null;
        }
      },
    });
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    // Wait for module initialization if not ready
    if (!this.netInfoModule) {
      await new Promise<void>((resolve) => {
        this.moduleReady$.subscribe({ complete: () => resolve() });
      });

      if (!this.netInfoModule) return null;
    }

    try {
      const state = this.isExpo
        ? await this.netInfoModule.getNetworkStateAsync()
        : await this.netInfoModule.fetch();

      return {
        type: this.mapConnectionType(state.type),
        effectiveType: this.mapEffectiveType(state.details?.cellularGeneration),
        downlink: state.details?.downlink,
        rtt: state.details?.rtt,
      };
    } catch (error) {
      log.error('Failed to fetch detailed network info:', error);
      return null;
    }
  }

  override destroy(): void {
    if (this.nativeUnsubscribe) {
      this.nativeUnsubscribe();
      this.nativeUnsubscribe = null;
    }
    super.destroy();
  }

  private mapConnectionType(
    type: string | null | undefined
  ): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  private mapEffectiveType(gen: string | null | undefined): '2g' | '3g' | '4g' | '5g' | undefined {
    switch (gen) {
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      case '5g':
        return '5g';
      default:
        return undefined;
    }
  }
}
