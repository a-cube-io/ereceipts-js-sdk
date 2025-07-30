/**
 * Ora Mock for Testing
 * Provides a simplified version of ora that works in Jest ESM environment
 */

interface MockSpinner {
  start: () => MockSpinner;
  succeed: (text?: string) => MockSpinner;
  fail: (text?: string) => MockSpinner;
  warn: (text?: string) => MockSpinner;
  info: (text?: string) => MockSpinner;
  stop: () => MockSpinner;
  text: string;
}

const createMockSpinner = (text?: string): MockSpinner => ({
  start: () => mockSpinner,
  succeed: (text?: string) => {
    if (text) {mockSpinner.text = text;}
    return mockSpinner;
  },
  fail: (text?: string) => {
    if (text) {mockSpinner.text = text;}
    return mockSpinner;
  },
  warn: (text?: string) => {
    if (text) {mockSpinner.text = text;}
    return mockSpinner;
  },
  info: (text?: string) => {
    if (text) {mockSpinner.text = text;}
    return mockSpinner;
  },
  stop: () => mockSpinner,
  text: text || '',
});

const mockSpinner = createMockSpinner();

const ora = (text?: string) => createMockSpinner(text);

export default ora;
