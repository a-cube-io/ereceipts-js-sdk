/**
 * Chalk Mock for Testing
 * Provides a simplified version of chalk that works in Jest ESM environment
 */

const mockChalk = (text: string) => text;

// Create a function with properties to match chalk's structure
const chalk = Object.assign(mockChalk, {
  blue: mockChalk,
  green: mockChalk,
  red: mockChalk,
  yellow: mockChalk,
  gray: mockChalk,
  grey: mockChalk,
  cyan: mockChalk,
  magenta: mockChalk,
  white: mockChalk,
  black: mockChalk,
  bold: mockChalk,
  dim: mockChalk,
  italic: mockChalk,
  underline: mockChalk,
  strikethrough: mockChalk,
  bgBlue: mockChalk,
  bgGreen: mockChalk,
  bgRed: mockChalk,
  bgYellow: mockChalk,
  bgGray: mockChalk,
  bgCyan: mockChalk,
  bgMagenta: mockChalk,
  bgWhite: mockChalk,
  bgBlack: mockChalk,
  hex: () => mockChalk,
  rgb: () => mockChalk,
  hsl: () => mockChalk,
  keyword: () => mockChalk,
  ansi256: () => mockChalk,
  bgHex: () => mockChalk,
  bgRgb: () => mockChalk,
  bgHsl: () => mockChalk,
  bgKeyword: () => mockChalk,
  bgAnsi256: () => mockChalk,
});

export default chalk;
