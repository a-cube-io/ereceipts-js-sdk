import { PaymentDetail } from '@/domain/entities/receipt.entity';

import { ReceiptMapper } from '../receipt.dto';

describe('ReceiptMapper', () => {
  describe('paymentDetailToApiInput', () => {
    it('should map a cash payment without vouchers_quantity', () => {
      const detail: PaymentDetail = {
        type: 'cash',
        amount: '10',
      };

      const result = ReceiptMapper.paymentDetailToApiInput(detail);

      expect(result).toEqual({
        type: 'cash',
        description: undefined,
        amount: '10.00',
        vouchers_quantity: undefined,
      });
    });

    it('should map a meal_vouchers payment with vouchers_quantity', () => {
      const detail: PaymentDetail = {
        type: 'meal_vouchers',
        description: 'Buoni pasto',
        amount: '16',
        vouchersQuantity: 2,
      };

      const result = ReceiptMapper.paymentDetailToApiInput(detail);

      expect(result).toEqual({
        type: 'meal_vouchers',
        description: 'Buoni pasto',
        amount: '16.00',
        vouchers_quantity: 2,
      });
    });

    it('should map an other_vouchers payment with vouchers_quantity', () => {
      const detail: PaymentDetail = {
        type: 'other_vouchers',
        amount: '5.5',
        vouchersQuantity: 1,
      };

      const result = ReceiptMapper.paymentDetailToApiInput(detail);

      expect(result).toEqual({
        type: 'other_vouchers',
        description: undefined,
        amount: '5.50',
        vouchers_quantity: 1,
      });
    });
  });
});
