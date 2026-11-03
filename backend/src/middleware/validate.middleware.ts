import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export function validate(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    schema.parse({
      body: request.body,
      params: request.params,
      query: request.query,
    });
    next();
  };
}
