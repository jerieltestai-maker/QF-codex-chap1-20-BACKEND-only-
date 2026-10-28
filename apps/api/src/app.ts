import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {Config} from '../../../packages/infrastructure/config.js';
import type {Database} from '../../../packages/infrastructure/database.js';
import {IdentityService, type Command} from '../../../packages/domain/identity-service.js';
import {can, canRead, requireCapability} from '../../../packages/domain/access.js';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {FastifyRequest,FastifyError} from 'fastify';
import {workspaceRoutes} from './workspace-routes.js';
import {procurementRoutes} from './procurement-routes.js';
import {eligibility} from '../../../packages/domain/verification-service.js';
import {CommandService} from '../../../packages/domain/commands.js';
import {reconcileProcurementClocks} from '../../../packages/domain/procurement-clocks.js';
import {quotingRoutes} from './quoting-routes.js';
import {workRoutes} from './work-routes.js';
import {workTimers} from '../../../packages/domain/work-clocks.js';
import {completionRoutes} from './completion-routes.js';
import {paymentTimers} from '../../../packages/domain/payment-clocks.js';
import {billingSupportRoutes} from './billing-support-routes.js';
import {syncBillingSources} from '../../../packages/domain/billing-service.js';
import {cancellationTimers} from '../../../packages/domain/cancellation-service.js';
import {supportExecutionTimers} from '../../../packages/domain/support-clocks.js';
import {feedbackRoutes} from './feedback-routes.js';
import {feedbackTimers} from '../../../packages/domain/feedback-core.js';
import {GeminiAdviceProvider} from '../../../packages/infrastructure/gemini-advice.js';
import {oversightRoutes} from './oversight-routes.js';
import {recordProtectedAccess} from '../../../packages/domain/protected-access.js';
import {operationsRoutes} from './operations-routes.js';
import {nativeRoutes} from './native-routes.js';
import {hashToken} from '../../../packages/infrastructure/local-identity.js';

