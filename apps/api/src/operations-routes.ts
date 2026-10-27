import type {FastifyInstance} from 'fastify';
import type {CommandService} from '../../../packages/domain/commands.js';
import {AppError} from '../../../packages/contracts/primitives.js';
import {operationalSnapshot} from '../../../packages/infrastructure/operations.js';
export async function operationsRoutes(app:FastifyInstance,commands:CommandService) {
  app.get('/api/v1/admin/operations',async req=>commands.db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(734130)');
    const actor=await commands.identity.actor(req.cookies.qf_session,tx);
    if(actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','Admin access is required');
    return operationalSnapshot(tx,commands.now(),actor);
  }));
}
