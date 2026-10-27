import {LocalAccounts} from '../infrastructure/local-accounts.js';
import {createHash, randomUUID} from 'node:crypto';
import type {Database, Sql} from '../infrastructure/database.js';
import type {Config} from '../infrastructure/config.js';
import {AppError, requiredText} from '../contracts/primitives.js';
import {hashPassword, checkPassword, hashToken, newToken, type Mailbox} from '../infrastructure/local-identity.js';
import {memberships, requireCapability, type Actor} from './access.js';
import {createAttention,validCategories} from './verification-service.js';

export interface Command {operationId: string; expectedVersion: number; requestId: string; csrf: string;}
export class IdentityService {
  private dummyHash!: string;
  localAccounts: LocalAccounts | undefined;
  constructor(readonly db: Database, readonly config: Config, readonly mailbox: Mailbox,
    readonly now: () => Date = () => new Date()) {}
  async initialize() {
    this.dummyHash = await hashPassword('local-dummy-password-for-timing');
    this.localAccounts = await LocalAccounts.create(this.config,this.db);
  }
  private after(hours: number) {return new Date(this.now().getTime() + hours * 3600000).toISOString();}
  async actor(token: string | undefined, sql: Sql = this.db): Promise<Actor> {
    if (!token) throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');
    const sessionHash = hashToken(token);
    const [row] = await sql.query(`SELECT u.id,u.name,u.email,u.access_version,s.csrf_token,s.context_id
      FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > $2 AND u.active=true`, [sessionHash, this.now().toISOString()]);
    if (!row) throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');
    const current = await memberships(sql, String(row.id));
    const context = current.find(m => m.id === row.context_id);
    return {id: String(row.id), name: String(row.name), email: String(row.email),
      accessVersion: Number(row.access_version), memberships: current, context,
      csrf: String(row.csrf_token), sessionHash};
  }
  async register(email: string, name: string, password: string) {
    const passwordHash = await hashPassword(password);
    await this.db.transaction(async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const [existing] = await tx.query('SELECT id FROM users WHERE email=$1', [email]);
      if (existing) return;
      const id = randomUUID();
      await tx.query('INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)',
        [id,email,requiredText(name),passwordHash]);
      await this.localAccounts?.remember(tx,id,password,passwordHash);
      await this.issueToken(tx,id,email,'verify');
      await this.audit(tx,id,null,'account.register',id,null,{email},'identity');
    });
    return {message: 'If eligible, account verification instructions have been issued.'};
  }
  private async issueToken(tx: Sql, userId: string, email: string, purpose: 'verify' | 'recover') {
    const token = newToken();
    await tx.query('UPDATE identity_tokens SET consumed_at=$1 WHERE user_id=$2 AND purpose=$3 AND consumed_at IS NULL',
      [this.now().toISOString(),userId,purpose]);
    await tx.query('INSERT INTO identity_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,$4)',
      [hashToken(token),userId,purpose,this.after(purpose === 'recover' ? 0.5 : 24)]);
    // Local-only security mailbox. No ticket activity email or production delivery is implemented.
    await this.mailbox.send({to:email,purpose,token});
  }
  async requestToken(email: string, purpose: 'verify' | 'recover') {
    await this.db.transaction(async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const [user] = await tx.query('SELECT id,email_verified FROM users WHERE email=$1 AND active=true', [email]);
      if (user && (purpose === 'recover' || !user.email_verified)) await this.issueToken(tx,String(user.id),email,purpose);
    });
    return {message:'If eligible, instructions have been issued.'};
  }
  async consumeToken(token: string, purpose: 'verify' | 'recover', password?: string) {
    const passwordHash = purpose === 'recover' ? await hashPassword(password ?? '') : undefined;
    return this.db.transaction(async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const [row] = await tx.query(`SELECT t.user_id FROM identity_tokens t JOIN users u ON u.id=t.user_id
        WHERE t.token_hash=$1 AND t.purpose=$2 AND t.consumed_at IS NULL AND t.expires_at>$3 AND u.active=true FOR UPDATE OF t`,
        [hashToken(token),purpose,this.now().toISOString()]);
      if (!row) throw new AppError(422,'INVALID_TOKEN','This link is invalid or expired');
      await tx.query('UPDATE identity_tokens SET consumed_at=$1 WHERE token_hash=$2', [this.now().toISOString(),hashToken(token)]);
      if (purpose === 'verify') await tx.query('UPDATE users SET email_verified=true WHERE id=$1', [row.user_id]);
      else {
        await tx.query('UPDATE users SET password_hash=$1,access_version=access_version+1 WHERE id=$2', [passwordHash,row.user_id]);
        await this.localAccounts?.remember(tx,String(row.user_id),password!,passwordHash!);
        await tx.query('DELETE FROM sessions WHERE user_id=$1', [row.user_id]);
      }
      await this.audit(tx,String(row.user_id),null,'identity.'+purpose,String(row.user_id),null,null,'identity');
      return {message: purpose === 'verify' ? 'Email verified. You can sign in.' : 'Password reset. Sign in again.'};
    });
  }
  async login(email: string, password: string) {
    const [user] = await this.db.query('SELECT id,password_hash FROM users WHERE email=$1', [email]);
    const valid = await checkPassword(password,String(user?.password_hash ?? this.dummyHash));
    if (!user || !valid) throw new AppError(401,'INVALID_CREDENTIALS','Unable to sign in with these credentials');
    return this.db.transaction(async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      // Recheck the credential hash: recovery can race password verification outside the transaction.
      const [current] = await tx.query('SELECT id FROM users WHERE id=$1 AND password_hash=$2 AND active=true AND email_verified=true',
        [user.id,user.password_hash]);
      if (!current) throw new AppError(401,'INVALID_CREDENTIALS','Unable to sign in with these credentials');
      await this.localAccounts?.remember(tx,String(user.id),password,String(user.password_hash));
      const token = newToken(), csrf = newToken();
      const contexts = await memberships(tx,String(user.id));
      await tx.query('INSERT INTO sessions(token_hash,user_id,csrf_token,context_id,expires_at) VALUES($1,$2,$3,$4,$5)',
        [hashToken(token),user.id,csrf,contexts.length === 1 ? contexts[0]!.id : null,this.after(this.config.sessionHours)]);
      await this.audit(tx,String(user.id),null,'session.login',String(user.id),null,null,'identity');
      return {token,csrf};
    });
  }
  async logout(token: string, csrf: string) {
    await this.db.transaction(async tx => {
      const actor = await this.actor(token,tx);
      if (actor.csrf !== csrf) throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      await tx.query('DELETE FROM sessions WHERE token_hash=$1',[actor.sessionHash]);
    });
    return {message:'Signed out'};
  }
  async switchContext(token: string, membershipId: string, csrf: string) {
    return this.db.transaction(async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor = await this.actor(token,tx);
      if (actor.csrf !== csrf) throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      if (!actor.memberships.some(m => m.id === membershipId)) throw new AppError(404,'NOT_FOUND','Context unavailable');
      await tx.query('UPDATE sessions SET context_id=$1 WHERE token_hash=$2',[membershipId,actor.sessionHash]);
      return {message:'Context selected'};
    });
  }
  private async command(token: string, meta: Command, intent: string, body: unknown,
    capability: 'membership.manage' | null, work: (tx: Sql, actor: Actor) => Promise<Record<string,unknown>>) {
    return this.db.transaction(async tx => {
      // One bounded identity mutation lock avoids invitation/revocation races in the initial monolith.
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor = await this.actor(token,tx);
      if (actor.csrf !== meta.csrf) throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      if (capability) requireCapability(actor,capability);
      const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const [receipt] = await tx.query('SELECT intent,fingerprint,result FROM command_receipts WHERE actor_id=$1 AND operation_id=$2',
        [actor.id,meta.operationId]);
      if (receipt) {
        if (receipt.intent !== intent || receipt.fingerprint !== fingerprint)
          throw new AppError(409,'IDEMPOTENCY_KEY_REUSED','Operation identity was used for another request');
        return receipt.result as Record<string,unknown>;
      }
      if (actor.accessVersion !== meta.expectedVersion) throw new AppError(412,'VERSION_CHANGED','Access changed. Refresh before submitting');
      const result = await work(tx,actor);
      await tx.query('INSERT INTO command_receipts(actor_id,operation_id,intent,fingerprint,result) VALUES($1,$2,$3,$4,$5)',
        [actor.id,meta.operationId,intent,fingerprint,result]);
      await tx.query('INSERT INTO outbox(id,kind,resource_id,payload) VALUES($1,$2,$3,$4)',
        [randomUUID(),intent,actor.id,{actorId:actor.id,accessChanged:true}]);
      return result;
    });
  }
  async invite(token: string, meta: Command, body: {email:string; estateId:string; role:'cm'|'mcst'}) {
    return this.command(token,meta,'membership.invite',body,'membership.manage',async(tx,actor) => {
      const [estate] = await tx.query('SELECT id FROM estates WHERE id=$1',[body.estateId]);
      if (!estate) throw new AppError(404,'NOT_FOUND','Estate unavailable');
      const id = randomUUID(), inviteToken = newToken();
      await tx.query('INSERT INTO invitations(id,token_hash,email,role,estate_id,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [id,hashToken(inviteToken),body.email,body.role,body.estateId,actor.id,this.after(72)]);
      await this.mailbox.send({to:body.email,purpose:'invite',token:inviteToken});
      await this.audit(tx,actor.id,actor.context!.role,'membership.invite',id,null,body,meta.requestId);
      return {invitationId:id,message:'Invitation issued'};
    });
  }
  async previewInvite(token: string, csrf: string, inviteToken: string) {
    const actor = await this.actor(token);
    if (actor.csrf !== csrf) throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
    const [invite] = await this.db.query(`SELECT i.role,i.expires_at,e.name AS estate_name
      FROM invitations i JOIN estates e ON e.id=i.estate_id
      WHERE i.token_hash=$1 AND i.email=$2 AND i.accepted_at IS NULL AND i.expires_at>$3`,
      [hashToken(inviteToken),actor.email,this.now().toISOString()]);
    if (!invite) throw new AppError(422,'INVALID_TOKEN','This invitation is invalid or unavailable for this account');
    return {role:invite.role,estateName:invite.estate_name,expiresAt:invite.expires_at};
  }
  async acceptInvite(token: string, meta: Command, inviteToken: string) {
    return this.command(token,meta,'membership.accept-invite',{tokenHash:hashToken(inviteToken)},null,async(tx,actor) => {
      const [invite] = await tx.query('SELECT * FROM invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>$2 FOR UPDATE',
        [hashToken(inviteToken),this.now().toISOString()]);
      if (!invite || invite.email !== actor.email) throw new AppError(422,'INVALID_TOKEN','This invitation is invalid or unavailable for this account');
      const id = randomUUID();
      const [existing] = await tx.query('SELECT id FROM memberships WHERE user_id=$1 AND estate_id=$2 AND role=$3',
        [actor.id,invite.estate_id,invite.role]);
      if (existing) throw new AppError(409,'MEMBERSHIP_EXISTS','Membership already exists; ask Admin to review access');
      await tx.query('INSERT INTO memberships(id,user_id,role,estate_id) VALUES($1,$2,$3,$4)',
        [id,actor.id,invite.role,invite.estate_id]);
      await tx.query('UPDATE invitations SET accepted_at=$1,accepted_by=$2 WHERE id=$3',[this.now().toISOString(),actor.id,invite.id]);
      await tx.query('UPDATE users SET access_version=access_version+1 WHERE id=$1',[actor.id]);
      const current = await memberships(tx,actor.id);
      if (current.length === 1) await tx.query('UPDATE sessions SET context_id=$1 WHERE token_hash=$2',[id,actor.sessionHash]);
      await this.audit(tx,actor.id,String(invite.role),'membership.accept',id,null,{estateId:invite.estate_id,role:invite.role},meta.requestId);
      return {membershipId:id};
    });
  }
  async apply(token: string, meta: Command, body: {organisationName:string; contact:string; trades:string[]}) {
    return this.command(token,meta,'contractor.apply',body,null,async(tx,actor) => {
      const [existing] = await tx.query('SELECT id FROM contractor_applications WHERE user_id=$1',[actor.id]);
      if (existing || actor.memberships.length) throw new AppError(409,'APPLICATION_UNAVAILABLE','An application or membership already exists');
      const organisationId = randomUUID(), applicationId = randomUUID(), membershipId = randomUUID();
      const trades = [...new Set(body.trades.map(requiredText))];
        validCategories(trades);
      await tx.query('INSERT INTO organisations(id,name) VALUES($1,$2)',[organisationId,requiredText(body.organisationName)]);
      await tx.query('INSERT INTO contractor_applications(id,user_id,organisation_id,contact,trades) VALUES($1,$2,$3,$4,$5)',
        [applicationId,actor.id,organisationId,requiredText(body.contact),trades]);
      await tx.query("INSERT INTO memberships(id,user_id,role,organisation_id) VALUES($1,$2,'contractor',$3)",[membershipId,actor.id,organisationId]);
      await tx.query('UPDATE users SET access_version=access_version+1 WHERE id=$1',[actor.id]);
      await tx.query('UPDATE sessions SET context_id=$1 WHERE token_hash=$2',[membershipId,actor.sessionHash]);
        await tx.query("INSERT INTO contractor_profiles(organisation_id,contact,categories,description,version,state,updated_at) VALUES($1,$2,$3,'',1,'pending',$4)",[organisationId,requiredText(body.contact),trades,this.now().toISOString()]);
        await tx.query('INSERT INTO contractor_profile_versions VALUES($1,1,$2,$3,$4)',[organisationId,{name:body.organisationName,contact:body.contact,categories:trades,description:''},actor.id,this.now().toISOString()]);
        await createAttention(tx,this.now(),{kind:'verification.review',resourceId:organisationId,organisationId,action:'Review contractor application identity and trade scope'});
      await this.audit(tx,actor.id,'contractor','contractor.apply',applicationId,null,{organisationId,trades,status:'pending'},meta.requestId);
      return {applicationId,status:'pending',canQuote:false};
    });
  }
  async revoke(token: string, meta: Command, body: {membershipId:string; membershipVersion:number; reason:string}) {
    return this.command(token,meta,'membership.revoke',body,'membership.manage',async(tx,actor) => {
      const [row] = await tx.query('SELECT * FROM memberships WHERE id=$1 FOR UPDATE',[body.membershipId]);
      if (!row) throw new AppError(404,'NOT_FOUND','Membership unavailable');
      if (row.role === 'admin') throw new AppError(409,'ACTION_NO_LONGER_AVAILABLE','Admin bootstrap access is managed by the operator');
      if (row.version !== body.membershipVersion) throw new AppError(412,'VERSION_CHANGED','Membership changed. Refresh before submitting');
      await tx.query('UPDATE memberships SET active=false,version=version+1 WHERE id=$1',[body.membershipId]);
      await tx.query('UPDATE users SET access_version=access_version+1 WHERE id=$1',[row.user_id]);
      await tx.query('UPDATE sessions SET context_id=NULL WHERE context_id=$1',[body.membershipId]);
      await this.audit(tx,actor.id,'admin','membership.revoke',body.membershipId,
        {active:row.active,version:row.version},{active:false,version:Number(row.version)+1},meta.requestId,requiredText(body.reason));
      return {membershipId:body.membershipId,active:false};
    });
  }
  async audit(tx: Sql, actor: string, role: string|null, action: string, resource: string,
    before: unknown, after: unknown, requestId: string, reason: string|null = null) {
    await tx.query('INSERT INTO audit_events(id,actor_id,actor_role,action,resource_id,before_value,after_value,request_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [randomUUID(),actor,role,action,resource,before,after,requestId,reason]);
  }
}
