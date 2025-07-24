// Setup file for API tests

// Polyfill structuredClone for Node.js < 17
if (typeof global.structuredClone === 'undefined') {
  (global as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Define __DEV__ for compatibility
(global as any).__DEV__ = process.env.NODE_ENV === 'development';

// Mock React Native modules that might be imported in API modules
jest.mock('react-native-keychain', () => ({
  getInternetCredentials: jest.fn(),
  setInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  getAllInternetCredentials: jest.fn(),
  getSupportedBiometryType: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  isConnected: {
    addEventListener: jest.fn(),
    fetch: jest.fn(),
  },
}));

// Suppress console warnings during tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
}); 