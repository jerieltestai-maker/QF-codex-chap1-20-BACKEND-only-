import {createHash,randomUUID} from 'node:crypto';
import type {IdentityService} from './identity-service.js';
import {AppError} from '../contracts/primitives.js';
import {hashToken,newToken} from '../infrastructure/local-identity.js';
export const NATIVE_REDIRECT='quotefix://auth';
export class NativeAuth {
  constructor(readonly identity:IdentityService){}
  async authorize(token:string|undefined,csrf:string,challenge:string,state:string) {
    return this.identity.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await this.identity.actor(token,tx);
      if(actor.csrf!==csrf)throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      const [source]=await tx.query('SELECT client_type FROM sessions WHERE token_hash=$1',[actor.sessionHash]);
      if(source?.client_type!=='browser')throw new AppError(403,'BROWSER_REQUIRED','Use the external browser to authorize this device');
      if(!/^[A-Za-z0-9_-]{43}$/.test(challenge)||!/^[A-Za-z0-9_-]{43}$/.test(state))throw new AppError(422,'FIELD_VALIDATION','Invalid native authorization request');
      const code=newToken();
      await tx.query(`INSERT INTO native_authorization_codes(code_hash,user_id,membership_id,access_version,challenge,redirect_uri,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,[hashToken(code),actor.id,actor.context?.id??null,actor.accessVersion,challenge,NATIVE_REDIRECT,new Date(this.identity.now().getTime()+60000).toISOString()]);
      await tx.query(`INSERT INTO audit_events(id,actor_id,actor_role,action,resource_id,after_value,request_id,recorded_at)
        VALUES($1,$2,$3,'native.authorize',$2,$4,'native-auth',$5)`,[randomUUID(),actor.id,actor.context?.role??null,{client:'native'},this.identity.now().toISOString()]);
      return {redirectUri:NATIVE_REDIRECT+'?'+new URLSearchParams({code,state}).toString()};
    });
  }
  async exchange(code:string,verifier:string,redirectUri:string) {
    if(!/^[A-Za-z0-9_-]{43}$/.test(code)||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)||redirectUri!==NATIVE_REDIRECT)
      throw new AppError(400,'INVALID_GRANT','Authorization is invalid or expired');
    return this.identity.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const [grant]=await tx.query(`SELECT c.* FROM native_authorization_codes c JOIN users u ON u.id=c.user_id
        WHERE c.code_hash=$1 AND c.consumed_at IS NULL AND c.expires_at>$2 AND u.active=true AND u.email_verified=true
        AND u.access_version=c.access_version FOR UPDATE OF c`,[hashToken(code),this.identity.now().toISOString()]);
      if(!grant||createHash('sha256').update(verifier).digest('base64url')!==grant.challenge||grant.redirect_uri!==redirectUri)
        throw new AppError(400,'INVALID_GRANT','Authorization is invalid or expired');
      if(grant.membership_id) {
        const [member]=await tx.query('SELECT id FROM memberships WHERE id=$1 AND user_id=$2 AND active=true',[grant.membership_id,grant.user_id]);
        if(!member)throw new AppError(400,'INVALID_GRANT','Authorization is invalid or expired');
      }
      const token=newToken(),csrf=newToken(),expiresAt=new Date(this.identity.now().getTime()+this.identity.config.sessionHours*3600000).toISOString();
      await tx.query(`INSERT INTO sessions(token_hash,user_id,csrf_token,context_id,expires_at,client_type) VALUES($1,$2,$3,$4,$5,'native')`,
        [hashToken(token),grant.user_id,csrf,grant.membership_id,expiresAt]);
      await tx.query('UPDATE native_authorization_codes SET consumed_at=$1 WHERE code_hash=$2',[this.identity.now().toISOString(),hashToken(code)]);
      await tx.query(`INSERT INTO audit_events(id,actor_id,action,resource_id,after_value,request_id,recorded_at)
        VALUES($1,$2,'native.session-issued',$2,$3,'native-auth',$4)`,[randomUUID(),grant.user_id,{client:'native',expiresAt},this.identity.now().toISOString()]);
      return {token,csrfToken:csrf,expiresAt,tokenType:'Bearer'};
    });
  }
}
