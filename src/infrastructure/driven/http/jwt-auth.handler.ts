import { AuthConfig, IAuthHandler } from '@/application/ports/driven/auth-handler.port';
import { ITokenStoragePort } from '@/application/ports/driven/token-storage.port';

export class JwtAuthHandler implements IAuthHandler {
  constructor(private readonly tokenStorage: ITokenStoragePort) {}

  async getAuthConfig(_url: string, _method: string): Promise<AuthConfig> {
    return { mode: 'jwt', usePort444: false };
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.tokenStorage.getAccessToken();
    if (!token) {
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }
}
