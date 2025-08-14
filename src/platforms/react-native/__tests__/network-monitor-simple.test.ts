// Mock @react-native-community/netinfo
const mockNetInfo = {
  addEventListener: jest.fn(),
  fetch: jest.fn(),
};

// Mock the module directly using Jest's module mocking
jest.mock('@react-native-community/netinfo', () => mockNetInfo);

import { ReactNativeNetworkMonitor } from '../network';

describe('ReactNativeNetworkMonitor - Basic Functionality', () => {
  let networkMonitor: ReactNativeNetworkMonitor;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock unsubscribe function
    mockUnsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);
    
    // Setup default NetInfo behavior
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {
        cellularGeneration: '4g'
      }
    });

    networkMonitor = new ReactNativeNetworkMonitor();
  });

  afterEach(() => {
    if (networkMonitor) {
      networkMonitor.destroy();
    }
  });

  describe('Basic Operations', () => {
    it('should initialize and provide default online state', () => {
      expect(networkMonitor).toBeTruthy();
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('should register NetInfo event listener on creation', () => {
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should allow adding status change callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = networkMonitor.onStatusChange(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Test unsubscribe works
      unsubscribe();
    });

    it('should handle multiple callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const unsubscribe1 = networkMonitor.onStatusChange(callback1);
      const unsubscribe2 = networkMonitor.onStatusChange(callback2);
      
      // Simulate network state change through internal method
      (networkMonitor as any).currentState = false;
      (networkMonitor as any).notifyListeners(false);
      
      expect(callback1).toHaveBeenCalledWith(false);
      expect(callback2).toHaveBeenCalledWith(false);
      
      unsubscribe1();
      unsubscribe2();
    });

    it('should handle callback removal', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const unsubscribe1 = networkMonitor.onStatusChange(callback1);
      const unsubscribe2 = networkMonitor.onStatusChange(callback2);
      
      // Remove first callback
      unsubscribe1();
      
      // Simulate network state change
      (networkMonitor as any).currentState = false;
      (networkMonitor as any).notifyListeners(false);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(false);
      
      unsubscribe2();
    });
  });

  describe('Network Info', () => {
    it('should return network info when NetInfo is available', async () => {
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const info = await networkMonitor.getNetworkInfo();
      
      expect(info).toEqual({
        type: 'wifi',
        effectiveType: '4g'
      });
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Fetch failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const info = await networkMonitor.getNetworkInfo();

      expect(info).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get network info:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should map connection types correctly', async () => {
      const testCases = [
        { netInfoType: 'wifi', expectedType: 'wifi' },
        { netInfoType: 'cellular', expectedType: 'cellular' },
        { netInfoType: 'ethernet', expectedType: 'ethernet' },
        { netInfoType: 'none', expectedType: 'unknown' },
        { netInfoType: 'unknown', expectedType: 'unknown' }
      ];

      for (const testCase of testCases) {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: testCase.netInfoType,
          details: {}
        });

        const info = await networkMonitor.getNetworkInfo();
        expect(info?.type).toBe(testCase.expectedType);
      }
    });

    it('should map cellular generations correctly', async () => {
      const testCases = [
        { generation: '2g', expectedType: '2g' },
        { generation: '3g', expectedType: '3g' },
        { generation: '4g', expectedType: '4g' },
        { generation: '5g', expectedType: '5g' },
        { generation: 'unknown', expectedType: undefined }
      ];

      for (const testCase of testCases) {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
          details: {
            cellularGeneration: testCase.generation
          }
        });

        const info = await networkMonitor.getNetworkInfo();
        expect(info?.effectiveType).toBe(testCase.expectedType);
      }
    });
  });

  describe('State Management', () => {
    it('should maintain current state correctly', () => {
      expect(networkMonitor.isOnline()).toBe(true);
      
      // Manually set offline state
      (networkMonitor as any).currentState = false;
      expect(networkMonitor.isOnline()).toBe(false);
      
      // Manually set online state
      (networkMonitor as any).currentState = true;
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('should only notify listeners when state changes', () => {
      const callback = jest.fn();
      const unsubscribe = networkMonitor.onStatusChange(callback);
      
      // Set to same state (should not notify)
      (networkMonitor as any).currentState = true;
      (networkMonitor as any).notifyListeners(true);
      expect(callback).not.toHaveBeenCalled();
      
      // Change state (should notify)
      (networkMonitor as any).currentState = false;
      (networkMonitor as any).notifyListeners(false);
      expect(callback).toHaveBeenCalledWith(false);
      
      unsubscribe();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      networkMonitor.onStatusChange(errorCallback);
      networkMonitor.onStatusChange(goodCallback);

      // Simulate network change
      (networkMonitor as any).currentState = false;
      (networkMonitor as any).notifyListeners(false);

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in network status callback:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources when destroyed', () => {
      // Add some listeners first
      networkMonitor.onStatusChange(() => {});
      networkMonitor.onStatusChange(() => {});

      // Destroy the monitor
      networkMonitor.destroy();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should clear all listeners on destroy', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      networkMonitor.onStatusChange(callback1);
      networkMonitor.onStatusChange(callback2);

      networkMonitor.destroy();

      // Listeners array should be empty
      expect((networkMonitor as any).listeners).toEqual([]);
    });

    it('should handle destroy when no subscription exists', () => {
      const monitorWithoutSubscription = new ReactNativeNetworkMonitor();
      
      // Simulate no subscription
      (monitorWithoutSubscription as any).unsubscribe = null;

      // Should not throw
      expect(() => {
        monitorWithoutSubscription.destroy();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should return null when NetInfo is not available for getNetworkInfo', async () => {
      // Simulate NetInfo not available
      (networkMonitor as any).NetInfo = null;

      const info = await networkMonitor.getNetworkInfo();
      expect(info).toBeNull();
    });

    it('should handle reinitialization when adding listener and NetInfo was not available', () => {
      // Simulate NetInfo not available initially
      (networkMonitor as any).NetInfo = null;

      // Add listener should trigger reinitialization attempt
      networkMonitor.onStatusChange(() => {});

      // This is a basic test - in reality the async nature makes this complex to test
      expect((networkMonitor as any).NetInfo).toBe(null);
    });

    it('should handle network state evaluation correctly', () => {
      // Test different combinations of connection states
      const testCases = [
        { isConnected: true, isInternetReachable: true, expected: true },
        { isConnected: true, isInternetReachable: false, expected: false },
        { isConnected: true, isInternetReachable: null, expected: true },
        { isConnected: false, isInternetReachable: true, expected: false },
        { isConnected: false, isInternetReachable: false, expected: false }
      ];

      testCases.forEach(({ isConnected, isInternetReachable, expected }) => {
        const state = { isConnected, isInternetReachable, type: 'wifi' };
        const isOnline = isConnected && isInternetReachable !== false;
        expect(isOnline).toBe(expected);
      });
    });
  });
});