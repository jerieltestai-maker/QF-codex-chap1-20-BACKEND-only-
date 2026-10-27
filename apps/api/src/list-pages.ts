import type {FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';

// Additive pagination: legacy v1 callers retain the complete authorized projection.
// Current clients request bounded pages. Never limit an unrestricted SQL candidate
// set before resource/subject/eligibility filtering has finished.
export function listPage<T>(request:FastifyRequest,items:T[]) {
  const query=request.query as Record<string,unknown>;
  if(query.limit===undefined&&query.offset===undefined)return items;
  const limit=String(query.limit??100),offset=String(query.offset??0);
  if(!/^(?:[1-9]|[1-9][0-9]|100)$/.test(limit)||!/^\d{1,8}$/.test(offset))
    throw new AppError(422,'FIELD_VALIDATION','Use a page size from 1 to 100 and a nonnegative offset');
  return items.slice(Number(offset),Number(offset)+Number(limit));
}
