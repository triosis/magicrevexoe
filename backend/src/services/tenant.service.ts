import type { RowDataPacket } from 'mysql2';
import { databasePool } from '../config/database';
import type { TenantContext } from '../types/auth';
import { AppError } from '../utils/app-error';

export function getTenantContext(context: TenantContext): TenantContext {
  return { ...context };
}

export function assertTenantAccess(
  actor: TenantContext,
  target: Pick<TenantContext, 'resellerId' | 'subResellerId' | 'clientId'>,
): void {
  const allowed =
    actor.accountType === 'SUPER_ADMIN' ||
    (actor.accountType === 'RESELLER' &&
      actor.resellerId === target.resellerId) ||
    (actor.accountType === 'SUB_RESELLER' &&
      actor.subResellerId === target.subResellerId) ||
    (actor.accountType === 'CLIENT' && actor.clientId === target.clientId);

  if (!allowed) {
    // A 404 avoids disclosing that a cross-tenant entity exists.
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  }
}

export async function getVisibleClientIds(
  context: TenantContext,
): Promise<string[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (context.accountType === 'RESELLER') {
    clauses.push('reseller_id = ?');
    values.push(context.resellerId!);
  } else if (context.accountType === 'SUB_RESELLER') {
    clauses.push('sub_reseller_id = ?');
    values.push(context.subResellerId!);
  } else if (context.accountType === 'CLIENT') {
    clauses.push('id = ?');
    values.push(context.clientId!);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await databasePool.execute<(RowDataPacket & { id: string })[]>(
    `SELECT CAST(id AS CHAR) AS id FROM clients ${where}`,
    values,
  );
  return rows.map((row) => row.id);
}

export async function getVisibleResellerIds(
  context: TenantContext,
): Promise<string[]> {
  if (context.accountType === 'SUPER_ADMIN') {
    const [rows] = await databasePool.execute<
      (RowDataPacket & { id: string })[]
    >('SELECT CAST(id AS CHAR) AS id FROM resellers');
    return rows.map((row) => row.id);
  }
  return context.resellerId ? [context.resellerId] : [];
}
