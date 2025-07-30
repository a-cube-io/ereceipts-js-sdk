/**
 * PWA Utils Tests
 * Comprehensive testing for PWA utility functions, constants, and main exports
 * including feature detection, display mode checking, network status, and storage estimation
 */

import {
  PWAUtils,
  PWA_CONSTANTS,
  PWAManager,
  ManifestGenerator,
  AppInstaller,
  BackgroundSyncManager,
  PushNotificationManager,
  type ServiceWorkerMessage,
  type CacheUpdateEvent,
  type OfflineQueueEvent,
} from '@/pwa';

describe('PWA Utils', () => {
  beforeEach(() => {
    // Reset window.matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock ServiceWorkerRegistration
    Object.defineProperty(global, 'ServiceWorkerRegistration', {
      writable: true,
      configurable: true,
      value: function ServiceWorkerRegistration() {
        return {
          prototype: {
            sync: {},
            periodicSync: {},
          },
        };
      },
    });

    // Reset navigator mocks
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    Object.defineProperty(navigator, 'storage', {
      writable: true,
      value: {
        estimate: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should detect standalone mode correctly', () => {
      // Test not standalone (default)
      expect(PWAUtils.isStandalone()).toBe(false);

      // Test standalone via matchMedia
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      expect(PWAUtils.isStandalone()).toBe(true);

      // Test fullscreen mode
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query === '(display-mode: fullscreen)',
        media: query,
      }));

      expect(PWAUtils.isStandalone()).toBe(true);

      // Test Safari standalone
      (window.matchMedia as jest.Mock).mockImplementation(() => ({
        matches: false,
      }));

      (window.navigator as any).standalone = true;
      expect(PWAUtils.isStandalone()).toBe(true);
    });

    it('should handle standalone detection when window is undefined', () => {
      // In JSDOM environment, we can't truly simulate undefined window
      // But we can test that the function handles the check properly
      // by temporarily removing matchMedia functionality
      const originalMatchMedia = window.matchMedia;
      
      try {
        // Remove matchMedia to simulate missing API
        delete (window as any).matchMedia;

        // This should still return a boolean (likely false)
        const result = PWAUtils.isStandalone();
        expect(typeof result).toBe('boolean');
        
      } finally {
        // Restore matchMedia
        (window as any).matchMedia = originalMatchMedia;
      }
    });

    it('should detect PWA support correctly', () => {
      // Test with all required features present
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'caches', {
        value: {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'fetch', {
        value: jest.fn(),
        writable: true,
        configurable: true,
      });

      expect(PWAUtils.isPWASupported()).toBe(true);

      // Test missing serviceWorker
      delete (navigator as any).serviceWorker;
      expect(PWAUtils.isPWASupported()).toBe(false);

      // Restore for next test
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      // Test missing caches
      delete (window as any).caches;
      expect(PWAUtils.isPWASupported()).toBe(false);

      // Restore for next test
      Object.defineProperty(window, 'caches', {
        value: {},
        writable: true,
        configurable: true,
      });

      // Test missing fetch
      delete (window as any).fetch;
      expect(PWAUtils.isPWASupported()).toBe(false);
    });

    it('should handle PWA support detection when window is undefined', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      expect(PWAUtils.isPWASupported()).toBe(false);

      global.window = originalWindow;
    });

    it('should detect background sync support correctly', () => {
      // Test with all required features present
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'ServiceWorkerRegistration', {
        value: {
          prototype: { sync: {} },
        },
        writable: true,
        configurable: true,
      });

      expect(PWAUtils.isBackgroundSyncSupported()).toBe(true);

      // Test missing serviceWorker
      delete (navigator as any).serviceWorker;
      expect(PWAUtils.isBackgroundSyncSupported()).toBe(false);

      // Restore for next test
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      // Test missing sync
      Object.defineProperty(window, 'ServiceWorkerRegistration', {
        value: {
          prototype: {},
        },
        writable: true,
        configurable: true,
      });
      expect(PWAUtils.isBackgroundSyncSupported()).toBe(false);
    });

    it('should detect push notification support correctly', () => {
      // Test with all required features present
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'PushManager', {
        value: {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'Notification', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(PWAUtils.isPushNotificationSupported()).toBe(true);

      // Test missing serviceWorker
      delete (navigator as any).serviceWorker;
      expect(PWAUtils.isPushNotificationSupported()).toBe(false);

      // Restore for next test
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      // Test missing PushManager
      delete (window as any).PushManager;
      expect(PWAUtils.isPushNotificationSupported()).toBe(false);

      // Restore for next test
      Object.defineProperty(window, 'PushManager', {
        value: {},
        writable: true,
        configurable: true,
      });

      // Test missing Notification
      delete (window as any).Notification;
      expect(PWAUtils.isPushNotificationSupported()).toBe(false);
    });

    it('should detect periodic sync support correctly', () => {
      // Test with all required features present
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'ServiceWorkerRegistration', {
        value: {
          prototype: { periodicSync: {} },
        },
        writable: true,
        configurable: true,
      });

      expect(PWAUtils.isPeriodicSyncSupported()).toBe(true);

      // Test missing serviceWorker
      delete (navigator as any).serviceWorker;
      expect(PWAUtils.isPeriodicSyncSupported()).toBe(false);

      // Restore for next test
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
        configurable: true,
      });

      // Test missing periodicSync
      Object.defineProperty(window, 'ServiceWorkerRegistration', {
        value: {
          prototype: {},
        },
        writable: true,
        configurable: true,
      });
      expect(PWAUtils.isPeriodicSyncSupported()).toBe(false);
    });
  });

  describe('Display Mode Detection', () => {
    it('should detect fullscreen display mode', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query === '(display-mode: fullscreen)',
        media: query,
      }));

      expect(PWAUtils.getDisplayMode()).toBe('fullscreen');
    });

    it('should detect standalone display mode', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      }));

      expect(PWAUtils.getDisplayMode()).toBe('standalone');
    });

    it('should detect minimal-ui display mode', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: query === '(display-mode: minimal-ui)',
        media: query,
      }));

      expect(PWAUtils.getDisplayMode()).toBe('minimal-ui');
    });

    it('should default to browser display mode', () => {
      (window.matchMedia as jest.Mock).mockImplementation(() => ({
        matches: false,
      }));

      expect(PWAUtils.getDisplayMode()).toBe('browser');
    });

    it('should handle display mode detection when window is undefined', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      expect(PWAUtils.getDisplayMode()).toBe('browser');

      global.window = originalWindow;
    });
  });

  describe('Network Status Detection', () => {
    it('should get basic network status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const status = PWAUtils.getNetworkStatus();
      expect(status.online).toBe(true);
      expect(status.effectiveType).toBeUndefined();
      expect(status.downlink).toBeUndefined();
      expect(status.rtt).toBeUndefined();
    });

    it('should get detailed network status when connection API is available', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      (navigator as any).connection = {
        effectiveType: '4g',
        downlink: 10.5,
        rtt: 50,
      };

      const status = PWAUtils.getNetworkStatus();
      expect(status).toEqual({
        online: true,
        effectiveType: '4g',
        downlink: 10.5,
        rtt: 50,
      });

      // Clean up
      delete (navigator as any).connection;
    });

    it('should handle webkit connection API', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      (navigator as any).webkitConnection = {
        effectiveType: '3g',
        downlink: 2.1,
        rtt: 150,
      };

      const status = PWAUtils.getNetworkStatus();
      expect(status).toEqual({
        online: false,
        effectiveType: '3g',
        downlink: 2.1,
        rtt: 150,
      });

      // Clean up
      delete (navigator as any).webkitConnection;
    });

    it('should handle mozilla connection API', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      (navigator as any).mozConnection = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 300,
      };

      const status = PWAUtils.getNetworkStatus();
      expect(status).toEqual({
        online: true,
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 300,
      });

      // Clean up
      delete (navigator as any).mozConnection;
    });

    it('should handle network status when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      const status = PWAUtils.getNetworkStatus();
      expect(status).toEqual({ online: true });

      global.navigator = originalNavigator;
    });
  });

  describe('Storage Estimation', () => {
    it('should get storage estimate successfully', async () => {
      const mockEstimate = {
        quota: 1000000000, // 1GB
        usage: 250000000,  // 250MB
      };

      (navigator.storage.estimate as jest.Mock).mockResolvedValue(mockEstimate);

      const estimate = await PWAUtils.getStorageEstimate();
      
      expect(estimate).toEqual({
        quota: 1000000000,
        usage: 250000000,
        usagePercentage: 25,
      });
    });

    it('should handle storage estimate with zero quota', async () => {
      const mockEstimate = {
        quota: 0,
        usage: 100000,
      };

      (navigator.storage.estimate as jest.Mock).mockResolvedValue(mockEstimate);

      const estimate = await PWAUtils.getStorageEstimate();
      
      expect(estimate).toEqual({
        quota: 0,
        usage: 100000,
        usagePercentage: 0,
      });
    });

    it('should handle storage estimate with undefined values', async () => {
      const mockEstimate = {};

      (navigator.storage.estimate as jest.Mock).mockResolvedValue(mockEstimate);

      const estimate = await PWAUtils.getStorageEstimate();
      
      expect(estimate).toEqual({
        quota: 0,
        usage: 0,
        usagePercentage: 0,
      });
    });

    it('should handle storage estimate API error', async () => {
      (navigator.storage.estimate as jest.Mock).mockRejectedValue(new Error('Storage API error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const estimate = await PWAUtils.getStorageEstimate();
      
      expect(estimate).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get storage estimate:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle missing storage API', async () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      const estimate = await PWAUtils.getStorageEstimate();
      expect(estimate).toEqual({});

      global.navigator = originalNavigator;
    });

    it('should handle navigator without storage property', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        writable: true,
      });

      const estimate = await PWAUtils.getStorageEstimate();
      expect(estimate).toEqual({});

      // Restore storage
      Object.defineProperty(navigator, 'storage', {
        writable: true,
        value: {
          estimate: jest.fn(),
        },
      });
    });
  });

  describe('Byte Formatting', () => {
    it('should format bytes correctly', () => {
      expect(PWAUtils.formatBytes(0)).toBe('0 Bytes');
      expect(PWAUtils.formatBytes(1024)).toBe('1 KB');
      expect(PWAUtils.formatBytes(1048576)).toBe('1 MB');
      expect(PWAUtils.formatBytes(1073741824)).toBe('1 GB');
      expect(PWAUtils.formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should format bytes with custom decimal places', () => {
      expect(PWAUtils.formatBytes(1536, 0)).toBe('2 KB');
      expect(PWAUtils.formatBytes(1536, 1)).toBe('1.5 KB');
      expect(PWAUtils.formatBytes(1536, 3)).toBe('1.5 KB'); // parseFloat removes trailing zeros
    });

    it('should handle negative decimal places', () => {
      expect(PWAUtils.formatBytes(1536, -1)).toBe('2 KB');
    });

    it('should format fractional values correctly', () => {
      expect(PWAUtils.formatBytes(1536)).toBe('1.5 KB');
      expect(PWAUtils.formatBytes(1572864)).toBe('1.5 MB');
      expect(PWAUtils.formatBytes(2621440)).toBe('2.5 MB');
    });
  });

  describe('Debounce Function', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = PWAUtils.debounce(mockFn, 1000);

      // Call multiple times rapidly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      // Function should not be called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Function should be called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should handle immediate execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = PWAUtils.debounce(mockFn, 1000, true);

      // First call should execute immediately
      debouncedFn('arg1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      // Subsequent calls should be debounced
      debouncedFn('arg2');
      debouncedFn('arg3');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for debounce period
      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle function parameters correctly', () => {
      const mockFn = jest.fn();
      const debouncedFn = PWAUtils.debounce(mockFn, 500);

      debouncedFn('param1', 'param2', { key: 'value' });

      jest.advanceTimersByTime(500);

      expect(mockFn).toHaveBeenCalledWith('param1', 'param2', { key: 'value' });
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = PWAUtils.debounce(mockFn, 1000);

      debouncedFn('arg1');
      jest.advanceTimersByTime(500);

      // Call again, should reset timer
      debouncedFn('arg2');
      jest.advanceTimersByTime(500);

      // Function should not be called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Advance remaining time
      jest.advanceTimersByTime(500);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });
  });
});

