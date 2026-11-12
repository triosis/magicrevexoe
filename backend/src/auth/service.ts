import {MfaFactors} from './mfa.js'
import {platformOwnerEmail} from '../config/platform-owner.js'
import type {Database} from './database.js'
import { randomBytes } from 'node:crypto'
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { RequestHandler } from 'express'
import { HttpError } from '../middleware/error-handler.js'
import { select, transaction, lockPlatform } from './database.js'
import { Authorization, type Principal, type Membership } from './authorization.js'
import { AccessTokens, tokenDigest, opaqueToken } from './tokens.js'
import { hashPassword, verifyPassword } from './passwords.js'
import {loginPasswordHash} from './super-admin-credential.js'
import type { InvitationDelivery } from '../tenants/delivery.js'
import {FeedbackTokens} from '../feedback/tokens.js'
import {quotas} from '../subscriptions/quota.js'

type User = RowDataPacket & { id: string; email: string; password_hash: string | null; status: string; auth_version: number; email_verified_at: Date | null }
type Session = RowDataPacket & { id: string; user_id: string; family_id: Buffer; auth_version: number; expires_at: Date; revoked_at: Date | null; valid: number; mfa_verified:number; challenge_only:number }
export type TokenDelivery = (message: { email: string; token: string; purpose: 'reset_password' | 'invite' }) => Promise<void>
function invalid(): never { throw new HttpError(401, 'Invalid credentials') }
export const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export class AuthService {
  readonly mfa:MfaFactors
  readonly feedbackTokens:FeedbackTokens
  readonly authorization: Authorization
  private readonly tokens: AccessTokens
  constructor(private readonly pool: Pool, key: Uint8Array, private readonly deliver?: TokenDelivery, private readonly verifyDelivery?: () => Promise<void>, mfaKey?:Uint8Array, private readonly passwordOnlySuperAdminEmail?:string) {
    if(passwordOnlySuperAdminEmail!==undefined&&passwordOnlySuperAdminEmail!==platformOwnerEmail)throw Error('Invalid password-only Super Admin policy')
    this.mfa=new MfaFactors(mfaKey)
    this.feedbackTokens=new FeedbackTokens(key)
    this.tokens = new AccessTokens(key)
    this.authorization = new Authorization(pool)
  }

  async requiresMfa(db:Database,user:string){
    const member=(await select(db,"SELECT m.id,u.email FROM tenant_memberships m JOIN roles r ON r.id=m.role_id JOIN users u ON u.id=m.user_id WHERE m.user_id=? AND m.status='active' AND m.tenant_kind='platform' AND r.code='super_admin' LIMIT 1",[user]))[0]
    return !!member&&member.email!==this.passwordOnlySuperAdminEmail
  }
  private async challengeUser(token:string){
    const hint=(await select(this.pool,'SELECT user_id FROM auth_sessions WHERE token_hash=?',[tokenDigest(token)]))[0]
    if(!hint)invalid()
    return hint.user_id as string
  }
  private async challenge(db:PoolConnection,token:string,userId:string){
    const user=await this.lockedUser(db,userId);this.usable(user)
    const session=(await select(db,'SELECT * FROM auth_sessions WHERE token_hash=? AND user_id=? AND challenge_only=TRUE AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP(6) AND auth_version=? FOR UPDATE',[tokenDigest(token),user.id,user.auth_version]))[0]
    if(!session||!await this.requiresMfa(db,user.id))invalid()
    this.mfa.available()
    return {user,session}
  }
  async enrollMfa(challengeToken:string){const userId=await this.challengeUser(challengeToken);return transaction(this.pool,async db=>{const {user,session}=await this.challenge(db,challengeToken,userId);const qr=await this.mfa.enroll(db,user.id,session.id,user.email);await this.audit(db,user.id,'auth.mfa_enrollment_started');return qr})}
  async verifyMfa(challengeToken:string,code:string,enroll=false){
    const userId=await this.challengeUser(challengeToken)
    const result=await transaction(this.pool,async db=>{
      const {user,session}=await this.challenge(db,challengeToken,userId)
      const verified=await this.mfa.verify(db,user.id,session.id,code,enroll)
      if(!verified){await this.audit(db,user.id,'auth.mfa_rejected');return null}
      await db.execute('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=?'+(enroll?'':' AND id=?'),enroll?[user.id]:[user.id,session.id])
      const recoveryCodes=enroll?await this.mfa.recoveryCodes(db,user.id):undefined
      await this.audit(db,user.id,enroll?'auth.mfa_enabled':verified.recovery?'auth.mfa_recovery_used':'auth.mfa_verified')
      return {...await this.response(await this.session(db,user,undefined,undefined,true)),...(recoveryCodes?{recoveryCodes}:{})}
    })
    if(!result)invalid()
    return result
  }
  async manageMfa(principal:Principal,password:string,code:string,disable=false){
    const result=await transaction(this.pool,async db=>{
      const user=await this.lockedUser(db,principal.identity.sub);this.usable(user)
      const session=(await select(db,'SELECT id FROM auth_sessions WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP(6) AND auth_version=? AND mfa_verified=TRUE AND challenge_only=FALSE',[principal.identity.sid,user.id,user.auth_version]))[0]
      if(!session||principal.identity.av!==user.auth_version||principal.identity.amr.length!==2||!await this.requiresMfa(db,user.id))invalid()
      const platformMember=(await select(db,"SELECT id FROM tenant_memberships WHERE user_id=? AND tenant_kind='platform' AND status='active'",[user.id]))[0]
      if(!platformMember)invalid()
      this.authorization.platform(await this.authorization.membership(user.id,platformMember.id,db))
      if(!await verifyPassword(user.password_hash,password)){await this.mfa.verify(db,user.id,principal.identity.sid,'invalid');await this.audit(db,user.id,'auth.mfa_rejected');return null}
      const verified=await this.mfa.verify(db,user.id,principal.identity.sid,code)
      if(!verified){await this.audit(db,user.id,'auth.mfa_rejected');return null}
      if(verified.recovery)await this.audit(db,user.id,'auth.mfa_recovery_used')
      let recoveryCodes:string[]|undefined
      if(disable){await db.execute('UPDATE user_mfa SET secret_cipher=NULL,enabled_at=NULL,last_step=NULL,pending_cipher=NULL,pending_session_id=NULL,pending_expires_at=NULL WHERE user_id=?',[user.id]);await db.execute('UPDATE mfa_recovery_codes SET consumed_at=COALESCE(consumed_at,UTC_TIMESTAMP(6)) WHERE user_id=?',[user.id])}
      else recoveryCodes=await this.mfa.recoveryCodes(db,user.id)
      await db.execute('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=?',[user.id])
      await this.audit(db,user.id,disable?'auth.mfa_disabled':'auth.mfa_recovery_regenerated')
      return {recoveryCodes:recoveryCodes??[]}
    })
    if(!result)invalid()
    return result
  }

  invitationDelivery(): InvitationDelivery | undefined {
    if (!this.deliver || !this.verifyDelivery) return undefined
    return {kind:'smtp',verify:this.verifyDelivery,send:this.deliver}
  }
  private async lockedUser(connection: PoolConnection, userId: string): Promise<User> {
    const user = (await select<User>(connection, 'SELECT * FROM users WHERE id=? FOR UPDATE', [userId]))[0]
    if (!user) invalid()
    return user
  }
  private usable(user: User): void {
    if (user.status !== 'active' || !user.email_verified_at || !user.password_hash) invalid()
  }
  private async audit(connection: PoolConnection, userId: string, action: string, member?: Membership): Promise<void> {
    const root = (await select(connection, "SELECT id FROM tenants WHERE platform_slot=1"))[0]
    if (!root) throw new HttpError(503, 'Authentication temporarily unavailable')
    await connection.execute(`INSERT INTO audit_logs(event_id,tenant_id,actor_user_id,actor_tenant_id,actor_membership_id,action,resource_type,resource_id,request_id,outcome,safe_metadata)
      VALUES (?,?,?,?,?,?,'user',?,?,?,'{}')`, [randomBytes(16),member?.tenantId ?? root.id,userId,member?.tenantId ?? null,member?.membershipId ?? null,action,userId,randomBytes(16),['auth.mfa_rejected','auth.password_rejected','auth.refresh_replay'].includes(action)?'denied':'success'])
  }
  private async session(connection: PoolConnection, user: User, family: Buffer = randomBytes(16), expires?: Date, verified=false, challenge=false) {
    const refreshToken = opaqueToken()
    const digest = tokenDigest(refreshToken)
    if (expires) {
      await connection.execute(`INSERT INTO auth_sessions(user_id,token_hash,family_id,expires_at,auth_version) VALUES (?,?,?,?,?)`,[user.id,digest,family,expires,user.auth_version])
    } else {
      await connection.execute(`INSERT INTO auth_sessions(user_id,token_hash,family_id,expires_at,auth_version) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 7 DAY),?)`,[user.id,digest,family,user.auth_version])
    }
    const row = (await select(connection,'SELECT id FROM auth_sessions WHERE token_hash=?',[digest]))[0]!
    await connection.execute('UPDATE auth_sessions SET mfa_verified=?,challenge_only=? WHERE id=?',[verified,challenge,row.id])
    return { refreshToken, identity: { sub:user.id,sid:row.id as string,av:user.auth_version,amr:verified?['pwd','mfa'] as ['pwd','mfa']:['pwd'] as ['pwd'] } }
  }
  private async response(session: Awaited<ReturnType<AuthService['session']>>) {
    return { accessToken:await this.tokens.issue(session.identity),refreshToken:session.refreshToken,tokenType:'Bearer',expiresIn:300 }
  }
  async login(email: string, password: string) {
    const candidate = (await select<User>(this.pool,'SELECT * FROM users WHERE email_key=?',[Buffer.from(normalizeEmail(email))]))[0]
    const verified = await verifyPassword(loginPasswordHash(candidate?.email,candidate?.password_hash ?? null),password)
    // The explicit owner exception keeps a persistent account lock independent
    // of process-local IP/email throttles. Existing MFA state is never cleared.
    if(candidate&&candidate.email===platformOwnerEmail){
      const accepted=await transaction(this.pool,async db=>{
        const user=await this.lockedUser(db,candidate.id);this.usable(user)
        if(user.email!==platformOwnerEmail||user.password_hash!==candidate.password_hash)invalid()
        const member=(await select(db,"SELECT m.id FROM tenant_memberships m JOIN roles r ON r.id=m.role_id WHERE m.user_id=? AND m.status='active' AND m.tenant_kind='platform' AND r.code='super_admin' LIMIT 1",[user.id]))[0]
        if(!member)invalid()
        const row=await this.mfa.row(db,user.id)
        if(Number(row.locked))throw new HttpError(429,'Too many login attempts')
        if(!verified){
          await db.execute('UPDATE user_mfa SET failed_attempts=IF(locked_until IS NOT NULL AND locked_until<=UTC_TIMESTAMP(6),1,failed_attempts+1),locked_until=IF(failed_attempts>=5,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 15 MINUTE),NULL) WHERE user_id=?',[user.id])
          await this.audit(db,user.id,'auth.password_rejected')
          return false
        }
        await db.execute('UPDATE user_mfa SET failed_attempts=0,locked_until=NULL WHERE user_id=?',[user.id])
        return true
      })
      if(!accepted)invalid()
    }
    if (!candidate || !verified) invalid()
    const session = await transaction(this.pool,async connection=>{
      const user = await this.lockedUser(connection,candidate.id)
      this.usable(user)
      if (user.password_hash !== candidate.password_hash || user.auth_version !== candidate.auth_version) invalid()
      const required=await this.requiresMfa(connection,user.id)
      if(required)this.mfa.available()
      const session = await this.session(connection,user,undefined,required?new Date(Date.now()+5*60_000):undefined,false,required)
      await connection.execute('UPDATE users SET last_login_at=UTC_TIMESTAMP(6) WHERE id=?',[user.id])
      await this.audit(connection,user.id,required?'auth.primary_verified':'auth.login')
      return session
    })
    if(await this.requiresMfa(this.pool,session.identity.sub))return {mfaRequired:true as const,challengeToken:session.refreshToken,enrollmentRequired:!await this.mfa.enabled(this.pool,session.identity.sub)}
    return this.response(session)
  }
  async refresh(token: string) {
    const digest = tokenDigest(token)
    const hint = (await select(this.pool,'SELECT user_id FROM auth_sessions WHERE token_hash=?',[digest]))[0]
    if (!hint) invalid()
    const result = await transaction(this.pool,async connection=>{
      const user = await this.lockedUser(connection,hint.user_id)
      const old = (await select<Session>(connection,'SELECT *,expires_at>UTC_TIMESTAMP(6) AS valid FROM auth_sessions WHERE token_hash=? AND user_id=? FOR UPDATE',[digest,user.id]))[0]
      if (!old) invalid()
      if (old.revoked_at) {
        // Commit family revocation before returning the generic error. Throwing
        // inside the transaction would roll back the replay response itself.
        await connection.execute('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=? AND family_id=?',[user.id,old.family_id])
        await this.audit(connection,user.id,'auth.refresh_replay')
        return null
      }
      this.usable(user)
      if (old.challenge_only || (await this.requiresMfa(connection,user.id)&&!old.mfa_verified)) invalid()
      if (!Number(old.valid) || old.auth_version !== user.auth_version) invalid()
      await connection.execute('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6),last_used_at=UTC_TIMESTAMP(6) WHERE id=?',[old.id])
      const session = await this.session(connection,user,old.family_id,old.expires_at,!!old.mfa_verified)
      await this.audit(connection,user.id,'auth.refresh')
      return session
    })
    if (!result) invalid()
    return this.response(result)
  }
  async authenticate(accessToken: string): Promise<Principal> {
    const identity = await this.tokens.verify(accessToken)
    const row = (await select(this.pool,`SELECT u.status,u.auth_version,u.email_verified_at,s.auth_version AS session_version,s.mfa_verified,s.challenge_only
      FROM users u JOIN auth_sessions s ON s.user_id=u.id
      WHERE u.id=? AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP(6)`,[identity.sub,identity.sid]))[0]
    if (!row || row.challenge_only || (await this.requiresMfa(this.pool,identity.sub)&&(!row.mfa_verified||identity.amr.length!==2)) || row.status!=='active' || !row.email_verified_at || row.auth_version!==identity.av || row.session_version!==identity.av) throw new HttpError(401,'Authentication required')
    const principal: Principal = {identity}
    if (identity.mid) principal.membership = await this.authorization.membership(identity.sub,identity.mid)
    return principal
  }
  authentication(): RequestHandler {
    return async (request,response,next)=>{
      const match = /^Bearer ([A-Za-z0-9_.-]{1,4096})$/.exec(request.headers.authorization ?? '')
      if (!match) throw new HttpError(401,'Authentication required')
      response.locals.auth = await this.authenticate(match[1]!)
      next()
    }
  }
  async selectTenant(principal: Principal, membershipId: string) {
    await this.authenticate(await this.tokens.issue(principal.identity))
    const member = await this.authorization.membership(principal.identity.sub,membershipId)
    await transaction(this.pool,c=>this.audit(c,principal.identity.sub,'auth.select_tenant',member))
    return { accessToken:await this.tokens.issue({...principal.identity,mid:membershipId}),tokenType:'Bearer',expiresIn:300,membership:member }
  }
  async me(principal: Principal) {
    const user = (await select(this.pool,'SELECT public_id,email,display_name FROM users WHERE id=?',[principal.identity.sub]))[0]!
    const candidates = await select(this.pool,"SELECT id FROM tenant_memberships WHERE user_id=? AND status='active'",[principal.identity.sub])
    const memberships: Membership[] = []
    for (const candidate of candidates) {
      try { memberships.push(await this.authorization.membership(principal.identity.sub,candidate.id)) }
      catch(error) { if (!(error instanceof HttpError) || error.status!==403) throw error }
    }
    return { user:{id:principal.identity.sub,publicId:(user.public_id as Buffer).toString('hex'),email:user.email,displayName:user.display_name},memberships,selectedMembership:principal.membership ?? null,amr:principal.identity.amr,mfaImplemented:true }
  }
  async logout(principal: Principal): Promise<void> {
    await transaction(this.pool,async connection=>{
      await this.lockedUser(connection,principal.identity.sub)
      const session = (await select(connection,'SELECT family_id FROM auth_sessions WHERE id=? AND user_id=? FOR UPDATE',[principal.identity.sid,principal.identity.sub]))[0]
      if (session) await connection.execute('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=? AND family_id=?',[principal.identity.sub,session.family_id])
      await this.audit(connection,principal.identity.sub,'auth.logout')
    })
  }
  async forgotPassword(email: string): Promise<void> {
    if (!this.deliver) throw new HttpError(503,'Account recovery temporarily unavailable')
    const hint = (await select<User>(this.pool,'SELECT * FROM users WHERE email_key=?',[Buffer.from(normalizeEmail(email))]))[0]
    // Equalize password-hash work for existent/nonexistent email paths.
    await verifyPassword(null,opaqueToken())
    if (!hint || hint.status!=='active') return
    const token = opaqueToken()
    const recipient = await transaction(this.pool,async connection=>{
      const user = await this.lockedUser(connection,hint.id)
      if (user.status!=='active') return null
      await connection.execute("UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(6) WHERE user_id=? AND purpose='reset_password' AND consumed_at IS NULL",[user.id])
      await connection.execute("INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES (?,'reset_password',?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 30 MINUTE))",[user.id,tokenDigest(token)])
      await this.audit(connection,user.id,'auth.password_reset_requested')
      return user.email
    })
    if (recipient) {
      // Do not expose SMTP latency as an account-existence timing signal.
      const deliver=this.deliver
      void Promise.resolve().then(()=>deliver({email:recipient,token,purpose:'reset_password'}))
        .catch(()=>console.error('Account recovery delivery failed; provider details withheld.'))
    }
  }
  async consumeToken(token: string, password: string, purpose: 'reset_password' | 'invite'): Promise<void> {
    const digest = tokenDigest(token)
    const hint = (await select(this.pool,'SELECT user_id FROM auth_tokens WHERE token_hash=? AND purpose=?',[digest,purpose]))[0]
    if (!hint) invalid()
    const encoded = await hashPassword(password)
    await transaction(this.pool,async connection=>{
      const user = await this.lockedUser(connection,hint.user_id)
      if(purpose==='invite')await lockPlatform(connection)
      const row = (await select(connection,'SELECT *,expires_at>UTC_TIMESTAMP(6) AS valid FROM auth_tokens WHERE token_hash=? AND purpose=? FOR UPDATE',[digest,purpose]))[0]
      if (!row || row.consumed_at || !Number(row.valid)) invalid()
      if (purpose==='reset_password' && user.status!=='active') invalid()
      if (purpose==='invite') {
        if (!['invited','active'].includes(user.status)) invalid()
        await this.authorization.ancestors(row.tenant_id,connection)
        const member = (await select(connection,"SELECT id FROM tenant_memberships WHERE tenant_id=? AND user_id=? AND status='invited' FOR UPDATE",[row.tenant_id,user.id]))[0]
        if (!member) invalid()
        // An invitation for an existing identity cannot reset its global password.
        if (user.status==='active' && !await verifyPassword(user.password_hash,password)) invalid()
        await connection.execute("UPDATE tenant_memberships SET status='active' WHERE id=?",[member.id])
      }
      if (purpose==='reset_password' || user.status==='invited') {
        await connection.execute("UPDATE users SET password_hash=?,password_changed_at=UTC_TIMESTAMP(6),email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP(6)),status='active',auth_version=auth_version+1 WHERE id=?",[encoded,user.id])
        await connection.execute('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=?',[user.id])
      }
      if(purpose==='invite'){
        const tenant=(await select(connection,'SELECT kind FROM tenants WHERE id=?',[row.tenant_id]))[0]
        if(tenant?.kind==='merchant')await quotas.consume(connection,row.tenant_id,'staff_seats',`membership:${row.tenant_id}:${user.id}`)
      }
      await connection.execute('UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(6) WHERE id=? AND consumed_at IS NULL',[row.id])
      if (purpose==='reset_password') await connection.execute("UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(6) WHERE user_id=? AND purpose='reset_password' AND consumed_at IS NULL",[user.id])
      await this.audit(connection,user.id,purpose==='invite'?'auth.invitation_accepted':'auth.password_reset')
    })
  }
}
