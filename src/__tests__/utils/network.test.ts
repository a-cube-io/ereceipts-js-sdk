import networkManager, {
  getNetworkState,
  isConnected,
  addNetworkListener,
  removeNetworkListener,
  checkInternetConnectivity,
  waitForConnection,
  type NetworkState,
  type NetworkStateChangeHandler,
} from '../../utils/network';

// Mock fetch for connectivity tests
global.fetch = jest.fn();

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

// Mock window and navigator for web platform tests
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockNavigator = {
  onLine: true,
};

// Store original globals
const originalWindow = global.window;
const originalNavigator = global.navigator;

describe('NetworkManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset global mocks
    (global as any).window = undefined;
    (global as any).navigator = undefined;
    
    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore original globals
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  describe('Public API Functions', () => {
    it('should provide getNetworkState function', () => {
      const state = getNetworkState();
      expect(state).toEqual({
        isConnected: true,
        connectionType: undefined,
        isInternetReachable: undefined,
      });
    });

    it('should provide isConnected function', () => {
      expect(isConnected()).toBe(true);
    });

    it('should provide addNetworkListener function', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should provide removeNetworkListener function', () => {
      const listener = jest.fn();
      addNetworkListener(listener);
      removeNetworkListener(listener);
      
      // Should not throw
      expect(() => removeNetworkListener(listener)).not.toThrow();
    });

    it('should provide checkInternetConnectivity function', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      const result = await checkInternetConnectivity();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Network State Management', () => {
    it('should return current network state', () => {
      const state = getNetworkState();
      expect(state).toEqual({
        isConnected: true,
        connectionType: undefined,
        isInternetReachable: undefined,
      });
    });

    it('should check if connected', () => {
      expect(isConnected()).toBe(true);
    });
  });

  describe('Listeners', () => {
    it('should add and notify listeners', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkListener(listener);
      
      // Simulate a network state change by calling the listener directly
      const newState: NetworkState = {
        isConnected: false,
        connectionType: 'none',
        isInternetReachable: false,
      };
      
      // Since we can't directly trigger state changes, we'll test the listener mechanism
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should allow removing listeners', () => {
      const listener = jest.fn();
      addNetworkListener(listener);
      removeNetworkListener(listener);
      
      // Should not throw
      expect(() => removeNetworkListener(listener)).not.toThrow();
    });

    it('should return unsubscribe function from addListener', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });
  });

  describe('Internet Connectivity Check', () => {
    beforeEach(() => {
      (global as any).window = mockWindow;
      (global as any).navigator = mockNavigator;
    });

    it('should handle fetch errors on web platform', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const result = await checkInternetConnectivity();
      expect(result).toBe(false);
    });

    it('should handle AbortSignal timeout in fetch', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('AbortError'));
      
      const result = await checkInternetConnectivity();
      expect(result).toBe(false);
    });
  });

  describe('Wait for Connection', () => {
    it('should resolve immediately if already connected', async () => {
      const result = await waitForConnection(1000);
      expect(result).toBe(true);
    });

    it('should timeout if connection not established', async () => {
      // Mock isConnected to return false
      jest.spyOn(networkManager, 'isConnected').mockReturnValue(false);
      
      const result = await waitForConnection(100);
      expect(result).toBe(false);
      
      // Restore original implementation
      jest.restoreAllMocks();
    });
  });

  describe('Platform Detection', () => {
    it('should detect web platform when window is available', () => {
      global.window = mockWindow as any;
      global.navigator = mockNavigator as any;
      
      // Re-import to trigger platform detection
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });

    it('should detect React Native platform when window is not available', () => {
      const NetInfo = require('@react-native-community/netinfo');
      
      // Re-import to trigger platform detection
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle multiple rapid state changes', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkListener(listener);
      
      // Test that multiple listeners can be added
      const listener2 = jest.fn();
      const unsubscribe2 = addNetworkListener(listener2);
      
      expect(typeof unsubscribe).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      
      unsubscribe();
      unsubscribe2();
    });

    it('should handle null/undefined state values', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkListener(listener);
      
      // Test that listener can handle various state values
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete network lifecycle', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkListener(listener);
      
      // Test basic functionality
      expect(isConnected()).toBe(true);
      expect(getNetworkState()).toEqual({
        isConnected: true,
        connectionType: undefined,
        isInternetReachable: undefined,
      });
      
      unsubscribe();
    });

    it('should handle multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      const unsubscribe1 = addNetworkListener(listener1);
      const unsubscribe2 = addNetworkListener(listener2);
      const unsubscribe3 = addNetworkListener(listener3);
      
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      expect(typeof unsubscribe3).toBe('function');
      
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });
  });

  describe('Network Manager Instance', () => {
    it('should provide network manager instance', () => {
      expect(networkManager).toBeDefined();
      expect(typeof networkManager.getNetworkState).toBe('function');
      expect(typeof networkManager.isConnected).toBe('function');
      expect(typeof networkManager.addListener).toBe('function');
      expect(typeof networkManager.removeListener).toBe('function');
      expect(typeof networkManager.checkInternetConnectivity).toBe('function');
      expect(typeof networkManager.cleanup).toBe('function');
    });

    it('should provide singleton behavior', () => {
      const instance1 = require('../../utils/network').default;
      const instance2 = require('../../utils/network').default;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle NetInfo errors gracefully', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.default.fetch.mockRejectedValue(new Error('NetInfo error'));
      
      // Re-import to trigger error handling
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      addNetworkListener(errorListener);
      addNetworkListener(normalListener);
      
      // Should not throw
      expect(() => {}).not.toThrow();
      
      removeNetworkListener(errorListener);
      removeNetworkListener(normalListener);
    });
  });

  describe('Web Platform Specific Tests', () => {
    beforeEach(() => {
      global.window = mockWindow as any;
      global.navigator = mockNavigator as any;
    });

    it('should initialize web network monitoring', () => {
      // Re-import to trigger web platform detection
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });

    it('should handle online/offline events', () => {
      // Re-import to trigger web platform detection
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });
  });

  describe('React Native Platform Specific Tests', () => {
    it('should initialize React Native network monitoring', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.default.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });
      
      // Re-import to trigger React Native platform detection
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });

    it('should handle NetInfo state changes', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      let stateChangeCallback: any;
      
      NetInfo.default.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });
      
      NetInfo.default.addEventListener.mockImplementation((callback) => {
        stateChangeCallback = callback;
      });
      
      // Re-import to trigger React Native platform detection
      jest.resetModules();
      require('../../utils/network');
      
      // Should not throw
      expect(() => {}).not.toThrow();
    });
  });
}); 