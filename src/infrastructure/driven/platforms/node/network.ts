import { NetworkInfo } from '@/application/ports/driven';

import { NetworkBase } from '../shared/network-base';

/**
 * Node.js network monitor using RxJS
 * Assumes always online by default (server environment)
 */
export class NodeNetworkMonitor extends NetworkBase {
  constructor() {
    super(true, 300);
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    return {
      type: 'ethernet',
    };
  }

  /**
   * Manually set network status (for testing)
   */
  setNetworkStatus(online: boolean): void {
    this.updateStatus(online);
  }
}
