import { PaymentDetail } from '@/domain/entities/receipt.entity';

import { ReceiptMapper } from '../receipt.dto';

describe('ReceiptMapper', () => {
  describe('paymentDetailToApiInput', () => {
    it('should map a cash payment without voucher_count', () => {
      const detail: PaymentDetail = {
        type: 'cash',
        amount: '10',
      };

      const result = ReceiptMapper.paymentDetailToApiInput(detail);

      expect(result).toEqual({
        type: 'cash',
        description: undefined,
        amount: '10.00',
        voucher_count: undefined,
      });
    });

    it('should map a meal_vouchers payment with voucher_count', () => {
      const detail: PaymentDetail = {
        type: 'meal_vouchers',
        description: 'Buoni pasto',
        amount: '16',
        voucherCount: 2,
      };

      const result = ReceiptMapper.paymentDetailToApiInput(detail);

      expect(result).toEqual({
        type: 'meal_vouchers',
        description: 'Buoni pasto',
        amount: '16.00',
        voucher_count: 2,
      });
    });

    it('should map an other_vouchers payment with voucher_count', () => {
      const detail: PaymentDetail = {
        type: 'other_vouchers',
        amount: '5.5',
        voucherCount: 1,
      };

      const result = ReceiptMapper.paymentDetailToApiInput(detail);

      expect(result).toEqual({
        type: 'other_vouchers',
        description: undefined,
        amount: '5.50',
        voucher_count: 1,
      });
    });
  });

  describe('returnInputToApi', () => {
    it('should omit payment_details when not provided', () => {
      const result = ReceiptMapper.returnInputToApi({
        documentNumber: '0001-0001',
        items: [{ id: 1, quantity: '1' }],
      });

      expect(result).toEqual({
        items: [{ id: 1, quantity: '1.00' }],
        document_number: '0001-0001',
        payment_details: undefined,
      });
    });

    it('should map payment_details when provided', () => {
      const result = ReceiptMapper.returnInputToApi({
        documentNumber: '0001-0001',
        items: [{ id: 1, quantity: '2' }],
        paymentDetails: [
          { type: 'cash', amount: '4' },
          { type: 'vouchers', amount: '8', voucherCount: 1 },
          { type: 'uncollected_services', amount: '3.5' },
        ],
      });

      expect(result).toEqual({
        items: [{ id: 1, quantity: '2.00' }],
        document_number: '0001-0001',
        payment_details: [
          { type: 'cash', amount: '4.00', voucher_count: undefined },
          { type: 'vouchers', amount: '8.00', voucher_count: 1 },
          { type: 'uncollected_services', amount: '3.50', voucher_count: undefined },
        ],
      });
    });

    it('should not send description in payment_details', () => {
      const result = ReceiptMapper.returnPaymentDetailToApiInput({ type: 'discount', amount: '1' });

      expect(result).not.toHaveProperty('description');
    });

    it('should round amount to 2 decimals', () => {
      const result = ReceiptMapper.returnPaymentDetailToApiInput({
        type: 'electronic',
        amount: '10.12345678',
      });

      expect(result.amount).toBe('10.12');
    });
  });

  describe('returnDataFromApi', () => {
    const baseItem = {
      id: 1,
      type: 'goods' as const,
      quantity: '2.00',
      returned_quantity: '1.00',
      description: 'Prodotto',
      unit_price: '10.00',
      simplified_vat_allocation: false,
      discount: '0',
      surcharge: '0',
      prepaid_or_voucher: false,
      complimentary: false,
    };

    it('should map items, summary and payment details', () => {
      const result = ReceiptMapper.returnDataFromApi({
        items: [{ ...baseItem, vat_rate_code: '22.00', ateco_code: '471100' }],
        lottery: { two_dimensional_lottery_code: 'ABC', lottery_code: 'XYZ' },
        summary: [
          {
            vat: { vat_rate: '22.00', total_vat_amount: '1.80' },
            nature: null,
            simplified_vat_allocation: false,
            total_taxable_amount: '8.20',
            uncollected_goods_sales: '0',
            uncollected_services: '0',
            uncollected_invoices: '0',
            uncollected_dcr_ssn: '0',
            uncollected_complimentary: '0',
            ateco_code: null,
            meal_vouchers_invoiced_to_issuer: true,
          },
        ],
        payment_details: {
          cash_payment_amount: '5.00',
          electronic_payment_amount: null,
          vouchers: { amount: '5.00', count: 1 },
          discount_amount: null,
          uncollected_goods_gross_amount: null,
          uncollected_services_gross_amount: '12.20',
        },
      });

      expect(result).toEqual({
        items: [
          {
            id: 1,
            type: 'goods',
            quantity: '2.00',
            returnedQuantity: '1.00',
            description: 'Prodotto',
            unitPrice: '10.00',
            vatRateCode: '22.00',
            simplifiedVatAllocation: false,
            discount: '0',
            surcharge: '0',
            prepaidOrVoucher: false,
            complimentary: false,
            atecoCode: '471100',
          },
        ],
        lottery: { twoDimensionalLotteryCode: 'ABC', lotteryCode: 'XYZ' },
        summary: [
          {
            vat: { vatRate: '22.00', totalVatAmount: '1.80' },
            nature: undefined,
            simplifiedVatAllocation: false,
            totalTaxableAmount: '8.20',
            uncollectedGoodsSales: '0',
            uncollectedServices: '0',
            uncollectedInvoices: '0',
            uncollectedDcrSsn: '0',
            uncollectedComplimentary: '0',
            atecoCode: undefined,
            mealVouchersInvoicedToIssuer: true,
          },
        ],
        paymentDetails: {
          cashPaymentAmount: '5.00',
          electronicPaymentAmount: undefined,
          vouchers: { amount: '5.00', count: 1 },
          discountAmount: undefined,
          uncollectedGoodsGrossAmount: undefined,
          uncollectedServicesGrossAmount: '12.20',
        },
      });
    });

    it('should map null vat_rate_code (Ventilazione IVA) and missing optional blocks to undefined', () => {
      const result = ReceiptMapper.returnDataFromApi({
        items: [{ ...baseItem, vat_rate_code: null, simplified_vat_allocation: true }],
        lottery: null,
        summary: [],
        payment_details: {
          vouchers: null,
          uncollected_services_gross_amount: '0.00',
        },
      });

      expect(result.items[0]?.vatRateCode).toBeUndefined();
      expect(result.items[0]?.simplifiedVatAllocation).toBe(true);
      expect(result.lottery).toBeUndefined();
      expect(result.paymentDetails.vouchers).toBeUndefined();
      expect(result.paymentDetails.cashPaymentAmount).toBeUndefined();
      expect(result.paymentDetails.uncollectedServicesGrossAmount).toBe('0.00');
    });
  });

  describe('fromApiOutput', () => {
    const base = {
      uuid: 'r-1',
      document_number: '0001-0001',
      document_datetime: '2026-11-10T10:00:00',
      is_returnable: false,
      is_voidable: false,
      status: 'sent' as const,
    };

    it('should map a sale receipt', () => {
      const result = ReceiptMapper.fromApiOutput({
        ...base,
        type: 'sale',
        total_amount: '12.20',
        is_returnable: true,
        is_voidable: true,
        pdf_url: 'https://example.test/r-1.pdf',
        parent_receipt_uuid: null,
      });

      expect(result).toEqual({
        uuid: 'r-1',
        type: 'sale',
        totalAmount: '12.20',
        documentNumber: '0001-0001',
        documentDatetime: '2026-11-10T10:00:00',
        isReturnable: true,
        isVoidable: true,
        pdfUrl: 'https://example.test/r-1.pdf',
        status: 'sent',
        parentReceiptUuid: undefined,
      });
    });

    it('should map null total_amount and pdf_url of a void receipt to undefined', () => {
      const result = ReceiptMapper.fromApiOutput({
        ...base,
        type: 'void',
        total_amount: null,
        pdf_url: null,
        parent_receipt_uuid: 'r-0',
      });

      expect(result.totalAmount).toBeUndefined();
      expect(result.pdfUrl).toBeUndefined();
      expect(result.parentReceiptUuid).toBe('r-0');
    });
  });

  describe('fromApiDetailsOutput', () => {
    it('should map details, items and cashier name', () => {
      const result = ReceiptMapper.fromApiDetailsOutput({
        uuid: 'r-1',
        type: 'sale',
        total_amount: '12.20',
        document_number: '0001-0001',
        document_datetime: '2026-11-10T10:00:00',
        is_returnable: true,
        is_voidable: true,
        pdf_url: null,
        status: 'sent',
        customer_lottery_code: null,
        total_taxable_amount: '10.00',
        total_uncollected_amount: '0.00',
        total_vat_amount: '2.20',
        total_discount: '0.00',
        items: [
          {
            type: 'goods',
            quantity: '1.00',
            description: 'Prodotto',
            unit_price: '12.20',
            vat_rate_code: null,
            simplified_vat_allocation: true,
            discount: '0',
            surcharge: '0',
            prepaid_or_voucher: false,
            complimentary: false,
            ateco_code: null,
          },
        ],
        cashier_name: 'Mario',
      });

      expect(result.cashierName).toBe('Mario');
      expect(result.customerLotteryCode).toBeUndefined();
      expect(result.totalDiscount).toBe('0.00');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.vatRateCode).toBeUndefined();
      expect(result.items[0]?.atecoCode).toBeUndefined();
      expect(result.items[0]?.simplifiedVatAllocation).toBe(true);
    });

    it('should map a null cashier name (issued by the merchant) to undefined', () => {
      const result = ReceiptMapper.fromApiDetailsOutput({
        uuid: 'r-1',
        type: 'sale',
        document_number: '0001-0001',
        document_datetime: '2026-11-10T10:00:00',
        is_returnable: true,
        is_voidable: true,
        status: 'sent',
        total_taxable_amount: '0.00',
        total_uncollected_amount: '0.00',
        total_vat_amount: '0.00',
        total_discount: '0.00',
        items: [],
        cashier_name: null,
      });

      expect(result.cashierName).toBeUndefined();
      expect(result.items).toEqual([]);
    });
  });

  describe('toListParams', () => {
    it('should map sort to order[document_number] and all the filters', () => {
      const result = ReceiptMapper.toListParams({
        serialNumber: 'E001-000001',
        page: 2,
        size: 10,
        status: 'ready',
        sort: 'ascending',
        type: 'return',
        documentNumber: '0001-0001',
        documentDatetimeBefore: '2026-11-10T00:00:00',
        documentDatetimeStrictlyBefore: '2026-11-11T00:00:00',
        documentDatetimeAfter: '2026-11-01T00:00:00',
        documentDatetimeStrictlyAfter: '2026-10-31T00:00:00',
      });

      expect(result).toEqual({
        page: 2,
        size: 10,
        status: 'ready',
        'order[document_number]': 'asc',
        type: 'return',
        document_number: '0001-0001',
        'document_datetime[before]': '2026-11-10T00:00:00',
        'document_datetime[strictly_before]': '2026-11-11T00:00:00',
        'document_datetime[after]': '2026-11-01T00:00:00',
        'document_datetime[strictly_after]': '2026-10-31T00:00:00',
      });
      expect(result).not.toHaveProperty('sort');
    });

    it('should map descending to desc and leave missing filters undefined', () => {
      const result = ReceiptMapper.toListParams({
        serialNumber: 'E001-000001',
        sort: 'descending',
        documentDatetimeAfter: null,
      });

      expect(result['order[document_number]']).toBe('desc');
      expect(result.type).toBeUndefined();
      expect(result['document_datetime[after]']).toBeUndefined();
    });

    it('should not send order[document_number] when sort is not set', () => {
      const result = ReceiptMapper.toListParams({ serialNumber: 'E001-000001' });

      expect(result['order[document_number]']).toBeUndefined();
    });
  });

  describe('additional_text', () => {
    const item = {
      quantity: '1',
      description: 'Prodotto',
      unitPrice: '10',
      vatRateCode: '22.00' as const,
    };

    it('should be sent by every input mapper', () => {
      const additionalText = 'Riga 1\nRiga 2';

      expect(ReceiptMapper.toApiInput({ items: [item], additionalText }).additional_text).toBe(
        additionalText
      );
      expect(
        ReceiptMapper.returnInputToApi({
          documentNumber: '0001-0001',
          items: [{ id: 1, quantity: '1' }],
          additionalText,
        }).additional_text
      ).toBe(additionalText);
      expect(
        ReceiptMapper.voidInputToApi({ documentNumber: '0001-0001', additionalText })
          .additional_text
      ).toBe(additionalText);
      expect(
        ReceiptMapper.voidViaDifferentDeviceToApi({
          deviceId: 'E001-000001',
          items: [item],
          documentNumber: '0001-0001',
          documentDatetime: '2026-11-10T10:00:00',
          additionalText,
        }).additional_text
      ).toBe(additionalText);
      expect(
        ReceiptMapper.voidWithProofToApi({
          items: [item],
          proof: 'POS',
          documentDatetime: '2026-11-10T10:00:00',
          additionalText,
        }).additional_text
      ).toBe(additionalText);
      expect(
        ReceiptMapper.returnViaDifferentDeviceToApi({
          deviceId: 'E001-000001',
          items: [item],
          documentNumber: '0001-0001',
          documentDatetime: '2026-11-10T10:00:00',
          additionalText,
        }).additional_text
      ).toBe(additionalText);
      expect(
        ReceiptMapper.returnWithProofToApi({
          items: [item],
          proof: 'ND',
          documentDatetime: '2026-11-10T10:00:00',
          additionalText,
        }).additional_text
      ).toBe(additionalText);
    });
  });
});
