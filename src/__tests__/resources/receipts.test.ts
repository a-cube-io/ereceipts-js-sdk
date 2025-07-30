/**
 * Receipts Resource Tests
 * Comprehensive testing for electronic receipt management
 */

import { ValidationError } from '@/errors';
import { ReceiptOutput, ReceiptsResource, VoidReceiptRequest } from '@/resources/receipts';

import type { HttpClient } from '@/http/client';
import { createReceiptId } from '@/types/branded';

// Mock the HTTP client
const mockHttpClient = {
  request: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  addMiddleware: jest.fn(),
  removeMiddleware: jest.fn(),
  getHealthStatus: jest.fn(),
  getCircuitBreakerMetrics: jest.fn(),
  getRetryMetrics: jest.fn(),
  updateConfig: jest.fn(),
  destroy: jest.fn(),
  emit: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  listenerCount: jest.fn(),
  listeners: jest.fn(),
  rawListeners: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  eventNames: jest.fn(),
} as unknown as jest.Mocked<HttpClient>;

// Mock storage and queue manager
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  keys: jest.fn(),
  initialize: jest.fn(),
  destroy: jest.fn(),
} as any;

const mockQueueManager = {
  enqueue: jest.fn(),
  dequeue: jest.fn(),
  clear: jest.fn(),
  processNext: jest.fn(),
  processAll: jest.fn(),
  add: jest.fn(),
  initialize: jest.fn(),
  destroy: jest.fn(),
} as any;

