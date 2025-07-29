/**
 * Setup Command Implementation
 * Interactive CLI configuration setup
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { BaseCommand } from '../base/command.js';
import { saveConfig, loadConfig } from '../../config/index.js';
import type { BaseCommandOptions } from '../../types.js';

export class SetupCommand extends BaseCommand {
  protected commandName = 'setup';
  
  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    console.log(chalk.blue('A-Cube E-Receipt CLI Setup'));
    console.log(chalk.gray('Configure your CLI settings\n'));
    
    const config = await loadConfig();
    
    // Environment configuration
    const envAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Select environment:',
        choices: [
          { name: 'Sandbox (development/testing)', value: 'sandbox' },
          { name: 'Production (live system)', value: 'production' },
          { name: 'Development (local)', value: 'development' },
        ],
        default: config.environment || 'sandbox',
      },
    ]);

    config.environment = envAnswers.environment;

    // Base URLs configuration (optional)
    const { customUrls } = await inquirer.prompt([{
      type: 'confirm',
      name: 'customUrls',
      message: 'Configure custom base URLs?',
      default: false,
    }]);

    if (customUrls) {
      const urlAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiUrl',
          message: 'API base URL:',
          default: config.baseUrls?.api || '',
          validate: (input) => !input || input.startsWith('http') || 'Must be a valid HTTP URL',
        },
        {
          type: 'input',
          name: 'authUrl',
          message: 'Auth base URL:',
          default: config.baseUrls?.auth || '',
          validate: (input) => !input || input.startsWith('http') || 'Must be a valid HTTP URL',
        },
      ]);

      if (urlAnswers.apiUrl || urlAnswers.authUrl) {
        config.baseUrls = {
          ...(urlAnswers.apiUrl && { api: urlAnswers.apiUrl }),
          ...(urlAnswers.authUrl && { auth: urlAnswers.authUrl }),
        };
      }
    }

    // Trace configuration
    const { configureTrace } = await inquirer.prompt([{
      type: 'confirm',
      name: 'configureTrace',
      message: 'Configure error tracing?',
      default: config.trace?.enabled || false,
    }]);

    if (configureTrace) {
      const traceAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enabled',
          message: 'Enable error tracing?',
          default: config.trace?.enabled !== false,
        },
        {
          type: 'list',
          name: 'level',
          message: 'Trace level:',
          choices: ['basic', 'detailed', 'verbose', 'debug'],
          default: config.trace?.level || 'basic',
          when: (answers: any) => answers.enabled,
        },
        {
          type: 'list',
          name: 'outputFormat',
          message: 'Output format:',
          choices: ['pretty', 'compact', 'json'],
          default: config.trace?.outputFormat || 'pretty',
          when: (answers: any) => answers.enabled,
        },
        {
          type: 'confirm',
          name: 'includeStack',
          message: 'Include stack traces?',
          default: config.trace?.includeStack || false,
          when: (answers: any) => answers.enabled,
        },
        {
          type: 'confirm',
          name: 'includeContext',
          message: 'Include context information?',
          default: config.trace?.includeContext !== false,
          when: (answers: any) => answers.enabled,
        },
        {
          type: 'confirm',
          name: 'includeTimestamp',
          message: 'Include timestamps?',
          default: config.trace?.includeTimestamp !== false,
          when: (answers: any) => answers.enabled,
        },
      ]);

      if (traceAnswers.enabled !== undefined) {
        config.trace = {
          enabled: traceAnswers.enabled,
          level: traceAnswers.level || 'basic',
          outputFormat: traceAnswers.outputFormat || 'pretty',
          includeStack: traceAnswers.includeStack || false,
          includeContext: traceAnswers.includeContext !== false,
          includeTimestamp: traceAnswers.includeTimestamp !== false,
        };
      }
    }

    await saveConfig(config);
    console.log(chalk.green('✓ Configuration saved'));
  }
}