import { INetworkMonitor, NetworkInfo } from '../../adapters';
import { detectPlatform } from '../../core/platform-detector';

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

export class ReactNativeNetworkMonitor implements INetworkMonitor {
  private netInfoModule: NetInfoModule | null = null;
  private unsubscribeFn: (() => void) | null = null;
  private listeners: Array<(online: boolean) => void> = [];
  private currentState: boolean = true;
  private readonly isExpo: boolean;

  constructor() {
    this.isExpo = detectPlatform().isExpo;
    this.init().catch((error) => {
      console.error('Network monitor initialization failed:', error);
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
  }

  private async loadRNModule(): Promise<void> {
    try {
      const module = require('@react-native-community/netinfo');
      this.netInfoModule = module.default || module;
      console.log('Loaded @react‑native‑community/netinfo module');
    } catch (error) {
      console.error('Failed to load React Native NetInfo module:', error);
      this.netInfoModule = null;
    }
  }

  private async loadExpoModule(): Promise<void> {
    try {
      const module = require('expo-network');
      this.netInfoModule = module.default || module;
      console.log('Loaded expo‑network module');
    } catch (error) {
      console.error('Failed to load Expo Network module:', error);
      this.netInfoModule = null;
    }
  }

  private async fetchInitialState(): Promise<void> {
    if (!this.netInfoModule) return;

    try {
      let online = false;
      if (this.isExpo) {
        const state = await this.netInfoModule.getNetworkStateAsync();
        online = !!(state.isConnected && state.isInternetReachable !== false);
      } else {
        const state = await this.netInfoModule.fetch();
        online = !!(state.isConnected && state.isInternetReachable !== false);
      }
      this.currentState = online;
      console.log('Initial network state:', online ? 'online' : 'offline');
    } catch (error) {
      console.warn('Could not fetch initial network state:', error);
    }
  }

  private subscribeToStateChanges(): void {
    if (!this.netInfoModule) return;

    console.debug('Subscribing to network state changes');
    console.dir(this.netInfoModule, { depth: 1 });

    if (this.isExpo) {
      // expo‑network: addNetworkStateListener returns unsubscribe function
      this.unsubscribeFn = this.netInfoModule.addNetworkStateListener((state: NetworkState) => {
        this.handleStateChange(!!state.isConnected, state.isInternetReachable ?? false);
      });
    } else {
      // @react‑native‑community/netinfo: addEventListener returns unsubscribe function
      this.unsubscribeFn = this.netInfoModule.addEventListener((state: NetworkState) => {
        this.handleStateChange(!!state.isConnected, state.isInternetReachable ?? false);
      });
    }
  }

  private handleStateChange(isConnected: boolean, isInternetReachable: boolean): void {
    const online = isConnected && isInternetReachable !== false;
    if (online !== this.currentState) {
      this.currentState = online;
      this.notifyListeners(online);
    }
  }

  private notifyListeners(online: boolean): void {
    // call listeners safely so one failing listener doesn't break others
    for (const cb of this.listeners.slice()) {
      try {
        cb(online);
      } catch (err) {
        console.error('Network status listener threw an error:', err);
      }
    }
  }

  isOnline(): boolean {
    return this.currentState;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);

    if (!this.netInfoModule) {
      // late init if needed
      this.init().catch((error) => {
        console.error('Late initialization of network monitor failed:', error);
      });
    }

    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    if (!this.netInfoModule) {
      await this.init();
      if (!this.netInfoModule) {
        return null;
      }
    }

    try {
      if (this.isExpo) {
        const state = await this.netInfoModule.getNetworkStateAsync();
        return {
          type: this.mapConnectionType(state.type),
          effectiveType: undefined, // expo‑network may not expose cellularGeneration
          downlink: undefined,
          rtt: undefined,
        };
      } else {
        const state = await this.netInfoModule.fetch();
        return {
          type: this.mapConnectionType(state.type),
          effectiveType: this.mapEffectiveType(state.details?.cellularGeneration),
          downlink: state.details?.downlink,
          rtt: state.details?.rtt,
        };
      }
    } catch (error) {
      console.error('Failed to fetch detailed network info:', error);
      return null;
    }
  }

  destroy(): void {
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
    }
    this.listeners = [];
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
