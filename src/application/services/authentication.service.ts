import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

import { IHttpPort } from '@/application/ports/driven/http.port';
import { ITokenStoragePort } from '@/application/ports/driven/token-storage.port';
import { JwtPayload, isTokenExpired, parseJwt } from '@/domain/services/jwt-parser.service';
import { UserRoles } from '@/domain/value-objects';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('AUTH-SERVICE');

export interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;
  fid: string;
  pid: string | null;
  expiresAt: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

export interface AuthEvents {
  onAuthError?: (error: Error) => void;
  onUserChanged?: (user: User | null) => void;
}

export interface AuthServiceConfig {
  authUrl: string;
  timeout?: number;
}

export type AuthState = 'idle' | 'authenticating' | 'authenticated' | 'error';

export class AuthenticationService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly authStateSubject = new BehaviorSubject<AuthState>('idle');
  private readonly destroy$ = new Subject<void>();

  get user$(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.userSubject.pipe(
      map((user) => user !== null),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );
  }

  get authState$(): Observable<AuthState> {
    return this.authStateSubject.asObservable();
  }

  constructor(
    private readonly httpPort: IHttpPort,
    private readonly tokenStorage: ITokenStoragePort,
    private readonly config: AuthServiceConfig,
    private readonly events: AuthEvents = {}
  ) {}

  async login(credentials: AuthCredentials): Promise<User> {
    this.authStateSubject.next('authenticating');

    log.info('Login attempt', {
      authUrl: this.config.authUrl,
      email: credentials.email,
    });

    try {
      const response = await this.httpPort.post<TokenResponse>(`${this.config.authUrl}/login`, {
        email: credentials.email,
        password: credentials.password,
      });

      const jwtPayload = parseJwt(response.data.token);
      const expiresAt = jwtPayload.exp * 1000;

      log.info('Login successful', {
        authUrl: this.config.authUrl,
        tokenPrefix: response.data.token.substring(0, 30) + '...',
        expiresAt: new Date(expiresAt).toISOString(),
      });

      await this.tokenStorage.saveAccessToken(response.data.token, expiresAt);

      const user = this.createUserFromPayload(jwtPayload);
      await this.tokenStorage.saveUser(user);

      this.userSubject.next(user);
      this.authStateSubject.next('authenticated');
      this.events.onUserChanged?.(user);

      return user;
    } catch (error) {
      this.authStateSubject.next('error');
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.tokenStorage.clearTokens();
    this.userSubject.next(null);
    this.authStateSubject.next('idle');
    this.events.onUserChanged?.(null);
  }

  async getCurrentUser(): Promise<User | null> {
    // Always verify token is valid before returning user
    const token = await this.tokenStorage.getAccessToken();
    if (!token) {
      // No token - clear any stale user state
      log.debug('getCurrentUser: No token in storage');
      if (this.userSubject.value) {
        this.userSubject.next(null);
        this.authStateSubject.next('idle');
      }
      return null;
    }

    log.debug('getCurrentUser: Token found', {
      tokenPrefix: token.substring(0, 30) + '...',
      tokenLength: token.length,
    });

    const jwtPayload = parseJwt(token);
    if (isTokenExpired(jwtPayload)) {
      // Token expired - clear everything
      log.warn('getCurrentUser: Token expired');
      await this.tokenStorage.clearTokens();
      this.userSubject.next(null);
      this.authStateSubject.next('idle');
      this.events.onUserChanged?.(null);
      return null;
    }

    // Token is valid - return cached user if available
    const currentUser = this.userSubject.value;
    if (currentUser) {
      log.debug('getCurrentUser: Returning cached user', {
        email: currentUser.email,
        roles: currentUser.roles,
      });
      return currentUser;
    }

    // Check stored user
    const storedUser = await this.tokenStorage.getUser<User>();
    if (storedUser) {
      this.userSubject.next(storedUser);
      this.authStateSubject.next('authenticated');
      return storedUser;
    }

    // Create user from token
    const user = this.createUserFromPayload(jwtPayload);
    await this.tokenStorage.saveUser(user);
    this.userSubject.next(user);
    this.authStateSubject.next('authenticated');

    return user;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.tokenStorage.getAccessToken();
    if (!token) {
      log.debug('isAuthenticated: No token in storage');
      return false;
    }

    const jwtPayload = parseJwt(token);
    const expired = isTokenExpired(jwtPayload);
    log.debug('isAuthenticated: Token check', {
      hasToken: true,
      expired,
      expiresAt: new Date(jwtPayload.exp * 1000).toISOString(),
    });
    return !expired;
  }

  async getAccessToken(): Promise<string | null> {
    const token = await this.tokenStorage.getAccessToken();
    if (!token) {
      return null;
    }

    const jwtPayload = parseJwt(token);
    if (isTokenExpired(jwtPayload)) {
      await this.tokenStorage.clearTokens();
      this.userSubject.next(null);
      this.authStateSubject.next('idle');
      this.events.onUserChanged?.(null);
      return null;
    }

    return token;
  }

  private createUserFromPayload(jwtPayload: JwtPayload): User {
    return {
      id: jwtPayload.uid.toString(),
      email: jwtPayload.username,
      username: jwtPayload.username,
      roles: jwtPayload.roles as UserRoles,
      fid: jwtPayload.fid,
      pid: jwtPayload.pid,
      expiresAt: jwtPayload.exp * 1000,
    };
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
