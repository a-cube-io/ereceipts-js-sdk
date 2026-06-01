import { AuthConfig, AuthMode } from '@/application/ports/driven/auth-handler.port';
import { UserRoles, hasRole } from '@/domain/value-objects';
import { createPrefixedLogger } from '@/shared';

import { JwtAuthHandler } from './jwt-auth.handler';
import { MtlsAuthHandler } from './mtls-auth.handler';

const log = createPrefixedLogger('AUTH-STRATEGY');

export interface IUserProvider {
  getCurrentUser(): Promise<{ roles: UserRoles } | null>;
  getAccessToken(): Promise<string | null>;
}

export class AuthStrategy {
  constructor(
    private readonly jwtHandler: JwtAuthHandler,
    private readonly mtlsHandler: MtlsAuthHandler,
    private readonly userProvider: IUserProvider | null
  ) {}

  async determineAuthConfig(
    url: string,
    method: string,
    explicitMode?: AuthMode
  ): Promise<AuthConfig> {
    if (this.isNotificationEndpoint(url) || this.isTelemetryEndpoint(url)) {
      return { mode: 'mtls', usePort444: true };
    }

    const userRole = await this.getUserRole();
    const isReceiptEndpoint = this.isReceiptEndpoint(url);

    log.debug('Determining auth config', {
      url,
      method,
      userRole,
      isReceiptEndpoint,
      explicitMode,
    });

    if (userRole === 'SUPPLIER') {
      return { mode: 'jwt', usePort444: false };
    }

    if (userRole === 'CASHIER') {
      if (url.includes('/inactivity-period')) {
        return { mode: 'mtls', usePort444: true };
      }
      if (!isReceiptEndpoint) {
        return { mode: 'jwt', usePort444: false };
      }
      return { mode: 'mtls', usePort444: true };
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
          return { mode: 'mtls', usePort444: true };
        }
        return { mode: 'jwt', usePort444: false };
      }

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return { mode: 'mtls', usePort444: true };
      }

      return { mode: 'jwt', usePort444: false };
    }

    if (explicitMode) {
      if (userRole === 'SUPPLIER' && explicitMode === 'mtls') {
        return { mode: 'jwt', usePort444: false };
      }
      return {
        mode: explicitMode,
        usePort444: explicitMode === 'mtls',
      };
    }

    if (isReceiptEndpoint) {
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

  private isNotificationEndpoint(url: string): boolean {
    return url.includes('/mf1/notifications');
  }

  private isTelemetryEndpoint(url: string): boolean {
    return !!url.match(/\/mf1\/pems\/[^/]+\/telemetry/);
  }
}
