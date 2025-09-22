// Mock @react-native-community/netinfo
const mockNetInfo = {
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  default: undefined
};

// Mock the module directly using Jest's module mocking
jest.mock('@react-native-community/netinfo', () => mockNetInfo, { virtual: true });

import { ReactNativeNetworkMonitor } from '../network';

describe('ReactNativeNetworkMonitor', () => {
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

  describe('Initialization', () => {
    it('should initialize with NetInfo available', async () => {
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('should handle basic functionality', async () => {
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should have basic network functionality
      expect(networkMonitor.isOnline()).toBe(true);
      
      // Should be able to get network info
      const info = await networkMonitor.getNetworkInfo();
      expect(info).toBeTruthy();
    });

    it('should support event listeners', async () => {
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      let callbackInvoked = false;
      const unsubscribe = networkMonitor.onStatusChange(() => {
        callbackInvoked = true;
      });

      expect(callbackInvoked).toBe(false);
      
      // Should be able to add/remove listeners
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Network State Detection', () => {
    beforeEach(async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should detect online state correctly', () => {
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('should handle network state changes', () => {
      let callbackInvoked = false;
      let receivedState: boolean;

      const unsubscribe = networkMonitor.onStatusChange((online) => {
        callbackInvoked = true;
        receivedState = online;
      });

      // Check that we can register listeners
      expect(typeof unsubscribe).toBe('function');
      
      // Simulate network state change by directly calling the monitor's internal methods
      (networkMonitor as any).currentState = false;
      (networkMonitor as any).notifyListeners(false);

      expect(callbackInvoked).toBe(true);
      expect(receivedState!).toBe(false);

      unsubscribe();
    });

    it('should handle connected but no internet reachability', () => {
      const unsubscribe = networkMonitor.onStatusChange(() => {});

      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate connected but no internet
      netInfoCallback({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi'
      });

      expect(networkMonitor.isOnline()).toBe(false);

      unsubscribe();
    });

    it('should handle connected with null internet reachability as online', () => {
      const unsubscribe = networkMonitor.onStatusChange(() => {});

      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate connected with null reachability (some platforms)
      netInfoCallback({
        isConnected: true,
        isInternetReachable: null,
        type: 'cellular'
      });

      // Should be considered online when reachability is null
      expect(networkMonitor.isOnline()).toBe(true);

      unsubscribe();
    });

    it('should not notify listeners when state does not change', () => {
      let callbackCount = 0;

      const unsubscribe = networkMonitor.onStatusChange(() => {
        callbackCount++;
      });

      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate same state multiple times
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular' // Different type but same online status
      });

      // Should only be called once for the actual state change
      expect(callbackCount).toBe(0); // No change from initial online state

      unsubscribe();
    });
  });

  describe('Network Info', () => {
    beforeEach(async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should return network info when available', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {
          cellularGeneration: '4g'
        }
      });

      const info = await networkMonitor.getNetworkInfo();

      expect(info).toEqual({
        type: 'wifi',
        effectiveType: '4g'
      });
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should return null when NetInfo is not available', async () => {
      const monitorWithoutNetInfo = new ReactNativeNetworkMonitor();
      
      // Override the NetInfo reference to null and prevent reinitialization
      (monitorWithoutNetInfo as any).NetInfo = null;
      // Mock the initializeNetInfo to do nothing
      (monitorWithoutNetInfo as any).initializeNetInfo = jest.fn();

      const info = await monitorWithoutNetInfo.getNetworkInfo();

      expect(info).toBeNull();
      
      monitorWithoutNetInfo.destroy();
    });

    it('should handle NetInfo fetch errors', async () => {
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
        { netInfoType: 'unknown', expectedType: 'unknown' },
        { netInfoType: 'bluetooth', expectedType: 'unknown' }
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
        { generation: 'unknown', expectedType: undefined },
        { generation: null, expectedType: undefined }
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

  describe('Listener Management', () => {
    it('should add and remove listeners correctly', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = networkMonitor.onStatusChange(callback1);
      const unsubscribe2 = networkMonitor.onStatusChange(callback2);

      // Simulate network change
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      expect(callback1).toHaveBeenCalledWith(false);
      expect(callback2).toHaveBeenCalledWith(false);

      // Remove first listener
      unsubscribe1();

      // Reset mocks
      callback1.mockClear();
      callback2.mockClear();

      // Simulate another change
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(true);

      unsubscribe2();
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
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in network status callback:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle NetInfo not being available initially', () => {
      // Create monitor without NetInfo by setting it to null
      const monitorWithoutNetInfo = new ReactNativeNetworkMonitor();
      (monitorWithoutNetInfo as any).NetInfo = null;

      // Add listener should still work
      const unsubscribe = monitorWithoutNetInfo.onStatusChange(() => {});

      // Should not crash
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
      monitorWithoutNetInfo.destroy();
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

    it('should handle destroy when no subscription exists', () => {
      const monitorWithoutSubscription = new ReactNativeNetworkMonitor();
      
      // Simulate no subscription
      (monitorWithoutSubscription as any).unsubscribe = null;

      // Should not throw
      expect(() => {
        monitorWithoutSubscription.destroy();
      }).not.toThrow();
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
  });

  describe('Edge Cases', () => {
    it('should handle NetInfo state with missing properties', () => {
      const unsubscribe = networkMonitor.onStatusChange(() => {});

      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate incomplete state object
      netInfoCallback({
        isConnected: true
        // Missing isInternetReachable
      });

      // Should handle gracefully and consider online
      expect(networkMonitor.isOnline()).toBe(true);

      unsubscribe();
    });

    it('should handle NetInfo state as undefined/null', () => {
      const unsubscribe = networkMonitor.onStatusChange(() => {});

      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate null/undefined state
      netInfoCallback(null);
      
      // Should not crash and maintain previous state
      expect(networkMonitor.isOnline()).toBe(true);

      unsubscribe();
    });

    it('should handle multiple rapid network changes', () => {
      let changeCount = 0;
      
      const unsubscribe = networkMonitor.onStatusChange(() => {
        changeCount++;
      });

      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate rapid changes
      netInfoCallback({ isConnected: false, isInternetReachable: false, type: 'none' });
      netInfoCallback({ isConnected: true, isInternetReachable: true, type: 'wifi' });
      netInfoCallback({ isConnected: false, isInternetReachable: false, type: 'none' });
      netInfoCallback({ isConnected: true, isInternetReachable: true, type: 'cellular' });

      expect(changeCount).toBe(4); // All changes should be processed

      unsubscribe();
    });
  });
});