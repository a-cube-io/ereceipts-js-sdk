import {
  ReceiptInput,
  ReceiptItem,
  ReceiptListParams,
  ReceiptReturnInput,
  ReceiptReturnItem,
  VoidReceiptInput,
} from '@/domain/entities/receipt.entity';

import {
  ReceiptApiOutput,
  ReceiptDetailsApiOutput,
  ReceiptMapper,
  ReturnableReceiptItemApiOutput,
} from '../receipt.dto';

describe('ReceiptMapper', () => {
  describe('itemToApiInput', () => {
    it('should map all item fields with values to snake_case', () => {
      const item: ReceiptItem = {
        type: 'goods',
        quantity: '2',
        description: 'Test Item',
        unitPrice: '10.5',
        vatRateCode: '22.00',
        simplifiedVatAllocation: true,
        discount: '1',
        isDownPaymentOrVoucherRedemption: false,
        complimentary: false,
      };

      const result = ReceiptMapper.itemToApiInput(item);

      expect(result).toEqual({
        type: 'goods',
        quantity: '2.00',
        description: 'Test Item',
        unit_price: '10.50',
        vat_rate_code: '22.00',
        simplified_vat_allocation: true,
        discount: '1.00',
        is_down_payment_or_voucher_redemption: false,
        complimentary: false,
      });
    });

    it('should preserve undefined for optional fields', () => {
      const item: ReceiptItem = {
        quantity: '1',
        description: 'Minimal Item',
        unitPrice: '5',
      };

      const result = ReceiptMapper.itemToApiInput(item);

      expect(result.type).toBeUndefined();
      expect(result.vat_rate_code).toBeUndefined();
      expect(result.simplified_vat_allocation).toBeUndefined();
      expect(result.discount).toBeUndefined();
      expect(result.is_down_payment_or_voucher_redemption).toBeUndefined();
      expect(result.complimentary).toBeUndefined();
    });

    it('should format quantity and unit_price to 2 decimal places', () => {
      const item: ReceiptItem = {
        quantity: '3',
        description: 'Test',
        unitPrice: '7.5',
      };

      const result = ReceiptMapper.itemToApiInput(item);

      expect(result.quantity).toBe('3.00');
      expect(result.unit_price).toBe('7.50');
    });
  });

  describe('toApiInput', () => {
    it('should map all receipt input fields to snake_case', () => {
      const input: ReceiptInput = {
        items: [
          {
            quantity: '1',
            description: 'Item 1',
            unitPrice: '20',
          },
        ],
        customerTaxCode: 'TAX123',
        customerLotteryCode: undefined,
        discount: '5',
        invoiceIssuing: true,
        uncollectedDcrToSsn: false,
        servicesUncollectedAmount: '10',
        goodsUncollectedAmount: '20',
        cashPaymentAmount: '100',
        electronicPaymentAmount: '50',
        ticketRestaurantPaymentAmount: '25',
        ticketRestaurantQuantity: 2,
      };

      const result = ReceiptMapper.toApiInput(input);

      expect(result.items).toHaveLength(1);
      expect(result.customer_tax_code).toBe('TAX123');
      expect(result.customer_lottery_code).toBeUndefined();
      expect(result.discount).toBe('5.00');
      expect(result.invoice_issuing).toBe(true);
      expect(result.uncollected_dcr_to_ssn).toBe(false);
      expect(result.services_uncollected_amount).toBe('10.00');
      expect(result.goods_uncollected_amount).toBe('20.00');
      expect(result.cash_payment_amount).toBe('100.00');
      expect(result.electronic_payment_amount).toBe('50.00');
      expect(result.ticket_restaurant_payment_amount).toBe('25.00');
      expect(result.ticket_restaurant_quantity).toBe(2);
    });

    it('should preserve undefined for optional payment fields', () => {
      const input: ReceiptInput = {
        items: [{ quantity: '1', description: 'Test', unitPrice: '10' }],
        cashPaymentAmount: '10',
      };

      const result = ReceiptMapper.toApiInput(input);

      expect(result.electronic_payment_amount).toBeUndefined();
      expect(result.ticket_restaurant_payment_amount).toBeUndefined();
      expect(result.ticket_restaurant_quantity).toBeUndefined();
    });

    it('should map multiple items correctly', () => {
      const input: ReceiptInput = {
        items: [
          { quantity: '1', description: 'Item 1', unitPrice: '10' },
          { quantity: '2', description: 'Item 2', unitPrice: '20' },
          { quantity: '3', description: 'Item 3', unitPrice: '30' },
        ],
        cashPaymentAmount: '140',
      };

      const result = ReceiptMapper.toApiInput(input);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].description).toBe('Item 1');
      expect(result.items[1].description).toBe('Item 2');
      expect(result.items[2].description).toBe('Item 3');
    });
  });

  describe('fromApiOutput', () => {
    it('should map snake_case API output to camelCase domain object', () => {
      const output: ReceiptApiOutput = {
        uuid: 'receipt-uuid-123',
        type: 'sale',
        created_at: '2024-01-15T10:30:00Z',
        total_amount: '150.00',
        document_number: 'DOC-001',
        document_datetime: '2024-01-15T10:30:00Z',
        is_returnable: true,
        is_voidable: true,
        pdf_url: 'https://example.com/receipt.pdf',
        parent_receipt_uuid: 'parent-uuid-456',
      };

      const result = ReceiptMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'receipt-uuid-123',
        type: 'sale',
        createdAt: '2024-01-15T10:30:00Z',
        totalAmount: '150.00',
        documentNumber: 'DOC-001',
        documentDatetime: '2024-01-15T10:30:00Z',
        isReturnable: true,
        isVoidable: true,
        pdfUrl: 'https://example.com/receipt.pdf',
        parentReceiptUuid: 'parent-uuid-456',
      });
    });

    it('should map return type receipt correctly', () => {
      const output: ReceiptApiOutput = {
        uuid: 'return-receipt-uuid',
        type: 'return',
        created_at: '2024-01-16T11:00:00Z',
        total_amount: '-50.00',
        document_number: 'RET-001',
        is_returnable: false,
        is_voidable: false,
        parent_receipt_uuid: 'original-receipt-uuid',
      };

      const result = ReceiptMapper.fromApiOutput(output);

      expect(result.type).toBe('return');
      expect(result.parentReceiptUuid).toBe('original-receipt-uuid');
    });

    it('should map void type receipt correctly', () => {
      const output: ReceiptApiOutput = {
        uuid: 'void-receipt-uuid',
        type: 'void',
        created_at: '2024-01-17T12:00:00Z',
        total_amount: '0.00',
        document_number: 'VOID-001',
        is_returnable: false,
        is_voidable: false,
      };

      const result = ReceiptMapper.fromApiOutput(output);

      expect(result.type).toBe('void');
    });

    it('should handle optional fields being undefined', () => {
      const output: ReceiptApiOutput = {
        uuid: 'receipt-uuid',
        type: 'sale',
        created_at: '2024-01-15T10:00:00Z',
        total_amount: '100.00',
        document_number: 'DOC-002',
        is_returnable: true,
        is_voidable: true,
      };

      const result = ReceiptMapper.fromApiOutput(output);

      expect(result.pdfUrl).toBeUndefined();
      expect(result.parentReceiptUuid).toBeUndefined();
      expect(result.documentDatetime).toBeUndefined();
    });
  });

  describe('fromApiDetailsOutput', () => {
    it('should map detailed receipt output with all fields', () => {
      const output: ReceiptDetailsApiOutput = {
        uuid: 'details-uuid',
        type: 'sale',
        created_at: '2024-01-15T10:00:00Z',
        total_amount: '122.00',
        document_number: 'DET-001',
        is_returnable: true,
        is_voidable: true,
        customer_lottery_code: 'LOTTERY123',
        vat_number: 'IT12345678901',
        total_taxable_amount: '100.00',
        total_uncollected_amount: '0.00',
        deductible_amount: '22.00',
        total_vat_amount: '22.00',
        total_discount: '10.00',
        total_gross_discount: '12.20',
        discount: '10.00',
        items: [
          {
            type: 'goods',
            quantity: '2',
            description: 'Product A',
            unit_price: '50.00',
            vat_rate_code: '22.00',
          },
        ],
      };

      const result = ReceiptMapper.fromApiDetailsOutput(output);

      expect(result.uuid).toBe('details-uuid');
      expect(result.customerLotteryCode).toBe('LOTTERY123');
      expect(result.vatNumber).toBe('IT12345678901');
      expect(result.totalTaxableAmount).toBe('100.00');
      expect(result.totalUncollectedAmount).toBe('0.00');
      expect(result.deductibleAmount).toBe('22.00');
      expect(result.totalVatAmount).toBe('22.00');
      expect(result.totalDiscount).toBe('10.00');
      expect(result.totalGrossDiscount).toBe('12.20');
      expect(result.discount).toBe('10.00');
      expect(result.items).toHaveLength(1);
      expect(result.items?.[0].description).toBe('Product A');
    });

    it('should handle undefined items array', () => {
      const output: ReceiptDetailsApiOutput = {
        uuid: 'details-uuid',
        type: 'sale',
        created_at: '2024-01-15T10:00:00Z',
        total_amount: '100.00',
        document_number: 'DET-002',
        is_returnable: true,
        is_voidable: true,
        vat_number: 'IT12345678901',
        total_taxable_amount: '81.97',
        total_uncollected_amount: '0.00',
        deductible_amount: '18.03',
        total_vat_amount: '18.03',
        total_discount: '0.00',
        total_gross_discount: '0.00',
        discount: '0.00',
      };

      const result = ReceiptMapper.fromApiDetailsOutput(output);

      expect(result.items).toBeUndefined();
    });
  });

  describe('returnItemToApiInput', () => {
    it('should map return item with id and formatted quantity', () => {
      const item: ReceiptReturnItem = {
        id: 42,
        quantity: '3',
      };

      const result = ReceiptMapper.returnItemToApiInput(item);

      expect(result).toEqual({
        id: 42,
        quantity: '3.00',
      });
    });

    it('should format quantity with decimal values', () => {
      const item: ReceiptReturnItem = {
        id: 1,
        quantity: '2.5',
      };

      const result = ReceiptMapper.returnItemToApiInput(item);

      expect(result.quantity).toBe('2.50');
    });
  });

  describe('returnInputToApi', () => {
    it('should map return input with items and document number', () => {
      const input: ReceiptReturnInput = {
        items: [
          { id: 1, quantity: '1' },
          { id: 2, quantity: '2' },
        ],
        documentNumber: 'RET-DOC-001',
      };

      const result = ReceiptMapper.returnInputToApi(input);

      expect(result.document_number).toBe('RET-DOC-001');
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ id: 1, quantity: '1.00' });
      expect(result.items[1]).toEqual({ id: 2, quantity: '2.00' });
    });
  });

  describe('voidInputToApi', () => {
    it('should map void input with only document_number', () => {
      const input: VoidReceiptInput = {
        documentNumber: 'VOID-DOC-001',
      };

      const result = ReceiptMapper.voidInputToApi(input);

      expect(result).toEqual({
        document_number: 'VOID-DOC-001',
      });
    });
  });

  describe('returnableItemFromApi', () => {
    it('should map returnable item with returned_quantity to returnedQuantity', () => {
      const item: ReturnableReceiptItemApiOutput = {
        id: 5,
        type: 'goods',
        quantity: '10',
        returned_quantity: '3',
        description: 'Returnable Product',
        unit_price: '25.00',
        vat_rate_code: '22.00',
      };

      const result = ReceiptMapper.returnableItemFromApi(item);

      expect(result).toEqual({
        id: 5,
        type: 'goods',
        quantity: '10',
        returnedQuantity: '3',
        description: 'Returnable Product',
        unitPrice: '25.00',
        vatRateCode: '22.00',
      });
    });

    it('should handle optional fields', () => {
      const item: ReturnableReceiptItemApiOutput = {
        id: 10,
        quantity: '5',
        returned_quantity: '0',
        description: 'Simple Item',
        unit_price: '15.00',
      };

      const result = ReceiptMapper.returnableItemFromApi(item);

      expect(result.type).toBeUndefined();
      expect(result.vatRateCode).toBeUndefined();
    });
  });

  describe('toListParams', () => {
    it('should map basic list params', () => {
      const params: ReceiptListParams = {
        serialNumber: 'SN001',
        page: 1,
        size: 20,
        status: 'ready',
        sort: 'descending',
      };

      const result = ReceiptMapper.toListParams(params);

      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.status).toBe('ready');
      expect(result.sort).toBe('descending');
    });

    it('should map documentNumber to document_number', () => {
      const params: ReceiptListParams = {
        serialNumber: 'SN001',
        documentNumber: 'DOC-123',
      };

      const result = ReceiptMapper.toListParams(params);

      expect(result.document_number).toBe('DOC-123');
    });

    it('should map date range params', () => {
      const params: ReceiptListParams = {
        serialNumber: 'SN001',
        documentDatetimeBefore: '2024-01-31T23:59:59Z',
        documentDatetimeAfter: '2024-01-01T00:00:00Z',
      };

      const result = ReceiptMapper.toListParams(params);

      expect(result['document_datetime[before]']).toBe('2024-01-31T23:59:59Z');
      expect(result['document_datetime[after]']).toBe('2024-01-01T00:00:00Z');
    });

    it('should convert null documentDatetimeAfter to undefined', () => {
      const params: ReceiptListParams = {
        serialNumber: 'SN001',
        documentDatetimeAfter: null,
      };

      const result = ReceiptMapper.toListParams(params);

      expect(result['document_datetime[after]']).toBeUndefined();
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response with receipts', () => {
      const response = {
        members: [
          {
            uuid: 'receipt-1',
            type: 'sale' as const,
            created_at: '2024-01-15T10:00:00Z',
            total_amount: '100.00',
            document_number: 'DOC-001',
            is_returnable: true,
            is_voidable: true,
          },
          {
            uuid: 'receipt-2',
            type: 'sale' as const,
            created_at: '2024-01-16T11:00:00Z',
            total_amount: '200.00',
            document_number: 'DOC-002',
            is_returnable: true,
            is_voidable: false,
          },
        ],
        total: 50,
        page: 1,
        size: 20,
        pages: 3,
      };

      const result = ReceiptMapper.pageFromApi(response);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].uuid).toBe('receipt-1');
      expect(result.members[1].uuid).toBe('receipt-2');
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.pages).toBe(3);
    });

    it('should handle empty members array', () => {
      const response = {
        members: [],
        total: 0,
        page: 1,
        size: 20,
        pages: 0,
      };

      const result = ReceiptMapper.pageFromApi(response);

      expect(result.members).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle optional pagination metadata', () => {
      const response = {
        members: [
          {
            uuid: 'receipt-1',
            type: 'sale' as const,
            created_at: '2024-01-15T10:00:00Z',
            total_amount: '100.00',
            document_number: 'DOC-001',
            is_returnable: true,
            is_voidable: true,
          },
        ],
      };

      const result = ReceiptMapper.pageFromApi(response);

      expect(result.members).toHaveLength(1);
      expect(result.total).toBeUndefined();
      expect(result.page).toBeUndefined();
      expect(result.size).toBeUndefined();
      expect(result.pages).toBeUndefined();
    });
  });
});
