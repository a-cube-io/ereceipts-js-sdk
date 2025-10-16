import type {NetInfoState} from '@react-native-community/netinfo';
import NetInfoLib from '@react-native-community/netinfo';
import {INetworkMonitor, NetworkInfo} from '../../adapters';

/**
 * Network monitor basato su @react-native-community/netinfo
 */
export class ReactNativeNetworkMonitor implements INetworkMonitor {
    private NetInfo: typeof NetInfoLib | null = null;
    private listeners: Array<(online: boolean) => void> = [];
    private unsubscribe: (() => void) | null = null;
    private currentState: boolean = true;

    private initializing: boolean = false;
    private readyPromise: Promise<void> | null = null;

    constructor() {
        this.initializeNetInfo().catch(err => {
            console.warn('[NETWORK-MONITOR] initialization failed:', err);
        });
    }

    public async ready(): Promise<void> {
        if (this.NetInfo) return;
        if (!this.readyPromise) {
            this.readyPromise = this.initializeNetInfo();
        }
        await this.readyPromise;
    }

    private async initializeNetInfo(): Promise<void> {
        if (this.NetInfo || this.initializing) {
            return;
        }
        this.initializing = true;
        try {
            // import dinamico compatibile con Metro
            const mod = require('@react-native-community/netinfo');
            this.NetInfo = mod.default ?? mod;
            console.log('[NETWORK-MONITOR] NetInfo loaded');

            // Inizializza stato corrente con fetch
            const state = await this.NetInfo!.fetch();
            this.currentState = this.isStateOnline(state);

            this.subscribeToNetworkState();
        } catch (error) {
            console.warn('[NETWORK-MONITOR] NetInfo not available:', error);
        } finally {
            this.initializing = false;
        }
    }

    private subscribeToNetworkState(): void {
        if (!this.NetInfo) return;
        if (this.unsubscribe) {
            // già sottoscritto → non duplicare
            return;
        }
        this.unsubscribe = this.NetInfo.addEventListener((state: NetInfoState) => {
            const isOnline = this.isStateOnline(state);
            if (isOnline !== this.currentState) {
                this.currentState = isOnline;
                this.notifyListeners(isOnline);
            }
        });
    }

    public isOnline(): boolean {
        return this.currentState;
    }

    public onStatusChange(callback: (online: boolean) => void): () => void {
        this.listeners.push(callback);

        if (!this.NetInfo) {
            void this.initializeNetInfo();
        } else {
            this.subscribeToNetworkState();
        }

        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
            if (this.listeners.length === 0) {
                this.cleanupNative();
            }
        };
    }

    public async getNetworkInfo(): Promise<NetworkInfo | null> {
        await this.ready();
        if (!this.NetInfo) return null;

        try {
            const state = await this.NetInfo.fetch();
            return {
                type: this.mapConnectionType(state.type),
                effectiveType: this.mapEffectiveType(state.details?.cellularGeneration),
            };
        } catch (error) {
            console.error('[NETWORK-MONITOR] fetch error:', error);
            return null;
        }
    }

    private notifyListeners(online: boolean): void {
        for (const cb of this.listeners) {
            try {
                cb(online);
            } catch (err) {
                console.error('Error in network status callback:', err);
            }
        }
    }

    private cleanupNative(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    private isStateOnline(state: NetInfoState): boolean {
        // `isInternetReachable` può essere null, quindi fallback se necessario
        return !!state.isConnected && (state.isInternetReachable ?? true);
    }

    private mapConnectionType(type: string): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
        switch (type) {
            case 'wifi':
                return 'wifi';
            case 'cellular':
                return 'cellular';
            case 'ethernet':
                return 'ethernet';
            case 'none':
            case 'unknown':
            default:
                return 'unknown';
        }
    }

    private mapEffectiveType(generation: string | undefined): '2g' | '3g' | '4g' | '5g' | undefined {
        switch (generation) {
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

    public destroy(): void {
        this.cleanupNative();
        this.listeners = [];
    }
}