import { CacheKeyGenerator } from '../cache-key-generator';

describe('CacheKeyGenerator', () => {
  const generator = new CacheKeyGenerator();

  describe('generate', () => {
    it('should generate key for receipt by ID', () => {
      const key = generator.generate('/mf1/receipts/abc-123');
      expect(key).toBe('receipt:abc-123');
    });

    it('should generate key for receipt details', () => {
      const key = generator.generate('/mf1/receipts/abc-123/details');
      expect(key).toBe('receipt:abc-123:details');
    });

    it('should generate key for receipt returnable items', () => {
      const key = generator.generate('/mf1/receipts/abc-123/returnable-items');
      expect(key).toBe('receipt:abc-123:returnable');
    });

    it('should generate list key for receipts', () => {
      const key = generator.generate('/mf1/receipts', { page: 0, size: 10 });
      expect(key).toBe('receipt:list:page=0&size=10');
    });

    it('should generate list key for point-of-sale receipts', () => {
      const key = generator.generate('/mf1/point-of-sales/SN123/receipts', { page: 0 });
      expect(key).toBe('receipt:list:point-of-sale=SN123&page=0');
    });

    it('should generate key for merchant by ID', () => {
      const key = generator.generate('/mf2/merchants/merchant-uuid');
      expect(key).toBe('merchant:merchant-uuid');
    });

    it('should generate list key for merchants', () => {
      const key = generator.generate('/mf2/merchants', { page: 0 });
      expect(key).toBe('merchant:list:page=0');
    });

    it('should generate key for cashier me endpoint', () => {
      const key = generator.generate('/mf1/cashiers/me');
      expect(key).toBe('cashier:me');
    });

    it('should generate key for cashier by ID', () => {
      const key = generator.generate('/mf1/cashiers/cashier-uuid');
      expect(key).toBe('cashier:cashier-uuid');
    });

    it('should generate key for supplier nested under merchant', () => {
      const key = generator.generate('/mf2/merchants/merchant-uuid/suppliers/supplier-uuid');
      expect(key).toBe('supplier:merchant-uuid:supplier-uuid');
    });

    it('should generate list key for suppliers', () => {
      const key = generator.generate('/mf2/merchants/merchant-uuid/suppliers', { page: 0 });
      expect(key).toBe('supplier:list:merchant=merchant-uuid&page=0');
    });

    it('should generate key for cash register', () => {
      const key = generator.generate('/mf1/cash-registers/register-uuid');
      expect(key).toBe('cash-register:register-uuid');
    });

    it('should generate key for point of sale', () => {
      const key = generator.generate('/mf1/point-of-sales/pos-uuid');
      expect(key).toBe('point-of-sale:pos-uuid');
    });

    it('should generate key for telemetry', () => {
      const key = generator.generate('/mf1/point-of-sales/pos-uuid/telemetry');
      expect(key).toBe('telemetry:pos-uuid');
    });

    it('should sort params alphabetically', () => {
      const key = generator.generate('/mf1/receipts', { size: 10, page: 0 });
      expect(key).toBe('receipt:list:page=0&size=10');
    });

    it('should fallback to URL for unknown patterns', () => {
      const key = generator.generate('/unknown/path', { foo: 'bar' });
      expect(key).toBe('/unknown/path?foo=bar');
    });
  });

  describe('parseResource', () => {
    it('should parse receipt resource', () => {
      expect(generator.parseResource('/mf1/receipts/abc')).toBe('receipt');
    });

    it('should parse merchant resource', () => {
      expect(generator.parseResource('/mf2/merchants/abc')).toBe('merchant');
    });

    it('should parse cashier resource', () => {
      expect(generator.parseResource('/mf1/cashiers/abc')).toBe('cashier');
    });

    it('should return undefined for unknown URL', () => {
      expect(generator.parseResource('/unknown/path')).toBeUndefined();
    });
  });

  describe('getTTL', () => {
    it('should return 30 min TTL for merchant', () => {
      expect(generator.getTTL('/mf2/merchants/abc')).toBe(30 * 60 * 1000);
    });

    it('should return 10 min TTL for cashier', () => {
      expect(generator.getTTL('/mf1/cashiers/abc')).toBe(10 * 60 * 1000);
    });

    it('should return 5 min TTL for receipt', () => {
      expect(generator.getTTL('/mf1/receipts/abc')).toBe(5 * 60 * 1000);
    });

    it('should return 1 min TTL for telemetry', () => {
      expect(generator.getTTL('/mf1/point-of-sales/abc/telemetry')).toBe(1 * 60 * 1000);
    });

    it('should return default TTL for unknown URL', () => {
      expect(generator.getTTL('/unknown/path')).toBe(5 * 60 * 1000);
    });
  });

  describe('shouldCache', () => {
    it('should cache single item endpoints', () => {
      expect(generator.shouldCache('/mf1/receipts/abc')).toBe(true);
      expect(generator.shouldCache('/mf2/merchants/abc')).toBe(true);
      expect(generator.shouldCache('/mf1/cashiers/abc')).toBe(true);
    });

    it('should NOT cache list endpoints', () => {
      expect(generator.shouldCache('/mf1/receipts')).toBe(false);
      expect(generator.shouldCache('/mf2/merchants')).toBe(false);
      expect(generator.shouldCache('/mf1/cashiers')).toBe(false);
    });

    it('should NOT cache notifications', () => {
      expect(generator.shouldCache('/mf1/notifications')).toBe(false);
    });

    it('should return false for unknown URLs', () => {
      expect(generator.shouldCache('/unknown/path')).toBe(false);
    });
  });

  describe('getInvalidationPatterns', () => {
    it('should invalidate list on POST', () => {
      const patterns = generator.getInvalidationPatterns('/mf1/receipts', 'POST');
      expect(patterns).toContain('receipt:list:*');
    });

    it('should invalidate item and list on PUT', () => {
      const patterns = generator.getInvalidationPatterns('/mf1/receipts/abc', 'PUT');
      expect(patterns).toContain('receipt:abc*');
      expect(patterns).toContain('receipt:list:*');
    });

    it('should invalidate item and list on DELETE', () => {
      const patterns = generator.getInvalidationPatterns('/mf2/merchants/abc', 'DELETE');
      expect(patterns).toContain('merchant:abc*');
      expect(patterns).toContain('merchant:list:*');
    });

    it('should invalidate cashier:me on cashier mutations', () => {
      const patterns = generator.getInvalidationPatterns('/mf1/cashiers/abc', 'PUT');
      expect(patterns).toContain('cashier:me');
    });

    it('should invalidate supplier list with merchant context', () => {
      const patterns = generator.getInvalidationPatterns('/mf2/merchants/mid/suppliers', 'POST');
      expect(patterns).toContain('supplier:list:merchant=mid*');
    });

    it('should return empty array for GET', () => {
      const patterns = generator.getInvalidationPatterns('/mf1/receipts/abc', 'GET');
      expect(patterns).toHaveLength(0);
    });
  });

  describe('custom TTL config', () => {
    it('should allow custom TTL configuration', () => {
      const customGenerator = new CacheKeyGenerator({
        receipt: { ttlMs: 60 * 1000, cacheList: false, cacheItem: true },
      });

      expect(customGenerator.getTTL('/mf1/receipts/abc')).toBe(60 * 1000);
    });
  });
});
