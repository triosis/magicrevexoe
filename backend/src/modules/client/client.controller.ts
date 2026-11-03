import type { Request, Response } from 'express';
import { AppError } from '../../utils/app-error';
import { findClientById, listClients } from './client.repository';

export async function getClients(
  request: Request,
  response: Response,
): Promise<void> {
  response.json({ success: true, data: await listClients(request.tenant!) });
}

export async function getClient(
  request: Request,
  response: Response,
): Promise<void> {
  const rawId = request.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id)
    throw new AppError(400, 'INVALID_CLIENT_ID', 'Client ID is required');
  const client = await findClientById(id, request.tenant!);
  if (!client)
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  response.json({ success: true, data: client });
}
