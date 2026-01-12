import { clearObject, clearObjectShallow, hasNonEmptyValues, isEmpty } from '../object';

describe('clearObject', () => {
  it('should return undefined for null input', () => {
    const result = clearObject(null);
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    const result = clearObject(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = clearObject('');
    expect(result).toBeUndefined();
  });

  it('should preserve non-empty string', () => {
    const result = clearObject('hello');
    expect(result).toBe('hello');
  });

  it('should preserve number values', () => {
    expect(clearObject(0)).toBe(0);
    expect(clearObject(42)).toBe(42);
  });

  it('should preserve boolean values', () => {
    expect(clearObject(true)).toBe(true);
    expect(clearObject(false)).toBe(false);
  });

  describe('object cleaning', () => {
    it('should remove null values from object', () => {
      const input = { a: 'value', b: null, c: 'other' };

      const result = clearObject(input);

      expect(result).toEqual({ a: 'value', c: 'other' });
    });

    it('should remove undefined values from object', () => {
      const input = { a: 'value', b: undefined, c: 'other' };

      const result = clearObject(input);

      expect(result).toEqual({ a: 'value', c: 'other' });
    });

    it('should remove empty string values from object', () => {
      const input = { a: 'value', b: '', c: 'other' };

      const result = clearObject(input);

      expect(result).toEqual({ a: 'value', c: 'other' });
    });

    it('should clean nested objects', () => {
      const input = {
        a: 'value',
        nested: {
          b: 'nested value',
          c: null,
          d: '',
        },
      };

      const result = clearObject(input);

      expect(result).toEqual({
        a: 'value',
        nested: {
          b: 'nested value',
        },
      });
    });

    it('should preserve 0 values', () => {
      const input = { a: 0, b: null };

      const result = clearObject(input);

      expect(result).toEqual({ a: 0 });
    });

    it('should preserve false values', () => {
      const input = { a: false, b: null };

      const result = clearObject(input);

      expect(result).toEqual({ a: false });
    });
  });

  describe('array cleaning', () => {
    it('should remove null/undefined from arrays', () => {
      const input = ['a', null, 'b', undefined, 'c'];

      const result = clearObject(input);

      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should remove empty strings from arrays', () => {
      const input = ['a', '', 'b'];

      const result = clearObject(input);

      expect(result).toEqual(['a', 'b']);
    });

    it('should clean objects within arrays', () => {
      const input = [
        { a: 'value', b: null },
        { c: '', d: 'other' },
      ];

      const result = clearObject(input);

      expect(result).toEqual([{ a: 'value' }, { d: 'other' }]);
    });
  });
});

describe('clearObjectShallow', () => {
  it('should remove null values', () => {
    const input = { a: 'value', b: null };

    const result = clearObjectShallow(input);

    expect(result).toEqual({ a: 'value' });
  });

  it('should remove undefined values', () => {
    const input = { a: 'value', b: undefined };

    const result = clearObjectShallow(input);

    expect(result).toEqual({ a: 'value' });
  });

  it('should remove empty string values', () => {
    const input = { a: 'value', b: '' };

    const result = clearObjectShallow(input);

    expect(result).toEqual({ a: 'value' });
  });

  it('should NOT clean nested objects', () => {
    const input = { a: 'value', nested: { b: null } };

    const result = clearObjectShallow(input);

    // Shallow clean keeps nested objects as-is
    expect(result).toEqual({ a: 'value', nested: { b: null } });
  });

  it('should return empty object for non-object input', () => {
    expect(clearObjectShallow(null as unknown as Record<string, unknown>)).toEqual({});
    expect(clearObjectShallow(undefined as unknown as Record<string, unknown>)).toEqual({});
  });

  it('should preserve 0 and false values', () => {
    const input = { a: 0, b: false, c: null };

    const result = clearObjectShallow(input);

    expect(result).toEqual({ a: 0, b: false });
  });
});

describe('isEmpty', () => {
  it('should return true for null', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });

  it('should return false for 0', () => {
    expect(isEmpty(0)).toBe(false);
  });

  it('should return false for false', () => {
    expect(isEmpty(false)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(isEmpty({})).toBe(false);
  });

  it('should return false for empty array', () => {
    expect(isEmpty([])).toBe(false);
  });
});

describe('hasNonEmptyValues', () => {
  it('should return true for object with non-empty values', () => {
    const obj = { a: 'value', b: null };

    expect(hasNonEmptyValues(obj)).toBe(true);
  });

  it('should return false for object with only empty values', () => {
    const obj = { a: null, b: undefined, c: '' };

    expect(hasNonEmptyValues(obj)).toBe(false);
  });

  it('should return true for object with 0', () => {
    const obj = { a: 0, b: null };

    expect(hasNonEmptyValues(obj)).toBe(true);
  });

  it('should return true for object with false', () => {
    const obj = { a: false, b: null };

    expect(hasNonEmptyValues(obj)).toBe(true);
  });

  it('should return false for empty object', () => {
    expect(hasNonEmptyValues({})).toBe(false);
  });

  it('should return false for null input', () => {
    expect(hasNonEmptyValues(null as unknown as Record<string, unknown>)).toBe(false);
  });

  it('should return false for non-object input', () => {
    expect(hasNonEmptyValues('string' as unknown as Record<string, unknown>)).toBe(false);
  });
});
