import { INetworkPort as INetworkMonitor } from '@/application/ports/driven';
import { NodeNetworkMonitor } from '@/infrastructure/driven/platforms/node/network';
import { ReactNativeNetworkMonitor } from '@/infrastructure/driven/platforms/react-native/network';
import { WebNetworkMonitor } from '@/infrastructure/driven/platforms/web/network';

export function loadNetworkMonitor(platform: string): INetworkMonitor {
  switch (platform) {
    case 'web':
      return new WebNetworkMonitor();
    case 'react-native':
      return new ReactNativeNetworkMonitor();
    case 'node':
    default:
      return new NodeNetworkMonitor();
  }
}
