/**
 * Utility Functions Tests
 * Comprehensive testing for utility functions, helpers, and common operations
 */

import { 
  setTimeoutSafe, 
  setIntervalSafe, 
  clearTimeoutSafe, 
  clearIntervalSafe 
} from '@/utils/timeout-helper';
import { ValidationError } from '@/errors';

// Additional utility functions for testing
class StringUtils {
  static isEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  static sanitize(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
  }

  static truncate(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  static camelToKebab(camelCase: string): string {
    return camelCase.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  static kebabToCamel(kebabCase: string): string {
    return kebabCase.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
  }

  static generateId(prefix = '', length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

class NumberUtils {
  static formatCurrency(amount: number | string, currency = 'EUR'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(numAmount);
  }

  static parseAmount(amountString: string): number {
    // Handle Italian decimal format (comma as decimal separator)
    const normalized = amountString.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) {
      throw new ValidationError(
        `Invalid amount format: ${amountString}`,
        'invalid_amount',
        [{
          field: 'amount',
          message: `Invalid amount format: ${amountString}`,
          code: 'invalid_amount',
          value: amountString,
        }]
      );
    }
    return parsed;
  }

  static formatPercentage(value: number, decimals = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  static roundToDecimals(value: number, decimals = 2): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}

class DateUtils {
  static formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static diffInDays(date1: Date, date2: Date): number {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  static isWithinRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }
}

class ObjectUtils {
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

 static merge<T, U>(target: T, source: U): T & U {
  const result = { ...target } as T & U;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof U];
      const targetValue = result[key as keyof typeof result];

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        result[key as keyof typeof result] = this.merge(
          (targetValue || {}) as any,
          sourceValue as any
        );
      } else {
        result[key as keyof typeof result] = sourceValue as any;
      }
    }
  }

  return result;
  }

  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result as Omit<T, K>;
  }

  static isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }
}

class AsyncUtils {
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
      ),
    ]);
  }

  static retry<T>(
    fn: () => Promise<T>, 
    maxRetries = 3, 
    delay = 1000,
    backoff = 2
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let attempt = 0;
      let currentDelay = delay;

      while (attempt < maxRetries) {
        try {
          const result = await fn();
          resolve(result);
          return;
        } catch (error) {
          attempt++;
          if (attempt >= maxRetries) {
            reject(error);
            return;
          }
          
          await this.delay(currentDelay);
          currentDelay *= backoff;
        }
      }
    });
  }

  static batch<T, R>(
    items: T[], 
    batchSize: number, 
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return Promise.all(batches.map(processor)).then(results => results.flat());
  }
}

