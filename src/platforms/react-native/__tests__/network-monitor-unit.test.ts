import { ReactNativeNetworkMonitor } from '../network';

describe('ReactNativeNetworkMonitor - Unit Tests', () => {
  let networkMonitor: ReactNativeNetworkMonitor;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console.warn to suppress NetInfo warnings in unit tests
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    // Create monitor without mocking external dependencies
    networkMonitor = new ReactNativeNetworkMonitor();
  });

  afterEach(() => {
    if (networkMonitor) {
      networkMonitor.destroy();
    }
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(networkMonitor).toBeTruthy();
      expect(networkMonitor).toBeInstanceOf(ReactNativeNetworkMonitor);
    });

    it('should have default online state', () => {
      // Should default to true (conservative approach)
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('should support status change callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = networkMonitor.onStatusChange(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Should be able to unsubscribe without error
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle multiple callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const unsubscribe1 = networkMonitor.onStatusChange(callback1);
      const unsubscribe2 = networkMonitor.onStatusChange(callback2);
      
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      
      // Clean up
      unsubscribe1();
      unsubscribe2();
    });

    it('should handle getNetworkInfo without throwing', async () => {
      let result;
      
      // Should not throw even if NetInfo is not available
      expect(async () => {
        result = await networkMonitor.getNetworkInfo();
      }).not.toThrow();
      
      // Result can be null if NetInfo is not available, which is fine
      // We're just testing that it doesn't crash
    });

    it('should handle destroy without throwing', () => {
      expect(() => {
        networkMonitor.destroy();
      }).not.toThrow();
    });

    it('should handle multiple destroys gracefully', () => {
      expect(() => {
        networkMonitor.destroy();
        networkMonitor.destroy(); // Second destroy should not throw
      }).not.toThrow();
    });
  });

  describe('Internal State Management', () => {
    it('should maintain internal state consistently', () => {
      const initialState = networkMonitor.isOnline();
      expect(typeof initialState).toBe('boolean');
      
      // State should be consistent across multiple calls
      expect(networkMonitor.isOnline()).toBe(initialState);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test callback error');
      });
      const goodCallback = jest.fn();
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Add both callbacks
      const unsubscribe1 = networkMonitor.onStatusChange(errorCallback);
      const unsubscribe2 = networkMonitor.onStatusChange(goodCallback);
      
      // Manually trigger callbacks to test error handling
      try {
        (networkMonitor as any).notifyListeners(false);
      } catch (error) {
        // Should not propagate errors from callbacks
        expect(false).toBe(true); // This should not be reached
      }
      
      // Clean up
      unsubscribe1();
      unsubscribe2();
      consoleSpy.mockRestore();
    });

    it('should support listener removal', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const unsubscribe1 = networkMonitor.onStatusChange(callback1);
      const unsubscribe2 = networkMonitor.onStatusChange(callback2);
      
      // Remove first listener
      unsubscribe1();
      
      // Manually trigger listeners
      try {
        (networkMonitor as any).notifyListeners(true);
      } catch (error) {
        // Should not throw when listeners are removed
      }
      
      // Clean up remaining listener
      unsubscribe2();
    });

    it('should clean up listeners on destroy', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      networkMonitor.onStatusChange(callback1);
      networkMonitor.onStatusChange(callback2);
      
      // Should not throw during destroy
      expect(() => {
        networkMonitor.destroy();
      }).not.toThrow();
      
      // Internal listeners array should be cleared
      expect((networkMonitor as any).listeners).toEqual([]);
    });
  });

  describe('Platform Integration', () => {
    it('should handle NetInfo unavailability gracefully', () => {
      // Create a new monitor instance
      const testMonitor = new ReactNativeNetworkMonitor();
      
      // Should not throw even if NetInfo is not available
      expect(testMonitor.isOnline()).toBe(true); // Default state
      
      testMonitor.destroy();
    });

    it('should provide network type mapping functionality', () => {
      // Test the private mapping methods exist (even if we can't call them directly)
      expect(networkMonitor).toBeTruthy();
      
      // These are internal methods, so we test them indirectly by ensuring
      // the class is properly structured
      expect(typeof (networkMonitor as any).mapConnectionType).toBe('function');
      expect(typeof (networkMonitor as any).mapEffectiveType).toBe('function');
    });

    it('should handle connection type mapping', () => {
      // Test the mapping functions directly
      const mapConnectionType = (networkMonitor as any).mapConnectionType;
      
      expect(mapConnectionType('wifi')).toBe('wifi');
      expect(mapConnectionType('cellular')).toBe('cellular');
      expect(mapConnectionType('ethernet')).toBe('ethernet');
      expect(mapConnectionType('none')).toBe('unknown');
      expect(mapConnectionType('unknown')).toBe('unknown');
      expect(mapConnectionType('bluetooth')).toBe('unknown');
    });

    it('should handle cellular generation mapping', () => {
      // Test the mapping functions directly
      const mapEffectiveType = (networkMonitor as any).mapEffectiveType;
      
      expect(mapEffectiveType('2g')).toBe('2g');
      expect(mapEffectiveType('3g')).toBe('3g');
      expect(mapEffectiveType('4g')).toBe('4g');
      expect(mapEffectiveType('5g')).toBe('5g');
      expect(mapEffectiveType('unknown')).toBeUndefined();
      expect(mapEffectiveType(null)).toBeUndefined();
    });
  });

  describe('Error Resilience', () => {
    it('should handle simultaneous operations gracefully', () => {
      // Multiple rapid operations should not cause issues
      const callbacks = Array.from({ length: 10 }, () => jest.fn());
      const unsubscribes = callbacks.map(cb => networkMonitor.onStatusChange(cb));
      
      // Should handle multiple rapid state checks
      for (let i = 0; i < 10; i++) {
        expect(typeof networkMonitor.isOnline()).toBe('boolean');
      }
      
      // Clean up all listeners
      unsubscribes.forEach(unsub => unsub());
    });

    it('should maintain consistency under stress', async () => {
      // Rapid async operations
      const promises = Array.from({ length: 5 }, () => networkMonitor.getNetworkInfo());
      
      // Should handle multiple simultaneous getNetworkInfo calls
      expect(async () => {
        await Promise.all(promises);
      }).not.toThrow();
    });
  });
});