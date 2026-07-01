export type AuthMode = 'jwt' | 'mtls';

export interface AuthConfig {
  mode: AuthMode;
}

export interface IAuthHandler {
  getAuthConfig(url: string, method: string): Promise<AuthConfig>;
  getAuthHeaders(): Promise<Record<string, string>>;
}