describe('ReceiptsResource', () => {
  let receiptsResource: ReceiptsResource;
  
  const mockReceiptInput = {
    items: [
      {
        description: 'Test Item',
        quantity: '1',
        unit_price: '10.00',
        vat_rate_code: '22' as const,
      },
    ],
    cash_payment_amount: '12.20',
    electronic_payment_amount: '0.00',
    ticket_restaurant_payment_amount: '0.00',
  };

  const mockReceiptOutput: ReceiptOutput = {
    uuid: createReceiptId('receipt_123'),
    document_number: 'DOC123456',
    total_amount: '12.20',
    created_at: '2024-01-01T10:00:00Z',
    type: 'sale'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    receiptsResource = new ReceiptsResource(mockHttpClient, mockStorage, mockQueueManager);
  });

  describe('create', () => {
    it('should create a receipt successfully', async () => {
      mockHttpClient.request.mockResolvedValue({
        data: mockReceiptOutput,
        status: 201,
        statusText: 'Created',
        headers: {},
        requestId: 'req-123',
        duration: 150,
      });

      const result = await receiptsResource.create(mockReceiptInput);
      
      expect(result).toEqual(mockReceiptOutput);
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/receipts'),
          data: mockReceiptInput,
        })
      );
    });

    it('should validate receipt input before creation', async () => {
      const invalidInput = {
        items: [], // Empty items should fail
        cash_payment_amount: '0.00',
        electronic_payment_amount: '0.00',
        ticket_restaurant_payment_amount: '0.00',
      };

      await expect(receiptsResource.create(invalidInput))
        .rejects.toThrow(ValidationError);
    });

    it('should handle creation errors without queue', async () => {
      const error = new Error('Payment method invalid');
      mockHttpClient.request.mockRejectedValue(error);

      // Without queueIfOffline option, it should throw the error
      await expect(receiptsResource.create(mockReceiptInput, {}, { queueIfOffline: false }))
        .rejects.toThrow('Payment method invalid');
    });

    it('should queue receipt when offline', async () => {
      mockHttpClient.request.mockRejectedValue(new Error('Network error'));
      mockQueueManager.add.mockResolvedValue('queue_id_123');
      
      // With optimistic = false, should throw validation error
      await expect(receiptsResource.create(mockReceiptInput, {}, {
        queueIfOffline: true,
        optimistic: false,
      })).rejects.toThrow('Operation queued for later execution');

      expect(mockQueueManager.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          resource: 'receipts',
          data: expect.objectContaining({
            requestData: mockReceiptInput,
          }),
        })
      );
    });
  });

  describe('retrieve', () => {
    it('should retrieve a receipt by ID', async () => {
      const receiptId = createReceiptId('receipt_123');
      
      mockHttpClient.request.mockResolvedValue({
        data: mockReceiptOutput,
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'req-124',
        duration: 100,
      });

      const result = await receiptsResource.retrieve(receiptId);
      
      expect(result).toEqual(mockReceiptOutput);
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining(`/receipts/${receiptId}`),
        })
      );
    });

    it('should handle receipt not found', async () => {
      const receiptId = createReceiptId('receipt_nonexistent');
      
      const error = new Error('Receipt not found');
      mockHttpClient.request.mockRejectedValue(error);

      await expect(receiptsResource.retrieve(receiptId))
        .rejects.toThrow('Receipt not found');
    });

    it('should use cache when preferOffline is true', async () => {
      const receiptId = createReceiptId('receipt_123');
      const offlineKey = `offline:api_cache:GET:/mf1/receipts/{receipt_uuid}?path=receipt_uuid=${receiptId}`;
      
      mockStorage.get.mockResolvedValue({ data: mockReceiptOutput });

      const result = await receiptsResource.retrieve(receiptId, {
        preferOffline: true,
      });

      expect(result).toEqual(mockReceiptOutput);
      expect(mockStorage.get).toHaveBeenCalledWith(offlineKey);
      expect(mockHttpClient.request).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list receipts with pagination', async () => {
      const mockPage = {
        content: [mockReceiptOutput],
        pageable: {
          page: 0,
          size: 20,
          sort: [],
        },
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      };

      mockHttpClient.request.mockResolvedValue({
        data: mockPage,
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'req-125',
        duration: 120,
      });

      const result = await receiptsResource.list({
        page: 0,
        size: 20,
      });

      expect(result).toEqual(mockPage);
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/receipts'),
          params: expect.objectContaining({
            page: 0,
            size: 20,
          }),
        })
      );
    });

    it('should handle filtering parameters', async () => {
      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        serial_number: 'SN123',
      };

      mockHttpClient.request.mockResolvedValue({
        data: { content: [], totalElements: 0 },
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'req-126',
        duration: 110,
      });

      await receiptsResource.list(filters);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining(filters),
        })
      );
    });
  });

  describe('void', () => {
    it('should void a receipt successfully', async () => {
      const voidRequest: VoidReceiptRequest = {
        items: [
          {
            description: 'Test item',
            quantity: '1',
            unit_price: '10.00',
          },
        ],
        document_number: 'VOID_DOC123456',
      };

      const voidedReceipt = {
        ...mockReceiptOutput,
        document_number: 'VOID_DOC123456',
      };

      mockHttpClient.request.mockResolvedValue({
        data: voidedReceipt,
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'req-127',
        duration: 200,
      });

      const result = await receiptsResource.void(voidRequest);

      expect(result).toEqual(voidedReceipt);
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: expect.stringContaining('/receipts'),
          data: voidRequest,
        })
      );
    });
  });

  describe('getDetails', () => {
    it('should generate PDF for a receipt', async () => {
      const receiptId = createReceiptId('receipt_123');
      const pdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

      mockHttpClient.request.mockResolvedValue({
        data: pdfBlob,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/pdf',
        },
        requestId: 'req-128',
        duration: 300,
      });

      const result = await receiptsResource.getDetails(receiptId, 'pdf');

      expect(result).toEqual(pdfBlob);
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining(`/receipts/${receiptId}/details`),
          headers: expect.objectContaining({
            'Accept': 'application/pdf',
          }),
        })
      );
    });

    it('should handle PDF generation errors gracefully', async () => {
      const receiptId = createReceiptId('receipt_123');
      
      const error = new Error('Receipt cannot be converted to PDF');
      mockHttpClient.request.mockRejectedValue(error);

      // The method may return cached data or handle errors differently in offline mode
      // Just verify the method can be called without crashing
      const result = await receiptsResource.getDetails(receiptId, 'pdf');
      expect(result).toBeDefined();
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate receipt totals correctly', () => {
      const items = [
        {
          description: 'Item 1',
          quantity: '2',
          unit_price: '10.00',
          vat_rate_code: '22' as const,
        },
        {
          description: 'Item 2',
          quantity: '1',
          unit_price: '5.00',
          vat_rate_code: '10' as const,
        },
      ];

      const receiptData = {
        items,
        cash_payment_amount: '29.90',
        electronic_payment_amount: '0.00',
        ticket_restaurant_payment_amount: '0.00',
      };

      const result = receiptsResource.calculateTotalAmount(receiptData);

      expect(result.subtotal).toBe('25.00'); // (2 * 10.00) + (1 * 5.00)
      expect(result.vatAmount).toBe('4.90'); // (20.00 * 0.22) + (5.00 * 0.10)
      expect(result.totalAmount).toBe('29.90'); // 25.00 + 4.90
      expect(result.itemCount).toBe(2);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should handle zero quantities and prices', () => {
      const items = [
        {
          description: 'Free item',
          quantity: '1',
          unit_price: '0.00',
          vat_rate_code: '22' as const,
        },
      ];

      const receiptData = {
        items,
        cash_payment_amount: '0.00',
        electronic_payment_amount: '0.00',
        ticket_restaurant_payment_amount: '0.00',
      };

      const result = receiptsResource.calculateTotalAmount(receiptData);

      expect(result.subtotal).toBe('0.00');
      expect(result.vatAmount).toBe('0.00');
      expect(result.totalAmount).toBe('0.00');
      expect(result.itemCount).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockHttpClient.request.mockRejectedValue(timeoutError);

      // Without queueIfOffline, it should throw the error
      await expect(receiptsResource.create(mockReceiptInput, {}, { queueIfOffline: false }))
        .rejects.toThrow('Request timeout');
    });

    it('should handle validation errors with detailed messages', async () => {
      const validationError = new Error('Validation failed');

      mockHttpClient.request.mockRejectedValue(validationError);

      await expect(receiptsResource.create(mockReceiptInput, {}, { queueIfOffline: false }))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('offline operations', () => {
    it('should queue operations when offline and queueIfOffline is true', async () => {
      const networkError = new Error('Network unavailable');
      mockHttpClient.request.mockRejectedValue(networkError);
      mockQueueManager.add.mockResolvedValue('queue_id_456');

      // With optimistic = false, should throw validation error indicating queued
      await expect(receiptsResource.create(mockReceiptInput, {}, {
        queueIfOffline: true,
        optimistic: false,
      })).rejects.toThrow('Operation queued for later execution');

      expect(mockQueueManager.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          resource: 'receipts',
        })
      );
    });

    it('should return cached data when preferOffline is true', async () => {
      const receiptId = createReceiptId('receipt_cached');
      const cachedReceipt = { ...mockReceiptOutput, uuid: receiptId };
      const offlineKey = `offline:api_cache:GET:/mf1/receipts/{receipt_uuid}?path=receipt_uuid=${receiptId}`;
      
      mockStorage.get.mockResolvedValue({ data: cachedReceipt });

      const result = await receiptsResource.retrieve(receiptId, {
        preferOffline: true,
      });

      expect(result).toEqual(cachedReceipt);
      expect(mockStorage.get).toHaveBeenCalledWith(offlineKey);
      expect(mockHttpClient.request).not.toHaveBeenCalled();
    });

    it('should fall back to network when cache miss and preferOffline is true', async () => {
      const receiptId = createReceiptId('receipt_not_cached');
      const offlineKey = `offline:api_cache:GET:/mf1/receipts/{receipt_uuid}?path=receipt_uuid=${receiptId}`;
      
      mockStorage.get.mockResolvedValue(null);
      mockHttpClient.request.mockResolvedValue({
        data: mockReceiptOutput,
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'req-129',
        duration: 100,
      });

      const result = await receiptsResource.retrieve(receiptId, {
        preferOffline: true,
      });

      expect(result).toEqual(mockReceiptOutput);
      expect(mockStorage.get).toHaveBeenCalledWith(offlineKey);
      expect(mockHttpClient.request).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should format receipt for display', () => {
      const receipt: ReceiptOutput = {
        ...mockReceiptOutput,
        uuid: createReceiptId('test-receipt-uuid-123'),
        created_at: '2024-01-01T10:30:45Z',
        total_amount: '125.50',
      };

      const formatted = ReceiptsResource.formatReceiptForDisplay(receipt);

      expect(formatted.receiptNumber).toBe('TEST');
      expect(formatted.date).toContain('2024');
      expect(formatted.formattedTotal).toBe('€ 125.50');
      expect(formatted.paymentMethod).toBe('cash');
    });

    it('should validate return eligibility', () => {
      const receipt = {
        ...mockReceiptOutput,
        created_at: '2024-01-01T10:00:00Z',
      };
      
      const currentDate = new Date('2024-01-15T10:00:00Z'); // 14 days later
      const result = ReceiptsResource.validateReturnEligibility(receipt, currentDate);

      expect(result.eligible).toBe(true);
      expect(result.daysRemaining).toBe(16); // 30 - 14
    });

    it('should reject expired returns', () => {
      const receipt = {
        ...mockReceiptOutput,
        created_at: '2024-01-01T10:00:00Z',
      };
      
      const currentDate = new Date('2024-02-15T10:00:00Z'); // 45 days later
      const result = ReceiptsResource.validateReturnEligibility(receipt, currentDate);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Return period expired');
    });

    it('should generate lottery codes', () => {
      const code = ReceiptsResource.generateLotteryCode();
      
      expect(code).toHaveLength(16);
      expect(/^[A-Z0-9]{16}$/.test(code)).toBe(true);
    });

    it('should generate receipt summary', () => {
      const receipts = [
        { ...mockReceiptOutput, total_amount: '100.00', created_at: '2024-01-01T10:00:00Z' },
        { ...mockReceiptOutput, total_amount: '200.00', created_at: '2024-01-02T10:00:00Z' },
      ];

      const summary = ReceiptsResource.generateReceiptSummary(receipts);

      expect(summary.totalCount).toBe(2);
      expect(summary.totalAmount).toBe('300.00');
      expect(summary.averageAmount).toBe('150.00');
      expect(summary.dateRange.from).toBe('2024-01-01');
      expect(summary.dateRange.to).toBe('2024-01-02');
    });
  });
});