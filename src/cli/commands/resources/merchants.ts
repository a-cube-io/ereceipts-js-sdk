/**
 * Merchants Command Implementation
 * Handles merchant management operations
 */

import { BaseResourceCommand } from '../base/resource.js';

import type { ACubeSDK } from '../../../index.js';
import type { BaseCommandOptions } from '../../types.js';

export class MerchantsCommand extends BaseResourceCommand {
  protected commandName = 'merchants';

  protected resourceName = 'merchant';

  protected resourceNamePlural = 'merchants';

  protected getSDKResource(sdk: ACubeSDK) {
    return sdk.merchants;
  }

  protected displayItems(merchants: any[]): void {
    merchants.forEach((merchant) => {
      const address = merchant.address
        ? `${merchant.address.street_address || ''}, ${merchant.address.city || ''}`.trim().replace(/^,\s*/, '')
        : 'N/A';

      console.log(`
${this.formatItemHeader(merchant.uuid, merchant.name)}
${this.formatProperty('Fiscal ID', merchant.fiscal_id)}
${this.formatProperty('Email', merchant.email)}
${this.formatProperty('Address', address)}
`);
    });
  }

  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    // This method is called by the base class
    // The specific operation (list, get) is handled by individual methods
    throw new Error('MerchantsCommand.executeCommand should not be called directly');
  }
}
