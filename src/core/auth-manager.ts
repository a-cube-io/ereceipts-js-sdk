import axios, { AxiosInstance, AxiosError } from 'axios';
import { ISecureStorage } from '../adapters';
import { ConfigManager } from './config';
import {
  AuthCredentials,
  TokenResponse,
  StoredTokenData,
  User,
  ACubeSDKError,
  JWTPayload,
  IUserProvider
} from './types';
import { parseLegacyRoles } from './roles';

/**
 * Authentication events
 */
export interface AuthEvents {
  onAuthError?: (error: ACubeSDKError) => void;
  onUserChanged?: (user: User | null) => void;
}

/**
 * JWT Authentication Manager
 */
export class AuthManager implements IUserProvider {
  private static readonly TOKEN_KEY = 'acube_tokens';
  private static readonly USER_KEY = 'acube_user';
  
  private httpClient: AxiosInstance;
  private currentUser: User | null = null;

  constructor(
    private config: ConfigManager,
    private secureStorage: ISecureStorage,
    private events: AuthEvents = {}
  ) {
    this.httpClient = this.createHttpClient();
    this.setupInterceptors();
  }

  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.getAuthUrl(),
      timeout: this.config.getTimeout(),
      headers: {
        'Content-Type': 'application/json',
        ...this.config.getCustomHeaders(),
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth header
    this.httpClient.interceptors.request.use(
      async (config) => {
        const tokenData = await this.getStoredTokens();
        if (tokenData?.accessToken) {
          config.headers.Authorization = `Bearer ${tokenData.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for 401 errors
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, clear tokens and notify
          await this.clearTokens();
          const authError = new ACubeSDKError('AUTH_ERROR', 'Session expired');
          this.events.onAuthError?.(authError);
        }
        
        throw this.transformError(error);
      }
    );
  }

  /**
   * Login with email and password
   */
  async login(credentials: AuthCredentials): Promise<User> {
    try {
      const response = await this.httpClient.post<TokenResponse>('/login', {
        email: credentials.email,
        password: credentials.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Parse JWT token to extract expiration
      const jwtPayload = this.parseJWTToken(response.data.token);
      
      const tokenData: StoredTokenData = {
        accessToken: response.data.token,
        expiresAt: jwtPayload.exp * 1000, // Convert to milliseconds
      };

      await this.storeTokens(tokenData);
      
      // Create user from JWT payload
      const user: User = {
        id: jwtPayload.uid.toString(),
        email: jwtPayload.username,
        username: jwtPayload.username,
        roles: parseLegacyRoles(jwtPayload.roles),
        fid: jwtPayload.fid,
        pid: jwtPayload.pid,
      };
      
      this.currentUser = user;
      
      // Store user for future use
      await this.secureStorage.set(AuthManager.USER_KEY, JSON.stringify(user));
      
      this.events.onUserChanged?.(user);

      return user;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Parse JWT token to extract payload
   */
  private parseJWTToken(token: string): JWTPayload {
    try {
      // JWT tokens have three parts separated by dots: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      // Decode the payload (second part)
      const payload = parts[1];
      if (!payload) {
        throw new Error('JWT token missing payload');
      }
      
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '==='.slice(0, (4 - (payload.length % 4)) % 4);
      
      // Decode from base64
      const decodedPayload = atob(paddedPayload);
      
      // Parse JSON
      return JSON.parse(decodedPayload) as JWTPayload;
    } catch (error) {
      throw new ACubeSDKError('AUTH_ERROR', 'Failed to parse JWT token', error);
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    await this.clearTokens();
    this.currentUser = null;
    this.events.onUserChanged?.(null);
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to get from storage first
    try {
      const userJson = await this.secureStorage.get(AuthManager.USER_KEY);
      if (userJson) {
        this.currentUser = JSON.parse(userJson);
        return this.currentUser!;
      }
    } catch {
      // Ignore storage errors
    }

    // If no user in storage and no current user, check if we have a valid token
    const tokenData = await this.getStoredTokens();
    if (tokenData && !this.isTokenExpired(tokenData)) {
      // Parse user info from JWT token
      const jwtPayload = this.parseJWTToken(tokenData.accessToken);
      
      const user: User = {
        id: jwtPayload.uid.toString(),
        email: jwtPayload.username,
        username: jwtPayload.username,
        roles: parseLegacyRoles(jwtPayload.roles),
        fid: jwtPayload.fid,
        pid: jwtPayload.pid,
      };
      
      this.currentUser = user;
      
      // Store for future use
      await this.secureStorage.set(AuthManager.USER_KEY, JSON.stringify(user));
      
      return user;
    }

    throw new ACubeSDKError('AUTH_ERROR', 'No valid authentication found');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const tokenData = await this.getStoredTokens();
    return tokenData !== null && !this.isTokenExpired(tokenData);
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    const tokenData = await this.getStoredTokens();
    
    if (!tokenData) {
      return null;
    }

    if (this.isTokenExpired(tokenData)) {
      // Token expired, clear it
      await this.clearTokens();
      return null;
    }

    return tokenData.accessToken;
  }


  /**
   * Store tokens securely
   */
  private async storeTokens(tokenData: StoredTokenData): Promise<void> {
    await this.secureStorage.set(AuthManager.TOKEN_KEY, JSON.stringify(tokenData));
  }

  /**
   * Get stored tokens
   */
  private async getStoredTokens(): Promise<StoredTokenData | null> {
    try {
      const tokenJson = await this.secureStorage.get(AuthManager.TOKEN_KEY);
      return tokenJson ? JSON.parse(tokenJson) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  private async clearTokens(): Promise<void> {
    await Promise.all([
      this.secureStorage.remove(AuthManager.TOKEN_KEY),
      this.secureStorage.remove(AuthManager.USER_KEY),
    ]);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(tokenData: StoredTokenData): boolean {
    // Add 5 minute buffer
    return Date.now() >= (tokenData.expiresAt - 300000);
  }

  /**
   * Transform API errors to SDK errors
   */
  private transformError(error: any): ACubeSDKError {
    if (error instanceof ACubeSDKError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const response = error.response;
      
      if (!response) {
        return new ACubeSDKError('NETWORK_ERROR', 'Network error occurred', error);
      }

      switch (response.status) {
        case 401:
          return new ACubeSDKError('AUTH_ERROR', 'Authentication failed', error, 401);
        case 403:
          return new ACubeSDKError('FORBIDDEN_ERROR', 'Access forbidden', error, 403);
        case 404:
          return new ACubeSDKError('NOT_FOUND_ERROR', 'Resource not found', error, 404);
        case 422:
          return new ACubeSDKError('VALIDATION_ERROR', 'Validation error', error, 422);
        default:
          return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error, response.status);
      }
    }

    return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error);
  }
}