describe('Utility Functions', () => {
  describe('Timeout Helpers', () => {
    it('should create and clear timeouts safely', (done) => {
      const timeout = setTimeoutSafe(() => {
        done();
      }, 50);
      
      expect(timeout).toBeDefined();
      
      // Test clearing
      const timeout2 = setTimeoutSafe(() => {
        throw new Error('Should not be called');
      }, 100);
      
      clearTimeoutSafe(timeout2);
    });

    it('should create and clear intervals safely', (done) => {
      let callCount = 0;
      
      const interval = setIntervalSafe(() => {
        callCount++;
        if (callCount >= 2) {
          clearIntervalSafe(interval);
          expect(callCount).toBe(2);
          done();
        }
      }, 50);
      
      expect(interval).toBeDefined();
    });

    it('should handle null/undefined timeout clearing', () => {
      expect(() => {
        clearTimeoutSafe(null);
        clearTimeoutSafe(undefined);
        clearIntervalSafe(null);
        clearIntervalSafe(undefined);
      }).not.toThrow();
    });
  });

  describe('String Utilities', () => {
    it('should validate email addresses', () => {
      expect(StringUtils.isEmail('test@example.com')).toBe(true);
      expect(StringUtils.isEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(StringUtils.isEmail('invalid-email')).toBe(false);
      expect(StringUtils.isEmail('@domain.com')).toBe(false);
      expect(StringUtils.isEmail('test@')).toBe(false);
    });

    it('should sanitize input strings', () => {
      expect(StringUtils.sanitize('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(StringUtils.sanitize('Hello "World"')).toBe('Hello World');
      expect(StringUtils.sanitize('  trimmed  ')).toBe('trimmed');
    });

    it('should truncate strings correctly', () => {
      expect(StringUtils.truncate('Hello World', 5)).toBe('He...');
      expect(StringUtils.truncate('Short', 10)).toBe('Short');
      expect(StringUtils.truncate('Hello World', 8, '…')).toBe('Hello W…');
    });

    it('should convert between camelCase and kebab-case', () => {
      expect(StringUtils.camelToKebab('helloWorld')).toBe('hello-world');
      expect(StringUtils.camelToKebab('XMLHttpRequest')).toBe('-x-m-l-http-request');
      
      expect(StringUtils.kebabToCamel('hello-world')).toBe('helloWorld');
      expect(StringUtils.kebabToCamel('simple')).toBe('simple');
    });

    it('should generate unique IDs', () => {
      const id1 = StringUtils.generateId('test_', 8);
      const id2 = StringUtils.generateId('test_', 8);
      
      expect(id1).toMatch(/^test_.{8}$/);
      expect(id2).toMatch(/^test_.{8}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Number Utilities', () => {
    it('should format currency correctly', () => {
      expect(NumberUtils.formatCurrency(12.50)).toContain('12');
      expect(NumberUtils.formatCurrency('25.99')).toContain('25');
      expect(NumberUtils.formatCurrency(1000, 'USD')).toContain('1000');
    });

    it('should parse amount strings', () => {
      expect(NumberUtils.parseAmount('12.50')).toBe(12.50);
      expect(NumberUtils.parseAmount('12,50')).toBe(12.50);
      
      expect(() => NumberUtils.parseAmount('invalid')).toThrow(ValidationError);
      expect(() => NumberUtils.parseAmount('')).toThrow(ValidationError);
    });

    it('should format percentages', () => {
      expect(NumberUtils.formatPercentage(0.22)).toBe('22.00%');
      expect(NumberUtils.formatPercentage(0.1, 1)).toBe('10.0%');
      expect(NumberUtils.formatPercentage(1.5, 0)).toBe('150%');
    });

    it('should round to specified decimals', () => {
      expect(NumberUtils.roundToDecimals(12.345, 2)).toBe(12.35);
      expect(NumberUtils.roundToDecimals(12.344, 2)).toBe(12.34);
      expect(NumberUtils.roundToDecimals(12.5, 0)).toBe(13);
    });

    it('should clamp values within range', () => {
      expect(NumberUtils.clamp(5, 1, 10)).toBe(5);
      expect(NumberUtils.clamp(-5, 1, 10)).toBe(1);
      expect(NumberUtils.clamp(15, 1, 10)).toBe(10);
    });
  });

  describe('Date Utilities', () => {
    const testDate = new Date('2024-01-15T10:30:45Z');

    it('should format dates correctly', () => {
      expect(DateUtils.formatDate(testDate, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(DateUtils.formatDate(testDate, 'DD/MM/YYYY')).toBe('15/01/2024');
      expect(DateUtils.formatDate(testDate, 'YYYY-MM-DD HH:mm:ss')).toMatch(/2024-01-15 \d{2}:30:45/);
    });

    it('should validate dates', () => {
      expect(DateUtils.isValidDate(new Date())).toBe(true);
      expect(DateUtils.isValidDate(new Date('2024-01-01'))).toBe(true);
      expect(DateUtils.isValidDate(new Date('invalid'))).toBe(false);
      expect(DateUtils.isValidDate('not a date')).toBe(false);
    });

    it('should add days to dates', () => {
      const result = DateUtils.addDays(testDate, 5);
      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should calculate difference in days', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-06');
      
      expect(DateUtils.diffInDays(date1, date2)).toBe(5);
      expect(DateUtils.diffInDays(date2, date1)).toBe(5);
    });

    it('should check if date is within range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const middle = new Date('2024-01-15');
      const outside = new Date('2024-02-01');
      
      expect(DateUtils.isWithinRange(middle, start, end)).toBe(true);
      expect(DateUtils.isWithinRange(outside, start, end)).toBe(false);
    });
  });

  describe('Object Utilities', () => {
    it('should deep clone objects', () => {
      const original = {
        a: 1,
        b: { c: 2, d: [3, 4] },
        e: new Date('2024-01-01'),
      };
      
      const cloned = ObjectUtils.deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
    });

    it('should merge objects deeply', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };
      
      const result = ObjectUtils.merge(target, source);
      
      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4,
      });
    });

    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = ObjectUtils.pick(obj, ['a', 'c']);
      
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = ObjectUtils.omit(obj, ['b', 'd']);
      
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should check if objects are empty', () => {
      expect(ObjectUtils.isEmpty({})).toBe(true);
      expect(ObjectUtils.isEmpty([])).toBe(true);
      expect(ObjectUtils.isEmpty('')).toBe(true);
      expect(ObjectUtils.isEmpty(null)).toBe(true);
      expect(ObjectUtils.isEmpty(undefined)).toBe(true);
      
      expect(ObjectUtils.isEmpty({ a: 1 })).toBe(false);
      expect(ObjectUtils.isEmpty([1])).toBe(false);
      expect(ObjectUtils.isEmpty('text')).toBe(false);
    });
  });

  describe('Async Utilities', () => {
    it('should create delays', async () => {
      const start = Date.now();
      await AsyncUtils.delay(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(elapsed).toBeLessThan(150);
    });

    it('should timeout promises', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 200));
      
      await expect(AsyncUtils.timeout(slowPromise, 100))
        .rejects.toThrow('Operation timed out after 100ms');
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const flakyOperation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve('Success');
      };
      
      const result = await AsyncUtils.retry(flakyOperation, 3, 10);
      
      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });

    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let batchCount = 0;
      
      const processor = async (batch: number[]) => {
        batchCount++;
        return batch.map(n => n * 2);
      };
      
      const result = await AsyncUtils.batch(items, 3, processor);
      
      expect(result).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(batchCount).toBe(4); // 10 items / 3 per batch = 4 batches
    });

    it('should handle retry exhaustion', async () => {
      const alwaysFailingOperation = () => Promise.reject(new Error('Always fails'));
      
      await expect(AsyncUtils.retry(alwaysFailingOperation, 2, 10))
        .rejects.toThrow('Always fails');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      expect(StringUtils.sanitize(null as any)).toBe('');
      expect(() => NumberUtils.clamp(NaN, 1, 10)).not.toThrow();
      expect(() => DateUtils.formatDate(null as any)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      expect(() => NumberUtils.parseAmount('abc'))
        .toThrow('Invalid amount format: abc');
    });
  });
});