import type { Request, Response } from 'express';
import { listAuditLogs } from './audit.repository';

export async function getAuditLogs(
  request: Request,
  response: Response,
): Promise<void> {
  const logs = await listAuditLogs(request.tenant!, 100);
  response.json({ success: true, data: logs });
}
