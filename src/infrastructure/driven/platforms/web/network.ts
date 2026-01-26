import { fromEvent, merge } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { NetworkInfo } from '@/application/ports/driven';

import { NetworkBase } from '../shared/network-base';

interface NetworkInformationConnection {
  type?: string;
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number;
  rtt?: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationConnection;
}

/**
 * Web network monitor using RxJS with browser events
 * Uses fromEvent to create observables from online/offline events
 */
export class WebNetworkMonitor extends NetworkBase {
  constructor() {
    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    super(initialOnline, 300);
    this.setupListeners();
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((online) => this.updateStatus(online));
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;

      return {
        type: this.mapConnectionType(connection?.type ?? 'unknown'),
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      };
    }

    return {
      type: 'unknown',
    };
  }

  private mapConnectionType(type: string): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
      case '2g':
      case '3g':
      case '4g':
      case '5g':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }
}
