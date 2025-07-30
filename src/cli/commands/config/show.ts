/**
 * Show Config Command Implementation
 * Displays current CLI configuration
 */

import chalk from 'chalk';

import { BaseCommand } from '../base/command.js';
import { loadConfig } from '../../config/index.js';

import type { BaseCommandOptions } from '../../types.js';

export class ShowConfigCommand extends BaseCommand {
  protected commandName = 'config-show';

  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    const config = await loadConfig();

    console.log(chalk.blue('Current Configuration'));
    console.log('─'.repeat(40));

    console.log(`Environment: ${chalk.cyan(config.environment)}`);

    if (config.currentProfile) {
      console.log(`Current Profile: ${chalk.cyan(config.currentProfile)}`);
    }

    if (config.baseUrls) {
      console.log('\nCustom URLs:');
      if (config.baseUrls.api) {
        console.log(`  API: ${chalk.gray(config.baseUrls.api)}`);
      }
      if (config.baseUrls.auth) {
        console.log(`  Auth: ${chalk.gray(config.baseUrls.auth)}`);
      }
    }

    if (config.trace) {
      console.log('\nError Tracing:');
      console.log(`  Enabled: ${config.trace.enabled ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  Level: ${chalk.cyan(config.trace.level)}`);
      console.log(`  Format: ${chalk.cyan(config.trace.outputFormat)}`);
      console.log(`  Stack traces: ${config.trace.includeStack ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  Context: ${config.trace.includeContext ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  Timestamps: ${config.trace.includeTimestamp ? chalk.green('✓') : chalk.red('✗')}`);
    }
  }
}
