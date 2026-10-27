import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {CommandService} from '../../../packages/domain/commands.js';
import {NativeAuth} from '../../../packages/domain/native-auth.js';
import {CLIENT_CONTRACT} from '../../../packages/contracts/client-capabilities.js';
const schema=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const code={type:'string',pattern:'^[A-Za-z0-9_-]{43}$'};
export async function nativeRoutes(app:FastifyInstance,commands:CommandService) {
  const auth=new NativeAuth(commands.identity);
  app.get('/api/v1/capabilities',async()=>({...CLIENT_CONTRACT,serverTime:commands.now().toISOString()}));
  app.get('/native/authorize',async(_r,reply)=>reply.type('text/html').send(await readFile('apps/web/native-auth.html','utf8')));
  app.get('/native-auth.js',async(_r,reply)=>reply.type('application/javascript').send(await readFile('apps/web/native-auth.js','utf8')));
  app.post<{Body:{challenge:string;state:string}}>('/api/v1/native/authorize',{schema:{body:schema({challenge:code,state:code})}},r=>
    auth.authorize(r.cookies.qf_session,String(r.headers['x-csrf-token']??''),r.body.challenge,r.body.state));
  app.post<{Body:{code:string;verifier:string;redirectUri:string}}>('/api/v1/native/token',{
    schema:{body:schema({code,verifier:{type:'string',pattern:'^[A-Za-z0-9._~-]{43,128}$'},redirectUri:{const:'quotefix://auth'}})},config:{rateLimit:{max:10,timeWindow:'1 minute'}}},r=>auth.exchange(r.body.code,r.body.verifier,r.body.redirectUri));
  app.get('/api/v1/me/refresh-context',async r=>commands.db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(734130)');
    const actor=await commands.identity.actor(r.cookies.qf_session,tx);
    // No cached server projections in the initial scope: re-fetch every protected resource.
    const accessContext=createHash('sha256').update(JSON.stringify([actor.id,actor.accessVersion,actor.context??null,actor.memberships])).digest('hex');
    return {accountId:actor.id,contextId:actor.context?.id??null,accessContext,contractVersion:1,mode:'canonical-refresh',purgeServerCache:true,serverTime:commands.now().toISOString()};
  }));
}
