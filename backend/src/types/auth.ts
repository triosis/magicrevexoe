export type AccountType =
  'SUPER_ADMIN' | 'RESELLER' | 'SUB_RESELLER' | 'CLIENT';

export interface TenantContext {
  accountId: string;
  accountType: AccountType;
  resellerId: string | null;
  subResellerId: string | null;
  clientId: string | null;
}

export interface AuthenticatedUser extends TenantContext {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AccessTokenClaims {
  sub: string;
  accountId: string;
  type: 'access';
}
