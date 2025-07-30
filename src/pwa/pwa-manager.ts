/**
 * PWA Manager for A-Cube E-Receipt SDK
 * Manages Progressive Web App features including service worker registration,
 * caching strategies, and offline functionality
 *
 * Features:
 * - Service worker lifecycle management
 * - Cache control and monitoring
 * - Offline queue integration
 * - App install prompts
 * - Background sync coordination
 */

import { EventEmitter } from 'eventemitter3';

import { AppInstaller, type EngagementData, type InstallCriteria, type AppInstallerConfig } from './app-installer';
import { PushNotificationManager, type NotificationPayload, type PushNotificationConfig } from './push-notifications';

/**
 * PWA Manager configuration
 */
export interface PWAManagerConfig {
  /** Service worker script path */
  serviceWorkerPath?: string;

  /** Enable automatic service worker registration */
  autoRegister?: boolean;

  /** Enable app install prompts */
  enableInstallPrompts?: boolean;

  /** Cache strategy preferences */
  cacheStrategy?: {
    /** API cache duration in milliseconds */
    apiCacheDuration?: number;

    /** Static cache duration in milliseconds */
    staticCacheDuration?: number;

    /** Enable stale-while-revalidate for API calls */
    staleWhileRevalidate?: boolean;
  };

  /** Background sync configuration */
  backgroundSync?: {
    /** Enable periodic background sync */
    enablePeriodicSync?: boolean;

    /** Minimum interval for periodic sync in milliseconds */
    minSyncInterval?: number;
  };

  /** Push notification configuration */
  pushNotifications?: {
    /** Enable push notifications */
    enabled?: boolean;

    /** VAPID public key for push notifications */
    vapidPublicKey?: string;
  };

  /** App installer configuration */
  appInstaller?: {
    /** Enable app install prompts */
    enabled?: boolean;

    /** Install criteria configuration */
    criteria?: InstallCriteria;

    /** Auto-show prompt when criteria met */
    autoShow?: boolean;

    /** Custom installer configuration */
    config?: Partial<AppInstallerConfig>;
  };
}

/**
 * PWA events
 */
export interface PWAEvents {
  'sw:registered': { registration: ServiceWorkerRegistration };
  'sw:updated': { registration: ServiceWorkerRegistration };
  'sw:error': { error: Error };
  'install:available': { prompt: BeforeInstallPromptEvent };
  'install:completed': { outcome: 'accepted' | 'dismissed' };
  'cache:updated': { cacheName: string; size: number };
  'offline:queued': { request: string; id: string };
  'offline:synced': { request: string; id: string };
  'push:received': { data: any };
  'push:subscribed': { subscription: any };
  'push:unsubscribed': { reason: string };
  'notification:shown': { notification: NotificationPayload };
  'notification:clicked': { action: string; data: any };
  'sync:completed': { syncedCount: number };
  'app:installable': { canInstall: boolean };
  'app:installed': { platform: string };
  'app:install-prompted': { type: 'native' | 'custom' };
  'app:install-dismissed': { reason: 'user' | 'timeout' | 'error' };
}

/**
 * Cache information
 */
export interface CacheInfo {
  name: string;
  size: number;
  lastUpdated?: Date;
}

/**
 * Install prompt event (enhanced BeforeInstallPromptEvent)
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DEFAULT_CONFIG: Required<PWAManagerConfig> = {
  serviceWorkerPath: '/sw.js',
  autoRegister: true,
  enableInstallPrompts: true,
  cacheStrategy: {
    apiCacheDuration: 5 * 60 * 1000, // 5 minutes
    staticCacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    staleWhileRevalidate: true,
  },
  backgroundSync: {
    enablePeriodicSync: true,
    minSyncInterval: 15 * 60 * 1000, // 15 minutes
  },
  pushNotifications: {
    enabled: false,
    vapidPublicKey: '',
  },
  appInstaller: {
    enabled: true,
    autoShow: true,
    criteria: {
      minEngagementTime: 2 * 60 * 1000, // 2 minutes
      minPageViews: 3,
      minReceiptsCreated: 1,
    },
    config: {},
  },
};

/**
 * PWA Manager - Coordinates Progressive Web App features
 */
export class PWAManager extends EventEmitter<PWAEvents> {
  private config: Required<PWAManagerConfig>;

  private registration: ServiceWorkerRegistration | null = null;

  private installPrompt: BeforeInstallPromptEvent | null = null;

  private isSupported: boolean;

  private messageChannel: MessageChannel | null = null;

  private pushManager?: PushNotificationManager;

  private appInstaller?: AppInstaller;

  constructor(config: PWAManagerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isSupported = this.checkPWASupport();

    if (this.isSupported) {
      this.setupEventListeners();

      if (this.config.autoRegister) {
        this.registerServiceWorker().catch(error => {
          console.error('Failed to auto-register service worker:', error);
        });
      }
    }
  }

