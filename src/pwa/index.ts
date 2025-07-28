/**
 * PWA (Progressive Web App) Module for A-Cube E-Receipt SDK
 * 
 * Provides comprehensive PWA functionality including:
 * - Service worker management
 * - Advanced caching strategies
 * - Offline-first functionality
 * - App install prompts
 * - Push notifications
 * - Background sync
 * - Manifest generation
 * 
 * @example Basic Usage
 * ```typescript
 * import { PWAManager, ManifestGenerator } from '@a-cube-io/ereceipts-js-sdk/pwa';
 * 
 * // Initialize PWA manager
 * const pwa = new PWAManager({
 *   autoRegister: true,
 *   enableInstallPrompts: true,
 * });
 * 
 * // Generate manifest
 * const manifestGenerator = new ManifestGenerator({
 *   name: 'My E-Receipt App',
 *   themeColor: '#1976d2',
 * });
 * 
 * const manifest = manifestGenerator.generateManifestJSON();
 * ```
 * 
 * @example Advanced PWA Setup
 * ```typescript
 * import { PWAManager, ManifestGenerator } from '@a-cube-io/ereceipts-js-sdk/pwa';
 * 
 * const pwa = new PWAManager({
 *   serviceWorkerPath: '/custom-sw.js',
 *   cacheStrategy: {
 *     apiCacheDuration: 10 * 60 * 1000, // 10 minutes
 *     staleWhileRevalidate: true,
 *   },
 *   pushNotifications: {
 *     enabled: true,
 *     vapidPublicKey: 'your-vapid-key',
 *   },
 * });
 * 
 * // Listen for PWA events
 * pwa.on('sw:registered', ({ registration }) => {
 *   console.log('Service worker registered:', registration);
 * });
 * 
 * pwa.on('install:available', ({ prompt }) => {
 *   // Show custom install UI
 *   showInstallButton();
 * });
 * 
 * pwa.on('offline:synced', ({ request, id }) => {
 *   console.log('Offline request synced:', request);
 * });
 * ```
 */

// Core PWA exports
export { PWAManager } from './pwa-manager.js';
export type { 
  PWAManagerConfig, 
  PWAEvents, 
  CacheInfo 
} from './pwa-manager.js';

// Manifest generator exports
export { ManifestGenerator } from './manifest-generator.js';
export type { 
  PWAManifestConfig, 
  WebAppManifest 
} from './manifest-generator.js';

// Background sync exports
export { BackgroundSyncManager } from './background-sync.js';
export type {
  BackgroundSyncConfig,
  BackgroundSyncEvents,
  SyncOperation,
  SyncOperationType,
  SyncPriority,
  ConflictStrategy,
  SyncStatus,
  SyncBatch,
  SyncStatistics,
} from './background-sync.js';

// Offline integration exports
export { PWAOfflineIntegration, createOfflineIntegration, getReceiptSyncPriority } from './offline-integration.js';
export type {
  OfflineIntegrationConfig,
  OfflineIntegrationEvents,
} from './offline-integration.js';

// Push notifications exports
export { PushNotificationManager } from './push-notifications.js';
export type {
  PushNotificationConfig,
  PushNotificationEvents,
  NotificationPayload,
  NotificationType,
  NotificationPriority,
  PushSubscriptionInfo,
} from './push-notifications.js';

// App installer exports
export { AppInstaller } from './app-installer.js';
export type {
  AppInstallerConfig,
  AppInstallerEvents,
  InstallCriteria,
} from './app-installer.js';

// Service worker types (for TypeScript support)
export interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

export interface CacheUpdateEvent {
  cacheName: string;
  size: number;
  lastUpdated?: Date;
}

export interface OfflineQueueEvent {
  request: string;
  id: string;
  timestamp?: number;
}

/**
 * PWA utility functions
 */
