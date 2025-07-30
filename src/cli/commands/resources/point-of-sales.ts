/**
 * Point of Sales Command Implementation
 * Handles POS device management operations
 */

import { BaseResourceCommand } from '../base/resource.js';

import type { ACubeSDK } from '../../../index.js';
import type { BaseCommandOptions } from '../../types.js';

export class PointOfSalesCommand extends BaseResourceCommand {
  protected commandName = 'point-of-sales';

  protected resourceName = 'point of sale';

  protected resourceNamePlural = 'point of sales';

  protected getSDKResource(sdk: ACubeSDK) {
    return sdk.pointOfSales;
  }

  protected displayItems(posList: any[]): void {
    posList.forEach((pos) => {
      const address = pos.address
        ? `${pos.address.street_address || ''}, ${pos.address.city || ''} ${pos.address.zip_code || ''}`.trim().replace(/^,\s*/, '')
        : 'N/A';

      console.log(`
${this.formatItemHeader(pos.serial_number)}
${this.formatProperty('Status', pos.status)}
${this.formatProperty('Address', address)}
`);
    });
  }

  protected async executeCommand(options: BaseCommandOptions): Promise<void> {
    // Default to list operation for resource commands
    // Individual operations can be specified via options or extending classes
    const resourceOptions = options as any;
    await this.list(resourceOptions);
  }
}
