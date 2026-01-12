export interface IStoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<Record<string, string | null>>;
  multiSet(items: Record<string, string>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export interface ISecureStoragePort extends IStoragePort {
  isAvailable(): Promise<boolean>;
  getSecurityLevel(): Promise<string>;
}

export type IStorage = IStoragePort;
export type ISecureStorage = ISecureStoragePort;
