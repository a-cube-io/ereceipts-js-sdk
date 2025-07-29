/**
 * Interactive Mode Command
 * Provides an interactive CLI experience
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { BaseCommand } from './base/command.js';
import { ReceiptsCommand, CashiersCommand, MerchantsCommand, PointOfSalesCommand } from './resources/index.js';
import { LoginCommand, LogoutCommand, StatusCommand } from './auth/index.js';
import type { BaseCommandOptions } from '../types.js';

export class InteractiveCommand extends BaseCommand {
  protected commandName = 'interactive';
  
  protected async executeCommand(options: BaseCommandOptions): Promise<void> {
    console.log(chalk.blue.bold('A-Cube E-Receipt Interactive Mode'));
    console.log(chalk.gray('Select an option to continue\n'));
    
    while (true) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Authentication', value: 'auth' },
          { name: 'Manage Receipts', value: 'receipts' },
          { name: 'Manage Cashiers', value: 'cashiers' },
          { name: 'Manage Merchants', value: 'merchants' },
          { name: 'Manage Point of Sales', value: 'pos' },
          { name: 'Exit', value: 'exit' },
        ],
      }]);
      
      if (action === 'exit') {
        console.log(chalk.green('Goodbye! 👋'));
        break;
      }
      
      try {
        await this.handleAction(action, options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        console.log(chalk.gray('Press any key to continue...'));
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
      }
    }
  }
  
  private async handleAction(action: string, options: BaseCommandOptions): Promise<void> {
    switch (action) {
      case 'auth':
        await this.handleAuthMenu(options);
        break;
      case 'receipts':
        await this.handleResourceMenu('receipts', new ReceiptsCommand(), options);
        break;
      case 'cashiers':
        await this.handleResourceMenu('cashiers', new CashiersCommand(), options);
        break;
      case 'merchants':
        await this.handleResourceMenu('merchants', new MerchantsCommand(), options);
        break;
      case 'pos':
        await this.handleResourceMenu('point of sales', new PointOfSalesCommand(), options);
        break;
    }
  }
  
  private async handleAuthMenu(options: BaseCommandOptions): Promise<void> {
    const { authAction } = await inquirer.prompt([{
      type: 'list',
      name: 'authAction',
      message: 'Authentication:',
      choices: [
        { name: 'Login', value: 'login' },
        { name: 'Show Status', value: 'status' },
        { name: 'Logout', value: 'logout' },
        { name: 'Back', value: 'back' },
      ],
    }]);
    
    if (authAction === 'back') return;
    
    switch (authAction) {
      case 'login':
        await new LoginCommand().run(options);
        break;
      case 'status':
        await new StatusCommand().run(options);
        break;
      case 'logout':
        await new LogoutCommand().run(options);
        break;
    }
  }
  
  private async handleResourceMenu(resourceName: string, command: any, options: BaseCommandOptions): Promise<void> {
    const { resourceAction } = await inquirer.prompt([{
      type: 'list',
      name: 'resourceAction',
      message: `${resourceName}:`,
      choices: [
        { name: 'List', value: 'list' },
        ...(command instanceof ReceiptsCommand ? [{ name: 'Create', value: 'create' }] : []),
        { name: 'Back', value: 'back' },
      ],
    }]);
    
    if (resourceAction === 'back') return;
    
    switch (resourceAction) {
      case 'list':
        await command.list({ limit: 10, ...options });
        break;
      case 'create':
        if (command instanceof ReceiptsCommand) {
          await command.create(options);
        }
        break;
    }
  }
}