const text = {type:'string',minLength:1,maxLength:500};
const email = {type:'string',format:'email',maxLength:254};
const uuid = {type:'string',format:'uuid'};
const password = {type:'string',minLength:15,maxLength:128};
function schema(properties: Record<string,unknown>, required = Object.keys(properties)) {
  return {type:'object',additionalProperties:false,properties,required};
}
function requestFailure(requestId:string) {return {error:{code:'INTERNAL_ERROR',message:'Request could not be completed',requestId}};}
export async function buildApp(config: Config, db: Database, identity: IdentityService, logging = false) {
  const app = Fastify({logger:logging ? {redact:['req.headers.cookie','req.headers.authorization','req.headers.x-csrf-token'], serializers:{req: (req: FastifyRequest) => ({method:req.method,url:String(req.url).split('?')[0] ?? '/'})}} : false,
    bodyLimit: 16384, genReqId: () => randomUUID(),
    ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
  await app.register(cookie);
  await app.register(helmet,{contentSecurityPolicy:{directives:{upgradeInsecureRequests:null,defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}});
  await app.register(rateLimit,{
    // Loading the interface must not consume a decision or sign-in budget.
    max:req=>req.method==='GET'?600:120,timeWindow:'1 minute',
    keyGenerator:req=>req.ip+':'+(req.url.startsWith('/api/v1/auth/')&&!req.url.startsWith('/api/v1/auth/logout')?'identity':req.method==='GET'?'read':'command'),
    allowList:req=>{const path=req.routeOptions.url??'';return req.method==='GET'&&!path.startsWith('/api/')&&(path==='/'||/\.(?:js|css|woff2|png|jpg)$/.test(path));}
  });
  // Commit protected-access evidence before releasing the response, including with server PostgreSQL latency.
  app.addHook('onSend',async(req,reply,payload)=>{
    try {
      await recordProtectedAccess(db,identity,req.cookies.qf_session,req.routeOptions.url??'',req.params as Record<string,string>,reply.statusCode);
      return payload;
    } catch {
      // Throwing while an error response is already being sent invokes Fastify's fallback handler,
      // which can expose the raw database message. Sanitize here, including denied/error responses.
      req.log.error({requestId:req.id},'Protected access recording failed');
      reply.code(500).type('application/json; charset=utf-8');
      reply.removeHeader('content-length');reply.removeHeader('content-disposition');
      return JSON.stringify(requestFailure(req.id));
    }
  });
  app.addHook('onRequest',async(req,reply) => {
    reply.header('X-Request-Id',req.id).header('Cache-Control','no-store');
    let native=false;
    if(req.headers.authorization) {
      const match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization);
      if(!match||req.cookies.qf_session||!req.url.startsWith('/api/v1/')||req.url.startsWith('/api/v1/dev/'))throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');
      const [session]=await db.query("SELECT token_hash FROM sessions WHERE token_hash=$1 AND client_type='native'",[hashToken(match[1]!)]);
      if(!session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');
      await identity.actor(match[1]);
      req.cookies.qf_session=match[1]!;native=true;
    }
    const codeExchange=req.method==='POST'&&req.url==='/api/v1/native/token';
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && !(native&&!req.headers.origin) && !(codeExchange&&!req.headers.origin) && req.headers.origin !== config.origin)
      throw new AppError(403,'ORIGIN_INVALID','Request origin is not permitted');
  });
  app.setErrorHandler<FastifyError>((error,req,reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({error:{code:error.code,message:error.message,requestId:req.id}});
    if (error.validation) return reply.code(422).send({error:{code:'FIELD_VALIDATION',message:'Check the required fields and their formats',requestId:req.id}});
    if (error.statusCode === 429) return reply.code(429).send({error:{code:'RATE_LIMITED',message:'Try again shortly',requestId:req.id}});
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
      return reply.code(error.statusCode).send({error:{code:'INVALID_REQUEST',message:'Request could not be processed',requestId:req.id}});
    req.log.error({requestId:req.id},'Request failed'); // Do not log DB errors, SQL parameters or private bodies.
    return reply.code(500).send(requestFailure(req.id));
  });
  app.setNotFoundHandler((req,reply) => reply.code(404).send({error:{code:'NOT_FOUND',message:'Resource unavailable',requestId:req.id}}));
  const token = (req: FastifyRequest) => {
    if (!req.cookies.qf_session) throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');
    return req.cookies.qf_session;
  };
  const csrf = (req: FastifyRequest) => typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';
  const meta = (req: FastifyRequest): Command => {
    const key = req.headers['idempotency-key'], match = req.headers['if-match'];
    if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
      throw new AppError(428,'PRECONDITION_REQUIRED','A UUID operation identity is required');
    if (typeof match !== 'string' || !/^"access-[1-9][0-9]*"$/.test(match))
      throw new AppError(428,'PRECONDITION_REQUIRED','A current access version is required');
    return {operationId:key,expectedVersion:Number(match.slice(8,-1)),requestId:req.id,csrf:csrf(req)};
  };
  const authLimit = {max:10,timeWindow:'1 minute'};
  app.get('/health/live',async()=>({status:'ok'}));
  app.get('/health/ready',async(_req,reply)=>{
    try {await db.query('SELECT 1'); return {status:'ready'};}
    catch {return reply.code(503).send({status:'unavailable'});}
  });
  app.get('/api/v1/version',async()=>({apiVersion:'v1',build:'0.1.0',localDevelopment:true}));
  app.get('/',async(_req,reply)=>reply.type('text/html').send(await readFile('apps/web/index.html','utf8')));
  app.get('/local-accounts.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/local-accounts.js','utf8')));
  app.get('/app.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/app.js','utf8')));
  app.get('/style.css',async(_req,reply)=>reply.type('text/css').send(await readFile('apps/web/style.css','utf8')));
  app.get('/ui.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/ui.js','utf8')));
  app.get('/shell.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/shell.js','utf8')));
  // Public interface assets are explicitly listed. Private job files retain their authorised routes.
  const interfaceAssets:Record<string,string>={'geist.woff2':'font/woff2','corridor-overview.jpg':'image/jpeg','ceiling-detail.jpg':'image/jpeg','corridor-repaired.jpg':'image/jpeg'};
  for(const name of ['quotefix-logo','all-caught-up','admin-support','platform-fees','report-issue','request-quotes','compare-quotations','mcst-approval','schedule-work','work-in-progress','variation-request','inspection-round','invoice-review','payment','aftercare-feedback','decision-pack-export','contractor-verification','council-oversight','audit-record','admin','mcst','contractor','building','confidential-report','upload','shield','cancelled','reselection','ai-refining'])interfaceAssets[name+'.png']='image/png';
  for(const [name,type] of Object.entries(interfaceAssets))app.get('/assets/'+name,async(_req,reply)=>reply.type(type).send(await readFile('apps/web/assets/'+name)));
  app.get('/workspace.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/workspace.js','utf8')));
  app.get('/commands.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/commands.js','utf8')));
  app.get('/procurement.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/procurement.js','utf8')));
  app.get('/quoting.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/quoting.js','utf8')));
  app.get('/work.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/work.js','utf8')));
  app.get('/payments.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/payments.js','utf8')));
  app.get('/work-uploads.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/work-uploads.js','utf8')));
  app.get('/billing-support.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/billing-support.js','utf8')));
  app.get('/feedback.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/feedback.js','utf8')));
  app.get('/oversight.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/oversight.js','utf8')));
  app.get('/integrity.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/integrity.js','utf8')));
  app.get('/operations.js',async(_req,reply)=>reply.type('application/javascript').send(await readFile('apps/web/operations.js','utf8')));
  const localAccounts = (req: FastifyRequest) => {
    if (!config.localAccountHelper || config.environment !== 'development' || !identity.localAccounts)
      throw new AppError(404,'NOT_FOUND','Resource unavailable');
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.ip) ||
        req.headers.host !== new URL(config.origin).host ||
        req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.headers.origin && req.headers.origin !== config.origin))
      throw new AppError(403,'FORBIDDEN','Local account helper is only available on this development origin');
    return identity.localAccounts;
  };
  app.get('/api/v1/dev/accounts',async req=>localAccounts(req).list());
  app.post<{Body:{userId:string}}>('/api/v1/dev/accounts/autofill',
    {schema:{body:schema({userId:uuid})}},async req=>localAccounts(req).credentials(req.body.userId));
  app.post<{Body:{email:string;name:string;password:string}}>('/api/v1/auth/register',
    {schema:{body:schema({email,name:text,password})},config:{rateLimit:authLimit}},async req =>
      identity.register(req.body.email.toLowerCase(),req.body.name,req.body.password));
  for (const purpose of ['verify','recover'] as const) {
    app.post<{Body:{email:string}}>(`/api/v1/auth/${purpose}/request`,
      {schema:{body:schema({email})},config:{rateLimit:authLimit}},async req => identity.requestToken(req.body.email.toLowerCase(),purpose));
    app.post<{Body:{token:string;password?:string}}>(`/api/v1/auth/${purpose}/confirm`,
      {schema:{body:schema(purpose === 'recover' ? {token:text,password} : {token:text})},config:{rateLimit:authLimit}},
      async req=>identity.consumeToken(req.body.token,purpose,req.body.password));
  }
  app.post<{Body:{email:string;password:string}}>('/api/v1/auth/login',
    {schema:{body:schema({email,password:{type:'string',minLength:1,maxLength:128}})},config:{rateLimit:authLimit}},async(req,reply)=>{
      const result = await identity.login(req.body.email.toLowerCase(),req.body.password);
      reply.setCookie('qf_session',result.token,{httpOnly:true,sameSite:'strict',secure:config.origin.startsWith('https:'),path:'/',maxAge:config.sessionHours*3600});
      return {csrfToken:result.csrf};
    });
  app.post('/api/v1/auth/logout',async(req,reply)=>{
    const result = await identity.logout(token(req),csrf(req));
    reply.clearCookie('qf_session',{path:'/'}); return result;
  });
  app.get('/api/v1/me/context',async(req,reply)=>{
    const actor = await identity.actor(token(req));
    const capabilities=Object.fromEntries(['estate.read','rfq.manage','selection.approve','payment.record','contractor.account','quote.submit','fee.read','membership.manage']
      .map(cap=>[cap,can(actor,cap as Parameters<typeof can>[1])]));
    if(actor.context?.role==='contractor'&&actor.context.organisation_id) {
      const [profile]=await db.query('SELECT approved_categories FROM contractor_profiles WHERE organisation_id=$1',[actor.context.organisation_id]);
      capabilities['quote.submit']=false;
      for(const category of (profile?.approved_categories??[]) as string[])if((await eligibility(db,actor.context.organisation_id,[category],identity.now())).eligible)capabilities['quote.submit']=true;
    }
    reply.header('ETag',`"access-${actor.accessVersion}"`);
    return {user:{id:actor.id,name:actor.name,email:actor.email},accessVersion:actor.accessVersion,
      memberships:actor.memberships,context:actor.context ?? null,csrfToken:actor.csrf,
      capabilities};
  });
  app.post<{Body:{membershipId:string}}>('/api/v1/me/context',
    {schema:{body:schema({membershipId:uuid})}},async req=>identity.switchContext(token(req),req.body.membershipId,csrf(req)));
  app.post<{Body:{token:string}}>('/api/v1/invitations/preview',
    {schema:{body:schema({token:text})}},async req=>identity.previewInvite(token(req),csrf(req),req.body.token));
  app.post<{Body:{token:string}}>('/api/v1/invitations/accept',
    {schema:{body:schema({token:text})}},async req=>identity.acceptInvite(token(req),meta(req),req.body.token));
  app.post<{Body:{organisationName:string;contact:string;trades:string[]}}>('/api/v1/contractor/applications',
    {schema:{body:schema({organisationName:text,contact:text,trades:{type:'array',minItems:1,maxItems:10,items:text,uniqueItems:true}})}},
    async req=>identity.apply(token(req),meta(req),req.body));
  app.post<{Body:{email:string;estateId:string;role:'cm'|'mcst'}}>('/api/v1/admin/invitations',
    {schema:{body:schema({email,estateId:uuid,role:{enum:['cm','mcst']}})}},
    async req=>identity.invite(token(req),meta(req),{...req.body,email:req.body.email.toLowerCase()}));
  app.post<{Params:{id:string};Body:{membershipVersion:number;reason:string}}>('/api/v1/admin/memberships/:id/revoke',
    {schema:{params:schema({id:uuid}),body:schema({membershipVersion:{type:'integer',minimum:1},reason:text})}},
    async req=>identity.revoke(token(req),meta(req),{membershipId:req.params.id,...req.body}));
  app.get<{Params:{id:string}}>('/api/v1/estates/:id',
    {schema:{params:schema({id:uuid})}},async req=>{
      const actor = await identity.actor(token(req));
      if (!canRead(actor,{estateId:req.params.id})) throw new AppError(404,'NOT_FOUND','Resource unavailable');
      const [estate] = await db.query('SELECT id,name,version FROM estates WHERE id=$1',[req.params.id]);
      if (!estate) throw new AppError(404,'NOT_FOUND','Resource unavailable');
      return estate;
    });
  app.get('/api/v1/admin/estates',async req=>{
    const actor = await identity.actor(token(req)); requireCapability(actor,'membership.manage');
    return db.query('SELECT id,name,version FROM estates ORDER BY name');
  });
  app.get('/api/v1/admin/memberships',async req=>{
    const actor = await identity.actor(token(req)); requireCapability(actor,'membership.manage');
    return db.query('SELECT m.id,m.user_id,m.role,m.estate_id,m.organisation_id,m.active,m.version,u.name FROM memberships m JOIN users u ON u.id=m.user_id ORDER BY m.id');
  });
  const commands=new CommandService(db,identity,identity.now,async(tx,now,intent,body,phase)=>{
    await reconcileProcurementClocks(tx,now);await workTimers(tx,now);
    const id=body&&typeof body==='object'&&'id' in body?body.id:undefined;
    // A receipt/issue submitted first must win over the worker's uncommitted silence fallback.
    if(typeof id==='string'&&!(phase==='before'&&['payment.receipt','payment.issue'].includes(intent)))await paymentTimers(tx,now,id);
    await syncBillingSources(tx,now);await cancellationTimers(tx,now);
    await supportExecutionTimers(tx,now);
    if(typeof id==='string')await feedbackTimers(tx,now,id);
  });
  await workspaceRoutes(app,db,identity,commands);
  await procurementRoutes(app,db,identity,commands);
  await quotingRoutes(app,commands);
  await workRoutes(app,commands);
  await completionRoutes(app,commands);
  await billingSupportRoutes(app,commands);
  await feedbackRoutes(app,commands,config.adviceProvider==='gemini'?new GeminiAdviceProvider(config.geminiApiKey!,config.geminiModel):undefined);
  await oversightRoutes(app,commands);
  await operationsRoutes(app,commands);
  await nativeRoutes(app,commands);
  app.addHook('onClose',async()=>db.close());
  return app;
}
