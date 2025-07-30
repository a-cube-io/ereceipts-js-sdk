/**
 * Cashiers Command Implementation
 * Handles cashier management operations
 */

import { BaseResourceCommand } from '../base/resource.js';

import type { ACubeSDK } from '../../../index.js';
import type { BaseCommandOptions } from '../../types.js';

export class CashiersCommand extends BaseResourceCommand {
  protected commandName = 'cashiers';

  protected resourceName = 'cashier';

  protected resourceNamePlural = 'cashiers';

  protected getSDKResource(sdk: ACubeSDK) {
    return sdk.cashiers;
  }

  protected displayItems(cashiers: any[]): void {
    cashiers.forEach((cashier) => {
      console.log(`
${this.formatItemHeader(cashier.id.toString())}
${this.formatProperty('Email', cashier.email)}
`);
    });
  }

  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    // This method is called by the base class
    // The specific operation (list, get) is handled by individual methods
    throw new Error('CashiersCommand.executeCommand should not be called directly');
  }
}
