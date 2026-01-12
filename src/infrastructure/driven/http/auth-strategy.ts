import { AuthConfig, AuthMode } from '@/application/ports/driven/auth-handler.port';
import { IMTLSPort } from '@/application/ports/driven/mtls.port';
import { UserRoles, hasRole } from '@/domain/value-objects';

import { JwtAuthHandler } from './jwt-auth.handler';
import { MtlsAuthHandler } from './mtls-auth.handler';

export interface IUserProvider {
  getCurrentUser(): Promise<{ roles: UserRoles } | null>;
  getAccessToken(): Promise<string | null>;
}

export class AuthStrategy {
  constructor(
    private readonly jwtHandler: JwtAuthHandler,
    private readonly mtlsHandler: MtlsAuthHandler,
    private readonly userProvider: IUserProvider | null,
    private readonly mtlsAdapter: IMTLSPort | null
  ) {}

  async determineAuthConfig(
    url: string,
    method: string,
    explicitMode?: AuthMode
  ): Promise<AuthConfig> {
    const platform = this.detectPlatform();
    const userRole = await this.getUserRole();
    const isReceiptEndpoint = this.isReceiptEndpoint(url);

    if (userRole === 'SUPPLIER') {
      return { mode: 'jwt', usePort444: false };
    }

    if (userRole === 'CASHIER') {
      if (!isReceiptEndpoint) {
        return { mode: 'jwt', usePort444: false };
      }
      if (platform === 'mobile') {
        return { mode: 'mtls', usePort444: true };
      }
      return { mode: 'jwt', usePort444: true };
    }

    if (userRole === 'MERCHANT') {
      if (!isReceiptEndpoint) {
        return { mode: 'jwt', usePort444: false };
      }

      if (this.isReturnableItemsEndpoint(url)) {
        return { mode: 'mtls', usePort444: true };
      }

      if (method === 'GET') {
        if (this.isDetailedReceiptEndpoint(url)) {
          if (platform === 'mobile') {
            return { mode: 'mtls', usePort444: true };
          }
          return { mode: 'jwt', usePort444: true };
        }
        return { mode: 'jwt', usePort444: false };
      }

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (platform === 'mobile') {
          return { mode: 'mtls', usePort444: true };
        }
        return { mode: 'jwt', usePort444: true };
      }

      return { mode: 'jwt', usePort444: false };
    }

    if (explicitMode) {
      if (userRole === 'SUPPLIER' && explicitMode === 'mtls') {
        return { mode: 'jwt', usePort444: false };
      }
      return {
        mode: explicitMode,
        usePort444: explicitMode === 'mtls' || (platform === 'web' && isReceiptEndpoint),
      };
    }

    if (platform === 'web') {
      return { mode: 'jwt', usePort444: isReceiptEndpoint };
    }

    if (isReceiptEndpoint && platform === 'mobile') {
      return { mode: 'mtls', usePort444: true };
    }

    return { mode: 'jwt', usePort444: false };
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    return this.jwtHandler.getAuthHeaders();
  }

  getMtlsHandler(): MtlsAuthHandler {
    return this.mtlsHandler;
  }

  getJwtHandler(): JwtAuthHandler {
    return this.jwtHandler;
  }

  private detectPlatform(): 'web' | 'mobile' {
    if (!this.mtlsAdapter) {
      return 'web';
    }
    const platformInfo = this.mtlsAdapter.getPlatformInfo();
    return platformInfo.platform === 'web' ? 'web' : 'mobile';
  }

  private async getUserRole(): Promise<'SUPPLIER' | 'MERCHANT' | 'CASHIER' | null> {
    if (!this.userProvider) {
      return null;
    }
    const user = await this.userProvider.getCurrentUser();
    if (!user || !user.roles) {
      return null;
    }
    if (hasRole(user.roles, 'ROLE_SUPPLIER')) {
      return 'SUPPLIER';
    }
    if (hasRole(user.roles, 'ROLE_MERCHANT')) {
      return 'MERCHANT';
    }
    if (hasRole(user.roles, 'ROLE_CASHIER')) {
      return 'CASHIER';
    }
    return null;
  }

  private isReceiptEndpoint(url: string): boolean {
    return url.includes('/receipts') || url.includes('/mf1/receipts');
  }

  private isReturnableItemsEndpoint(url: string): boolean {
    return !!(
      url.match(/\/receipts\/[a-f0-9-]+\/returnable-items$/) ||
      url.match(/\/mf1\/receipts\/[a-f0-9-]+\/returnable-items$/)
    );
  }

  private isDetailedReceiptEndpoint(url: string): boolean {
    return !!(
      url.match(/\/receipts\/[a-f0-9-]+\/details$/) ||
      url.match(/\/mf1\/receipts\/[a-f0-9-]+\/details$/)
    );
  }
}
