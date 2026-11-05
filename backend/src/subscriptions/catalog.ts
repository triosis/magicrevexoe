import {z} from 'zod'
import type {Principal} from '../auth/authorization.js'
import type {TenantService} from '../tenants/service.js'
import {select} from '../auth/database.js'
import {HttpError} from '../middleware/error-handler.js'
import {metrics} from './model.js'
import {approvalInput} from '../billing/terms.js'

const quantity=z.string().regex(/^(0|[1-9][0-9]{0,19})$/).refine(v=>BigInt(v)<=18446744073709551615n).nullable()
export const catalogInput=z.object({code:z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),version:z.number().int().positive().max(4294967295),name:z.string().trim().min(1).max(100),price:z.string().regex(/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/),currency:z.string().regex(/^[A-Z]{3}$/),interval:z.enum(['month','year']),limits:z.object({branches:quantity,staff_seats:quantity,feedback_submissions:quantity,short_links:quantity,qr_assets:quantity}).strict()}).strict()

export class CatalogService {
  constructor(private readonly tenants:TenantService){}
  async approve(principal:Principal,id:string,raw:unknown){
    const parsed=approvalInput.safeParse(raw);if(!parsed.success)throw new HttpError(400,'Every commercial decision and approval reference must be explicit')
    return this.tenants.withActor(principal,async(db,actor)=>{
      this.tenants.requirePermission(actor,'platform.manage');this.tenants.requirePermission(actor,'subscription.manage')
      if(actor.member.kind!=='platform'||actor.member.roleCode!=='super_admin')throw new HttpError(403,'Access denied')
      const plan=(await select(db,'SELECT id,status FROM subscription_plans WHERE id=?',[id]))[0]
      if(!plan||plan.status!=='published')throw new HttpError(409,'Publish the immutable resource plan before commercial approval')
      const value=JSON.stringify(parsed.data.terms),existing=(await select(db,'SELECT terms,approval_reference FROM commercial_approvals WHERE plan_id=?',[id]))[0]
      if(existing){const prior=typeof existing.terms==='string'?JSON.parse(existing.terms):existing.terms;if(JSON.stringify(prior)!==value||existing.approval_reference!==parsed.data.reference)throw new HttpError(409,'Commercial terms are immutable; create a new plan version');return{id,approved:true,created:false}}
      await db.execute('INSERT INTO commercial_approvals(plan_id,terms,approval_reference,approved_by) VALUES (?,?,?,?)',[id,value,parsed.data.reference,actor.principal.identity.sub])
      await this.tenants.auditChange(db,actor,actor.member.tenantId,'catalog.commercial_approved',{reference:parsed.data.reference},'subscription_plan',id)
      return{id,approved:true,created:true}
    })
  }
  async list(principal:Principal,after='0',limit=50){return this.tenants.withActor(principal,async(db,actor)=>{
    this.tenants.requirePermission(actor,'platform.manage')
    if(actor.member.kind!=='platform'||actor.member.roleCode!=='super_admin')throw new HttpError(403,'Access denied')
    const rows=await select(db,'SELECT id,code,version,name,price,currency,interval_unit AS `interval`,status FROM subscription_plans WHERE id>? ORDER BY id LIMIT ?',[after,limit])
    const plans=[]
    for(const row of rows)plans.push({...row,limits:await select(db,'SELECT metric,limit_value AS `limit` FROM plan_limits WHERE plan_id=? ORDER BY metric',[row.id])})
    return{plans,nextCursor:rows.length===limit?rows.at(-1)!.id:null}
  },true)}
  async create(principal:Principal,raw:unknown) {
    const parsed=catalogInput.safeParse(raw);if(!parsed.success)throw new HttpError(400,'Invalid catalog input; explicit terms and every metric are required')
    const input=parsed.data
    return this.tenants.withActor(principal,async(db,actor)=>{
      this.tenants.requirePermission(actor,'platform.manage');this.tenants.requirePermission(actor,'subscription.manage')
      if(actor.member.kind!=='platform'||actor.member.roleCode!=='super_admin')throw new HttpError(403,'Access denied')
      const existing=(await select(db,'SELECT * FROM subscription_plans WHERE code=? AND version=?',[input.code,input.version]))[0]
      if(existing){
        const limits=await select(db,'SELECT metric,limit_value FROM plan_limits WHERE plan_id=?',[existing.id])
        if(existing.name!==input.name||existing.price!==input.price||existing.currency!==input.currency||existing.interval_unit!==input.interval||!metrics.every(m=>limits.some(l=>l.metric===m&&l.limit_value===input.limits[m])))throw new HttpError(409,'Catalog version already exists with different terms')
        return {id:existing.id,status:existing.status,created:false}
      }
      await db.execute('INSERT INTO subscription_plans(code,version,name,price,currency,interval_unit) VALUES (?,?,?,?,?,?)',[input.code,input.version,input.name,input.price,input.currency,input.interval])
      const plan=(await select(db,'SELECT id FROM subscription_plans WHERE code=? AND version=?',[input.code,input.version]))[0]!
      for(const metric of metrics)await db.execute('INSERT INTO plan_limits(plan_id,metric,limit_value) VALUES (?,?,?)',[plan.id,metric,input.limits[metric]])
      await this.tenants.auditChange(db,actor,actor.member.tenantId,'catalog.draft_created',{code:input.code,version:String(input.version)},'subscription_plan',plan.id)
      return {id:plan.id,status:'draft',created:true}
    })
  }
  async publish(principal:Principal,id:string) {return this.tenants.withActor(principal,async(db,actor)=>{
    this.tenants.requirePermission(actor,'platform.manage');this.tenants.requirePermission(actor,'subscription.manage')
    if(actor.member.kind!=='platform'||actor.member.roleCode!=='super_admin')throw new HttpError(403,'Access denied')
    const plan=(await select(db,'SELECT id,status FROM subscription_plans WHERE id=? FOR UPDATE',[id]))[0]
    if(!plan)throw new HttpError(404,'Catalog plan not found')
    if(plan.status==='published')return{id,status:plan.status,changed:false}
    if(plan.status!=='draft')throw new HttpError(409,'Catalog plan cannot be published')
    await db.execute("UPDATE subscription_plans SET status='published' WHERE id=?",[id])
    await this.tenants.auditChange(db,actor,actor.member.tenantId,'catalog.published',{},'subscription_plan',id)
    return{id,status:'published',changed:true}
  })}
}
