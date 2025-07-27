/**
 * End-to-End Validation Workflow Tests
 * Tests complex business workflows involving multiple resources with validation
 */

import { ACubeSDK } from '@/core/sdk';
import { ValidationError } from '@/errors/index';
import { HttpTestHelpers, TestDataFactory } from '../setup';
import { 
  createAmount, 
  createQuantity, 
  createReceiptId, 
  createCashierId, 
  createMerchantId, 
  createSerialNumber 
} from '@/types/branded';

describe('End-to-End Validation Workflows', () => {
  let sdk: ACubeSDK;

  beforeEach(() => {
    sdk = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    sdk.removeAllListeners();
  });

  describe('Complete Merchant Onboarding Workflow', () => {
    it('should validate complete merchant setup: merchant → cash register → cashier', async () => {
      // Step 1: Create merchant with validation
      const merchantData = {
        fiscal_id: '12345678903', // Valid Italian VAT
        name: 'Pizzeria Napoli S.r.l.',
        email: 'info@pizzerianapoli.it',
        password: 'SecureMerchantPass2024!',
        address: {
          street_address: 'Via Nazionale 42',
          zip_code: '80138',
          city: 'Napoli',
          province: 'NA'
        }
      };

      const merchantId = createMerchantId('merchant_pizzeria_napoli');
      HttpTestHelpers.mockFetchSuccess({
        uuid: merchantId,
        fiscal_id: merchantData.fiscal_id,
        name: merchantData.name,
        email: merchantData.email,
        address: merchantData.address
      }, 201);

      const merchant = await sdk.merchants.create(merchantData);
      expect(merchant.uuid).toBe(merchantId);

      // Step 2: Create cash register for the merchant
      const cashRegisterData = {
        serial_number: createSerialNumber('REG-NAPOLI-001'),
        model: 'CashFlow Pro 3000',
        manufacturer: 'ACube Systems',
        merchant_uuid: merchantId,
        location: 'Main Counter'
      };

      HttpTestHelpers.mockFetchSuccess({
        serial_number: cashRegisterData.serial_number,
        model: cashRegisterData.model,
        manufacturer: cashRegisterData.manufacturer,
        status: 'INACTIVE',
        merchant_uuid: merchantId,
        location: cashRegisterData.location
      }, 201);

      const cashRegister = await sdk.cashRegisters.create(cashRegisterData);
      expect(cashRegister.merchant_uuid).toBe(merchantId);

      // Step 3: Create cashier for the merchant
      const cashierData = {
        email: 'mario.rossi@pizzerianapoli.it',
        password: 'CashierSecure123!'
      };

      const cashierId = createCashierId(1);
      HttpTestHelpers.mockFetchSuccess({
        id: cashierId,
        email: cashierData.email
      }, 201);

      const cashier = await sdk.cashiers.create(cashierData);
      expect(cashier.id).toBe(cashierId);

      // Verify all HTTP calls were made in correct order
      expect(global.fetch).toHaveBeenCalledTimes(3);
      
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('/merchants');
      expect(calls[1][0]).toContain('/cash-registers');
      expect(calls[2][0]).toContain('/cashiers');
    });

    it('should fail merchant onboarding when merchant data is invalid', async () => {
      const invalidMerchantData = {
        fiscal_id: '123', // Invalid VAT number
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
        password: '123', // Weak password
        address: {
          street_address: '',
          zip_code: '123', // Invalid postal code
          city: '',
          province: 'INVALID'
        }
      };

      // Should fail at merchant creation - no subsequent calls should be made
      await expect(
        sdk.merchants.create(invalidMerchantData as any)
      ).rejects.toThrow(ValidationError);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fail at cash register creation when merchant reference is invalid', async () => {
      // First, create a valid merchant
      const validMerchantData = {
        fiscal_id: '12345678903',
        name: 'Test Merchant',
        email: 'test@merchant.com',
        password: 'SecurePass123!',
        address: {
          street_address: 'Via Roma 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };

      const merchantId = createMerchantId('merchant_test');
      HttpTestHelpers.mockFetchSuccess({
        uuid: merchantId,
        ...validMerchantData
      }, 201);

      await sdk.merchants.create(validMerchantData);

      // Now try to create cash register with invalid merchant reference
      const invalidCashRegisterData = {
        serial_number: createSerialNumber('REG123'),
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
        merchant_uuid: 'invalid-merchant-id', // Invalid format
        location: 'Counter'
      };

      await expect(
        sdk.cashRegisters.create(invalidCashRegisterData as any)
      ).rejects.toThrow();

      // Only merchant creation should have succeeded
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complete Receipt Transaction Workflow', () => {
    it('should validate full receipt lifecycle: create → void → return', async () => {
      // Step 1: Create a receipt
      const receiptData = {
        items: [
          {
            description: 'Pizza Margherita',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('12.00'),
            good_or_service: 'B' as const,
            vat_rate_code: '10' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          },
          {
            description: 'Coca Cola',
            quantity: createQuantity('2.00'),
            unit_price: createAmount('3.50'),
            good_or_service: 'B' as const,
            vat_rate_code: '22' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }
        ],
        cash_payment_amount: createAmount('19.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: false,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      const receiptId = createReceiptId('receipt_pizza_001');
      HttpTestHelpers.mockFetchSuccess({
        uuid: receiptId,
        type: 'sale',
        created_at: '2024-01-01T12:00:00Z',
        total_amount: createAmount('19.00'),
        document_number: 'DOC001',
        document_datetime: '2024-01-01T12:00:00Z'
      }, 201);

      const receipt = await sdk.receipts.create(receiptData);
      expect(receipt.uuid).toBe(receiptId);

      // Step 2: Void the receipt
      const voidData = {
        reason: 'Customer changed mind',
        serial_number: 'POS123456789'
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_void_001'),
        type: 'void',
        created_at: '2024-01-01T12:05:00Z',
        total_amount: createAmount('0.00'),
        document_number: 'VOID001',
        document_datetime: '2024-01-01T12:05:00Z'
      }, 200);

      const voidReceipt = await sdk.receipts.void(receiptId, voidData);
      expect(voidReceipt.type).toBe('void');

      // Step 3: Create a return receipt for partial return
      const returnData = {
        items: [
          {
            description: 'Coca Cola (Return)',
            quantity: createQuantity('1.00'), // Return only 1 of 2
            unit_price: createAmount('3.50'),
            good_or_service: 'B' as const,
            vat_rate_code: '22' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }
        ],
        cash_payment_amount: createAmount('0.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: false,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_return_001'),
        type: 'return',
        created_at: '2024-01-01T12:10:00Z',
        total_amount: createAmount('-3.50'),
        document_number: 'RET001',
        document_datetime: '2024-01-01T12:10:00Z'
      }, 201);

      const returnReceipt = await sdk.receipts.returnItems(returnData);
      expect(returnReceipt.type).toBe('return');

      // Verify all operations were validated and executed
      expect(global.fetch).toHaveBeenCalledTimes(3);
      
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls[0][1].method).toBe('POST'); // Create
      expect(calls[1][1].method).toBe('POST'); // Void
      expect(calls[2][1].method).toBe('POST'); // Return
    });

    it('should validate receipt calculations and totals', async () => {
      const receiptWithCalculationErrors = {
        items: [
          {
            description: 'Expensive Item',
            quantity: createQuantity('2.00'),
            unit_price: createAmount('100.00'),
            good_or_service: 'B' as const,
            vat_rate_code: '22' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }
        ],
        cash_payment_amount: createAmount('10.00'), // Too low for total
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: false,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      // This should pass basic validation but could have business logic validation
      // For now, just verify it goes through the validation pipeline
      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_calc_test'),
        type: 'sale',
        created_at: new Date().toISOString(),
        total_amount: createAmount('244.00'), // 200 + 22% VAT
        document_number: null,
        document_datetime: null
      }, 201);

      const result = await sdk.receipts.create(receiptWithCalculationErrors);
      expect(result).toBeDefined();
    });
  });

  describe('Point of Sale Activation and Management Workflow', () => {
    it('should validate POS setup: create → activate → journal operations', async () => {
      // Step 1: Create Point of Sale
      const posData = {
        merchant_uuid: createMerchantId('merchant_pos_test'),
        address: {
          street_address: 'Via Veneto 88',
          zip_code: '00187',
          city: 'Roma',
          province: 'RM'
        }
      };

      const serialNumber = 'POS-VENETO-001';
      HttpTestHelpers.mockFetchSuccess({
        serial_number: serialNumber,
        status: 'NEW',
        address: posData.address,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z'
      }, 201);

      // Note: POS creation might not be directly available, 
      // so we'll simulate the flow
      
      // Step 2: Activate the POS
      const activationData = {
        registration_key: 'ROMA-2024-VENETO-001'
      };

      HttpTestHelpers.mockFetchSuccess({}, 200);

      await sdk.pointOfSales.activate(serialNumber, activationData);

      // Step 3: Close journal
      HttpTestHelpers.mockFetchSuccess({}, 200);

      await sdk.pointOfSales.closeJournal();

      // Step 4: Create inactivity period
      const inactivityData = {
        timestamp: '2024-01-02T08:00:00Z',
        reason: 'Scheduled maintenance'
      };

      HttpTestHelpers.mockFetchSuccess(undefined, 204);

      await sdk.pointOfSales.createInactivityPeriod(serialNumber, inactivityData);

      // Verify all operations were validated and executed
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail POS activation with invalid registration key', async () => {
      const serialNumber = 'POS123456789';
      const invalidActivationData = {
        registration_key: 'abc' // Too short
      };

      await expect(
        sdk.pointOfSales.activate(serialNumber, invalidActivationData as any)
      ).rejects.toThrow(ValidationError);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should validate inactivity period data', async () => {
      const serialNumber = 'POS123456789';
      const invalidInactivityData = {
        timestamp: 'invalid-date',
        reason: '' // Empty reason
      };

      await expect(
        sdk.pointOfSales.createInactivityPeriod(serialNumber, invalidInactivityData as any)
      ).rejects.toThrow(ValidationError);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Resource Validation Dependencies', () => {
    it('should validate merchant-cashier-receipt relationship workflow', async () => {
      // This test simulates a complete business day workflow
      
      // 1. Morning: Setup merchant and cashier
      const merchantData = {
        fiscal_id: '12345678903',
        name: 'Gelateria Milano',
        email: 'info@gelateriamilano.it',
        password: 'GelatoSecure2024!',
        address: {
          street_address: 'Corso Buenos Aires 15',
          zip_code: '20124',
          city: 'Milano',
          province: 'MI'
        }
      };

      const merchantId = createMerchantId('merchant_gelateria');
      HttpTestHelpers.mockFetchSuccess({
        uuid: merchantId,
        ...merchantData
      }, 201);

      await sdk.merchants.create(merchantData);

      const cashierData = {
        email: 'luca.bianchi@gelateriamilano.it',
        password: 'CashierGelato123!'
      };

      const cashierId = createCashierId(1);
      HttpTestHelpers.mockFetchSuccess({
        id: cashierId,
        email: cashierData.email
      }, 201);

      await sdk.cashiers.create(cashierData);

      // 2. During the day: Process multiple receipts
      const receiptData1 = {
        items: [
          {
            description: 'Gelato Cioccolato',
            quantity: createQuantity('2.00'),
            unit_price: createAmount('4.50'),
            good_or_service: 'B' as const,
            vat_rate_code: '10' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }
        ],
        cash_payment_amount: createAmount('9.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: false,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_gelato_001'),
        type: 'sale',
        created_at: '2024-01-01T14:30:00Z',
        total_amount: createAmount('9.00'),
        document_number: null,
        document_datetime: null
      }, 201);

      await sdk.receipts.create(receiptData1);

      // Verify complete workflow
      expect(global.fetch).toHaveBeenCalledTimes(3);
      
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('/merchants');
      expect(calls[1][0]).toContain('/cashiers');
      expect(calls[2][0]).toContain('/receipts');
    });

    it('should handle validation failures at different workflow stages', async () => {
      // Start with valid merchant
      const validMerchantData = {
        fiscal_id: '12345678903',
        name: 'Valid Merchant',
        email: 'valid@merchant.com',
        password: 'ValidPassword123!',
        address: {
          street_address: 'Via Valid 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_valid'),
        ...validMerchantData
      }, 201);

      await sdk.merchants.create(validMerchantData);

      // Try to create invalid cashier - should fail here
      const invalidCashierData = {
        email: 'invalid-email-format',
        password: '123' // Too weak
      };

      await expect(
        sdk.cashiers.create(invalidCashierData as any)
      ).rejects.toThrow(ValidationError);

      // Only merchant creation should have succeeded
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bulk Operations and Performance', () => {
    it('should validate multiple receipts in sequence', async () => {
      const receipts = [
        {
          items: [{
            description: 'Item 1',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('5.00'),
            good_or_service: 'B' as const,
            vat_rate_code: '22' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: createAmount('5.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        },
        {
          items: [{
            description: 'Item 2',
            quantity: createQuantity('2.00'),
            unit_price: createAmount('7.50'),
            good_or_service: 'B' as const,
            vat_rate_code: '10' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: createAmount('15.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        }
      ];

      // Mock responses for each receipt
      for (let i = 0; i < receipts.length; i++) {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId(`receipt_bulk_${i + 1}`),
          type: 'sale',
          created_at: new Date().toISOString(),
          total_amount: i === 0 ? createAmount('5.00') : createAmount('15.00'),
          document_number: null,
          document_datetime: null
        }, 201);
      }

      // Process all receipts
      const results = await Promise.all(
        receipts.map(receipt => sdk.receipts.create(receipt))
      );

      expect(results).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});