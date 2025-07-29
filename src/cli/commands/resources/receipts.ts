/**
 * Receipts Command Implementation
 * Handles receipt management operations
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { BaseResourceCommand } from '../base/resource.js';
import { initializeSDK } from '../../utils/sdk.js';
import type { ACubeSDK } from '../../../index.js';
import type { BaseCommandOptions } from '../../types.js';

export class ReceiptsCommand extends BaseResourceCommand {
  protected commandName = 'receipts';
  protected resourceName = 'receipt';
  protected resourceNamePlural = 'receipts';
  
  protected getSDKResource(sdk: ACubeSDK) {
    return sdk.receipts;
  }
  
  protected displayItems(receipts: any[]): void {
    receipts.forEach((receipt) => {
      console.log(`
${this.formatItemHeader(receipt.uuid, receipt.document_number)}
${this.formatProperty('Type', receipt.type)}
${this.formatProperty('Amount', `€${receipt.total_amount}`)}
${this.formatProperty('Date', new Date(receipt.created_at).toLocaleDateString())}
${this.formatProperty('Lottery', receipt.customer_lottery_code)}
`);
    });
  }
  
  /**
   * Create a new receipt interactively
   */
  async create(_options: BaseCommandOptions): Promise<void> {
    console.log(chalk.blue('Creating a new receipt'));
    
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'totalAmount',
        message: 'Total amount (in euros):',
        validate: (input) => input > 0 || 'Amount must be positive',
      },
      {
        type: 'input',
        name: 'customerLotteryCode',
        message: 'Customer lottery code (optional):',
      },
    ]);
    
    const receiptData = {
      total_amount: answers.totalAmount.toFixed(2),
      ...(answers.customerLotteryCode && { customer_lottery_code: answers.customerLotteryCode }),
    };
    
    const spinner = ora('Creating receipt...').start();
    
    try {
      const sdk = await initializeSDK();
      const receipt = await sdk.receipts.create(receiptData);
      
      spinner.succeed('Receipt created successfully');
      console.log(`Receipt ID: ${chalk.green(receipt.uuid)}`);
      
    } catch (error: any) {
      spinner.fail('Failed to create receipt');
      throw error;
    }
  }
  
  protected async executeCommand(_options: any): Promise<void> {
    // This method is called by the base class
    // The specific operation (list, create, get, delete) is handled by individual methods
    throw new Error('ReceiptsCommand.executeCommand should not be called directly');
  }
}