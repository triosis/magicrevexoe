import {randomBytes} from 'node:crypto'
// Only called with the harness-owned schema. Values are synthetic, never a catalog.
export async function seedCloudTriggers(db){
 const query=async(sql,args=[])=> (await db.execute(sql,args))[0]
 const insert=async(table,values)=>{const keys=Object.keys(values);const result=await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values));return String(result.insertId)}
 const id=()=>randomBytes(16),hash=()=>randomBytes(32),start='2026-01-01 00:00:00',end='2030-01-01 00:00:00'
 const channel=(await query('SELECT id FROM industry_channels LIMIT 1'))[0].id
 const platform=await insert('tenants',{public_id:id(),kind:'platform',name:'Synthetic platform'})
 const merchant=await insert('tenants',{public_id:id(),kind:'merchant',parent_id:platform,parent_kind:'platform',industry_channel_id:channel,name:'Synthetic merchant'})
 const user=await insert('users',{public_id:id(),email:'cloud@example.invalid',email_key:Buffer.from('cloud@example.invalid'),display_name:'Synthetic'})
 const role=(await query("SELECT id FROM roles WHERE code='merchant_admin'"))[0].id
 await insert('tenant_memberships',{tenant_id:merchant,tenant_kind:'merchant',user_id:user,role_id:role})
 await insert('auth_tokens',{user_id:user,purpose:'reset_password',token_hash:hash(),expires_at:end})
 const version=await insert('channel_versions',{industry_channel_id:channel,version:1,display_name:'Synthetic channel',public_copy:JSON.stringify({title:'Experience',google_label:'Leave a Google review',private_label:'Share private feedback'}),feedback_labels:JSON.stringify({service:'Service experience',cleanliness:'Cleanliness',waiting_time:'Waiting time'}),status:'published',published_at:start})
 const branch=await insert('branches',{public_id:id(),tenant_id:merchant,industry_channel_id:channel,code:'main',name:'Synthetic branch',timezone:'Asia/Kolkata'})
 const destination=await insert('review_destinations',{tenant_id:merchant,branch_id:branch,place_id:'ChIJ_cloud_fixture',review_url:'https://search.google.com/local/writereview?placeid=ChIJ_cloud_fixture'})
 const funnel=await insert('funnel_configurations',{tenant_id:merchant,branch_id:branch,industry_channel_id:channel,channel_version_id:version,review_destination_id:destination,revision:1,status:'published',brand_title:'Synthetic',accent_hex:'#123456',locale:'en',published_at:start})
 const link=await insert('short_links',{tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,code:'cloud_fixture_code_123456789',status:'active'})
 await insert('qr_assets',{tenant_id:merchant,branch_id:branch,short_link_id:link,format:'svg',object_key:'cloud-fixture.svg'})
 const feedback=await insert('private_feedback',{public_id:id(),tenant_id:merchant,branch_id:branch,funnel_configuration_id:funnel,industry_channel_id:channel,short_link_id:link,submission_key_hash:hash(),overall_rating:3,status:'resolved',resolved_at:start})
 await insert('feedback_status_events',{tenant_id:merchant,feedback_id:feedback,actor_user_id:user,from_status:'new',to_status:'in_progress',reason_code:'triage'})
 const plan=await insert('subscription_plans',{code:'synthetic_cloud',version:1,name:'Synthetic',price:'0.00',currency:'INR',interval_unit:'month'})
 for(const metric of ['branches','staff_seats','feedback_submissions','short_links','qr_assets'])await insert('plan_limits',{plan_id:plan,metric,limit_value:'10'})
 await query("UPDATE subscription_plans SET status='published' WHERE id=?",[plan])
 const subscription=await insert('subscriptions',{tenant_id:merchant,plan_id:plan,status:'trialing',starts_at:start,current_period_start:start,current_period_end:end})
 await insert('usage_records',{tenant_id:merchant,subscription_id:subscription,metric:'branches',quantity:1,period_start:start,period_end:end,source_event_key:Buffer.from('fixture')})
 await insert('usage_counters',{tenant_id:merchant,subscription_id:subscription,metric:'branches',period_start:start,period_end:end,used:1})
 await insert('audit_logs',{event_id:id(),tenant_id:merchant,action:'synthetic.fixture',resource_type:'tenant',request_id:id(),outcome:'success',safe_metadata:'{}'})
 await insert('commercial_approvals',{plan_id:plan,terms:'{}',approval_reference:'TEST-ONLY-NO-COMMERCIAL-APPROVAL',approved_by:user})
 const agreement=await insert('billing_agreements',{tenant_id:merchant,plan_id:plan,request_key:id(),status:'creating'})
 await insert('billing_events',{tenant_id:merchant,agreement_id:agreement,event_key:'test-only',event_type:'test-only',payload_sha256:hash()})
 await insert('billable_usage',{tenant_id:merchant,subscription_id:subscription,branch_id:branch,short_link_id:link,metric:'scan',request_key:id(),form_digest:hash(),input_sha256:hash(),language:'en',status:'complete',reserved_tokens:0,expires_at:end})
 await insert('merchant_presentation',{tenant_id:merchant,seed_keywords:'[]'})
 await insert('feedback_archives',{tenant_id:merchant,feedback_id:feedback,actor_user_id:user})
 return {platform,merchant,user,plan,feedback,branch,query}
}
