import {quotas} from '../dist/subscriptions/quota.js'
import {metrics} from '../dist/subscriptions/model.js'

// Explicit synthetic configuration for pre-quota regression tests, never runtime.
export async function fundTestMerchant(pool,tenant){
 const db=await pool.getConnection()
 try{
  const [name]=await db.query('SELECT DATABASE() AS name')
  if(!name[0].name.startsWith('magicreview_migration_'))throw Error('Disposable schema required')
  await db.query("SET SESSION time_zone='+00:00'");await db.beginTransaction()
  const [existing]=await db.execute('SELECT id FROM subscriptions WHERE tenant_id=? AND current_slot=1',[tenant]);if(existing.length){await db.commit();return existing[0].id}
  let [plans]=await db.query("SELECT id FROM subscription_plans WHERE code='quota_regression_fixture'")
  if(!plans.length){await db.query("INSERT INTO subscription_plans(code,version,name,price,currency,interval_unit) VALUES ('quota_regression_fixture',1,'Synthetic regression fixture',0,'INR','month')");[plans]=await db.query("SELECT id FROM subscription_plans WHERE code='quota_regression_fixture'");for(const m of metrics)await db.execute('INSERT INTO plan_limits(plan_id,metric,limit_value) VALUES (?,?,NULL)',[plans[0].id,m]);await db.execute("UPDATE subscription_plans SET status='published' WHERE id=?",[plans[0].id])}
  await db.execute("INSERT INTO subscriptions(tenant_id,plan_id,status,starts_at,current_period_start,current_period_end) VALUES (?,?,'active',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 DAY))",[tenant,plans[0].id])
  const [rows]=await db.execute("SELECT id,DATE_FORMAT(current_period_start,'%Y-%m-%d %H:%i:%s.%f') AS start,DATE_FORMAT(current_period_end,'%Y-%m-%d %H:%i:%s.%f') AS end FROM subscriptions WHERE tenant_id=? AND current_slot=1",[tenant]);const s=rows[0]
  for(const m of metrics){const used=await quotas.observed(db,tenant,m,s.start,s.end);await db.execute('INSERT INTO usage_counters(tenant_id,subscription_id,metric,period_start,period_end,used) VALUES (?,?,?,?,?,?)',[tenant,s.id,m,s.start,s.end,used]);if(BigInt(used))await db.execute('INSERT INTO usage_records(tenant_id,subscription_id,metric,quantity,period_start,period_end,source_event_key) VALUES (?,?,?,?,?,?,?)',[tenant,s.id,m,used,s.start,s.end,Buffer.from(`init:${s.id}:${m}`)])}
  await db.commit();return s.id
 }catch(error){await db.rollback();throw error}finally{db.release()}
}