  /**
   * Check if PWA features are supported
   */
  private checkPWASupport(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'caches' in window &&
      'fetch' in window
    );
  }

  /**
   * Setup event listeners for PWA features
   */
  private setupEventListeners(): void {
    // Install prompt handling
    if (this.config.enableInstallPrompts) {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.installPrompt = event as BeforeInstallPromptEvent;
        this.emit('install:available', { prompt: this.installPrompt });
      });

      window.addEventListener('appinstalled', () => {
        this.installPrompt = null;
        this.emit('install:completed', { outcome: 'accepted' });
      });
    }

    // Online/offline handling
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported) {
      throw new Error('Service workers are not supported in this environment');
    }

    try {
      this.registration = await navigator.serviceWorker.register(
        this.config.serviceWorkerPath,
        {
          scope: '/',
          updateViaCache: 'imports',
        },
      );

      // Setup message channel for communication
      this.setupMessageChannel();

      // Handle registration updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.emit('sw:updated', { registration: this.registration! });
            }
          });
        }
      });

      // Register for background sync
      if (this.config.backgroundSync.enablePeriodicSync && 'periodicSync' in this.registration) {
        await this.registerPeriodicSync();
      }

      // Register for push notifications
      if (this.config.pushNotifications.enabled) {
        await this.initializePushNotifications();
      }

      // Initialize app installer
      if (this.config.appInstaller.enabled) {
        await this.initializeAppInstaller();
      }

      this.emit('sw:registered', { registration: this.registration });
      console.log('Service worker registered successfully');

      return this.registration;
    } catch (error) {
      const swError = new Error(`Service worker registration failed: ${error}`);
      this.emit('sw:error', { error: swError });
      throw swError;
    }
  }

  /**
   * Setup message channel for service worker communication
   */
  private setupMessageChannel(): void {
    if (!this.registration) {return;}

    this.messageChannel = new MessageChannel();

    // Listen for messages from service worker
    this.messageChannel.port1.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'CACHE_SIZE':
          this.emit('cache:updated', { cacheName: 'all', size: data.reduce((sum: number, cache: any) => sum + cache.size, 0) });
          break;

        case 'OFFLINE_SYNC_SUCCESS':
          this.emit('offline:synced', { request: data.url, id: data.id });
          break;

        case 'CACHE_CLEARED':
          this.emit('cache:updated', { cacheName: 'all', size: 0 });
          break;
      }
    };

    // Send port to service worker
    navigator.serviceWorker.controller?.postMessage(
      { type: 'PORT_TRANSFER' },
      [this.messageChannel.port2],
    );
  }

  /**
   * Register periodic background sync
   */
  private async registerPeriodicSync(): Promise<void> {
    if (!this.registration || !('periodicSync' in this.registration)) {
      console.warn('Periodic background sync not supported');
      return;
    }

    try {
      // Request permission for background sync
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });

      if (status.state === 'granted') {
        await (this.registration as any).periodicSync.register('offline-queue-periodic', {
          minInterval: this.config.backgroundSync.minSyncInterval,
        });

        console.log('Periodic background sync registered');
      }
    } catch (error) {
      console.warn('Failed to register periodic background sync:', error);
    }
  }

  /**
   * Initialize app installer
   */
  private async initializeAppInstaller(): Promise<void> {
    try {

      const installerConfig: AppInstallerConfig = {
        ...this.config.appInstaller.config,
        criteria: this.config.appInstaller.criteria ?? DEFAULT_CONFIG.appInstaller.criteria,
        autoShow: this.config.appInstaller.autoShow ?? DEFAULT_CONFIG.appInstaller.autoShow,
      } as AppInstallerConfig;

      this.appInstaller = new AppInstaller(installerConfig);

      // Forward app installer events
      this.appInstaller.on('criteria:met', () => {
        this.emit('app:installable', { canInstall: true });
      });

      this.appInstaller.on('prompt:shown', ({ type }) => {
        this.emit('app:install-prompted', { type });
      });

      this.appInstaller.on('prompt:dismissed', ({ reason }) => {
        this.emit('app:install-dismissed', { reason });
      });

      this.appInstaller.on('install:completed', ({ outcome, platform }) => {
        if (outcome === 'accepted') {
          this.emit('app:installed', { platform });
        }
      });

      console.log('App installer initialized');
    } catch (error) {
      console.warn('Failed to initialize app installer:', error);
    }
  }

  /**
   * Initialize push notifications
   */
  private async initializePushNotifications(): Promise<void> {
    if (!this.registration || !this.config.pushNotifications.vapidPublicKey) {
      console.warn('Push notifications not configured');
      return;
    }

    try {
      // Create push notification manager
      const pushConfig: PushNotificationConfig = {
        vapidPublicKey: this.config.pushNotifications.vapidPublicKey,
        serviceWorkerRegistration: this.registration,
        autoSubscribe: true,
        language: 'it', // Default for Italian e-receipts
        serverEndpoint: '/api/push/subscribe',
      };

      this.pushManager = new PushNotificationManager(pushConfig);

      // Forward push notification events
      this.pushManager.on('subscription:created', ({ subscription }) => {
        this.emit('push:subscribed', { subscription });
      });

      this.pushManager.on('subscription:deleted', ({ reason }) => {
        this.emit('push:unsubscribed', { reason });
      });

      this.pushManager.on('notification:shown', ({ notification }) => {
        this.emit('notification:shown', { notification });
      });

      this.pushManager.on('notification:clicked', ({ action, data }) => {
        this.emit('notification:clicked', { action, data });
      });

      this.pushManager.on('error', (error) => {
        console.error('Push notification error:', error);
      });

      console.log('Push notifications initialized');
    } catch (error) {
      console.warn('Failed to initialize push notifications:', error);
    }
  }


  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatusChange(isOnline: boolean): void {
    if (isOnline && this.registration) {
      // Trigger background sync when coming back online
      this.triggerBackgroundSync();
    }
  }

  /**
   * Trigger background sync
   */
  async triggerBackgroundSync(): Promise<void> {
    if (!this.registration || !('sync' in this.registration)) {
      console.warn('Background sync not supported');
      return;
    }

    try {
      await (this.registration as any).sync.register('offline-queue-sync');
      console.log('Background sync triggered');
    } catch (error) {
      console.warn('Failed to trigger background sync:', error);
    }
  }

  /**
   * Show app install prompt
   */
  async showInstallPrompt(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string } | null> {
    if (this.appInstaller) {
      try {
        await this.appInstaller.showInstallPrompt();
        return null; // AppInstaller will emit events
      } catch (error) {
        console.error('Failed to show install prompt via AppInstaller:', error);
      }
    }

    // Fallback to original implementation
    if (!this.installPrompt) {
      console.warn('Install prompt not available');
      return null;
    }

    try {
      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;

      this.emit('install:completed', { outcome: choiceResult.outcome });
      this.installPrompt = null;

      return choiceResult;
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      return null;
    }
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<CacheInfo[]> {
    if (!this.messageChannel) {
      throw new Error('Service worker not registered or message channel not available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Cache info request timeout'));
      }, 5000);

      this.messageChannel!.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_SIZE') {
          clearTimeout(timeout);
          const cacheInfo: CacheInfo[] = event.data.data.map((cache: any) => ({
            name: cache.name,
            size: cache.size,
            lastUpdated: new Date(),
          }));
          resolve(cacheInfo);
        }
      };

      navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_SIZE' });
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.messageChannel) {
      throw new Error('Service worker not registered or message channel not available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Clear cache request timeout'));
      }, 10000);

      this.messageChannel!.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          clearTimeout(timeout);
          resolve();
        }
      };

      navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
    });
  }

  /**
   * Force service worker update
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      await this.registration.update();

      if (this.registration.waiting) {
        // Signal the waiting service worker to skip waiting
        navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.error('Failed to update service worker:', error);
      throw error;
    }
  }

  /**
   * Check if app is installable
   */
  isInstallable(): boolean {
    if (this.appInstaller) {
      return this.appInstaller.canInstall();
    }
    return this.installPrompt !== null;
  }

  /**
   * Check if app is installed
   */
  isInstalled(): boolean {
    if (this.appInstaller) {
      return this.appInstaller.getPlatformInfo().isStandalone;
    }
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Get service worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if PWA features are supported
   */
  isPWASupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get push notification manager
   */
  getPushManager(): PushNotificationManager | undefined {
    return this.pushManager;
  }

  /**
   * Get app installer
   */
  getAppInstaller(): AppInstaller | undefined {
    return this.appInstaller;
  }

  /**
   * Record receipt created (for app installer engagement tracking)
   */
  recordReceiptCreated(): void {
    if (this.appInstaller) {
      this.appInstaller.recordReceiptCreated();
    }
  }

  /**
   * Get engagement statistics
   */
  getEngagementStats(): EngagementData | null {
    if (this.appInstaller) {
      return this.appInstaller.getEngagementStats();
    }
    return null;
  }

  /**
   * Check if app install criteria are met
   */
  async checkInstallCriteria(): Promise<boolean> {
    if (this.appInstaller) {
      return this.appInstaller.checkCriteria();
    }
    return false;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<any> {
    if (!this.pushManager) {
      throw new Error('Push notifications not initialized');
    }

    return this.pushManager.subscribe();
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPushNotifications(): Promise<void> {
    if (!this.pushManager) {
      throw new Error('Push notifications not initialized');
    }

    return this.pushManager.unsubscribe();
  }

  /**
   * Show a notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.pushManager) {
      throw new Error('Push notifications not initialized');
    }

    return this.pushManager.showNotification(payload);
  }

  /**
   * Check if subscribed to push notifications
   */
  isPushSubscribed(): boolean {
    return this.pushManager?.isSubscribed() || false;
  }

  /**
   * Destroy PWA manager
   */
  async destroy(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.unregister();
      } catch (error) {
        console.warn('Failed to unregister service worker:', error);
      }
    }

    if (this.messageChannel) {
      this.messageChannel.port1.close();
      this.messageChannel.port2.close();
    }

    if (this.pushManager) {
      await this.pushManager.destroy();
    }

    if (this.appInstaller) {
      this.appInstaller.destroy();
    }

    this.removeAllListeners();
  }
}
