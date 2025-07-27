/**
 * End-to-End Validation Performance Tests
 * Tests validation system performance and optimization
 */

import { ACubeSDK } from '@/core/sdk';
import { ValidationError } from '@/errors/index';
import { HttpTestHelpers, TestDataFactory } from '../setup';
import { 
  createAmount, 
  createQuantity, 
  createReceiptId, 
  createCashierId, 
  createMerchantId 
} from '@/types/branded';

describe('End-to-End Validation Performance', () => {
  let sdk: ACubeSDK;
  let performanceSDK: ACubeSDK;

  beforeEach(() => {
    sdk = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
    });

    // SDK optimized for performance testing
    performanceSDK = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
      httpConfig: {
        enableLogging: false, // Disable logging for performance
        retries: 0 // Disable retries for consistent timing
      }
    });
  });

  afterEach(() => {
    sdk.removeAllListeners();
    performanceSDK.removeAllListeners();
  });

  describe('Single Request Performance', () => {
    it('should validate simple merchant creation within acceptable time', async () => {
      const merchantData = TestDataFactory.createMerchantInput();
      
      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_perf_simple'),
        ...merchantData
      }, 201);

      const startTime = performance.now();
      
      const result = await performanceSDK.merchants.create(merchantData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      
      // Simple validation should complete very quickly (< 10ms)
      expect(duration).toBeLessThan(10);
      console.log(`Simple merchant validation took ${duration.toFixed(2)}ms`);
    });

    it('should validate simple receipt creation within acceptable time', async () => {
      const receiptData = TestDataFactory.createReceiptInput();
      
      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_perf_simple'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('10.00'),
        document_number: null,
        document_datetime: null
      }, 201);

      const startTime = performance.now();
      
      const result = await performanceSDK.receipts.create(receiptData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      
      // Simple receipt validation should complete quickly (< 15ms)
      expect(duration).toBeLessThan(15);
      console.log(`Simple receipt validation took ${duration.toFixed(2)}ms`);
    });

    it('should validate complex receipt with multiple items efficiently', async () => {
      const complexReceiptData = {
        items: Array.from({ length: 20 }, (_, i) => ({
          description: `Complex Item ${i + 1} with detailed description`,
          quantity: createQuantity((Math.random() * 5 + 0.1).toFixed(2)),
          unit_price: createAmount((Math.random() * 50 + 1).toFixed(2)),
          good_or_service: Math.random() > 0.5 ? 'B' as const : 'S' as const,
          vat_rate_code: ['0', '4', '10', '22'][Math.floor(Math.random() * 4)] as any,
          discount: createAmount((Math.random() * 2).toFixed(2)),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: Math.random() > 0.9
        })),
        cash_payment_amount: createAmount('250.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('5.00'),
        invoice_issuing: true,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_perf_complex'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('250.00'),
        document_number: 'COMP001',
        document_datetime: '2024-01-01T10:00:00Z'
      }, 201);

      const validationOptions = {
        validateVATRates: true,
        checkTotalCalculations: true,
        enforceItalianFiscalRules: true,
        maxReceiptItems: 50
      };

      const startTime = performance.now();
      
      const result = await performanceSDK.receipts.create(complexReceiptData, validationOptions);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      
      // Complex validation should still be reasonably fast (< 50ms)
      expect(duration).toBeLessThan(50);
      console.log(`Complex receipt validation (20 items) took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle multiple merchant creations efficiently', async () => {
      const merchantCount = 50;
      const merchants = Array.from({ length: merchantCount }, (_, i) => ({
        ...TestDataFactory.createMerchantInput(),
        name: `Performance Test Merchant ${i + 1}`,
        email: `merchant${i + 1}@performance.test`
      }));

      // Mock responses for all merchants
      merchants.forEach((_, i) => {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId(`merchant_bulk_${i}`),
          ...merchants[i]
        }, 201);
      });

      const startTime = performance.now();
      
      // Process merchants in parallel
      const results = await Promise.all(
        merchants.map(merchant => performanceSDK.merchants.create(merchant))
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / merchantCount;

      expect(results).toHaveLength(merchantCount);
      results.forEach(result => expect(result).toBeDefined());
      
      // Bulk processing should be efficient (< 10ms per merchant on average)
      expect(avgDuration).toBeLessThan(10);
      console.log(`Bulk merchant creation (${merchantCount} merchants) took ${duration.toFixed(2)}ms (${avgDuration.toFixed(2)}ms avg)`);
    });

    it('should handle multiple receipt creations efficiently', async () => {
      const receiptCount = 30;
      const receipts = Array.from({ length: receiptCount }, (_, i) => ({
        ...TestDataFactory.createReceiptInput(),
        items: [{
          description: `Performance Receipt Item ${i + 1}`,
          quantity: createQuantity('1.00'),
          unit_price: createAmount((Math.random() * 20 + 1).toFixed(2)),
          good_or_service: 'B' as const,
          vat_rate_code: '22' as const,
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        }]
      }));

      // Mock responses for all receipts
      receipts.forEach((_, i) => {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId(`receipt_bulk_${i}`),
          type: 'sale',
          created_at: '2024-01-01T10:00:00Z',
          total_amount: createAmount('10.00'),
          document_number: null,
          document_datetime: null
        }, 201);
      });

      const startTime = performance.now();
      
      const results = await Promise.all(
        receipts.map(receipt => performanceSDK.receipts.create(receipt))
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / receiptCount;

      expect(results).toHaveLength(receiptCount);
      
      // Bulk receipt processing should be efficient (< 15ms per receipt on average)
      expect(avgDuration).toBeLessThan(15);
      console.log(`Bulk receipt creation (${receiptCount} receipts) took ${duration.toFixed(2)}ms (${avgDuration.toFixed(2)}ms avg)`);
    });

    it('should handle mixed resource operations efficiently', async () => {
      const operationCount = 20;
      const operations = [];

      // Prepare mixed operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 3 === 0) {
          operations.push({
            type: 'merchant',
            data: { ...TestDataFactory.createMerchantInput(), name: `Mixed Merchant ${i}` }
          });
        } else if (i % 3 === 1) {
          operations.push({
            type: 'receipt',
            data: TestDataFactory.createReceiptInput()
          });
        } else {
          operations.push({
            type: 'cashier',
            data: { ...TestDataFactory.createCashierInput(), email: `cashier${i}@mixed.test` }
          });
        }
      }

      // Mock responses for all operations
      operations.forEach((op, i) => {
        if (op.type === 'merchant') {
          HttpTestHelpers.mockFetchSuccess({
            uuid: createMerchantId(`mixed_merchant_${i}`),
            ...op.data
          }, 201);
        } else if (op.type === 'receipt') {
          HttpTestHelpers.mockFetchSuccess({
            uuid: createReceiptId(`mixed_receipt_${i}`),
            type: 'sale',
            created_at: '2024-01-01T10:00:00Z',
            total_amount: createAmount('10.00'),
            document_number: null,
            document_datetime: null
          }, 201);
        } else {
          HttpTestHelpers.mockFetchSuccess({
            id: createCashierId(i),
            email: op.data.email
          }, 201);
        }
      });

      const startTime = performance.now();
      
      const results = await Promise.all(
        operations.map(async (op) => {
          if (op.type === 'merchant') {
            return performanceSDK.merchants.create(op.data);
          } else if (op.type === 'receipt') {
            return performanceSDK.receipts.create(op.data);
          } else {
            return performanceSDK.cashiers.create(op.data);
          }
        })
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / operationCount;

      expect(results).toHaveLength(operationCount);
      
      // Mixed operations should maintain good performance (< 20ms per operation on average)
      expect(avgDuration).toBeLessThan(20);
      console.log(`Mixed operations (${operationCount} ops) took ${duration.toFixed(2)}ms (${avgDuration.toFixed(2)}ms avg)`);
    });
  });

  describe('Memory Usage and Efficiency', () => {
    it('should not leak memory during repeated validation operations', async () => {
      const iterations = 100;
      const merchantData = TestDataFactory.createMerchantInput();

      // Mock response for all iterations
      for (let i = 0; i < iterations; i++) {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId(`memory_test_${i}`),
          ...merchantData
        }, 201);
      }

      // Measure initial memory if available
      const initialMemory = typeof process !== 'undefined' && process.memoryUsage ? 
        process.memoryUsage().heapUsed : 0;

      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        await performanceSDK.merchants.create({
          ...merchantData,
          name: `Memory Test Merchant ${i}`,
          email: `memory${i}@test.com`
        });
      }

      // Measure final memory if available
      const finalMemory = typeof process !== 'undefined' && process.memoryUsage ? 
        process.memoryUsage().heapUsed : 0;

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePerOp = memoryIncrease / iterations;
        
        // Memory increase should be reasonable (< 1KB per operation)
        expect(memoryIncreasePerOp).toBeLessThan(1024);
        console.log(`Memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB total, ${(memoryIncreasePerOp / 1024).toFixed(2)}KB per operation`);
      }

      expect(global.fetch).toHaveBeenCalledTimes(iterations);
    });

    it('should efficiently handle large data structures', async () => {
      const largeReceiptData = {
        items: Array.from({ length: 200 }, (_, i) => ({
          description: `Large Receipt Item ${i + 1} `.repeat(10), // Longer descriptions
          quantity: createQuantity('1.00'),
          unit_price: createAmount('1.00'),
          good_or_service: 'B' as const,
          vat_rate_code: '22' as const,
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        })),
        cash_payment_amount: createAmount('244.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: true,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_large_structure'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('244.00'),
        document_number: 'LARGE001',
        document_datetime: '2024-01-01T10:00:00Z'
      }, 201);

      const startTime = performance.now();
      
      const result = await performanceSDK.receipts.create(largeReceiptData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      
      // Large data structure validation should still be reasonable (< 100ms)
      expect(duration).toBeLessThan(100);
      console.log(`Large receipt validation (200 items) took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Validation Error Performance', () => {
    it('should handle validation errors efficiently', async () => {
      const invalidData = {
        fiscal_id: '', // Multiple validation errors
        name: '',
        email: 'invalid-email',
        password: '123',
        address: {
          street_address: '',
          zip_code: '1',
          city: '',
          province: 'INVALID'
        }
      };

      const iterations = 50;
      const durations: number[] = [];

      // Test repeated validation errors
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        try {
          await performanceSDK.merchants.create(invalidData as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
        
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      // Validation errors should be fast to generate (< 5ms average, < 15ms max)
      expect(avgDuration).toBeLessThan(5);
      expect(maxDuration).toBeLessThan(15);
      
      console.log(`Validation error generation: ${avgDuration.toFixed(2)}ms avg, ${maxDuration.toFixed(2)}ms max`);
      
      // No HTTP calls should have been made
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should efficiently validate and reject complex invalid receipts', async () => {
      const complexInvalidReceipt = {
        items: Array.from({ length: 50 }, (_, i) => ({
          description: '', // Invalid: empty description
          quantity: createQuantity('0.00'), // Invalid: zero quantity
          unit_price: createAmount('-1.00'), // Invalid: negative price
          good_or_service: 'B' as const,
          vat_rate_code: '99' as const, // Invalid: non-existent VAT rate
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        })),
        cash_payment_amount: createAmount('0.00'), // Invalid: no payment
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: false,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      const validationOptions = {
        validateVATRates: true,
        checkTotalCalculations: true,
        enforceItalianFiscalRules: true,
        maxReceiptItems: 100
      };

      const startTime = performance.now();
      
      try {
        await performanceSDK.receipts.create(complexInvalidReceipt as any, validationOptions);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        
        // Should have many validation errors (one for each invalid item field plus general errors)
        expect(validationError.violations.length).toBeGreaterThan(100);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Complex validation should still be fast even with many errors (< 30ms)
      expect(duration).toBeLessThan(30);
      console.log(`Complex invalid receipt validation (50 invalid items) took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Validation Performance', () => {
    it('should handle concurrent validation requests efficiently', async () => {
      const concurrentRequests = 20;
      const merchants = Array.from({ length: concurrentRequests }, (_, i) => ({
        ...TestDataFactory.createMerchantInput(),
        name: `Concurrent Merchant ${i}`,
        email: `concurrent${i}@test.com`
      }));

      // Mock responses for all concurrent requests
      merchants.forEach((merchant, i) => {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId(`concurrent_${i}`),
          ...merchant
        }, 201);
      });

      const startTime = performance.now();
      
      // Execute all requests concurrently
      const results = await Promise.all(
        merchants.map(merchant => performanceSDK.merchants.create(merchant))
      );
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDurationPerRequest = totalDuration / concurrentRequests;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => expect(result).toBeDefined());

      // Concurrent requests should benefit from parallelization
      // Average time per request should be much less than sequential processing
      expect(avgDurationPerRequest).toBeLessThan(20);
      console.log(`${concurrentRequests} concurrent requests took ${totalDuration.toFixed(2)}ms total (${avgDurationPerRequest.toFixed(2)}ms avg per request)`);
    });

    it('should maintain validation quality under concurrent load', async () => {
      const validRequests = 10;
      const invalidRequests = 10;
      
      const validMerchants = Array.from({ length: validRequests }, (_, i) => ({
        ...TestDataFactory.createMerchantInput(),
        name: `Valid Concurrent ${i}`,
        email: `valid${i}@concurrent.test`
      }));
      
      const invalidMerchants = Array.from({ length: invalidRequests }, (_, i) => ({
        fiscal_id: '123', // Invalid
        name: '',
        email: 'invalid',
        password: '123'
      }));

      // Mock responses only for valid requests
      validMerchants.forEach((merchant, i) => {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId(`valid_concurrent_${i}`),
          ...merchant
        }, 201);
      });

      const allRequests = [
        ...validMerchants.map(merchant => ({ type: 'valid', data: merchant })),
        ...invalidMerchants.map(merchant => ({ type: 'invalid', data: merchant }))
      ];

      // Shuffle requests to simulate real concurrent load
      const shuffled = allRequests.sort(() => Math.random() - 0.5);

      const startTime = performance.now();
      
      const results = await Promise.allSettled(
        shuffled.map(async req => {
          if (req.type === 'valid') {
            return await performanceSDK.merchants.create(req.data);
          } else {
            return await performanceSDK.merchants.create(req.data as any);
          }
        })
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Check results
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(validRequests);
      expect(failed).toHaveLength(invalidRequests);

      // All failures should be ValidationErrors
      failed.forEach(result => {
        expect(result.reason).toBeInstanceOf(ValidationError);
      });

      console.log(`Concurrent mixed validation (${validRequests} valid, ${invalidRequests} invalid) took ${duration.toFixed(2)}ms`);
      
      // Only valid requests should have made HTTP calls
      expect(global.fetch).toHaveBeenCalledTimes(validRequests);
    });
  });
});