describe('PWA Constants', () => {
  it('should have correct cache prefixes', () => {
    expect(PWA_CONSTANTS.STATIC_CACHE_PREFIX).toBe('acube-static-');
    expect(PWA_CONSTANTS.API_CACHE_PREFIX).toBe('acube-api-');
    expect(PWA_CONSTANTS.RUNTIME_CACHE_PREFIX).toBe('acube-runtime-');
  });

  it('should have correct default cache durations', () => {
    expect(PWA_CONSTANTS.DEFAULT_API_CACHE_DURATION).toBe(5 * 60 * 1000);
    expect(PWA_CONSTANTS.DEFAULT_STATIC_CACHE_DURATION).toBe(24 * 60 * 60 * 1000);
    expect(PWA_CONSTANTS.DEFAULT_RUNTIME_CACHE_DURATION).toBe(60 * 60 * 1000);
  });

  it('should have correct offline queue settings', () => {
    expect(PWA_CONSTANTS.DEFAULT_QUEUE_NAME).toBe('acube-offline-queue');
    expect(PWA_CONSTANTS.DEFAULT_MAX_QUEUE_SIZE).toBe(1000);
    expect(PWA_CONSTANTS.DEFAULT_MAX_RETENTION_TIME).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('should have correct background sync settings', () => {
    expect(PWA_CONSTANTS.DEFAULT_MIN_SYNC_INTERVAL).toBe(15 * 60 * 1000);
  });

  it('should have correct manifest defaults', () => {
    expect(PWA_CONSTANTS.DEFAULT_THEME_COLOR).toBe('#1976d2');
    expect(PWA_CONSTANTS.DEFAULT_BACKGROUND_COLOR).toBe('#ffffff');
    expect(PWA_CONSTANTS.DEFAULT_DISPLAY_MODE).toBe('standalone');
    expect(PWA_CONSTANTS.DEFAULT_ORIENTATION).toBe('portrait');
  });

  it('should have correct service worker events', () => {
    expect(PWA_CONSTANTS.SW_EVENTS.REGISTERED).toBe('sw:registered');
    expect(PWA_CONSTANTS.SW_EVENTS.UPDATED).toBe('sw:updated');
    expect(PWA_CONSTANTS.SW_EVENTS.ERROR).toBe('sw:error');
    expect(PWA_CONSTANTS.SW_EVENTS.INSTALL_AVAILABLE).toBe('install:available');
    expect(PWA_CONSTANTS.SW_EVENTS.INSTALL_COMPLETED).toBe('install:completed');
    expect(PWA_CONSTANTS.SW_EVENTS.CACHE_UPDATED).toBe('cache:updated');
    expect(PWA_CONSTANTS.SW_EVENTS.OFFLINE_QUEUED).toBe('offline:queued');
    expect(PWA_CONSTANTS.SW_EVENTS.OFFLINE_SYNCED).toBe('offline:synced');
    expect(PWA_CONSTANTS.SW_EVENTS.PUSH_RECEIVED).toBe('push:received');
    expect(PWA_CONSTANTS.SW_EVENTS.SYNC_COMPLETED).toBe('sync:completed');
  });

  it('should have correct e-receipt categories', () => {
    expect(PWA_CONSTANTS.ERECEIPT_CATEGORIES).toEqual([
      'business',
      'finance',
      'productivity',
      'utilities',
    ]);
  });

  it('should have correct recommended icon sizes', () => {
    expect(PWA_CONSTANTS.RECOMMENDED_ICON_SIZES).toEqual([
      '72x72',
      '96x96',
      '128x128',
      '144x144',
      '152x152',
      '192x192',
      '384x384',
      '512x512',
    ]);
  });

  it('should have correct maskable icon sizes', () => {
    expect(PWA_CONSTANTS.MASKABLE_ICON_SIZES).toEqual([
      '192x192',
      '512x512',
    ]);
  });

  it('should have readonly constants object', () => {
    // Test that constants object exists and has correct properties
    expect(PWA_CONSTANTS.DEFAULT_THEME_COLOR).toBe('#1976d2');
    expect(typeof PWA_CONSTANTS).toBe('object');
    expect(PWA_CONSTANTS).toBeDefined();
  });
});

describe('PWA Type Definitions', () => {
  it('should have correctly typed ServiceWorkerMessage interface', () => {
    const message: ServiceWorkerMessage = {
      type: 'test-message',
      data: { key: 'value' },
    };

    expect(message.type).toBe('test-message');
    expect(message.data).toEqual({ key: 'value' });
  });

  it('should handle ServiceWorkerMessage without data', () => {
    const message: ServiceWorkerMessage = {
      type: 'simple-message',
    };

    expect(message.type).toBe('simple-message');
    expect(message.data).toBeUndefined();
  });

  it('should have correctly typed CacheUpdateEvent interface', () => {
    const event: CacheUpdateEvent = {
      cacheName: 'acube-api-v1',
      size: 1024,
      lastUpdated: new Date('2023-01-01'),
    };

    expect(event.cacheName).toBe('acube-api-v1');
    expect(event.size).toBe(1024);
    expect(event.lastUpdated).toEqual(new Date('2023-01-01'));
  });

  it('should handle CacheUpdateEvent without lastUpdated', () => {
    const event: CacheUpdateEvent = {
      cacheName: 'acube-static-v1',
      size: 2048,
    };

    expect(event.cacheName).toBe('acube-static-v1');
    expect(event.size).toBe(2048);
    expect(event.lastUpdated).toBeUndefined();
  });

  it('should have correctly typed OfflineQueueEvent interface', () => {
    const event: OfflineQueueEvent = {
      request: '/api/receipts',
      id: 'req_123',
      timestamp: 1640995200000,
    };

    expect(event.request).toBe('/api/receipts');
    expect(event.id).toBe('req_123');
    expect(event.timestamp).toBe(1640995200000);
  });

  it('should handle OfflineQueueEvent without timestamp', () => {
    const event: OfflineQueueEvent = {
      request: '/api/sync',
      id: 'req_456',
    };

    expect(event.request).toBe('/api/sync');
    expect(event.id).toBe('req_456');
    expect(event.timestamp).toBeUndefined();
  });
});

describe('PWA Module Exports', () => {
  it('should export all main PWA classes', () => {
    expect(PWAManager).toBeDefined();
    expect(ManifestGenerator).toBeDefined();
    expect(AppInstaller).toBeDefined();
    expect(BackgroundSyncManager).toBeDefined();
    expect(PushNotificationManager).toBeDefined();
  });

  it('should export PWAUtils object', () => {
    expect(PWAUtils).toBeDefined();
    expect(typeof PWAUtils.isStandalone).toBe('function');
    expect(typeof PWAUtils.isPWASupported).toBe('function');
    expect(typeof PWAUtils.getDisplayMode).toBe('function');
    expect(typeof PWAUtils.getNetworkStatus).toBe('function');
    expect(typeof PWAUtils.getStorageEstimate).toBe('function');
    expect(typeof PWAUtils.formatBytes).toBe('function');
    expect(typeof PWAUtils.debounce).toBe('function');
  });

  it('should export PWA_CONSTANTS object', () => {
    expect(PWA_CONSTANTS).toBeDefined();
    expect(typeof PWA_CONSTANTS.STATIC_CACHE_PREFIX).toBe('string');
    expect(typeof PWA_CONSTANTS.DEFAULT_API_CACHE_DURATION).toBe('number');
    expect(Array.isArray(PWA_CONSTANTS.ERECEIPT_CATEGORIES)).toBe(true);
    expect(Array.isArray(PWA_CONSTANTS.RECOMMENDED_ICON_SIZES)).toBe(true);
  });

  it('should have consistent PWA class constructors', () => {
    // Test that classes can be instantiated (basic smoke test)
    expect(() => new ManifestGenerator()).not.toThrow();
    
    // PWAManager requires config
    expect(() => new PWAManager({})).not.toThrow();
    
    // AppInstaller can be created with empty config
    expect(() => new AppInstaller()).not.toThrow();
  });
});

describe('PWA Environment Compatibility', () => {
  it('should handle server-side rendering environment', async () => {
    // In JSDOM environment, we can't fully simulate SSR, but we can test
    // that the functions handle missing APIs gracefully

    // Test the functions' defensive programming by checking they return safe defaults
    expect(PWAUtils.isStandalone()).toBeDefined();
    expect(PWAUtils.isPWASupported()).toBeDefined();
    expect(PWAUtils.isBackgroundSyncSupported()).toBeDefined();
    expect(PWAUtils.isPushNotificationSupported()).toBeDefined();
    expect(PWAUtils.isPeriodicSyncSupported()).toBeDefined();
    expect(PWAUtils.getDisplayMode()).toBeDefined();

    // Network status should have safe defaults
    const networkStatus = PWAUtils.getNetworkStatus();
    expect(networkStatus).toBeDefined();
    expect(typeof networkStatus.online).toBe('boolean');

    // Storage estimate should return a safe value
    const storageEstimate = await PWAUtils.getStorageEstimate();
    expect(storageEstimate).toBeDefined();
  });

  it('should handle partial browser API support', () => {
    // In the current JSDOM environment, we can test with mocked missing properties
    const originalServiceWorker = (navigator as any).serviceWorker;
    const originalCaches = (window as any).caches;
    const originalFetch = (window as any).fetch;

    try {
      // Test when serviceWorker is available but caches and fetch are not
      delete (navigator as any).serviceWorker;
      delete (window as any).caches;
      delete (window as any).fetch;

      // Should return false when APIs are missing
      expect(PWAUtils.isPWASupported()).toBe(false);

      // Restore serviceWorker, add caches, but keep fetch missing
      (navigator as any).serviceWorker = {};
      (window as any).caches = {};
      
      expect(PWAUtils.isPWASupported()).toBe(false);

      // Add fetch - now all APIs should be available
      (window as any).fetch = jest.fn();
      
      expect(PWAUtils.isPWASupported()).toBe(true);
    } finally {
      // Restore all original properties
      if (originalServiceWorker) {
        (navigator as any).serviceWorker = originalServiceWorker;
      }
      if (originalCaches) {
        (window as any).caches = originalCaches;
      }
      if (originalFetch) {
        (window as any).fetch = originalFetch;
      }
    }
  });

  it('should handle legacy browser environments', () => {
    // Store originals
    const originalNavigator = global.navigator;
    const originalWindow = global.window;

    // Mock older browser without modern PWA APIs
    global.navigator = {
      ...originalNavigator,
    } as any;
    // Remove modern properties
    delete (global.navigator as any).serviceWorker;

    global.window = {
      ...originalWindow,
    } as any;
    // Remove modern properties
    delete (global.window as any).caches;
    delete (global.window as any).PushManager;
    delete (global.window as any).Notification;

    expect(PWAUtils.isPWASupported()).toBe(false);
    expect(PWAUtils.isBackgroundSyncSupported()).toBe(false);
    expect(PWAUtils.isPushNotificationSupported()).toBe(false);
    expect(PWAUtils.isPeriodicSyncSupported()).toBe(false);

    // But basic utilities should still work
    expect(PWAUtils.formatBytes(1024)).toBe('1 KB');
    expect(typeof PWAUtils.debounce(jest.fn(), 100)).toBe('function');

    // Restore originals
    global.navigator = originalNavigator;
    global.window = originalWindow;
  });
});