export const PWAUtils = {
  /**
   * Check if the app is running in standalone mode (installed as PWA)
   */
  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true
    );
  },

  /**
   * Check if PWA features are supported
   */
  isPWASupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      'serviceWorker' in navigator &&
      'caches' in window &&
      'fetch' in window
    );
  },

  /**
   * Check if background sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
  },

  /**
   * Check if push notifications are supported
   */
  isPushNotificationSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Check if periodic background sync is supported
   */
  isPeriodicSyncSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype;
  },

  /**
   * Get display mode
   */
  getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
    if (typeof window === 'undefined') return 'browser';
    
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    return 'browser';
  },

  /**
   * Get network status
   */
  getNetworkStatus(): {
    online: boolean;
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    downlink?: number;
    rtt?: number;
  } {
    if (typeof navigator === 'undefined') {
      return { online: true };
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  },

  /**
   * Estimate cache storage quota
   */
  async getStorageEstimate(): Promise<{
    quota?: number;
    usage?: number;
    usagePercentage?: number;
  }> {
    if (typeof navigator === 'undefined' || !('storage' in navigator)) {
      return {};
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const usagePercentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

      return {
        quota,
        usage,
        usagePercentage,
      };
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
      return {};
    }
  },

  /**
   * Convert bytes to human readable format
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Create a debounced function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate: boolean = false
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeout;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func(...args);
    };
  },
};

/**
 * PWA constants
 */
export const PWA_CONSTANTS = {
  // Cache names
  STATIC_CACHE_PREFIX: 'acube-static-',
  API_CACHE_PREFIX: 'acube-api-',
  RUNTIME_CACHE_PREFIX: 'acube-runtime-',
  
  // Default cache durations (in milliseconds)
  DEFAULT_API_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  DEFAULT_STATIC_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_RUNTIME_CACHE_DURATION: 60 * 60 * 1000, // 1 hour
  
  // Offline queue settings
  DEFAULT_QUEUE_NAME: 'acube-offline-queue',
  DEFAULT_MAX_QUEUE_SIZE: 1000,
  DEFAULT_MAX_RETENTION_TIME: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Background sync settings
  DEFAULT_MIN_SYNC_INTERVAL: 15 * 60 * 1000, // 15 minutes
  
  // Manifest defaults
  DEFAULT_THEME_COLOR: '#1976d2',
  DEFAULT_BACKGROUND_COLOR: '#ffffff',
  DEFAULT_DISPLAY_MODE: 'standalone',
  DEFAULT_ORIENTATION: 'portrait',
  
  // Service worker events
  SW_EVENTS: {
    REGISTERED: 'sw:registered',
    UPDATED: 'sw:updated',
    ERROR: 'sw:error',
    INSTALL_AVAILABLE: 'install:available',
    INSTALL_COMPLETED: 'install:completed',
    CACHE_UPDATED: 'cache:updated',
    OFFLINE_QUEUED: 'offline:queued',
    OFFLINE_SYNCED: 'offline:synced',
    PUSH_RECEIVED: 'push:received',
    SYNC_COMPLETED: 'sync:completed',
  } as const,
  
  // Italian e-receipt specific categories
  ERECEIPT_CATEGORIES: [
    'business',
    'finance',
    'productivity',
    'utilities',
  ] as const,
  
  // Recommended icon sizes for PWA
  RECOMMENDED_ICON_SIZES: [
    '72x72',
    '96x96',
    '128x128',
    '144x144',
    '152x152',
    '192x192',
    '384x384',
    '512x512',
  ] as const,
  
  // Maskable icon sizes
  MASKABLE_ICON_SIZES: [
    '192x192',
    '512x512',
  ] as const,
} as const;

// Import classes for default export
import { PWAManager } from './pwa-manager.js';
import { ManifestGenerator } from './manifest-generator.js';
import { AppInstaller } from './app-installer.js';

/**
 * Default export for convenient access
 */
export default {
  PWAManager,
  ManifestGenerator,
  PWAUtils,
  PWA_CONSTANTS,
  AppInstaller,
};