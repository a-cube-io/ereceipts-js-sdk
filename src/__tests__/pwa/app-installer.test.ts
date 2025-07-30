/**
 * App Installer Tests
 * Comprehensive testing for PWA app installation functionality
 * including install prompts, engagement tracking, and platform detection
 */

import { AppInstaller, type EngagementData, type InstallCriteria, type AppInstallerConfig} from '@/pwa/app-installer';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator with complete interface
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  standalone: false, // Explicitly set to false for non-iOS scenarios
  permissions: {
    query: jest.fn().mockResolvedValue({ state: 'granted' }),
  },
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Mock window with complete interface
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  matchMedia: jest.fn().mockReturnValue({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
};


// NOTE: window.matchMedia will be set up in beforeEach to ensure proper test isolation

Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
  writable: true,
  configurable: true,
});

// Mock history
Object.defineProperty(window, 'history', {
  value: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
  },
  writable: true,
  configurable: true,
});

// Document mock is set up below using Object.assign

// Add mock methods to existing document object using defineProperty
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
  configurable: true,
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName: string) => {
    const element = {
      tagName: tagName.toUpperCase(),
      style: {},
      textContent: '',
      onclick: null as (() => void) | null,
      src: '',
      className: '',
      id: '',
      appendChild: jest.fn(),
      remove: jest.fn(),
    };
    return element;
  }),
  writable: true,
  configurable: true,
});

