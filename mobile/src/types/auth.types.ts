/**
 * Yellow Grid Mobile - Authentication Types
 * Aligned with API v2.1 response structure
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  countryCode: string;
  businessUnit?: string;
  providerId?: string;
  providerName?: string;
  workTeamId?: string;
  workTeamName?: string;
  phone?: string;
  avatar?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  WORK_TEAM = 'WORK_TEAM',
  TEAM_LEAD = 'TEAM_LEAD',
  PROVIDER_ADMIN = 'PROVIDER_ADMIN',
  OPERATOR = 'OPERATOR',
  PSM = 'PSM',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
