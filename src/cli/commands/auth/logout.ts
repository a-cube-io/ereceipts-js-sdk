/**
 * Logout Command Implementation
 * Handles user logout and session cleanup
 */

import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { BaseCommand } from '../base/command.js';
import { clearAuth, loadConfig } from '../../config/index.js';
import { cleanupSDK, initializeSDK } from '../../utils/sdk.js';

import type { AuthCommandOptions } from '../../types.js';

export class LogoutCommand extends BaseCommand {
  protected commandName = 'logout';

  protected async executeCommand(options: AuthCommandOptions): Promise<void> {
    const config = await loadConfig();
    const profileText = config.currentProfile ? ` (profile: ${config.currentProfile})` : '';

    if (!options.force) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to logout${profileText}?`,
        default: false,
      }]);

      if (!confirm) {
        console.log(chalk.yellow('Logout cancelled'));
        return;
      }
    }

    const spinner = ora('Logging out...').start();

    try {
      // Try to properly logout from the server
      try {
        const sdk = await initializeSDK(false);
        await sdk.logout();
      } catch (error) {
        // Ignore server logout errors - we'll clear local auth anyway
        console.log('🔧 Debug: Server logout failed, clearing local auth:', error);
      }

      // Clear authentication state
      await clearAuth(config.currentProfile);

      // Cleanup SDK
      await cleanupSDK();

      spinner.succeed('Logged out successfully');
      console.log(chalk.green(`You have been logged out${profileText}`));

    } catch (error: any) {
      spinner.fail('Logout failed');
      throw error;
    }
  }
}
