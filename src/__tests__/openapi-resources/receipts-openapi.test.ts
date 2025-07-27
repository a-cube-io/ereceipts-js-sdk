/**
 * Integration tests for ReceiptsResource - OpenAPI Implementation
 * Tests for the new OpenAPI-based receipts resource
 */

import { ReceiptsResource } from '@/resources/receipts';
import { HttpClient, DEFAULT_HTTP_CONFIG } from '@/http/client';
import { ValidationError } from '@/errors/index';
import { TestDataFactory, MockResponses, HttpTestHelpers } from '../setup';

import type { 
  ReceiptInput, 
  ReceiptOutput, 
  ReceiptPage,
  ReceiptListParams,
  ReceiptValidationOptions
} from '@/resources/receipts';

describe('ReceiptsResource - OpenAPI Implementation', () => {
  let receiptsResource: ReceiptsResource;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    });
    receiptsResource = new ReceiptsResource(httpClient);
  });

  describe('list()', () => {
    it('should list receipts with pagination', async () => {
      const mockReceipt: ReceiptOutput = {
        uuid: 'receipt_123456789',
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '10.00',
        document_number: null,
        document_datetime: null,
      };

      const mockReceiptPage: ReceiptPage = MockResponses.paginatedResponse([mockReceipt]);

      HttpTestHelpers.mockFetchSuccess(mockReceiptPage);

      const params: ReceiptListParams = {
        page: 1,
        size: 10,
      };

      const result = await receiptsResource.list(params);

      expect(result).toEqual(mockReceiptPage);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/receipts');
    });

    it('should handle empty pagination parameters', async () => {
      const mockReceipt: ReceiptOutput = {
        uuid: 'receipt_987654321',
        type: 'sale',
        created_at: '2024-01-02T10:00:00Z',
        total_amount: '25.50',
        document_number: null,
        document_datetime: null,
      };

      const mockReceiptPage: ReceiptPage = MockResponses.paginatedResponse([mockReceipt]);

      HttpTestHelpers.mockFetchSuccess(mockReceiptPage);

      const result = await receiptsResource.list();

      expect(result).toEqual(mockReceiptPage);
    });
  });

  describe('create()', () => {
    it('should create a receipt with valid data', async () => {
      const receiptInput: ReceiptInput = TestDataFactory.createReceiptInput();
      
      const createdReceipt: ReceiptOutput = {
        uuid: 'receipt_123456789',
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '10.00',
        document_number: null,
        document_datetime: null,
      };

      HttpTestHelpers.mockFetchSuccess(createdReceipt, 201);

      const result = await receiptsResource.create(receiptInput);

      expect(result).toEqual(createdReceipt);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/receipts', {
        method: 'POST',
        body: JSON.stringify(receiptInput),
      });
    });

    it('should validate receipt items before creation', async () => {
      const invalidReceiptInput: ReceiptInput = {
        ...TestDataFactory.createReceiptInput(),
        items: [], // Empty items should trigger validation error
      };

      const options: ReceiptValidationOptions = { 
        maxReceiptItems: 10,
        validateVATRates: true,
      };

      await expect(
        receiptsResource.create(invalidReceiptInput, options)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate VAT rates when enabled', async () => {
      const receiptWithInvalidVAT: ReceiptInput = {
        ...TestDataFactory.createReceiptInput(),
        items: [{
          ...TestDataFactory.createReceiptItem(),
          vat_rate_code: '99' as any, // Invalid VAT rate
        }],
      };

      const options: ReceiptValidationOptions = { 
        validateVATRates: true,
      };

      await expect(
        receiptsResource.create(receiptWithInvalidVAT, options)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('retrieve()', () => {
    it('should retrieve a receipt by UUID', async () => {
      const receiptId = 'receipt_123456789';
      
      const mockReceipt: ReceiptOutput = {
        uuid: receiptId,
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '10.00',
        document_number: null,
        document_datetime: null,
      };

      HttpTestHelpers.mockFetchSuccess(mockReceipt);

      const result = await receiptsResource.retrieve(receiptId);

      expect(result).toEqual(mockReceipt);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/receipts/${receiptId}`);
    });

    it('should handle not found errors', async () => {
      const receiptId = 'nonexistent_receipt';
      
      HttpTestHelpers.mockFetchError(404);

      await expect(
        receiptsResource.retrieve(receiptId)
      ).rejects.toThrow();
    });
  });

  describe('void()', () => {
    it('should void a receipt', async () => {
      const voidRequest = {
        pem_id: 'E001-000001',
        items: [TestDataFactory.createReceiptItem()],
        document_number: '0001-0001',
      };

      const voidedReceipt: ReceiptOutput = {
        uuid: 'receipt_voided_123',
        type: 'void',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '10.00',
        document_number: voidRequest.document_number,
        document_datetime: null,
      };

      HttpTestHelpers.mockFetchSuccess(voidedReceipt, 201);

      const result = await receiptsResource.void(voidRequest);

      expect(result).toEqual(voidedReceipt);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/receipts/return', {
        method: 'POST',
        body: JSON.stringify(voidRequest),
      });
    });
  });

  describe('voidWithProof()', () => {
    it('should void a receipt with proof', async () => {
      const voidWithProofRequest = {
        items: [TestDataFactory.createReceiptItem()],
        proof: 'POS' as const,
        document_datetime: '2024-03-20T10:00:00',
      };

      const voidedReceipt: ReceiptOutput = {
        uuid: 'receipt_voided_with_proof_123',
        type: 'void',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '10.00',
        document_number: null,
        document_datetime: voidWithProofRequest.document_datetime,
      };

      HttpTestHelpers.mockFetchSuccess(voidedReceipt, 201);

      const result = await receiptsResource.voidWithProof(voidWithProofRequest);

      expect(result).toEqual(voidedReceipt);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/receipts/return-with-proof', {
        method: 'POST',
        body: JSON.stringify(voidWithProofRequest),
      });
    });
  });

  describe('getDetails()', () => {
    it('should get receipt details in JSON format', async () => {
      const receiptId = 'receipt_123456789';
      const mockDetails = {
        uuid: receiptId,
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '10.00',
        document_number: null,
        document_datetime: null,
        items: [TestDataFactory.createReceiptItem()],
      };

      HttpTestHelpers.mockFetchSuccess(mockDetails);

      const result = await receiptsResource.getDetails(receiptId, 'json');

      expect(result).toEqual(mockDetails);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/receipts/${receiptId}/details`, {
        headers: { Accept: 'application/json' },
      });
    });

    it('should get receipt details in PDF format', async () => {
      const receiptId = 'receipt_123456789';
      const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

      HttpTestHelpers.mockFetchSuccess(mockPdfBlob);

      const result = await receiptsResource.getDetails(receiptId, 'pdf');

      expect(result).toEqual(mockPdfBlob);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith(`/mf1/receipts/${receiptId}/details`, {
        headers: { Accept: 'application/pdf' },
      });
    });
  });

  describe('returnItems()', () => {
    it('should return items from a receipt', async () => {
      const returnRequest = {
        pem_id: 'E001-000001',
        items: [TestDataFactory.createReceiptItem()],
        document_number: '0001-0001',
      };

      const returnReceipt: ReceiptOutput = {
        uuid: 'receipt_return_123',
        type: 'return',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '-10.00',
        document_number: returnRequest.document_number,
        document_datetime: null,
      };

      HttpTestHelpers.mockFetchSuccess(returnReceipt, 201);

      const result = await receiptsResource.returnItems(returnRequest);

      expect(result).toEqual(returnReceipt);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/receipts/return', {
        method: 'POST',
        body: JSON.stringify(returnRequest),
      });
    });
  });

  describe('returnItemsWithProof()', () => {
    it('should return items with proof', async () => {
      const returnWithProofRequest = {
        items: [TestDataFactory.createReceiptItem()],
        proof: 'POS' as const,
        document_datetime: '2024-03-20T10:00:00',
      };

      const returnReceipt: ReceiptOutput = {
        uuid: 'receipt_return_with_proof_123',
        type: 'return',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: '-10.00',
        document_number: null,
        document_datetime: returnWithProofRequest.document_datetime,
      };

      HttpTestHelpers.mockFetchSuccess(returnReceipt, 201);

      const result = await receiptsResource.returnItemsWithProof(returnWithProofRequest);

      expect(result).toEqual(returnReceipt);
      HttpTestHelpers.expectFetchToHaveBeenCalledWith('/mf1/receipts/return-with-proof', {
        method: 'POST',
        body: JSON.stringify(returnWithProofRequest),
      });
    });
  });

  describe('calculateTotalAmount()', () => {
    it('should calculate receipt totals correctly', () => {
      const receiptInput: ReceiptInput = TestDataFactory.createReceiptInput({
        items: [
          {
            ...TestDataFactory.createReceiptItem(),
            quantity: '2.00',
            unit_price: '10.00',
            vat_rate_code: '22',
            discount: '1.00',
          },
        ],
        discount: '2.00',
      });

      const result = receiptsResource.calculateTotalAmount(receiptInput);

      expect(result.subtotal).toBe('17.00'); // (2 * 10) - 1 - 2
      expect(result.vatAmount).toBe('4.18'); // 19 * 0.22
      expect(result.totalAmount).toBe('21.18'); // 17 + 4.18
      expect(result.discountAmount).toBe('3.00'); // 1 + 2
      expect(result.itemCount).toBe(1);
    });

    it('should handle multiple VAT rates', () => {
      const receiptInput: ReceiptInput = TestDataFactory.createReceiptInput({
        items: [
          {
            ...TestDataFactory.createReceiptItem(),
            quantity: '1.00',
            unit_price: '10.00',
            vat_rate_code: '22',
          },
          {
            ...TestDataFactory.createReceiptItem(),
            quantity: '1.00',
            unit_price: '5.00',
            vat_rate_code: '10',
          },
        ],
      });

      const result = receiptsResource.calculateTotalAmount(receiptInput);

      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown.find((b: any) => b.vatRate === '22')).toMatchObject({
        netAmount: '10.00',
        vatAmount: '2.20',
        grossAmount: '12.20',
      });
      expect(result.breakdown.find((b: any) => b.vatRate === '10')).toMatchObject({
        netAmount: '5.00',
        vatAmount: '0.50',
        grossAmount: '5.50',
      });
    });
  });

  describe('Static utility methods', () => {
    describe('formatReceiptForDisplay()', () => {
      it('should format receipt for display', () => {
        const receipt: ReceiptOutput = {
          uuid: 'receipt_123456789',
          type: 'sale',
          created_at: '2024-01-01T10:00:00Z',
          total_amount: '10.00',
          document_number: null,
          document_datetime: null,
        };

        const result = ReceiptsResource.formatReceiptForDisplay(receipt);

        expect(result).toMatchObject({
          receiptNumber: expect.stringMatching(/^[A-Z0-9]+$/),
          date: expect.any(String),
          time: expect.any(String),
          formattedTotal: '€ 10.00',
          paymentMethod: 'cash',
          itemSummary: '0 items',
        });
      });
    });

    describe('generateReceiptSummary()', () => {
      it('should generate summary for multiple receipts', () => {
        const receipts: ReceiptOutput[] = [
          {
            uuid: 'receipt_123456789',
            type: 'sale',
            created_at: '2024-01-01T10:00:00Z',
            total_amount: '10.00',
            document_number: null,
            document_datetime: null,
          },
          {
            uuid: 'receipt_987654321',
            type: 'sale',
            created_at: '2024-01-01T11:00:00Z',
            total_amount: '25.50',
            document_number: null,
            document_datetime: null,
          },
        ];

        const result = ReceiptsResource.generateReceiptSummary(receipts);

        expect(result).toMatchObject({
          totalCount: 2,
          totalAmount: '35.50',
          vatAmount: expect.any(String),
          averageAmount: expect.any(String),
          paymentMethodBreakdown: expect.any(Object),
        });
      });
    });

    describe('validateReturnEligibility()', () => {
      it('should validate return eligibility within period', () => {
        const receipt: ReceiptOutput = {
          uuid: 'receipt_123456789',
          type: 'sale',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          total_amount: '10.00',
          document_number: null,
          document_datetime: null,
        };

        const result = ReceiptsResource.validateReturnEligibility(receipt);

        expect(result).toMatchObject({
          eligible: true,
          daysRemaining: expect.any(Number),
        });
        expect(result.daysRemaining).toBeGreaterThan(0);
      });

      it('should reject returns after period expiry', () => {
        const receipt: ReceiptOutput = {
          uuid: 'receipt_123456789',
          type: 'sale',
          created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
          total_amount: '10.00',
          document_number: null,
          document_datetime: null,
        };

        const result = ReceiptsResource.validateReturnEligibility(receipt);

        expect(result).toMatchObject({
          eligible: false,
          reason: expect.stringContaining('Return period expired'),
        });
      });
    });

    describe('generateLotteryCode()', () => {
      it('should generate valid lottery code', () => {
        const code = ReceiptsResource.generateLotteryCode();

        expect(code).toMatch(/^[A-Z0-9]{16}$/);
        expect(code).toHaveLength(16);
      });

      it('should generate unique codes', () => {
        const codes = Array.from({ length: 10 }, () => ReceiptsResource.generateLotteryCode());
        const uniqueCodes = new Set(codes);

        expect(uniqueCodes.size).toBe(10);
      });
    });
  });
});