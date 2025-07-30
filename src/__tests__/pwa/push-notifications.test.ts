/**
 * Push Notification Manager Tests
 * Comprehensive testing for PWA push notifications with Italian e-receipt specific messaging
 * including subscription management, notification display, and multi-language support
 */

import {
  PushNotificationManager,
  type PushNotificationConfig,
  type NotificationPayload,
  type NotificationType,
  type NotificationPriority,
} from '@/pwa/push-notifications';

// Mock PushSubscription
class MockPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  options: PushSubscriptionOptions;
  private keys: Record<string, ArrayBuffer>;

  constructor(endpoint: string, keys: Record<string, ArrayBuffer>, expirationTime: number | null = null) {
    this.endpoint = endpoint;
    this.expirationTime = expirationTime;
    this.keys = keys;
    this.options = { 
      userVisibleOnly: true,
      applicationServerKey: null
     };
  }

  getKey(name: string): ArrayBuffer | null {
    return this.keys[name] || null;
  }

  unsubscribe(): Promise<boolean> {
    return Promise.resolve(true);
  }

  toJSON(): PushSubscriptionJSON {
    return {
      endpoint: this.endpoint,
      expirationTime: this.expirationTime,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(this.keys.p256dh as ArrayBuffer))),
        auth: btoa(String.fromCharCode(...new Uint8Array(this.keys.auth as ArrayBuffer))),
      },
    };
  }
}

// Mock PushManager
const mockPushManager = {
  getSubscription: jest.fn(),
  subscribe: jest.fn(),
  permissionState: jest.fn(),
};

// Mock ServiceWorkerRegistration
const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
  showNotification: jest.fn(),
  getNotifications: jest.fn().mockResolvedValue([]),
  scope: '/',
  active: null,
  installing: null,
  waiting: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock Notification
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = jest.fn();
  
  title: string;
  body: string;
  data: any;
  tag: string;
  onclick: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onshow: (() => void) | null = null;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.body = options?.body || '';
    this.data = options?.data;
    this.tag = options?.tag || '';
  }

  close(): void {
    if (this.onclose) {
      this.onclose();
    }
  }

  click(): void {
    if (this.onclick) {
      this.onclick();
    }
  }
}

// Mock navigator
const mockNavigator = {
  serviceWorker: {
    ready: Promise.resolve(mockServiceWorkerRegistration),
    register: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
  },
};

// Mock window
const mockWindow = {
  atob: jest.fn((str: string) => Buffer.from(str, 'base64').toString('binary')),
  btoa: jest.fn((str: string) => Buffer.from(str, 'binary').toString('base64')),
};

// Mock fetch
const mockFetch = jest.fn();

// Global setup executed immediately
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockNavigator.serviceWorker,
  },
  writable: true,
  configurable: true,
});

// Add mock properties to window without redefining the whole object
Object.defineProperty(window, 'atob', {
  value: mockWindow.atob,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'btoa', {
  value: mockWindow.btoa,
  writable: true,
  configurable: true,
});

// Add PushManager to window for checkSupport()
Object.defineProperty(window, 'PushManager', {
  value: class MockPushManagerClass {},
  writable: true,
  configurable: true,
});

// Add Notification to window for checkSupport()
Object.defineProperty(window, 'Notification', {
  value: MockNotification,
  writable: true,
  configurable: true,
});

// Global Notification is already set up above for window
// Global PushManager is already set up above for window

Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
  configurable: true,
});

// Mock console
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
});

