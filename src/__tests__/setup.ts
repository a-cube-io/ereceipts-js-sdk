/**
 * Test Setup File
 * Global test configuration and utilities
 */

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly testing it
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Restore console for specific tests if needed
export const restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Mock process.exit to prevent tests from exiting
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`Process.exit called with code: ${code}`);
});

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Mock any external dependencies that might cause issues in tests
jest.mock('keytar', () => ({
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
}));

// Increase timeout for async operations
jest.setTimeout(10000);