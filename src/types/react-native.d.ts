/**
 * Type declarations for React Native dependencies
 */

// AsyncStorage
declare module '@react-native-async-storage/async-storage' {
  export default class AsyncStorage {
    static getItem(key: string): Promise<string | null>;
    static setItem(key: string, value: string): Promise<void>;
    static removeItem(key: string): Promise<void>;
    static multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
    static multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
    static clear(): Promise<void>;
    static getAllKeys(): Promise<string[]>;
  }
}

// NetInfo
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }

  export default class NetInfo {
    static fetch(): Promise<NetInfoState>;
    static addEventListener(listener: (state: NetInfoState) => void): () => void;
  }
}

// React Native
declare module 'react-native' {
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    select: <T>(specifics: { [platform: string]: T; default?: T }) => T;
  };

  // Legacy AsyncStorage (deprecated, but needed for fallback)
  export const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
    multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
    multiRemove(keys: string[]): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<string[]>;
  };
}

// Expo SecureStore
declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

// React Native Keychain
declare module 'react-native-keychain' {
  export interface UserCredentials {
    username: string;
    password: string;
  }

  export function setInternetCredentials(
    server: string,
    username: string,
    password: string
  ): Promise<void>;

  export function getInternetCredentials(
    server: string
  ): Promise<UserCredentials | false>;

  export function resetInternetCredentials(server: string): Promise<void>;
}