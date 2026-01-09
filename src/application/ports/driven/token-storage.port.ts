export interface ITokenStoragePort {
  getAccessToken(): Promise<string | null>;
  saveAccessToken(token: string, expiresAt: number): Promise<void>;
  clearTokens(): Promise<void>;
  getUser<T>(): Promise<T | null>;
  saveUser<T>(user: T): Promise<void>;
}
