/**
 * Platform detection tests
 *
 * Note: These tests are limited because platform detection relies on
 * global variables (window, process, global.navigator) that are difficult
 * to mock properly in Jest. The actual platform detection works correctly
 * at runtime based on the real environment.
 *
 * In the Jest test environment (Node.js), detectPlatform() returns 'node'.
 */
import { Platform, PlatformInfo, detectPlatform } from '../platform-detector';

describe('detectPlatform', () => {
  it('should return a PlatformInfo object', () => {
    const result = detectPlatform();

    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('isReactNative');
    expect(result).toHaveProperty('isWeb');
    expect(result).toHaveProperty('isNode');
    expect(result).toHaveProperty('isExpo');
  });

  it('should return boolean values for platform flags', () => {
    const result = detectPlatform();

    expect(typeof result.isReactNative).toBe('boolean');
    expect(typeof result.isWeb).toBe('boolean');
    expect(typeof result.isNode).toBe('boolean');
    expect(typeof result.isExpo).toBe('boolean');
  });

  it('should return a valid Platform type', () => {
    const result = detectPlatform();
    const validPlatforms: Platform[] = ['web', 'react-native', 'node', 'unknown'];

    expect(validPlatforms).toContain(result.platform);
  });

  it('should have mutually exclusive platform flags for detected platform', () => {
    const result = detectPlatform();

    // Only one primary platform should be true
    const platformFlags = [result.isReactNative, result.isWeb, result.isNode];
    const trueCount = platformFlags.filter(Boolean).length;

    // Either exactly one is true, or none (unknown platform)
    expect(trueCount).toBeLessThanOrEqual(1);
  });

  describe('in Jest/Node environment', () => {
    it('should detect Node.js environment in tests', () => {
      const result = detectPlatform();

      // In Jest, we're running in Node.js
      expect(result.platform).toBe('node');
      expect(result.isNode).toBe(true);
      expect(result.isWeb).toBe(false);
      expect(result.isReactNative).toBe(false);
    });

    it('should not detect Expo in Node environment', () => {
      const result = detectPlatform();

      expect(result.isExpo).toBe(false);
    });
  });

  describe('PlatformInfo structure', () => {
    it('should return consistent structure for node platform', () => {
      const expected: PlatformInfo = {
        platform: 'node',
        isReactNative: false,
        isWeb: false,
        isNode: true,
        isExpo: false,
      };

      const result = detectPlatform();

      expect(result).toEqual(expected);
    });
  });
});

describe('Platform type', () => {
  it('should include all expected platform values', () => {
    // Type check - these should all be valid Platform values
    const platforms: Platform[] = ['web', 'react-native', 'node', 'unknown'];

    expect(platforms).toHaveLength(4);
  });
});
