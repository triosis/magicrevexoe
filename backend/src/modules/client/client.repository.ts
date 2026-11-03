import type { RowDataPacket } from 'mysql2';
import { databasePool } from '../../config/database';
import type { TenantContext } from '../../types/auth';

export interface ClientRecord extends RowDataPacket {
  id: string;
  account_id: string;
  reseller_id: string | null;
  sub_reseller_id: string | null;
  client_id: string;
  name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function scopeClause(tenant: TenantContext): { sql: string; values: string[] } {
  if (tenant.accountType === 'RESELLER')
    return { sql: 'AND reseller_id = ?', values: [tenant.resellerId!] };
  if (tenant.accountType === 'SUB_RESELLER')
    return { sql: 'AND sub_reseller_id = ?', values: [tenant.subResellerId!] };
  if (tenant.accountType === 'CLIENT')
    return { sql: 'AND id = ?', values: [tenant.clientId!] };
  return { sql: '', values: [] };
}

export async function findClientById(
  id: string,
  tenant: TenantContext,
): Promise<ClientRecord | null> {
  const scope = scopeClause(tenant);
  const [rows] = await databasePool.execute<ClientRecord[]>(
    `SELECT CAST(id AS CHAR) AS id, CAST(account_id AS CHAR) AS account_id,
            CAST(reseller_id AS CHAR) AS reseller_id,
            CAST(sub_reseller_id AS CHAR) AS sub_reseller_id,
            CAST(client_id AS CHAR) AS client_id, name, status, created_at, updated_at
       FROM clients WHERE id = ? ${scope.sql} LIMIT 1`,
    [id, ...scope.values],
  );
  return rows[0] ?? null;
}

export async function listClients(
  tenant: TenantContext,
): Promise<ClientRecord[]> {
  const scope = scopeClause(tenant);
  const [rows] = await databasePool.execute<ClientRecord[]>(
    `SELECT CAST(id AS CHAR) AS id, CAST(account_id AS CHAR) AS account_id,
            CAST(reseller_id AS CHAR) AS reseller_id,
            CAST(sub_reseller_id AS CHAR) AS sub_reseller_id,
            CAST(client_id AS CHAR) AS client_id, name, status, created_at, updated_at
       FROM clients WHERE 1 = 1 ${scope.sql} ORDER BY id`,
    scope.values,
  );
  return rows;
}
