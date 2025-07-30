/**
 * Process Management Utilities
 * Handles process lifecycle, status reporting, and graceful exits
 */

import chalk from 'chalk';

import type { ProcessStatus } from '../types.js';

// Process status stamping utility
export function stampProcessStatus(commandName: string, status: ProcessStatus, details?: string): void {
  const timestamp = new Date().toISOString();
  const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
  const statusColor = status === 'success' ? 'green' : status === 'error' ? 'red' : 'yellow';

  console.log(chalk.gray(`\n${  '─'.repeat(60)}`));
  console.log(chalk[statusColor](`${statusIcon} Process: ${commandName}`));
  console.log(chalk.gray(`   Status: ${status.toUpperCase()}`));
  console.log(chalk.gray(`   Time: ${timestamp}`));
  if (details) {
    console.log(chalk.gray(`   Details: ${details}`));
  }
  console.log(chalk.gray('─'.repeat(60)));
}

export function exitWithStatus(
  commandName: string,
  status: ProcessStatus,
  details?: string,
  exitCode = 0,
): never {
  stampProcessStatus(commandName, status, details);

  // In CLI environments, we need to force exit to prevent hanging
  // This is necessary because HTTP clients, timers, or other resources
  // might keep the event loop alive
  process.exit(exitCode);
}

// Graceful shutdown handler
export function setupGracefulShutdown(commandName: string): void {
  const handleShutdown = (signal: string) => {
    console.log(chalk.yellow(`\n\nReceived ${signal}. Shutting down gracefully...`));
    exitWithStatus(commandName, 'cancelled', `Interrupted by ${signal}`, 130);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}
