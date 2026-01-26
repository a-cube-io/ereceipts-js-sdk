import { ISecureStoragePort } from '@/application/ports/driven/storage.port';
import { ITokenStoragePort } from '@/application/ports/driven/token-storage.port';

const TOKEN_KEY = 'acube_tokens';
const USER_KEY = 'acube_user';

interface StoredTokenData {
  accessToken: string;
  expiresAt: number;
}

export class TokenStorageAdapter implements ITokenStoragePort {
  constructor(private readonly secureStorage: ISecureStoragePort) {}

  async getAccessToken(): Promise<string | null> {
    const tokenJson = await this.secureStorage.get(TOKEN_KEY);
    if (!tokenJson) {
      return null;
    }
    const tokenData: StoredTokenData = JSON.parse(tokenJson);
    return tokenData.accessToken;
  }

  async saveAccessToken(token: string, expiresAt: number): Promise<void> {
    const tokenData: StoredTokenData = {
      accessToken: token,
      expiresAt,
    };
    await this.secureStorage.set(TOKEN_KEY, JSON.stringify(tokenData));
  }

  async clearTokens(): Promise<void> {
    await Promise.all([this.secureStorage.remove(TOKEN_KEY), this.secureStorage.remove(USER_KEY)]);
  }

  async getUser<T>(): Promise<T | null> {
    const userJson = await this.secureStorage.get(USER_KEY);
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson) as T;
  }

  async saveUser<T>(user: T): Promise<void> {
    await this.secureStorage.set(USER_KEY, JSON.stringify(user));
  }
}
