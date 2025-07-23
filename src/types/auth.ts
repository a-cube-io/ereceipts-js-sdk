export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenInfo {
  token: string;
  expiresAt?: number;
  role: string;
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'provider' | 'merchant' | 'cashier';
  name?: string;
  createdAt: string;
  lastLoginAt?: string;
}