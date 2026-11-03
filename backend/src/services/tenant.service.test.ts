import { describe, expect, it } from 'vitest';
import type { TenantContext } from '../types/auth';
import { AppError } from '../utils/app-error';
import { assertTenantAccess } from './tenant.service';

function tenant(overrides: Partial<TenantContext>): TenantContext {
  return {
    accountId: '1',
    accountType: 'CLIENT',
    resellerId: null,
    subResellerId: null,
    clientId: null,
    ...overrides,
  };
}

describe('tenant isolation', () => {
  it('allows Super Admin to access platform-level resources', () => {
    expect(() =>
      assertTenantAccess(tenant({ accountType: 'SUPER_ADMIN' }), {
        resellerId: '99',
        subResellerId: '98',
        clientId: '97',
      }),
    ).not.toThrow();
  });

  it('allows a Reseller to access its own client', () => {
    expect(() =>
      assertTenantAccess(
        tenant({ accountType: 'RESELLER', resellerId: '10' }),
        {
          resellerId: '10',
          subResellerId: null,
          clientId: '30',
        },
      ),
    ).not.toThrow();
  });

  it("does not allow a Reseller to access another Reseller's client", () => {
    expect(() =>
      assertTenantAccess(
        tenant({ accountType: 'RESELLER', resellerId: '10' }),
        {
          resellerId: '11',
          subResellerId: null,
          clientId: '30',
        },
      ),
    ).toThrow(AppError);
  });

  it('allows a Sub-Reseller to access only its own clients', () => {
    const actor = tenant({
      accountType: 'SUB_RESELLER',
      resellerId: '10',
      subResellerId: '20',
    });
    expect(() =>
      assertTenantAccess(actor, {
        resellerId: '10',
        subResellerId: '20',
        clientId: '30',
      }),
    ).not.toThrow();
    expect(() =>
      assertTenantAccess(actor, {
        resellerId: '10',
        subResellerId: '21',
        clientId: '31',
      }),
    ).toThrow(AppError);
  });

  it('does not allow a Client to access another Client', () => {
    expect(() =>
      assertTenantAccess(tenant({ accountType: 'CLIENT', clientId: '30' }), {
        resellerId: null,
        subResellerId: null,
        clientId: '31',
      }),
    ).toThrow(AppError);
  });
});