describe('PushNotificationManager', () => {
  let pushManager: PushNotificationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset notification permission
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockResolvedValue('granted');
    
    // Reset mocks
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(null);
    mockPushManager.permissionState.mockResolvedValue('granted');
    mockServiceWorkerRegistration.showNotification.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  afterEach(async () => {
    if (pushManager) {
      await pushManager.destroy();
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
      };

      pushManager = new PushNotificationManager(config);
      
      expect(pushManager).toBeDefined();
      expect(pushManager.isNotificationSupported()).toBe(true);
      expect(pushManager.getPermission()).toBe('default');
      expect(pushManager.isSubscribed()).toBe(false);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should initialize with custom configuration', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'custom-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        defaultOptions: {
          icon: '/custom-icon.png',
          badge: '/custom-badge.png',
          vibrate: [100, 50, 100],
          silent: true,
          requireInteraction: true,
          tag: 'custom-tag',
        },
        language: 'en',
        autoSubscribe: true,
        serverEndpoint: '/custom/push/endpoint',
      };

      pushManager = new PushNotificationManager(config);
      
      expect(pushManager).toBeDefined();
      expect(pushManager.isNotificationSupported()).toBe(true);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should detect unsupported environment', () => {
      // Mock unsupported environment
      const originalWindow = global.window;
      const originalNavigator = global.navigator;
      
      delete (global as any).window;
      delete (global as any).navigator;

      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key',
      };

      pushManager = new PushNotificationManager(config);
      
      expect(pushManager.isNotificationSupported()).toBe(false);

      // Restore globals
      global.window = originalWindow;
      global.navigator = originalNavigator;
    });

    it('should load existing subscription on initialization', async () => {
      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3, 4, 5])).buffer,
          auth: (new Uint8Array([6, 7, 8, 9, 10])).buffer,
        }
      );

      mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);

      const subscriptionCreatedSpy = jest.fn();

      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
      };

      pushManager = new PushNotificationManager(config);
      pushManager.on('subscription:created', subscriptionCreatedSpy);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(pushManager.isSubscribed()).toBe(true);
      expect(subscriptionCreatedSpy).toHaveBeenCalledWith({
        subscription: expect.objectContaining({
          endpoint: 'https://example.com/push',
          keys: expect.objectContaining({
            p256dh: expect.any(String),
            auth: expect.any(String),
          }),
        }),
      });
    });
  });

  describe('Permission Management', () => {
    beforeEach(() => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
      };

      pushManager = new PushNotificationManager(config);
    });

    it('should request notification permission successfully', async () => {
      MockNotification.requestPermission.mockResolvedValueOnce('granted');

      const permissionGrantedSpy = jest.fn();
      pushManager.on('permission:granted', permissionGrantedSpy);

      const permission = await pushManager.requestPermission();
      
      expect(permission).toBe('granted');
      expect(pushManager.getPermission()).toBe('granted');
      expect(permissionGrantedSpy).toHaveBeenCalledWith({
        permission: 'granted',
      });
    });

    it('should handle denied permission', async () => {
      MockNotification.requestPermission.mockResolvedValueOnce('denied');

      const permissionDeniedSpy = jest.fn();
      pushManager.on('permission:denied', permissionDeniedSpy);

      const permission = await pushManager.requestPermission();
      
      expect(permission).toBe('denied');
      expect(pushManager.getPermission()).toBe('denied');
      expect(permissionDeniedSpy).toHaveBeenCalledWith({
        permission: 'denied',
      });
    });

    it('should handle permission request errors', async () => {
      MockNotification.requestPermission.mockRejectedValueOnce(new Error('Permission request failed'));

      const errorSpy = jest.fn();
      pushManager.on('error', errorSpy);

      await expect(pushManager.requestPermission()).rejects.toThrow('Permission request failed');
      
      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'permission_request',
      });
    });

    it('should throw error when notifications not supported', async () => {
      // Mock unsupported environment
      (pushManager as any).isSupported = false;

      await expect(pushManager.requestPermission()).rejects.toThrow('Push notifications are not supported');
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        serverEndpoint: '/api/push/subscribe',
      };

      pushManager = new PushNotificationManager(config);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should subscribe to push notifications successfully', async () => {
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const mockSubscription = new MockPushSubscription(
        'https://fcm.googleapis.com/fcm/send/subscription-token',
        {
          p256dh: (new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).buffer,
          auth: (new Uint8Array([11, 12, 13, 14, 15, 16])).buffer,
        }
      );

      mockPushManager.subscribe.mockResolvedValueOnce(mockSubscription);

      const subscriptionCreatedSpy = jest.fn();
      pushManager.on('subscription:created', subscriptionCreatedSpy);

      const subscriptionInfo = await pushManager.subscribe();
      
      expect(subscriptionInfo).toBeDefined();
      expect(subscriptionInfo!.endpoint).toBe('https://fcm.googleapis.com/fcm/send/subscription-token');
      expect(subscriptionInfo!.keys.p256dh).toBeDefined();
      expect(subscriptionInfo!.keys.auth).toBeDefined();
      
      expect(mockPushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('subscription-token'),
      });

      expect(subscriptionCreatedSpy).toHaveBeenCalledWith({
        subscription: expect.objectContaining({
          endpoint: 'https://fcm.googleapis.com/fcm/send/subscription-token',
        }),
      });
    });

    it('should request permission before subscribing if not granted', async () => {
      MockNotification.permission = 'default';
      (pushManager as any).permission = 'default';
      MockNotification.requestPermission.mockResolvedValueOnce('granted');

      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3])).buffer,
          auth: (new Uint8Array([4, 5, 6])).buffer,
        }
      );

      mockPushManager.subscribe.mockResolvedValueOnce(mockSubscription);

      const subscriptionInfo = await pushManager.subscribe();
      
      expect(MockNotification.requestPermission).toHaveBeenCalled();
      expect(subscriptionInfo).toBeDefined();
    });

    it('should return null if permission denied during subscription', async () => {
      MockNotification.permission = 'default';
      (pushManager as any).permission = 'default';
      MockNotification.requestPermission.mockResolvedValueOnce('denied');

      const subscriptionInfo = await pushManager.subscribe();
      
      expect(subscriptionInfo).toBeNull();
      expect(mockPushManager.subscribe).not.toHaveBeenCalled();
    });

    it('should handle subscription errors', async () => {
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      mockPushManager.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

      const errorSpy = jest.fn();
      pushManager.on('error', errorSpy);

      await expect(pushManager.subscribe()).rejects.toThrow('Subscription failed');
      
      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'subscription',
      });
    });

    it('should unsubscribe from push notifications', async () => {
      // First, set up a subscription
      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3])).buffer,
          auth: (new Uint8Array([4, 5, 6])).buffer,
        }
      );

      (pushManager as any).subscription = mockSubscription;

      const subscriptionDeletedSpy = jest.fn();
      pushManager.on('subscription:deleted', subscriptionDeletedSpy);

      await pushManager.unsubscribe();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('https://example.com/push'),
      });

      expect(subscriptionDeletedSpy).toHaveBeenCalledWith({
        reason: 'user_unsubscribed',
      });

      expect(pushManager.isSubscribed()).toBe(false);
    });

    it('should handle unsubscribe when not subscribed', async () => {
      // No subscription set up
      const subscriptionDeletedSpy = jest.fn();
      pushManager.on('subscription:deleted', subscriptionDeletedSpy);

      await pushManager.unsubscribe();
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(subscriptionDeletedSpy).not.toHaveBeenCalled();
    });

    it('should get current subscription info', () => {
      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3, 4, 5])).buffer,
          auth: (new Uint8Array([6, 7, 8, 9, 10])).buffer,
        }
      );

      (pushManager as any).subscription = mockSubscription;

      const subscriptionInfo = pushManager.getSubscription();
      
      expect(subscriptionInfo).toBeDefined();
      expect(subscriptionInfo!.endpoint).toBe('https://example.com/push');
      expect(subscriptionInfo!.keys.p256dh).toBeDefined();
      expect(subscriptionInfo!.keys.auth).toBeDefined();
    });

    it('should return null when no subscription exists', () => {
      const subscriptionInfo = pushManager.getSubscription();
      expect(subscriptionInfo).toBeNull();
    });
  });

  describe('Notification Display', () => {
    beforeEach(async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'it',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should show notification with service worker', async () => {
      const payload: NotificationPayload = {
        type: 'receipt_created' as NotificationType,
        title: 'Custom Title',
        body: 'Custom body message',
        data: {
          receiptId: 'receipt_123',
          amount: '29.99',
          merchantName: 'Test Store',
          priority: 'normal' as NotificationPriority,
        },
        options: {
          requireInteraction: true,
        },
      };

      const notificationShownSpy = jest.fn();
      pushManager.on('notification:shown', notificationShownSpy);

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Custom Title',
        expect.objectContaining({
          body: 'Custom body message',
          data: payload.data,
          tag: 'receipt_created',
          requireInteraction: true,
          icon: '/icons/icon-192x192.png', // Default icon
          badge: '/icons/badge-72x72.png', // Default badge
        })
      );

      expect(notificationShownSpy).toHaveBeenCalledWith({
        notification: payload,
      });
    });

    it('should use notification templates when title/body not provided', async () => {
      const payload: NotificationPayload = {
        type: 'receipt_created' as NotificationType,
        title: '',
        body: '',
        data: {
          amount: '29.99',
          merchantName: 'Test Store',
        },
      };

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Nuovo Scontrino', // Italian template
        expect.objectContaining({
          body: 'Scontrino di €29.99 creato presso Test Store', // Template with data substitution
        })
      );
    });

    it('should handle different notification types with actions', async () => {
      const fiscalAlertPayload: NotificationPayload = {
        type: 'fiscal_alert' as NotificationType,
        title: '',
        body: '',
        data: {
          priority: 'urgent' as NotificationPriority,
        },
      };

      await pushManager.showNotification(fiscalAlertPayload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        '⚠️ Avviso Fiscale',
        expect.objectContaining({
          body: 'Azione richiesta per conformità fiscale',
          actions: expect.arrayContaining([
            { action: 'resolve', title: 'Risolvi' },
            { action: 'later', title: 'Più tardi' },
          ]),
        })
      );
    });

    it('should fallback to Notification API when no service worker', async () => {
      // Remove service worker registration
      (pushManager as any).registration = null;

      const payload: NotificationPayload = {
        type: 'receipt_synced' as NotificationType,
        title: 'Test Notification',
        body: 'Test body',
        data: { test: true },
      };

      const notificationClickedSpy = jest.fn();
      const notificationClosedSpy = jest.fn();
      pushManager.on('notification:clicked', notificationClickedSpy);
      pushManager.on('notification:closed', notificationClosedSpy);

      await pushManager.showNotification(payload);

      // Should create new Notification instance
      // We can't easily test the constructor call, but we can verify it doesn't use service worker
      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled();
    });

    it('should throw error when permission not granted', async () => {
      MockNotification.permission = 'denied';
      (pushManager as any).permission = 'denied';

      const payload: NotificationPayload = {
        type: 'receipt_created' as NotificationType,
        title: 'Test',
        body: 'Test',
      };

      await expect(pushManager.showNotification(payload)).rejects.toThrow(
        'Cannot show notification: permission not granted'
      );
    });

    it('should handle notification display errors', async () => {
      mockServiceWorkerRegistration.showNotification.mockRejectedValueOnce(
        new Error('Notification display failed')
      );

      const errorSpy = jest.fn();
      pushManager.on('error', errorSpy);

      const payload: NotificationPayload = {
        type: 'receipt_created' as NotificationType,
        title: 'Test',
        body: 'Test',
      };

      await expect(pushManager.showNotification(payload)).rejects.toThrow('Notification display failed');
      
      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'show_notification',
      });
    });
  });

  describe('E-Receipt Specific Notifications', () => {
    beforeEach(async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'it',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should show receipt created notification', async () => {
      const receipt = {
        id: 'receipt_12345',
        amount: '45.67',
        merchantName: 'Supermercato ABC',
        timestamp: '2023-12-25T10:30:00Z',
      };

      await pushManager.notifyReceiptCreated(receipt);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Nuovo Scontrino',
        expect.objectContaining({
          body: 'Scontrino di €45.67 creato presso Supermercato ABC',
          data: expect.objectContaining({
            receiptId: 'receipt_12345',
            amount: '45.67',
            merchantName: 'Supermercato ABC',
            timestamp: '2023-12-25T10:30:00Z',
            actionUrl: '/receipts/receipt_12345',
            priority: 'normal',
          }),
          tag: 'receipt_created',
        })
      );
    });

    it('should show fiscal alert notification', async () => {
      const alertData = {
        message: 'Documento fiscale non conforme',
        receiptId: 'receipt_567',
        urgency: 'critical' as const,
      };

      await pushManager.notifyFiscalAlert(alertData);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        '⚠️ Avviso Fiscale',
        expect.objectContaining({
          body: 'Documento fiscale non conforme',
          data: expect.objectContaining({
            receiptId: 'receipt_567',
            actionUrl: '/receipts/receipt_567',
            priority: 'urgent',
          }),
          requireInteraction: true,
          tag: 'fiscal_alert',
        })
      );
    });

    it('should show lottery win notification', async () => {
      const lotteryData = {
        receiptId: 'receipt_lucky_777',
        prizeAmount: '1000.00',
        claimCode: 'WIN2023ABC',
      };

      await pushManager.notifyLotteryWin(lotteryData);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        '🎉 Hai Vinto!',
        expect.objectContaining({
          body: 'Il tuo scontrino ha vinto alla lotteria!',
          data: expect.objectContaining({
            receiptId: 'receipt_lucky_777',
            prizeAmount: '1000.00',
            claimCode: 'WIN2023ABC',
            actionUrl: '/lottery/claim/receipt_lucky_777',
            priority: 'urgent',
          }),
          requireInteraction: true,
          icon: '/icons/lottery-win.png',
          tag: 'lottery_win',
        })
      );
    });

    it('should show sync completed notification', async () => {
      await pushManager.notifySyncStatus('completed', 15);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Sincronizzazione Completata',
        expect.objectContaining({
          body: '15 scontrini sincronizzati con successo',
          data: expect.objectContaining({
            count: '15',
            actionUrl: '/sync-status',
            priority: 'normal',
          }),
          tag: 'sync_completed',
        })
      );
    });

    it('should show sync failed notification', async () => {
      await pushManager.notifySyncStatus('failed', 3);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Sincronizzazione Fallita',
        expect.objectContaining({
          body: 'Impossibile sincronizzare 3 scontrini',
          data: expect.objectContaining({
            count: '3',
            actionUrl: '/sync-status',
            priority: 'high',
          }),
          tag: 'sync_failed',
        })
      );
    });

    it('should show offline reminder notification', async () => {
      await pushManager.notifyOfflineReminder(7);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Modalità Offline',
        expect.objectContaining({
          body: 'Hai 7 scontrini in attesa di sincronizzazione',
          data: expect.objectContaining({
            count: '7',
            actionUrl: '/offline-queue',
            priority: 'normal',
          }),
          tag: 'offline_reminder',
        })
      );
    });

    it('should not show offline reminder when count is zero', async () => {
      await pushManager.notifyOfflineReminder(0);
      
      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled();
    });

    it('should show high priority for many pending receipts', async () => {
      await pushManager.notifyOfflineReminder(15);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Modalità Offline',
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'high', // High priority for > 10 receipts
          }),
        })
      );
    });
  });

  describe('Multi-language Support', () => {
    it('should use English templates', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'en',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const payload: NotificationPayload = {
        type: 'receipt_created' as NotificationType,
        title: '',
        body: '',
        data: {
          amount: '25.50',
          merchantName: 'Coffee Shop',
        },
      };

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'New Receipt',
        expect.objectContaining({
          body: 'Receipt for €25.50 created at Coffee Shop',
          actions: expect.arrayContaining([
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' },
          ]),
        })
      );
    });

    it('should use German templates', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'de',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const payload: NotificationPayload = {
        type: 'sync_completed' as NotificationType,
        title: '',
        body: '',
        data: {
          count: '8',
        },
      };

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Synchronisation Abgeschlossen',
        expect.objectContaining({
          body: '8 Belege erfolgreich synchronisiert',
        })
      );
    });

    it('should use French templates', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'fr',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const payload: NotificationPayload = {
        type: 'lottery_win' as NotificationType,
        title: '',
        body: '',
        data: {},
      };

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        '🎉 Vous avez gagné!',
        expect.objectContaining({
          body: 'Votre reçu a gagné à la loterie!',
          actions: expect.arrayContaining([
            { action: 'claim', title: 'Réclamer' },
            { action: 'share', title: 'Partager' },
          ]),
        })
      );
    });

    it('should fallback to Italian for unsupported language', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'es' as any, // Unsupported language
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const payload: NotificationPayload = {
        type: 'app_update' as NotificationType,
        title: '',
        body: '',
      };

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Aggiornamento Disponibile', // Italian fallback
        expect.objectContaining({
          body: 'Una nuova versione dell\'app è disponibile',
        })
      );
    });

    it('should change language dynamically', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        language: 'it',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      // Change to English
      pushManager.setLanguage('en');

      const payload: NotificationPayload = {
        type: 'receipt_void' as NotificationType,
        title: '',
        body: '',
        data: {
          receiptId: 'R123',
        },
      };

      await pushManager.showNotification(payload);
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Receipt Voided', // English template
        expect.objectContaining({
          body: 'Receipt #R123 has been voided',
        })
      );
    });
  });

  describe('Server Integration', () => {
    beforeEach(async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
        serverEndpoint: '/api/push/notifications',
        language: 'en',
      };

      pushManager = new PushNotificationManager(config);
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should send subscription to server', async () => {
      const mockSubscription = new MockPushSubscription(
        'https://fcm.googleapis.com/fcm/send/test-token',
        {
          p256dh: (new Uint8Array([1, 2, 3, 4, 5])).buffer,
          auth: (new Uint8Array([6, 7, 8, 9, 10])).buffer,
        }
      );

      mockPushManager.subscribe.mockResolvedValueOnce(mockSubscription);

      await pushManager.subscribe();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/push/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"endpoint":"https://fcm.googleapis.com/fcm/send/test-token"'),
      });

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody).toEqual({
        subscription: expect.objectContaining({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
          keys: expect.objectContaining({
            p256dh: expect.any(String),
            auth: expect.any(String),
          }),
        }),
        language: 'en',
        timestamp: expect.any(String),
      });
    });

    it('should handle server errors gracefully during subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3])).buffer,
          auth: (new Uint8Array([4, 5, 6])).buffer,
        }
      );

      mockPushManager.subscribe.mockResolvedValueOnce(mockSubscription);

      // Should not throw despite server error
      const subscriptionInfo = await pushManager.subscribe();
      
      expect(subscriptionInfo).toBeDefined();
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to send subscription to server:',
        expect.any(Error)
      );
    });

    it('should remove subscription from server on unsubscribe', async () => {
      const mockSubscription = new MockPushSubscription(
        'https://example.com/push/test-endpoint',
        {
          p256dh: (new Uint8Array([1, 2, 3])).buffer,
          auth: (new Uint8Array([4, 5, 6])).buffer,
        }
      );

      (pushManager as any).subscription = mockSubscription;

      await pushManager.unsubscribe();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/push/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('https://example.com/push/test-endpoint'),
      });
    });

    it('should handle server errors gracefully during unsubscription', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3])).buffer,
          auth: (new Uint8Array([4, 5, 6])).buffer,
        }
      );

      (pushManager as any).subscription = mockSubscription;

      // Should not throw despite server error
      await pushManager.unsubscribe();
      
      expect(pushManager.isSubscribed()).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to remove subscription from server:',
        expect.any(Error)
      );
    });
  });

  describe('Event System', () => {
    beforeEach(async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
      };

      pushManager = new PushNotificationManager(config);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should emit error events during initialization', async () => {
      const errorSpy = jest.fn();
      
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
      };

      // Mock service worker error
      mockNavigator.serviceWorker.ready = Promise.reject(new Error('Service worker not available'));

      pushManager = new PushNotificationManager(config);
      pushManager.on('error', errorSpy);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'initialization',
      });
    });

    it('should emit subscription events', async () => {
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {
          p256dh: (new Uint8Array([1, 2, 3])).buffer,
          auth: (new Uint8Array([4, 5, 6])).buffer,
        }
      );

      mockPushManager.subscribe.mockResolvedValueOnce(mockSubscription);

      const subscriptionCreatedSpy = jest.fn();
      const subscriptionDeletedSpy = jest.fn();
      
      pushManager.on('subscription:created', subscriptionCreatedSpy);
      pushManager.on('subscription:deleted', subscriptionDeletedSpy);

      // Subscribe
      await pushManager.subscribe();
      expect(subscriptionCreatedSpy).toHaveBeenCalled();

      // Unsubscribe
      await pushManager.unsubscribe();
      expect(subscriptionDeletedSpy).toHaveBeenCalledWith({
        reason: 'user_unsubscribed',
      });
    });

    it('should emit permission events', async () => {
      const permissionGrantedSpy = jest.fn();
      const permissionDeniedSpy = jest.fn();
      
      pushManager.on('permission:granted', permissionGrantedSpy);
      pushManager.on('permission:denied', permissionDeniedSpy);

      // Test granted permission
      MockNotification.requestPermission.mockResolvedValueOnce('granted');
      await pushManager.requestPermission();
      expect(permissionGrantedSpy).toHaveBeenCalledWith({ permission: 'granted' });

      // Test denied permission
      MockNotification.requestPermission.mockResolvedValueOnce('denied');
      await pushManager.requestPermission();
      expect(permissionDeniedSpy).toHaveBeenCalledWith({ permission: 'denied' });
    });

    it('should emit notification display events', async () => {
      MockNotification.permission = 'granted';
      (pushManager as any).permission = 'granted';

      const notificationShownSpy = jest.fn();
      pushManager.on('notification:shown', notificationShownSpy);

      const payload: NotificationPayload = {
        type: 'receipt_created' as NotificationType,
        title: 'Test Notification',
        body: 'Test body',
        data: { test: true },
      };

      await pushManager.showNotification(payload);
      
      expect(notificationShownSpy).toHaveBeenCalledWith({
        notification: payload,
      });
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
      };

      pushManager = new PushNotificationManager(config);
    });

    it('should convert VAPID key to Uint8Array correctly', () => {
      const testKey = 'BElGbBaEk5VzOJsEZXEKVFhCLLgw8JZgOdnlBrj2cKx7Tb6Xz0X7PnYZNgpjmjmj';
      
      // Access private method for testing
      const converted = (pushManager as any).urlBase64ToUint8Array(testKey);
      
      expect(converted).toBeInstanceOf(Uint8Array);
      expect(converted.length).toBeGreaterThan(0);
    });

    it('should extract subscription info correctly', () => {
      const mockSubscription = new MockPushSubscription(
        'https://fcm.googleapis.com/fcm/send/test-token',
        {
          p256dh: (new Uint8Array([1, 2, 3, 4, 5])).buffer,
          auth: (new Uint8Array([6, 7, 8, 9, 10])).buffer,
        },
        1672531200000 // Expiration time
      );

      const info = (pushManager as any).extractSubscriptionInfo(mockSubscription);
      
      expect(info).toEqual({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        keys: {
          p256dh: expect.any(String),
          auth: expect.any(String),
        },
        expirationTime: 1672531200000,
      });
    });

    it('should throw error when subscription keys are missing', () => {
      const mockSubscription = new MockPushSubscription(
        'https://example.com/push',
        {} // No keys
      );

      expect(() => {
        (pushManager as any).extractSubscriptionInfo(mockSubscription);
      }).toThrow('Unable to get subscription keys');
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      const config: PushNotificationConfig = {
        vapidPublicKey: 'test-vapid-key-123456789012345678901234567890123456789012345678901234567890',
        serviceWorkerRegistration: mockServiceWorkerRegistration as any,
      };

      pushManager = new PushNotificationManager(config);
      
      const removeAllListenersSpy = jest.spyOn(pushManager, 'removeAllListeners');

      await pushManager.destroy();
      
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect((pushManager as any).registration).toBeNull();
      expect((pushManager as any).subscription).toBeNull();
    });
  });
});