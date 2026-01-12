import { UserRole } from '@/domain/value-objects';

export interface JwtPayload {
  uid: number;
  username: string;
  roles: Record<string, string[]>;
  fid: string;
  pid: string | null;
  exp: number;
  iat: number;
}

export function parseJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1];
  if (!payload) {
    throw new Error('JWT missing payload');
  }
  const padded = payload + '==='.slice(0, (4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

export function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() >= payload.exp * 1000 - 300000;
}

export function extractRoles(jwtRoles: Record<string, string[]>): UserRole[] {
  const allRoles: UserRole[] = [];
  for (const context of Object.values(jwtRoles)) {
    for (const role of context) {
      if (role === 'ROLE_SUPPLIER' || role === 'ROLE_CASHIER' || role === 'ROLE_MERCHANT') {
        if (!allRoles.includes(role)) {
          allRoles.push(role);
        }
      }
    }
  }
  return allRoles;
}
