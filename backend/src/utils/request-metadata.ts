import { createHash } from 'node:crypto';
import type { Request } from 'express';

export function getRequestMetadata(request: Request): {
  ipHash: string | null;
  userAgent: string | null;
} {
  const ipHash = request.ip
    ? createHash('sha256').update(request.ip).digest('hex')
    : null;

  return {
    ipHash,
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
  };
}
