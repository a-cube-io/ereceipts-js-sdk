import { CashierCreateInput } from '@/domain/entities/cashier.entity';
import { Page } from '@/domain/value-objects/page.vo';

import { CashierApiOutput, CashierMapper } from '../cashier.dto';

describe('CashierMapper', () => {
  describe('toCreateApiInput', () => {
    it('should map all required fields', () => {
      const input: CashierCreateInput = {
        email: 'cashier@example.com',
        password: 'securePass123',
        name: 'Mario Rossi',
        displayName: 'Mario',
      };

      const result = CashierMapper.toCreateApiInput(input);

      expect(result).toEqual({
        email: 'cashier@example.com',
        password: 'securePass123',
        name: 'Mario Rossi',
        display_name: 'Mario',
      });
    });

    it('should convert undefined displayName to null', () => {
      const input: CashierCreateInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = CashierMapper.toCreateApiInput(input);

      expect(result.display_name).toBeNull();
    });

    it('should preserve null displayName', () => {
      const input: CashierCreateInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        displayName: null,
      };

      const result = CashierMapper.toCreateApiInput(input);

      expect(result.display_name).toBeNull();
    });
  });

  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: CashierApiOutput = {
        uuid: 'cashier-uuid-123',
        merchant_uuid: 'merchant-uuid-456',
        display_name: 'Display Name',
        email: 'cashier@example.com',
        name: 'Full Name',
        status: 'active',
      };

      const result = CashierMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'cashier-uuid-123',
        merchantUuid: 'merchant-uuid-456',
        displayName: 'Display Name',
        email: 'cashier@example.com',
        name: 'Full Name',
        status: 'active',
      });
    });

    it('should handle null display_name', () => {
      const output: CashierApiOutput = {
        uuid: 'cashier-uuid',
        merchant_uuid: 'merchant-uuid',
        display_name: null,
        email: 'test@example.com',
        name: 'Test',
        status: 'disabled',
      };

      const result = CashierMapper.fromApiOutput(output);

      expect(result.displayName).toBeNull();
      expect(result.status).toBe('disabled');
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const response: Page<CashierApiOutput> = {
        members: [
          {
            uuid: 'cashier-1',
            merchant_uuid: 'merchant-1',
            display_name: 'Cashier 1',
            email: 'c1@example.com',
            name: 'Name 1',
            status: 'active',
          },
          {
            uuid: 'cashier-2',
            merchant_uuid: 'merchant-1',
            display_name: null,
            email: 'c2@example.com',
            name: 'Name 2',
            status: 'disabled',
          },
        ],
        total: 10,
        page: 1,
        size: 20,
        pages: 1,
      };

      const result = CashierMapper.pageFromApi(response);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].uuid).toBe('cashier-1');
      expect(result.members[1].displayName).toBeNull();
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
    });

    it('should handle empty page', () => {
      const response: Page<CashierApiOutput> = {
        members: [],
        total: 0,
        page: 1,
        size: 20,
        pages: 0,
      };

      const result = CashierMapper.pageFromApi(response);

      expect(result.members).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
