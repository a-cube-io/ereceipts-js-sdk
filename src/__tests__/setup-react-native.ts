import '@testing-library/jest-dom';
import '@testing-library/react-native';

// Define __DEV__ for React Native compatibility
(global as any).__DEV__ = process.env.NODE_ENV === 'development';

// Mock React Native core to avoid parsing issues in Jest
// @testing-library/react-native handles most component rendering internally
jest.mock('react-native', () => {
  const React = require('react');
  return {
    // Core components - minimal mocks to avoid parsing issues
    // Make text content directly accessible for @testing-library/react-native queries
    Text: ({ children, testID, accessibilityLabel, ...props }: any) => 
      React.createElement('span', { 
        testID, 
        accessibilityLabel, 
        'data-testid': testID,
        'aria-label': accessibilityLabel,
        ...props 
      }, children),
    View: ({ children, testID, accessibilityLabel, ...props }: any) => 
      React.createElement('div', { 
        testID, 
        accessibilityLabel, 
        'data-testid': testID,
        'aria-label': accessibilityLabel,
        ...props 
      }, children),
    TouchableOpacity: ({ children, testID, accessibilityLabel, onPress, disabled, ...props }: any) => 
      React.createElement('button', { 
        testID, 
        accessibilityLabel, 
        'data-testid': testID,
        'aria-label': accessibilityLabel,
        onClick: disabled ? undefined : onPress, 
        disabled,
        role: 'button',
        'aria-disabled': disabled,
        ...props 
      }, children),
    TextInput: ({ testID, onChangeText, value, ...props }: any) => 
      React.createElement('input', { 
        testID, 
        value, 
        'data-testid': testID,
        onChange: (e: any) => onChangeText?.(e.target.value), 
        ...props 
      }),
    
    // Additional components that might be used
    ScrollView: ({ children, testID, ...props }: any) => 
      React.createElement('div', { 
        testID, 
        'data-testid': testID,
        ...props 
      }, children),
    FlatList: ({ data, renderItem, testID, ...props }: any) => 
      React.createElement('div', { 
        testID, 
        'data-testid': testID,
        ...props 
      }, 
        data?.map((item: any, index: number) => renderItem({ item, index }))
      ),
    Image: ({ source, testID, ...props }: any) => 
      React.createElement('img', { 
        testID, 
        'data-testid': testID,
        src: source?.uri || source, 
        ...props 
      }),
    Switch: ({ testID, value, onValueChange, ...props }: any) => 
      React.createElement('input', { 
        testID, 
        'data-testid': testID,
        type: 'checkbox', 
        checked: value, 
        onChange: (e: any) => onValueChange?.(e.target.checked), 
        ...props 
      }),
    Modal: ({ children, visible, testID, ...props }: any) => 
      visible ? React.createElement('div', { 
        testID, 
        'data-testid': testID,
        ...props 
      }, children) : null,
    ActivityIndicator: ({ size, color, style, testID, ...props }: any) => 
      React.createElement('div', { 
        style, 
        testID,
        'data-testid': testID,
        ...props 
      }, 'Loading...'),
    
    // Utilities
    StyleSheet: {
      create: (styles: any) => styles,
      hairlineWidth: 1,
      flatten: (style: any) => style,
    },
    Alert: { alert: jest.fn() },
    Platform: { OS: 'ios', select: jest.fn() },
    Dimensions: { get: jest.fn(() => ({ width: 375, height: 667 })) },
    StatusBar: { setBarStyle: jest.fn(), setHidden: jest.fn() },
  };
});

// Mock external React Native libraries
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

// Mock browser APIs for JSDOM compatibility
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Suppress console warnings during tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Using incorrect casing') ||
       args[0].includes('react-test-renderer is deprecated'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
}); 