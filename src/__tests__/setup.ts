/**
 * Test setup configuration
 * Global test environment setup and utilities
 */

// Import branded type creators
import { createQuantity, createAmount } from '../types/branded';

// Mock EventEmitter for tests
jest.mock('eventemitter3', () => {
  return {
    EventEmitter: class MockEventEmitter {
      private events: Record<string, Function[]> = {};
      
      on(event: string, listener: Function): this {
        if (!this.events[event]) {
          this.events[event] = [];
        }
        this.events[event].push(listener);
        return this;
      }
      
      emit(event: string, ...args: unknown[]): boolean {
        if (this.events[event]) {
          this.events[event].forEach(listener => listener(...args));
          return true;
        }
        return false;
      }
      
      removeAllListeners(): this {
        this.events = {};
        return this;
      }
    },
  };
});

// Mock fetch for HTTP client tests
global.fetch = jest.fn();

// Mock timers
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeReceiptId(): R;
      toBeFiscalId(): R;
      toBeAmount(): R;
    }
  }
}

// Custom Jest matchers for branded types
expect.extend({
  toBeReceiptId(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'string' && received.length > 0;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a receipt ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a receipt ID`,
        pass: false,
      };
    }
  },
  
  toBeFiscalId(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'string' && /^\d{11}$/.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a fiscal ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a fiscal ID (11 digits)`,
        pass: false,
      };
    }
  },
  
  toBeAmount(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'string' && /^\d+\.\d{2,8}$/.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be an amount`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be an amount (string with 2-8 decimal places)`,
        pass: false,
      };
    }
  },
});

// Test data factories
export const TestDataFactory = {
  createReceiptItem: (overrides = {}) => ({
    description: 'Test Product',
    quantity: createQuantity('1.00'),
    unit_price: createAmount('10.00'),
    good_or_service: 'B' as const,
    vat_rate_code: '22' as const,
    discount: createAmount('0.00'),
    simplified_vat_allocation: false,
    is_down_payment_or_voucher_redemption: false,
    complimentary: false,
    ...overrides,
  }),
  
  createReceiptInput: (overrides = {}) => ({
    items: [TestDataFactory.createReceiptItem()],
    cash_payment_amount: createAmount('10.00'),
    electronic_payment_amount: createAmount('0.00'),
    discount: createAmount('0.00'),
    invoice_issuing: false,
    uncollected_dcr_to_ssn: false,
    services_uncollected_amount: createAmount('0.00'),
    goods_uncollected_amount: createAmount('0.00'),
    ticket_restaurant_payment_amount: createAmount('0.00'),
    ticket_restaurant_quantity: 0,
    ...overrides,
  }),
  
  createCashierInput: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'TestPassword123!',
    ...overrides,
  }),
  
  createMerchantInput: (overrides = {}) => ({
    fiscal_id: '12345678901',
    name: 'Test Merchant Ltd',
    email: 'merchant@example.com',
    password: 'MerchantPassword123!',
    address: {
      street_address: 'Via Roma 123',
      zip_code: '00100',
      city: 'Roma',
      province: 'RM',
    },
    ...overrides,
  }),
  
  createAddress: (overrides = {}) => ({
    street_address: 'Via Roma 123',
    zip_code: '00100',
    city: 'Roma',
    province: 'RM',
    ...overrides,
  }),

  createPointOfSaleInput: (overrides = {}) => ({
    merchant_uuid: 'merchant_123456789',
    address: TestDataFactory.createAddress(),
    ...overrides,
  }),

  createActivationRequest: (overrides = {}) => ({
    registration_key: 'ABCD-1234-EFGH-5678',
    ...overrides,
  }),

  createInactivityRequest: (overrides = {}) => ({
    timestamp: '2024-01-01T10:00:00Z',
    reason: 'Maintenance period',
    ...overrides,
  }),
};

// Mock HTTP responses
export const MockResponses = {
  receiptCreated: {
    uuid: 'receipt_123456789',
    type: 'sale' as const,
    created_at: '2024-01-01T10:00:00Z',
    total_amount: createAmount('10.00'),
    document_number: null,
    document_datetime: null,
  },
  
  cashierCreated: {
    id: 1,
    email: 'test@example.com',
  },
  
  merchantCreated: {
    uuid: 'merchant_123456789',
    fiscal_id: '12345678901',
    name: 'Test Merchant Ltd',
    email: 'merchant@example.com',
    address: TestDataFactory.createAddress(),
  },
  
  pointOfSaleCreated: {
    serial_number: 'POS123456789',
    status: 'NEW' as const,
    address: TestDataFactory.createAddress(),
  },
  
  paginatedResponse: <T>(items: T[]) => ({
    members: items,
    total: items.length,
    page: 1,
    size: 30,
    pages: 1,
  }),
  
  error400: {
    type: '/errors/400',
    title: 'Bad Request',
    status: 400,
    detail: 'Invalid request data',
  },
  
  error401: {
    type: '/errors/401',
    title: 'Unauthorized',
    status: 401,
    detail: 'Authentication required',
  },
  
  error403: {
    type: '/errors/403',
    title: 'Forbidden',
    status: 403,
    detail: 'Access denied',
  },
  
  error404: {
    type: '/errors/404',
    title: 'Not Found',
    status: 404,
    detail: 'Resource not found',
  },
  
  error422: {
    status: 422,
    violations: [
      {
        propertyPath: 'email',
        message: 'Invalid email format',
      },
    ],
  },
};

// HTTP client test helpers
export const HttpTestHelpers = {
  mockFetchSuccess: <T>(data: T, status = 200) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => data,
    });
  },
  
  mockFetchError: (status: number, data?: unknown) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      statusText: 'Error',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => data || MockResponses[`error${status}` as keyof typeof MockResponses],
    });
  },
  
  mockFetchNetworkError: () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
  },
  
  expectFetchToHaveBeenCalledWith: (url: string, options?: RequestInit) => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.objectContaining(options || {}),
    );
  },
};

// Console spy helpers
export const ConsoleHelpers = {
  spyOnConsole: () => {
    const consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
    
    return {
      ...consoleSpy,
      restore: () => {
        Object.values(consoleSpy).forEach(spy => spy.mockRestore());
      },
    };
  },
};

// Performance testing helpers
export const PerformanceHelpers = {
  measureAsyncPerformance: async <T>(
    operation: () => Promise<T>,
    maxDurationMs = 1000,
  ): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(maxDurationMs);
    
    return { result, duration };
  },
};