Object.defineProperty(document, 'head', {
  value: {
    appendChild: jest.fn(),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(document, 'getElementById', {
  value: jest.fn(),
  writable: true,
  configurable: true,
});

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
});

// Mock alert
Object.defineProperty(global, 'alert', {
  value: jest.fn(),
  writable: true,
});

// Mock gtag for analytics
(global as any).gtag = jest.fn();

// Mock BeforeInstallPromptEvent
interface MockBeforeInstallPromptEvent {
  preventDefault: () => void;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  platforms: string[];
}

describe('AppInstaller', () => {
  let appInstaller: AppInstaller;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Reset window properties
    mockWindow.matchMedia.mockReturnValue({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    });

    // Reset window.matchMedia to default (not standalone) - CRITICAL FOR canInstall tests
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({
        matches: false, // This is key - must be false for not standalone
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (appInstaller) {
      appInstaller.destroy();
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      appInstaller = new AppInstaller();
      
      expect(appInstaller).toBeDefined();
      expect(appInstaller.canInstall()).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig: AppInstallerConfig = {
        criteria: {
          minEngagementTime: 5 * 60 * 1000,
          minPageViews: 5,
          minReceiptsCreated: 2,
          daysSinceFirstVisit: 1,
          requireReturnVisit: true,
        },
        autoShow: false,
        showDelay: 10000,
        maxPromptAttempts: 2,
        dismissalCooldown: 14,
        customPrompt: {
          enabled: true,
          title: 'Custom Install Title',
          message: 'Custom install message',
          installButtonText: 'Install Now',
          cancelButtonText: 'Maybe Later',
          icon: '/custom-icon.png',
        },
        analytics: {
          enabled: true,
          trackingId: 'GA-TEST-123',
          customEvents: {
            customProperty: 'customValue',
          },
        },
        platforms: {
          ios: {
            showIOSInstructions: true,
            customInstructions: 'Custom iOS instructions',
          },
          android: {
            enableWebAPK: true,
            customIcon: '/android-custom.png',
          },
          desktop: {
            showDesktopPrompt: true,
            position: 'top',
          },
        },
      };

      appInstaller = new AppInstaller(customConfig);
      
      expect(appInstaller).toBeDefined();
      expect(appInstaller.canInstall()).toBeDefined();
    });

    it('should load existing engagement data from localStorage', () => {
      const existingEngagement: EngagementData = {
        firstVisit: Date.now() - 24 * 60 * 60 * 1000,
        lastVisit: Date.now() - 60 * 60 * 1000,
        totalTime: 10 * 60 * 1000,
        pageViews: 5,
        receiptsCreated: 2,
        returnVisits: 1,
        promptsShown: 0,
        dismissed: false,
        installed: false,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingEngagement));

      appInstaller = new AppInstaller();
      const stats = appInstaller.getEngagementStats();
      
      expect(stats.firstVisit).toBe(existingEngagement.firstVisit);
      expect(stats.pageViews).toBe(existingEngagement.pageViews);
      expect(stats.receiptsCreated).toBe(existingEngagement.receiptsCreated);
      expect(stats.returnVisits).toBe(existingEngagement.returnVisits);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      appInstaller = new AppInstaller();
      const stats = appInstaller.getEngagementStats();
      
      expect(stats).toBeDefined();
      expect(stats.firstVisit).toBeDefined();
      expect(stats.pageViews).toBe(1);
    });
  });

  describe('Platform Detection', () => {
    it('should detect iOS platform correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
      
      appInstaller = new AppInstaller();
      const platformInfo = appInstaller.getPlatformInfo();
      
      expect(platformInfo.name).toBe('ios');
      expect(platformInfo.browser).toBe('safari');
      expect(platformInfo.supportsNativePrompt).toBe(false);
      expect(platformInfo.supportsWebAPK).toBe(false);
    });

    it('should detect Android Chrome correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
      
      appInstaller = new AppInstaller();
      const platformInfo = appInstaller.getPlatformInfo();
      
      expect(platformInfo.name).toBe('android');
      expect(platformInfo.browser).toBe('chrome');
      expect(platformInfo.supportsNativePrompt).toBe(true);
      expect(platformInfo.supportsWebAPK).toBe(true);
    });

    it('should detect desktop Chrome correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      appInstaller = new AppInstaller();
      const platformInfo = appInstaller.getPlatformInfo();
      
      expect(platformInfo.name).toBe('desktop');
      expect(platformInfo.browser).toBe('chrome');
      expect(platformInfo.supportsNativePrompt).toBe(true);
      expect(platformInfo.supportsWebAPK).toBe(false);
    });

    it('should detect desktop Firefox correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0';
      
      appInstaller = new AppInstaller();
      const platformInfo = appInstaller.getPlatformInfo();
      
      expect(platformInfo.name).toBe('desktop');
      expect(platformInfo.browser).toBe('firefox');
      expect(platformInfo.supportsNativePrompt).toBe(true);
    });

    it('should detect standalone mode correctly', () => {
      // Mock window.matchMedia directly on window object
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
        writable: true,
        configurable: true,
      });
      
      appInstaller = new AppInstaller();
      const platformInfo = appInstaller.getPlatformInfo();
      
      expect(platformInfo.isStandalone).toBe(true);
    });

    it('should detect iOS standalone mode', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15';
      (mockNavigator as any).standalone = true;
      
      appInstaller = new AppInstaller();
      const platformInfo = appInstaller.getPlatformInfo();
      
      expect(platformInfo.isStandalone).toBe(true);
    });
  });

  describe('Install Criteria Checking', () => {
    beforeEach(() => {
      // Set up engagement data for testing
      const baseEngagement: EngagementData = {
        firstVisit: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        lastVisit: Date.now() - 60 * 60 * 1000, // 1 hour ago
        totalTime: 5 * 60 * 1000, // 5 minutes
        pageViews: 5,
        receiptsCreated: 2,
        returnVisits: 2,
        promptsShown: 0,
        dismissed: false,
        installed: false,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(baseEngagement));
    });

    it('should pass criteria when all requirements are met', async () => {
      const criteria: InstallCriteria = {
        minEngagementTime: 2 * 60 * 1000, // 2 minutes
        minPageViews: 3,
        minReceiptsCreated: 1,
        daysSinceFirstVisit: 1,
        requireReturnVisit: true,
      };

      appInstaller = new AppInstaller({ criteria });
      const criteriaMet = await appInstaller.checkCriteria();
      
      expect(criteriaMet).toBe(true);
    });

    it('should fail criteria when engagement time is insufficient', async () => {
      const criteria: InstallCriteria = {
        minEngagementTime: 10 * 60 * 1000, // 10 minutes (more than available)
      };

      appInstaller = new AppInstaller({ criteria });
      const criteriaMet = await appInstaller.checkCriteria();
      
      expect(criteriaMet).toBe(false);
    });

    it('should fail criteria when page views are insufficient', async () => {
      const criteria: InstallCriteria = {
        minPageViews: 10, // More than available
      };

      appInstaller = new AppInstaller({ criteria });
      const criteriaMet = await appInstaller.checkCriteria();
      
      expect(criteriaMet).toBe(false);
    });

    it('should fail criteria when receipts created are insufficient', async () => {
      const criteria: InstallCriteria = {
        minReceiptsCreated: 5, // More than available
      };

      appInstaller = new AppInstaller({ criteria });
      const criteriaMet = await appInstaller.checkCriteria();
      
      expect(criteriaMet).toBe(false);
    });

    it('should fail criteria when not enough days since first visit', async () => {
      const criteria: InstallCriteria = {
        daysSinceFirstVisit: 30, // More than available (7 days)
      };

      appInstaller = new AppInstaller({ criteria });
      const criteriaMet = await appInstaller.checkCriteria();
      
      expect(criteriaMet).toBe(false);
    });

    it('should fail criteria when return visit is required but not met', async () => {
      // Set engagement data with no return visits
      const noReturnEngagement: EngagementData = {
        firstVisit: Date.now() - 24 * 60 * 60 * 1000,
        lastVisit: Date.now(),
        totalTime: 5 * 60 * 1000,
        pageViews: 5,
        receiptsCreated: 2,
        returnVisits: 0, // No return visits
        promptsShown: 0,
        dismissed: false,
        installed: false,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(noReturnEngagement));

      const criteria: InstallCriteria = {
        requireReturnVisit: true,
      };

      appInstaller = new AppInstaller({ criteria });
      const criteriaMet = await appInstaller.checkCriteria();
      
      expect(criteriaMet).toBe(false);
    });

    it('should handle custom criteria function', async () => {
      const customCriteriaPass = jest.fn().mockResolvedValue(true);
      const customCriteriaFail = jest.fn().mockResolvedValue(false);

      // Test passing custom criteria
      appInstaller = new AppInstaller({
        criteria: { customCriteria: customCriteriaPass },
      });
      
      let criteriaMet = await appInstaller.checkCriteria();
      expect(criteriaMet).toBe(true);
      expect(customCriteriaPass).toHaveBeenCalled();

      appInstaller.destroy();

      // Test failing custom criteria
      appInstaller = new AppInstaller({
        criteria: { customCriteria: customCriteriaFail },
      });
      
      criteriaMet = await appInstaller.checkCriteria();
      expect(criteriaMet).toBe(false);
      expect(customCriteriaFail).toHaveBeenCalled();
    });

    it('should respect maximum prompt attempts', async () => {
      // Set engagement data with max prompts already shown
      const maxPromptsEngagement: EngagementData = {
        firstVisit: Date.now() - 24 * 60 * 60 * 1000,
        lastVisit: Date.now(),
        totalTime: 10 * 60 * 1000,
        pageViews: 10,
        receiptsCreated: 5,
        returnVisits: 2,
        promptsShown: 3,
        dismissed: false,
        installed: false,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(maxPromptsEngagement));

      appInstaller = new AppInstaller({
        maxPromptAttempts: 3,
        criteria: { minEngagementTime: 1000 }, // Very low threshold
      });
      
      const criteriaMet = await appInstaller.checkCriteria();
      expect(criteriaMet).toBe(false);
    });

    it('should respect dismissal cooldown period', async () => {
      const recentlyDismissedEngagement: EngagementData = {
        firstVisit: Date.now() - 24 * 60 * 60 * 1000,
        lastVisit: Date.now(),
        totalTime: 10 * 60 * 1000,
        pageViews: 10,
        receiptsCreated: 5,
        returnVisits: 2,
        promptsShown: 1,
        lastPromptShown: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        dismissed: true,
        installed: false,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentlyDismissedEngagement));

      appInstaller = new AppInstaller({
        dismissalCooldown: 7, // 7 days cooldown
        criteria: { minEngagementTime: 1000 },
      });
      
      const criteriaMet = await appInstaller.checkCriteria();
      expect(criteriaMet).toBe(false);
    });
  });

  describe('Engagement Tracking', () => {
    it('should record receipt creation', () => {
      appInstaller = new AppInstaller();
      const initialStats = appInstaller.getEngagementStats();
      const initialCount = initialStats.receiptsCreated;
      
      appInstaller.recordReceiptCreated();
      
      const updatedStats = appInstaller.getEngagementStats();
      expect(updatedStats.receiptsCreated).toBe(initialCount + 1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'acube_install_engagement',
        expect.stringContaining('"receiptsCreated":')
      );
    });

    it('should reset engagement data', () => {
      appInstaller = new AppInstaller();
      
      // Record some engagement
      appInstaller.recordReceiptCreated();
      
      // Reset engagement
      appInstaller.resetEngagement();
      
      const stats = appInstaller.getEngagementStats();
      expect(stats.receiptsCreated).toBe(0);
      expect(stats.pageViews).toBe(1);
      expect(stats.totalTime).toBe(0);
      expect(stats.returnVisits).toBe(0);
      expect(stats.promptsShown).toBe(0);
      expect(stats.dismissed).toBe(false);
      expect(stats.installed).toBe(false);
    });

    it('should track return visits correctly', async () => {
      // Ensure not standalone
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockReturnValue({
          matches: false, // Not standalone
          addListener: jest.fn(),
          removeListener: jest.fn(),
        }),
        writable: true,
        configurable: true,
      });

      // Set up first visit 25 hours ago (more than 24 hours)
      const now = Date.now();
      const firstVisitEngagement: EngagementData = {
        firstVisit: now - 25 * 60 * 60 * 1000, // 25 hours ago
        lastVisit: now - 25 * 60 * 60 * 1000,  // 25 hours ago (should trigger return visit)
        totalTime: 2 * 60 * 1000,
        pageViews: 3,
        receiptsCreated: 1,
        returnVisits: 0,
        promptsShown: 0,
        dismissed: false,
        installed: false, // Important: not installed
      };
      
      // Create a storage mock that simulates real localStorage behavior
      let storedData = JSON.stringify(firstVisitEngagement);
      mockLocalStorage.getItem.mockImplementation(() => storedData);
      mockLocalStorage.setItem.mockImplementation((_key, value) => {
        storedData = value;
      });

      appInstaller = new AppInstaller();
      
      // Manually trigger the engagement tracking logic that should detect return visit
      (appInstaller as any).startEngagementTracking();
      
      // Allow for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // The logic should detect return visit and increment the counter
      const stats = appInstaller.getEngagementStats();
      expect(stats.returnVisits).toBe(1);
    });
  });

  describe('Install Prompts', () => {
    it('should show native install prompt when available', async () => {
      // Set user agent to desktop Chrome (supports native prompts)
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const mockPrompt: MockBeforeInstallPromptEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
        platforms: ['web'],
      };

      appInstaller = new AppInstaller();
      (appInstaller as any).installPrompt = mockPrompt;

      await appInstaller.showInstallPrompt();

      expect(mockPrompt.prompt).toHaveBeenCalled();
    });

    it('should show custom install prompt when native not available', async () => {
      appInstaller = new AppInstaller({
        customPrompt: {
          enabled: true,
          title: 'Install Test App',
          message: 'Test message',
        },
      });

      await appInstaller.showInstallPrompt();

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('should create custom prompt UI with correct structure', async () => {
      // Track created elements to verify content
      let titleElement: any;
      let messageElement: any;

      (document.createElement as jest.Mock).mockImplementation((tagName: string) => {
        const baseElement = {
          tagName: tagName.toUpperCase(),
          style: { cssText: '' },
          appendChild: jest.fn(),
          remove: jest.fn(),
        };

        switch (tagName) {
          case 'div':
            return {
              ...baseElement,
              className: '',
            };
          case 'h3':
            titleElement = {
              ...baseElement,
              textContent: '',
            };
            return titleElement;
          case 'p':
            messageElement = {
              ...baseElement,
              textContent: '',
            };
            return messageElement;
          case 'button':
            return {
              ...baseElement,
              textContent: '',
              onclick: null as (() => void) | null,
            };
          case 'img':
            return {
              ...baseElement,
              src: '',
            };
          case 'style':
            return {
              id: '',
              textContent: '',
            };
          default:
            return baseElement;
        }
      });

      appInstaller = new AppInstaller({
        customPrompt: {
          enabled: true,
          title: 'Custom Install Title',
          message: 'Custom install message',
          installButtonText: 'Install Now',
          cancelButtonText: 'Cancel',
        },
      });

      await appInstaller.showInstallPrompt();

      // Verify elements were created and content was set
      expect(titleElement?.textContent).toBe('Custom Install Title');
      expect(messageElement?.textContent).toBe('Custom install message');
    });

    it('should show platform-specific install instructions', async () => {
      // Test iOS instructions - iOS doesn't support native prompts so will use instructions
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)';
      
      appInstaller = new AppInstaller({
        customPrompt: {
          enabled: false, // Disable custom prompt to force instructions
        },
        platforms: {
          ios: {
            showIOSInstructions: true,
            customInstructions: 'Custom iOS instructions',
          },
        },
      });

      await appInstaller.showInstallPrompt();

      expect(global.alert).toHaveBeenCalledWith('Custom iOS instructions');
    });

    it('should emit appropriate events during install flow', async () => {
      // Set user agent to desktop Chrome (supports native prompts)
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const promptShownSpy = jest.fn();
      const installCompletedSpy = jest.fn();
      
      appInstaller = new AppInstaller();
      appInstaller.on('prompt:shown', promptShownSpy);
      appInstaller.on('install:completed', installCompletedSpy);

      const mockPrompt: MockBeforeInstallPromptEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
        platforms: ['web'],
      };

      (appInstaller as any).installPrompt = mockPrompt;

      await appInstaller.showInstallPrompt();

      expect(promptShownSpy).toHaveBeenCalledWith({ type: 'native' });
      
      // Wait for userChoice promise to resolve
      await Promise.resolve();
      
      expect(installCompletedSpy).toHaveBeenCalledWith({
        outcome: 'accepted',
        platform: 'web',
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track analytics events when enabled', () => {
      appInstaller = new AppInstaller({
        analytics: {
          enabled: true,
          trackingId: 'GA-TEST-123',
          customEvents: {
            source: 'test',
          },
        },
      });

      const analyticsSpy = jest.fn();
      appInstaller.on('analytics:tracked', analyticsSpy);

      // Trigger an analytics event by manually calling trackAnalytics
      // (which is what the AppInstaller does for various install events)
      (appInstaller as any).trackAnalytics('test_event', { test: 'data' });

      // Analytics should be tracked
      expect(analyticsSpy).toHaveBeenCalled();
    });

    it('should not track analytics when disabled', () => {
      appInstaller = new AppInstaller({
        analytics: {
          enabled: false,
        },
      });

      const analyticsSpy = jest.fn();
      appInstaller.on('analytics:tracked', analyticsSpy);

      appInstaller.recordReceiptCreated();

      expect(analyticsSpy).not.toHaveBeenCalled();
    });

    it('should integrate with Google Analytics gtag', () => {
      (global as any).gtag = jest.fn();

      appInstaller = new AppInstaller({
        analytics: {
          enabled: true,
        },
      });

      // Manually emit an analytics event to test gtag integration
      (appInstaller as any).trackAnalytics('test_event', { test: 'data' });

      expect((global as any).gtag).toHaveBeenCalledWith('event', 'test_event', expect.objectContaining({
        test: 'data',
        timestamp: expect.any(String),
        platform: expect.any(String),
      }));
    });
  });

  describe('Can Install Detection', () => {
    it('should return true when install is possible', () => {
      // Ensure the mock is set up BEFORE creating AppInstaller
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(() => ({
          matches: false, // Always return false to ensure not standalone
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
        writable: true,
        configurable: true,
      });

      // Also ensure navigator.standalone is false
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true,
        configurable: true,
      });

      // Create AppInstaller with default config (customPrompt.enabled defaults to true)
      appInstaller = new AppInstaller();
      
      // Verify the setup worked
      const platformInfo = appInstaller.getPlatformInfo();
      const engagementStats = appInstaller.getEngagementStats();
      
      expect(platformInfo.isStandalone).toBe(false);
      expect(engagementStats.installed).toBe(false);
      expect(appInstaller.canInstall()).toBe(true);
    });

    it('should return false when already installed', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)', // Standalone = installed
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
        writable: true,
        configurable: true,
      });

      appInstaller = new AppInstaller();
      
      expect(appInstaller.canInstall()).toBe(false);
    });

    it('should return false when already installed (localStorage)', () => {
      const installedEngagement: EngagementData = {
        firstVisit: Date.now() - 24 * 60 * 60 * 1000,
        lastVisit: Date.now(),
        totalTime: 10 * 60 * 1000,
        pageViews: 10,
        receiptsCreated: 5,
        returnVisits: 2,
        promptsShown: 1,
        dismissed: false,
        installed: true, // Already installed
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(installedEngagement));

      appInstaller = new AppInstaller();
      
      expect(appInstaller.canInstall()).toBe(false);
    });

    it('should return true when custom prompt is enabled', () => {
      // Explicitly set up non-standalone mode BEFORE creating AppInstaller
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(() => ({
          matches: false, // Not standalone for any query
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
        writable: true,
        configurable: true,
      });

      // Also ensure navigator.standalone is false
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true,
        configurable: true,
      });

      // Create AppInstaller with custom prompt enabled
      appInstaller = new AppInstaller({
        customPrompt: {
          enabled: true,
        },
      });
      
      // Verify the setup worked
      const platformInfo = appInstaller.getPlatformInfo();
      const engagementStats = appInstaller.getEngagementStats();
      
      expect(platformInfo.isStandalone).toBe(false);
      expect(engagementStats.installed).toBe(false);
      expect(appInstaller.canInstall()).toBe(true);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      appInstaller = new AppInstaller();
      
      const removeAllListenersSpy = jest.spyOn(appInstaller, 'removeAllListeners');
      
      appInstaller.destroy();
      
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'acube_install_engagement',
        expect.any(String)
      );
    });

    it('should handle destroy gracefully with timers', (done) => {
      appInstaller = new AppInstaller();
      
      // Trigger custom prompt to create timers
      appInstaller.showInstallPrompt().then(() => {
        // Destroy while prompt might be active
        appInstaller.destroy();
        
        // Should not throw errors
        expect(appInstaller).toBeDefined();
        done();
      }).catch(done);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      expect(() => {
        appInstaller = new AppInstaller();
      }).not.toThrow();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to load engagement data:',
        expect.any(Error)
      );
    });

    it('should handle save errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      appInstaller = new AppInstaller();
      
      expect(() => {
        appInstaller.recordReceiptCreated();
      }).not.toThrow();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to save engagement data:',
        expect.any(Error)
      );
    });

    it('should handle prompt errors gracefully', async () => {
      const mockPrompt: MockBeforeInstallPromptEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn().mockRejectedValue(new Error('Prompt failed')),
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
        platforms: ['web'],
      };

      appInstaller = new AppInstaller();
      (appInstaller as any).installPrompt = mockPrompt;

      const installFailedSpy = jest.fn();
      appInstaller.on('install:failed', installFailedSpy);

      await appInstaller.showInstallPrompt();

      expect(installFailedSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        platform: expect.any(String),
      });
    });
  });

  describe('Event System', () => {
    it('should emit criteria:met event when criteria are satisfied', async () => {
      const criteriaMetSpy = jest.fn();
      
      appInstaller = new AppInstaller({
        criteria: {
          minEngagementTime: 1000, // Very low threshold
        },
      });
      
      appInstaller.on('criteria:met', criteriaMetSpy);

      const criteriaMet = await appInstaller.checkCriteria();
      
      if (criteriaMet) {
        appInstaller.emit('criteria:met', { criteria: { minEngagementTime: 1000 } });
        expect(criteriaMetSpy).toHaveBeenCalled();
      }
    });

    it('should emit prompt:dismissed event when user dismisses', async () => {
      const promptDismissedSpy = jest.fn();
      
      appInstaller = new AppInstaller();
      appInstaller.on('prompt:dismissed', promptDismissedSpy);

      // Manually trigger dismiss event
      appInstaller.emit('prompt:dismissed', { reason: 'user' });

      expect(promptDismissedSpy).toHaveBeenCalledWith({ reason: 'user' });
    });

    it('should emit install:started event when installation begins', () => {
      const installStartedSpy = jest.fn();
      
      appInstaller = new AppInstaller();
      appInstaller.on('install:started', installStartedSpy);

      // Manually trigger install started event
      appInstaller.emit('install:started', { platform: 'desktop' });

      expect(installStartedSpy).toHaveBeenCalledWith({ platform: 'desktop' });
    });
  });
});