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
});
