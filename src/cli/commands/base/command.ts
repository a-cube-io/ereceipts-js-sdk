/**
 * Base Command Class
 * Abstract base class for all CLI commands with common functionality
 */

import chalk from 'chalk';

import { handleError } from '../../utils/errors.js';
import { AuthenticationRequiredError } from '../../types.js';
import { exitWithStatus, setupGracefulShutdown } from '../../utils/process.js';

import type { BaseCommandOptions } from '../../types.js';

export abstract class BaseCommand {
  protected abstract commandName: string;

  /**
   * Execute the command with error handling and process management
   */
  async execute(options: BaseCommandOptions): Promise<void> {
    setupGracefulShutdown(this.commandName);

    try {
      await this.run(options);

      // Cleanup SDK connections to allow process exit
      const { cleanupSDK } = await import('../../utils/sdk.js');
      try {
        await Promise.race([
          cleanupSDK(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 1000)),
        ]);
      } catch {
        // Ignore cleanup timeout - we'll exit anyway
      }

      exitWithStatus(this.commandName, 'success');
    } catch (error) {
      // Handle authentication errors with user-friendly messages
      if (error instanceof AuthenticationRequiredError) {
        console.error(chalk.red('\n❌ Authentication Required'));
        console.error(chalk.yellow(`💡 ${  error.message}`));
        console.error(chalk.gray('\nExample: acube auth login --profile sandbox -u user@example.com -p password\n'));

        // Cleanup before exit
        const { cleanupSDK } = await import('../../utils/sdk.js');
        try {
          await Promise.race([
            cleanupSDK(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 1000)),
          ]);
        } catch {
          // Ignore cleanup timeout - we'll exit anyway
        }

        process.exit(1);
      }

      await handleError(error, { command: this.commandName }, options);

      // Cleanup before exit
      const { cleanupSDK } = await import('../../utils/sdk.js');
      try {
        await Promise.race([
          cleanupSDK(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 1000)),
        ]);
      } catch {
        // Ignore cleanup timeout - we'll exit anyway
      }

      exitWithStatus(this.commandName, 'error', error instanceof Error ? error.message : 'Unknown error', 1);
    }
  }

  /**
   * Execute the command with error handling but without process exit
   * Useful for interactive mode or when commands are called programmatically
   */
  async run(options: BaseCommandOptions): Promise<void> {
    try {
      await this.executeCommand(options);
    } catch (error) {
      await this.handleError(error, options);
      throw error;
    }
  }

  /**
   * Main command logic - implemented by subclasses
   */
  protected abstract executeCommand(options: BaseCommandOptions): Promise<void>;

  /**
   * Handle command-specific errors
   */
  protected async handleError(error: any, options: BaseCommandOptions): Promise<void> {
    await handleError(error, { command: this.commandName }, options);
  }

  /**
   * Validate command options - override in subclasses
   */
  protected validateOptions(_options: BaseCommandOptions): void {
    // Base validation - can be overridden
  }
}
