import {
  ISecureStoragePort as ISecureStorage,
  IStoragePort as IStorage,
} from '@/application/ports/driven';
import {
  NodeSecureStorageAdapter,
  NodeStorageAdapter,
} from '@/infrastructure/driven/platforms/node/storage';
import {
  ReactNativeSecureStorageAdapter,
  ReactNativeStorageAdapter,
} from '@/infrastructure/driven/platforms/react-native/storage';
import {
  WebSecureStorageAdapter,
  WebStorageAdapter,
} from '@/infrastructure/driven/platforms/web/storage';

export interface StorageAdapters {
  storage: IStorage;
  secureStorage: ISecureStorage;
}

export function loadStorageAdapters(platform: string): StorageAdapters {
  switch (platform) {
    case 'web':
      return {
        storage: new WebStorageAdapter(),
        secureStorage: new WebSecureStorageAdapter(),
      };
    case 'react-native':
      return {
        storage: new ReactNativeStorageAdapter(),
        secureStorage: new ReactNativeSecureStorageAdapter(),
      };
    case 'node':
    default:
      return {
        storage: new NodeStorageAdapter(),
        secureStorage: new NodeSecureStorageAdapter(),
      };
  }
}
