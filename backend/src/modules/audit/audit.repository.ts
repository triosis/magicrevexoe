import type { RowDataPacket } from 'mysql2';
import { databasePool } from '../../config/database';
import type { TenantContext } from '../../types/auth';

export async function listAuditLogs(
  tenant: TenantContext,
  limit: number,
): Promise<RowDataPacket[]> {
  const filters: string[] = [];
  const values: Array<string | number> = [];

  if (tenant.accountType === 'RESELLER') {
    filters.push('reseller_id = ?');
    values.push(tenant.resellerId!);
  } else if (tenant.accountType === 'SUB_RESELLER') {
    filters.push('sub_reseller_id = ?');
    values.push(tenant.subResellerId!);
  } else if (tenant.accountType === 'CLIENT') {
    filters.push('client_id = ?');
    values.push(tenant.clientId!);
  }

  values.push(limit);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await databasePool.execute<RowDataPacket[]>(
    `SELECT id, actor_user_id, actor_account_id, reseller_id, sub_reseller_id,
            client_id, event_type, entity_type, entity_id, old_value, new_value,
            ip_hash, user_agent, created_at
       FROM audit_logs ${where}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
    values,
  );
  return rows;
}
