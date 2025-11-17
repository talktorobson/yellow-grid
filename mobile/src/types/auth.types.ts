export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  countryCode: string;
  businessUnit: string;
  providerId?: string;
  workTeamId?: string;
  permissions: string[];
}

export enum UserRole {
  TECHNICIAN = 'TECHNICIAN',
  PROVIDER_ADMIN = 'PROVIDER_ADMIN',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
