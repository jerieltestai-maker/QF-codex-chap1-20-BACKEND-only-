/** Normal local identity flow for two fictional comparison bidders. No database writes here. */
import {readdir,readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Database} from '../packages/infrastructure/database.js';
import type {Config} from '../packages/infrastructure/config.js';
export type DemoClient={cookie:string;csrf:string;access:number};
type Json=Record<string,any>;
type Get=(path:string,role?:string)=>Promise<Json>;
type Command=(key:string,path:string,body:Json,role?:string,version?:number)=>Promise<Json>;
export async function ensureDemoContractors(app:FastifyInstance,db:Database,config:Config,clients:Record<string,DemoClient>,get:Get,command:Command) {
 if(config.environment!=='development'||config.identityAdapter!=='local'||!config.localAccountHelper)throw new Error('Demo accounts require local development identity and encrypted account helper');
 const okay=(r:{statusCode:number;body:string;json:()=>any})=>{if(r.statusCode!==200)throw new Error('Demo identity API failed: '+r.body);return r.json() as Json;};
 const post=async(path:string,payload:Json)=>{
  for(let attempt=0;attempt<4;attempt++) {
   const response=await app.inject({method:'POST',url:'/api/v1/'+path,remoteAddress:'127.0.0.1',headers:{host:new URL(config.origin).host,origin:config.origin},payload});
   if(response.statusCode!==429)return response;
   const seconds=Math.max(1,Math.min(60,Number(response.headers['retry-after'])||60));
   console.log('Demo identity request rate limited; waiting before safe retry.');
   await new Promise(resolve=>setTimeout(resolve,seconds*1000));
  }
  throw new Error('Demo identity rate limit remains active; rerun later');
 };
 const result:{role:string;organisationId:string}[]=[];
 for(const suffix of ['cedar','harbour']) {
  const role='demo-'+suffix,email='demo.'+suffix+'@example.test',name='[Demo] '+(suffix==='cedar'?'Cedar Plumbing':'Harbour Plumbing');
  let password:string;
  let [user]=await db.query('SELECT id,name,email_verified FROM users WHERE email=$1',[email]);
  if(user&&user.name!==name)throw new Error('Demo email belongs to a different account; no account changed');
  if(!user) {
   password=randomBytes(32).toString('base64url');
   okay(await post('auth/register',{email,name,password}));
   [user]=await db.query('SELECT id,name,email_verified FROM users WHERE email=$1',[email]);
  } else password=String(okay(await post('dev/accounts/autofill',{userId:user.id})).password);
  if(!user)throw new Error('Demo registration did not create the expected local account');
  if(!user.email_verified) {
   // Request a fresh verification link so an interrupted run never relies on an expired token.
   okay(await post('auth/verify/request',{email}));
   const files=await readdir('work/security-mailbox');let token:string|undefined;
   for(const file of files.sort().reverse()) {
    if(!file.endsWith('.json'))continue;
    const mail=JSON.parse(await readFile('work/security-mailbox/'+file,'utf8')) as Json;
    if(mail.to===email&&mail.purpose==='verify'){token=String(mail.token);break;}
   }
   if(!token)throw new Error('Demo local verification message unavailable');
   okay(await post('auth/verify/confirm',{token}));
  }
  const login=await post('auth/login',{email,password}),data=okay(login);
  clients[role]={cookie:String(login.headers['set-cookie']).split(';')[0]!,csrf:String(data.csrfToken),access:1};
  let context=await get('me/context',role);clients[role]!.access=Number(context.accessVersion);
  if(!context.context) {
   await command(role+'/apply','contractor/applications',{organisationName:name,contact:'[Demo] fictional comparison contact',trades:['plumbing']},role,clients[role]!.access);
   context=await get('me/context',role);clients[role]!.access=Number(context.accessVersion);
  }
  const [membership]=await db.query("SELECT organisation_id FROM memberships WHERE user_id=$1 AND active=true AND role='contractor'",[user.id]);
  if(!membership)throw new Error('Demo contractor membership missing');
  const organisationId=String(membership.organisation_id),detail=await get('contractors/'+organisationId,'admin');
  if(detail.organisation.name!==name)throw new Error('Unexpected demo organisation; no approval changed');
  if(detail.profile?.state!=='approved')await command(role+'/approve','admin/contractors/'+organisationId+'/decision',{outcome:'approved',categories:['plumbing'],reason:'[Demo] Owner-authorised fictional comparison bidder; not genuine verification',internalNotes:'[Demo] Local synthetic organisation; no real credential assertion.'},'admin',Number(detail.organisation.version));
  result.push({role,organisationId});
 }
 return result;
}
