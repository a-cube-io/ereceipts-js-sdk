/**
 * Formatters Tests
 * Tests for output formatting utilities
 */

import {
  formatHeader,
  formatSeparator,
  formatProperty,
  formatSuccess,
  formatError,
  formatWarning,
  formatInfo,
  formatListItem,
  formatJSON
} from '../../../cli/utils/formatters.js';

describe('Formatters', () => {
  describe('formatHeader', () => {
    it('should format header with default blue color', () => {
      const result = formatHeader('Test Header');
      expect(result).toContain('Test Header');
    });

    it('should format header with specified color', () => {
      const result = formatHeader('Test Header', 'green');
      expect(result).toContain('Test Header');
    });
  });

  describe('formatSeparator', () => {
    it('should format separator with default length', () => {
      const result = formatSeparator();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format separator with specified length', () => {
      const result = formatSeparator(20);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatProperty', () => {
    it('should format property with value', () => {
      const result = formatProperty('Name', 'John Doe');
      expect(result).toContain('Name');
      expect(result).toContain('John Doe');
    });

    it('should format property with fallback when value is null', () => {
      const result = formatProperty('Name', null);
      expect(result).toContain('Name');
      expect(result).toContain('N/A');
    });

    it('should format property with custom fallback', () => {
      const result = formatProperty('Name', null, 'Unknown');
      expect(result).toContain('Name');
      expect(result).toContain('Unknown');
    });
  });

  describe('status formatters', () => {
    it('should format success message', () => {
      const result = formatSuccess('Operation completed');
      expect(result).toContain('Operation completed');
      expect(result).toContain('✓');
    });

    it('should format error message', () => {
      const result = formatError('Operation failed');
      expect(result).toContain('Operation failed');
      expect(result).toContain('✗');
    });

    it('should format warning message', () => {
      const result = formatWarning('Be careful');
      expect(result).toContain('Be careful');
      expect(result).toContain('⚠');
    });

    it('should format info message', () => {
      const result = formatInfo('For your information');
      expect(result).toContain('For your information');
      expect(result).toContain('ℹ');
    });
  });

  describe('formatListItem', () => {
    it('should format inactive list item', () => {
      const result = formatListItem('Item 1');
      expect(result).toContain('Item 1');
    });

    it('should format active list item', () => {
      const result = formatListItem('Item 1', true);
      expect(result).toContain('Item 1');
      expect(result).toContain('→');
    });
  });

  describe('formatJSON', () => {
    it('should format JSON object with syntax highlighting', () => {
      const obj = {
        name: 'John',
        age: 30,
        active: true,
        data: null
      };
      
      const result = formatJSON(obj);
      expect(result).toContain('name');
      expect(result).toContain('John');
      expect(result).toContain('30');
      expect(result).toContain('true');
      expect(result).toContain('null');
    });
  });
});