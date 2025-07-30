/**
 * Output Formatting Utilities
 * Consistent formatting for CLI output
 */

import chalk from 'chalk';

/**
 * Format a header with consistent styling
 */
export function formatHeader(text: string, color: 'blue' | 'green' | 'red' | 'yellow' = 'blue'): string {
  return chalk[color].bold(text);
}

/**
 * Format a section separator
 */
export function formatSeparator(length = 40): string {
  return chalk.gray('─'.repeat(length));
}

/**
 * Format a property display
 */
export function formatProperty(label: string, value: any, fallback = 'N/A'): string {
  const displayValue = value ?? fallback;
  return `  ${label}: ${displayValue}`;
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
  return chalk.green(`✓ ${message}`);
}

/**
 * Format an error message
 */
export function formatError(message: string): string {
  return chalk.red(`✗ ${message}`);
}

/**
 * Format a warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow(`⚠ ${message}`);
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return chalk.blue(`ℹ ${message}`);
}

/**
 * Format a list item
 */
export function formatListItem(text: string, active = false): string {
  const marker = active ? chalk.green('→') : ' ';
  const content = active ? chalk.green(text) : text;
  return `${marker} ${content}`;
}

/**
 * Format JSON output with syntax highlighting
 */
export function formatJSON(obj: any): string {
  const json = JSON.stringify(obj, null, 2);
  return json
    .replace(/"([^"]+)":/g, `${chalk.blue('"$1"')  }:`)
    .replace(/: "([^"]+)"/g, `: ${  chalk.green('"$1"')}`)
    .replace(/: (\d+)/g, `: ${  chalk.yellow('$1')}`)
    .replace(/: (true|false)/g, `: ${  chalk.cyan('$1')}`)
    .replace(/: null/g, `: ${  chalk.gray('null')}`);
}
