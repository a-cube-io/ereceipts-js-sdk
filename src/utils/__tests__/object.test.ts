import { clearObject, clearObjectShallow, isEmpty, hasNonEmptyValues } from '../object';

describe('Object Utilities', () => {
  describe('clearObject', () => {
    it('should remove null values', () => {
      const input = {
        name: 'John',
        age: null,
        city: 'New York'
      };

      const result = clearObject(input);
      expect(result).toEqual({
        name: 'John',
        city: 'New York'
      });
    });

    it('should remove undefined values', () => {
      const input = {
        name: 'John',
        age: undefined,
        city: 'New York'
      };

      const result = clearObject(input);
      expect(result).toEqual({
        name: 'John',
        city: 'New York'
      });
    });

    it('should remove empty string values', () => {
      const input = {
        name: 'John',
        age: 25,
        city: '',
        country: 'USA'
      };

      const result = clearObject(input);
      expect(result).toEqual({
        name: 'John',
        age: 25,
        country: 'USA'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John',
          email: '',
          profile: {
            bio: null,
            website: 'https://example.com',
            social: {
              twitter: '',
              linkedin: undefined
            }
          }
        },
        settings: {
          theme: 'dark',
          notifications: null
        }
      };

      const result = clearObject(input);
      expect(result).toEqual({
        user: {
          name: 'John',
          profile: {
            website: 'https://example.com',
            social: {}
          }
        },
        settings: {
          theme: 'dark'
        }
      });
    });

    it('should preserve arrays', () => {
      const input = {
        name: 'John',
        tags: ['tag1', 'tag2'],
        emptyTags: [],
        nullValue: null
      };

      const result = clearObject(input);
      expect(result).toEqual({
        name: 'John',
        tags: ['tag1', 'tag2'],
        emptyTags: []
      });
    });

    it('should preserve zero and false values', () => {
      const input = {
        count: 0,
        isActive: false,
        name: '',
        value: null
      };

      const result = clearObject(input);
      expect(result).toEqual({
        count: 0,
        isActive: false
      });
    });

    it('should handle empty nested objects', () => {
      const input = {
        user: {
          name: null,
          email: ''
        },
        settings: {
          theme: 'dark'
        }
      };

      const result = clearObject(input);
      expect(result).toEqual({
        user: {},
        settings: {
          theme: 'dark'
        }
      });
    });

    it('should handle null or undefined input', () => {
      expect(clearObject(null)).toBe(undefined);
      expect(clearObject(undefined)).toBe(undefined);
    });

    it('should handle empty string input', () => {
      expect(clearObject('')).toBe(undefined);
    });

    it('should handle non-object input', () => {
      expect(clearObject('string')).toBe('string');
      expect(clearObject(123)).toBe(123);
      expect(clearObject(true)).toBe(true);
      expect(clearObject(false)).toBe(false);
      expect(clearObject(0)).toBe(0);
    });

    it('should handle arrays with null/undefined/empty values', () => {
      const input = ['valid', null, 'another', undefined, '', 'last'];
      const result = clearObject(input);
      expect(result).toEqual(['valid', 'another', 'last']);
    });

    it('should handle arrays with nested objects', () => {
      const input = [
        { name: 'John', age: null },
        { name: '', email: 'test@example.com' },
        { name: 'Jane', age: 30 }
      ];
      const result = clearObject(input);
      expect(result).toEqual([
        { name: 'John' },
        { email: 'test@example.com' },
        { name: 'Jane', age: 30 }
      ]);
    });

    it('should handle empty arrays', () => {
      const input = { items: [] };
      const result = clearObject(input);
      expect(result).toEqual({ items: [] });
    });

    it('should handle arrays with all empty values', () => {
      const input = [null, undefined, ''];
      const result = clearObject(input);
      expect(result).toEqual([]);
    });

    it('should handle deeply nested arrays', () => {
      const input = {
        matrix: [
          [1, null, 3],
          [null, '', 6],
          [7, 8, undefined]
        ]
      };
      const result = clearObject(input);
      expect(result).toEqual({
        matrix: [
          [1, 3],
          [6],
          [7, 8]
        ]
      });
    });

    it('should preserve Date objects', () => {
      const date = new Date('2023-01-01');
      const input = { 
        name: 'John',
        birthday: date,
        emptyField: null
      };
      const result = clearObject(input);
      expect(result).toEqual({
        name: 'John',
        birthday: date
      });
    });

    it('should handle objects with constructor other than Object', () => {
      class CustomClass {
        constructor(public value: string, public empty: null | string) {}
      }
      const instance = new CustomClass('test', null);
      const input = { custom: instance, name: 'test' };
      const result = clearObject(input);
      expect(result).toEqual({ custom: instance, name: 'test' });
    });
  });

  describe('clearObjectShallow', () => {
    it('should only clean top-level properties', () => {
      const input = {
        name: 'John',
        age: null,
        profile: {
          bio: null,
          website: 'https://example.com'
        },
        empty: ''
      };

      const result = clearObjectShallow(input);
      expect(result).toEqual({
        name: 'John',
        profile: {
          bio: null,
          website: 'https://example.com'
        }
      });
    });

    it('should preserve nested null values', () => {
      const input = {
        user: {
          name: null,
          email: ''
        },
        topLevel: null
      };

      const result = clearObjectShallow(input);
      expect(result).toEqual({
        user: {
          name: null,
          email: ''
        }
      });
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
      expect(isEmpty([])).toBe(false);
      expect(isEmpty({})).toBe(false);
      expect(isEmpty(' ')).toBe(false); // space is not empty string
    });
  });

  describe('hasNonEmptyValues', () => {
    it('should return true if object has non-empty values', () => {
      const obj = {
        name: 'John',
        age: null,
        city: ''
      };

      expect(hasNonEmptyValues(obj)).toBe(true);
    });

    it('should return false if object has only empty values', () => {
      const obj = {
        name: null,
        age: undefined,
        city: ''
      };

      expect(hasNonEmptyValues(obj)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(hasNonEmptyValues({})).toBe(false);
    });

    it('should return false for null/undefined input', () => {
      expect(hasNonEmptyValues(null as any)).toBe(false);
      expect(hasNonEmptyValues(undefined as any)).toBe(false);
    });

    it('should return true for zero and false values', () => {
      const obj = {
        count: 0,
        isActive: false
      };

      expect(hasNonEmptyValues(obj)).toBe(true);
    });
  });

  describe('Real-world examples', () => {
    it('should clean merchant data', () => {
      const merchantData = {
        vat_number: '12345678901',
        fiscal_code: '',
        business_name: 'Test Company',
        first_name: null,
        last_name: undefined,
        email: 'test@company.com',
        password: 'SecurePass123!',
        address: {
          street_address: 'Via Roma',
          street_number: '123',
          zip_code: '',
          city: 'Roma',
          province: null
        }
      };

      const result = clearObject(merchantData);
      expect(result).toEqual({
        vat_number: '12345678901',
        business_name: 'Test Company',
        email: 'test@company.com',
        password: 'SecurePass123!',
        address: {
          street_address: 'Via Roma',
          street_number: '123',
          city: 'Roma'
        }
      });
    });

    it('should clean API request parameters', () => {
      const params = {
        page: 1,
        pem_serial_number: '',
        status: 'pending',
        date_from: null,
        date_to: undefined,
        limit: 0
      };

      const result = clearObject(params);
      expect(result).toEqual({
        page: 1,
        status: 'pending',
        limit: 0
      });
    });
  });
});