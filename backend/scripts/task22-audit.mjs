import {readFile,writeFile,access} from 'node:fs/promises'
import {createHash} from 'node:crypto'

// Reproducible source-line inventory, with explicit reviewed dispositions. This
// reads scope as evidence, never as executable instructions or approved prices.
const source=new URL('../../docs/product/approved-scope-of-work-v1.md',import.meta.url)
const raw=await readFile(source),hash=createHash('sha256').update(raw).digest('hex')
if(hash!=='212492f82241a9072b28f1b3aad9e86cdd55b6f2d19666a35855a5bdfaeb47d4')throw Error('Scope changed: review each disposition before regenerating')
const states={IV:'Implemented and verified',IU:'Implemented but not verified',P:'Partially implemented',N:'Not implemented',D:'Deferred to Phase 2/Phase 3/Ongoing',O:'Awaiting owner decision',E:'Blocked by external provider or credentials'}
const evidence={
 TEN:'src/tenants/service.ts; test/tenants.integration.mjs; scripts/e2e-real.mjs',
 AUTH:'src/auth/service.ts, authorization.ts, mfa.ts; test/auth.integration.mjs, mfa.integration.mjs',
 DB:'migrations; src/migrations; test/schema.integration.mjs, migration-safety.integration.mjs',
 FUN:'src/funnels/service.ts, print.ts; test/funnels.integration.mjs, setup.integration.mjs; scripts/e2e-real.mjs',
 PUB:'src/application/public.tsx, drafts.tsx, offline.tsx; test/frontend/public.test.tsx, offline.test.ts; scripts/e2e-real.mjs',
 FB:'src/feedback/service.ts, validation.ts; test/feedback.integration.mjs, feedback-concurrency.integration.mjs, setup.integration.mjs',
 AI:'src/ai/provider.ts, service.ts; src/business/presentation.ts; test/ai-billing.test.mjs, setup.integration.mjs',
 FIN:'src/billing/approval.ts, service.ts; src/subscriptions/service.ts; test/task22.test.mjs, setup.integration.mjs',
 CAT:'src/subscriptions/catalog.ts; src/setup/bootstrap.ts; test/setup.integration.mjs',
 ANA:'src/feedback/service.ts analytics; src/application/analytics.tsx; test/setup.integration.mjs; scripts/e2e-real.mjs',
 BRAND:'src/business/presentation.ts; src/application/presentation.tsx; test/task22.test.mjs, setup.integration.mjs; scripts/e2e-real.mjs',
 QUO:'src/subscriptions/service.ts, quota.ts, model.ts; test/quotas.integration.mjs, subscriptions.integration.mjs, task22.test.mjs',
 EXT:'src/config; src/auth/smtp.ts; test/external.integration.mjs; provider evidence absent',
 REC:'scripts/recovery; test/recovery.integration.mjs; backup-recovery-runbook.md',
 NONE:'Source/schema/route inventory: no implementation or positive feature evidence',
}
const item=(status,phase,proof,note,disposition='Retained')=>({status,phase,proof,note,disposition})
const deferred=(phase,note)=>item('D',phase,'NONE',note)
const policy=note=>item('O','Phase 1 / release','FIN',note)
const originalReplacement=note=>item('IV','Phase 1','DB; TEN; FB',note,'Replaced by approved Task 02; status concerns replacement, not original behavior')
function classify({section,sub,module,text}){
 const t=text.toLowerCase()
 if(/commission|wallet|wholesale|payout|pricing floor|markup|payment split|revenue.share/.test(t))return deferred('Task 02 explicit deferral','No commissions, wallets, wholesale pricing, reseller settlement or payouts may be inferred or enabled.')
 if(section==='6'){
  if(/phase 2/.test(sub))return deferred('Phase 2','Roadmap item; existing early hierarchy/branches do not complete the remaining phase.')
  if(/phase 3/.test(sub))return deferred('Phase 3','Roadmap item; no advanced AI, builder, integration API or analytics claim.')
  if(/phase 4/.test(sub))return deferred('Phase 4','Explicit later roadmap item; not a Phase 1 gap.')
  if(/pilot|processed|p95|completion rate|success metric|merchants onboarded/.test(t))return item('E','Phase 1 acceptance / ongoing','NONE','Requires pilot/representative field evidence. Synthetic fixtures and unit-test duration do not meet business/performance success targets.')
  if(/payments|billing/.test(t))return policy('Catalog/preparation exists; paid activation and financial execution remain disabled by Task 22. Written finance approval and actual catalog are absent.')
  if(/infrastructure/.test(t))return item('P','Phase 1 / operations','DB; EXT','MariaDB/Express/React replace original stack under Task 02. Shared Redis/edge deployment and representative performance remain absent/unverified.')
  if(/scan page/.test(t))return item('P','Phase 1','PUB','Three-language independent paths verified locally; full accessibility and sub-second field performance remain unverified.')
  if(/industry channels/.test(t))return item('IV','Phase 1','DB; BRAND; AI','Three launch channels and fixed structured presets exist. No extra launch verticals or tenant override of guardrails.')
  return item('P','Phase 1','TEN; FUN; FB; AI; ANA','Core loop implemented locally; OAuth/import, legal acceptance and external quality/performance dependencies still prevent Phase 1 completion.')
 }
 if(section==='7'||section==='9'||section==='10')return item('O','Business projections / ongoing','NONE','Source projections, comparisons or success targets are not approved commercial values or verified results. Owner/pilot evidence required.')
 if(section==='8')return item('P','Ongoing risk management','AUTH; QUO; REC; EXT','Local preventive controls are evidenced; legal/provider/capacity/incident/business risk acceptance remains ongoing, not a claim of zero risk.')
 if(section==='5'&&module===null){
  if(/connects? gbp|auto.detect|category.*suggest|suggests.*channel/.test(t))return item('N','Phase 1; owner/provider blocked','NONE','Google connector/category import code remains absent; approved OAuth consent/privacy, app/scopes and API access are prerequisites, not proof the connector exists.')
  if(/routing|notify|escalation/.test(t))return item('O','Automation / privacy decision','NONE','Approved escalation, recipient/contact and consent rules absent; no automated patient/customer contact invented.')
  if(/widget|stylist mentioned|recommendation rate/.test(t))return deferred('Phase 3 advanced analytics','Basic owned rating/event/activity statistics do not implement semantic extraction or specialized industry dashboards.')
  if(/prompt|keyword/.test(t))return item('P','Phase 1 safe context / Phase 3 builder','AI; BRAND','Owned business phrases and immutable service guardrails exist. No arbitrary prompt/rule builder, full SEO library or unsupported claims injected.')
  if(/print|standee|sticker|business card/.test(t))return item('P','Phase 1 QR / Phase 2 hardware','FUN','Vector A6 PDF/SVG/PNG QR download exists; branded industry hardware layouts are later scope.')
  return item('P','Phase 1 amended launch / later vertical expansion','DB; FB; AI','Fixed protected question fields and labels remain unchanged; no weakening of historical constraints to match illustrative custom questionnaires.')
 }
 if(module===6){
  if(sub.startsWith('6.2'))return deferred('Phase 2','AI replies, suggest/auto-post modes and reply guardrails are not implemented; no Google posting enabled.')
  if(/^6\.[3456]/.test(sub))return deferred('Phase 3','Advanced audit/content/sentiment/fraud module remains deferred; current throttles are not the specified classifier.')
  if(sub.startsWith('6.7'))return deferred('Phase 4','No voice/transcription/mobile recording pipeline.')
  if(/latency|cost per draft/.test(t))return item('E','Phase 1 acceptance','AI','Actual model account, latency, usage cost and field evaluation are unverified. Test fixtures are not real AI responses.')
  if(/input/.test(t))return item('P','Phase 1','AI; BRAND','Structured ratings/tags, merchant/industry/language and optional owned business keywords implemented. Customer free text is superseded by Task 02; automated keyword suggestions are not implemented.')
  return item('IU','Phase 1','AI; PUB','Real Claude adapter, editable bounded output and guarded configured model selection tested with injected synthetic transport. Actual language/factual/medical safety quality and vendor operation are unverified.')
 }
 if(module===9)return deferred(/self-encod|mobile/.test(t)?'Phase 4':'Phase 2 hardware / print expansion','Core downloadable vector QR PDF/SVG/PNG exists; physical NFC, SKUs, print partner, industry hardware layouts, EPS and fulfillment are not implemented.')
 if(module===8){
  if(sub.startsWith('8.4'))return deferred('Phase 3','No arbitrary channel/prompt/routing builder or editable compliance engine.')
  if(/hotel|retail|automotive|education|fitness|real estate|professional|home service|pet|event/.test(t))return deferred('Phase 2+','Explicit Phase 1 roadmap selects Salon, Clinic and Restaurant; later verticals are not seeded.')
  if(/question set/.test(t))return item('P','Phase 1 amended structured fields','DB; FB','Four common protected rating fields remain; arbitrary industry questionnaires are not implemented and historical CHECKs are not weakened.')
  if(/compliance notes/.test(t))return item('O','Legal / industry policy','NONE','Approved vertical-specific legal/privacy notes are absent; no healthcare/legal guarantees invented.')
  if(/prompt/.test(t))return item('IU','Phase 1','AI','Fixed per-industry service guardrails exist; live model quality unverified. Tenant-custom prompt builder remains Phase 3.')
  if(/keyword/.test(t))return item('P','Phase 1 / Phase 3 builder','BRAND; AI','Owned 3–5 phrase editor and safe prompt context exist. No 20–30 curated SEO library, verified local-trend source or AI keyword suggestion workflow.')
  if(/routing|print|widgets/.test(t))return item('P','Phase 1 core / later expansion','FB; FUN; ANA','Scoped private inbox, QR PDF and basic analytics exist. Automated escalation, full industry hardware layouts/widgets are not delivered.')
  return item('IV','Phase 1 amended launch contract','DB; FB; AI','Three permitted industry channels, fixed service-only fields and immutable publication. No clinical narrative, arbitrary question builder or guardrail override.')
 }
 if(module===10){
  if(sub.startsWith('10.3'))return deferred('Task 02','Commercial reseller hierarchy, commissions and wallets remain deferred.')
  return policy('Numerical SOW grid/rates/cycles are not approved. Catalog, measurement, receipt reconciliation and non-issuable invoice preparation only. No paid activation, collection, GST issuance, refund, credit note or automated dunning.')
 }
 if(module===11){
  if(/tos|terms|consent|retention|erasure|gdpr|dpdp|breach|72.hour/.test(t))return item('O','Phase 1 / legal / ongoing','NONE','Owner confirms no approved legal/privacy/consent/retention/deletion policy. No wording, periods, acceptance or deletion guarantees invented.')
  if(sub.startsWith('11.2'))return deferred('Phase 4 toolkit / ongoing policy','No approved policy summary/training content or automated compliance PDF toolkit. Owner legal content required before publication.')
  if(/compliance dashboard|anomaly.*alert/.test(t))return item('P','Phase 1 invariant / Phase 4 monitoring','PUB; FB','Fixed guardrails and tests exist; active policy-risk monitor/alert engine is not implemented.')
  if(/audit trail/.test(t))return item('P','Phase 1','FB; ANA','Owned append-only events and feedback history exist. No proof of a Google post, device fingerprint or approved IP/device retention policy.')
  if(/encryption/.test(t))return item('P','Phase 1 / operations','AUTH; REC; EXT','MFA encryption, encrypted backup and verified TLS transport are local evidence; Google OAuth absent, provider at-rest/TLS1.3-only evidence missing.')
  if(/access control/.test(t))return originalReplacement('API RBAC/ancestry and composite FKs are tested. MariaDB does not provide SELECT RLS; original PostgreSQL RLS claim is explicitly replaced.')
  if(/penetration|bug bounty|incident/.test(t))return item('E','Ongoing / Phase 3 bug bounty','AUTH; REC','External pentest, security/legal response approval and operational rehearsal are not established by local tests.')
  if(/editable ai/.test(t))return item('IV','Phase 1','PUB; AI','Actual provider-result text is editable and nothing is automatically posted; unit fixtures are clearly synthetic.')
  return item('IV','Phase 1 amended contract','PUB; FB; AI','Independent Google/private options and strict structured service-only contracts enforced locally. No claim about off-app merchant conduct, perfect model safety or legal certification.')
 }
 if(module===7){
  if(sub.startsWith('7.2')||sub.startsWith('7.3')||sub.startsWith('7.4'))return deferred('Phase 2/3 advanced analytics and reporting','Current scoped basic metrics do not supply commercial KPIs, branded reports, digests, review insights or physical fulfillment reports.')
  if(/public review|review velocity|posted reviews|acceptance rate|conversion/.test(t))return item('E','Phase 1 basic / Phase 3 advanced','ANA','Google posts/velocity/conversion explicitly unavailable. Authorized Google integration and independent posting evidence are absent; no fabricated counts.')
  return item('P','Phase 1 basic / Phase 3 advanced','ANA; FB','Scoped UTC rating distribution, daily feedback, public event counts, recent feedback, recorded language/token usage exist. Recorded views are not unique/physical scans; no full heatmap or keyword analysis.')
 }
 if(module===3){
  if(/create and manage|cannot create or manage other/.test(t))return item('IV','Phase 1 amended hierarchy','TEN','Actual ancestry/typed hierarchy rejects peer/sub-reseller creation and allows the three approved merchant parent paths.')
  return deferred('Phase 2 reseller layer','Scoped hierarchy is implemented early; inherited branding, advanced dashboards and hardware remain deferred.')
 }
 if(module===2){
  if(sub.startsWith('2.1')||sub.startsWith('2.5')||sub.startsWith('2.6'))return deferred('Phase 2','Full reseller white-label/hardware/commercial analytics not delivered. Existing shared dashboard is not white-label completion.')
  if(/create\/edit\/suspend|view all downstream/.test(t))return item('IV','Phase 1 amended hierarchy','TEN','Scoped paginated creation/name/status/descendant paths are tested across all approved edges.')
  if(/filter by status/.test(t))return item('O','Phase 1 basic / Phase 2 reseller','TEN','Tenant status and subscription state are distinct; trial/churn labels require approved lifecycle mapping. Existing list exposes actual state; no invented churn classification.')
  if(/override permissions|impersonat|api keys|bulk|discount/.test(t))return item('O','Phase 2 / owner security-commercial decision','NONE','No delegated impersonation, custom role grants, API key or bulk financial/communication policy is approved; fixed permissions preserved.')
  return deferred('Phase 2','Reseller expansion remains deferred; do not infer advanced functionality from scoped hierarchy.')
 }
 if(module===1){
  if(sub.startsWith('1.3'))return deferred('Phase 2','No hardware ordering, inventory, partner API or shipment notification system.')
  if(/tos|terms/.test(t))return item('O','Phase 1 legal','NONE','Approved legal text and acceptance requirements are absent; owner explicitly requires waiting.')
  if(/impersonat/.test(t))return item('O','Support/security decision','NONE','No approved delegation, reauthentication, notification or audited impersonation policy; never bypass actor authorization.')
  if(sub.startsWith('1.5'))return /subscription plans/.test(t)?item('P','Phase 1','CAT; FIN','Versioned feature/limit catalog exists; no approved numerical three-tier catalog and no paid execution.'):policy('Financial execution remains disabled pending written finance-reviewed approval; measurement/preparation are not collection or GST issuance.')
  if(sub.startsWith('1.4'))return item('P','Phase 1 basic / Phase 3 advanced','ANA','Actual record counts/token metrics exist; MRR/ARR/LTV/churn/cost/conversion/anomaly reporting is not inferred or fabricated.')
  if(sub.startsWith('1.6'))return item('P','Phase 1 invariants / Phase 4 monitor','PUB; FB','Fixed compliance rules have local tests; automated monitoring/alerts/PDF audits remain unimplemented later scope.')
  if(sub.startsWith('1.7'))return item('P','Phase 1 model config / Phase 3 expansion','AI; QUO','Configured primary/complex model and token reservation exist; custom prompt rollback, quality management UI and later-task models are not implemented.')
  if(sub.startsWith('1.2')){
   if(/a\/b/.test(t))return deferred('Phase 3 channel experimentation','No A/B framework or experimentation policy.')
   if(/assign channels to resellers/.test(t))return item('O','Phase assignment / reseller policy','NONE','Owner must approve reseller vertical restriction/grant rules; one-industry merchant ownership and fixed launch catalog remain enforced.')
   return item('P','Phase 1 launch / Phase 3 builder','BRAND; AI; FB; FUN','Fixed channel publication, presets, merchant keywords/logo and QR PDF exist; full arbitrary routing/print/template builder remains later scope.')
  }
  return item('IV','Phase 1 basic administration','TEN; ANA','Create/name/suspend/resume and scoped descendant queries verified; advanced financial performance is separately classified.')
 }
 if(module===4){
  if(/google business profile|oauth|auto.fetch|pre.populated|category suggestion/.test(t))return item('N','Phase 1; owner/provider blocked','NONE','Google OAuth/import/category detection is not implemented, not merely unverified. Depends on approved Google app/access/scopes/redirect and privacy/consent; manual canonical Place ID remains available.')
  if(/seed keyword|keyword insight/.test(t))return item('P','Phase 1 context / later insight','BRAND; AI','Manual keyword editor and prompt context implemented; automatic suggestions/trends are absent and need provider data/entitlement and privacy decisions.')
  if(/internal notes/.test(t))return item('O','Phase 1 / privacy decision','NONE','Free-text internal-note allowlist, allowed data, retention and access policy not approved. No narrative/medical collection invented.')
  if(/escalation|response templates|email|whatsapp/.test(t))return item('O','Phase 2/3/4 automation / consent','NONE','Automated contact/escalation needs approved recipients, consent and policy. Anonymous structured feedback has no customer contact channel.')
  if(sub.startsWith('4.5'))return deferred('Phase 2 replies / Phase 3 classification','No connected Google inbox/replies/classifier/posting. Phase 1 customer drafts do not supply merchant auto-replies.')
  if(sub.startsWith('4.6'))return /review draft/.test(t)?item('P','Phase 1 draft','AI; PUB','Customer draft exists; no separate merchant simulation/keyword insight tool. Live provider behavior unverified.'):deferred('Phase 3 AI tools','No GBP audit/content/image/trend module; not a Phase 1 completion requirement.')
  if(sub.startsWith('4.7')||sub.startsWith('4.8')){
   if(/manager|assigned branch|assignment|comparison|side.by.side/.test(t))return deferred('Phase 2 multi-branch expansion','Task 02 fixed merchant_admin/staff RBAC preserved. No claimed branch-only manager or comparison permissions.')
   return item('IV','Phase 1 amended core / early Phase 2 branches','TEN; FB; ANA','Merchant-owned branches, active ancestry and fixed-role API controls verified locally; no arbitrary role or branch-manager grants.')
  }
  if(sub.startsWith('4.9')){
   if(/usage alerts/.test(t))return item('IV','Phase 1 in-app alerts','QUO','Exact configured finite capacities trigger in-app 80%/100% warnings. No email/push or financial retry/charging inferred.')
   if(/current plan/.test(t))return item('P','Phase 1','QUO; ANA','Real resource plan/period and recorded view/token usage exist; usage is not proof of billable scans. Paid activation disabled.')
   return policy('No paid upgrade/downgrade, collection, invoice issuance or payment-method mutation enabled without written approval. Read-only historical receipts/preparation remain.')
  }
  if(sub.startsWith('4.10'))return /policy status/.test(t)?item('P','Phase 1 invariant','PUB; FB','Fixed independent options are enforced, not a legal certification/active compliance monitor.'):item('O','Phase 1 legal / privacy','NONE','Approved ToS/privacy/acceptance/retention/deletion rules are absent; audit records alone do not meet those legal requirements.')
  if(sub.startsWith('4.4')){
   if(/entry shows/.test(t))return originalReplacement('Anonymous structured ratings, branch/time and newly recorded language are displayed; historic language stays unknown. Contact/narrative removed; sentiment/tags are later-phase AI.')
   return item('IV','Phase 1 amended feedback','FB','Inbox, versioned status/history, resolved-to-archived, immutable archive and atomic audit/rollback verified. Dismissed remains a separate spam/duplicate disposition.')
  }
  if(/branding|logo/.test(t))return item('P','Phase 1 basic / later templates','BRAND; FUN','Validated static PNG logo, existing heading/accent fields and public display; no full reseller branding or arbitrary template gallery.')
  if(/nfc|hardware|gallery|template/.test(t))return item('P','Phase 1 QR / Phase 2 hardware','FUN','Print-ready A6 vector PDF plus SVG/PNG exist. No NFC encoding, physical fulfillment, EPS or hardware industry-layout gallery.')
  if(sub.startsWith('4.3'))return item('P','Phase 1 basic','ANA','Actual UTC ratings/events/daily feedback/activity exist; Google posts, velocity and posting conversion remain unavailable without authorized provider evidence.')
  return item('P','Phase 1','TEN; BRAND; FUN','Core manual setup, canonical destination, preview/go-live and QR work locally. Full GBP onboarding, later hardware assets and representative five-minute benchmark remain open.')
 }
 if(module===5){
  if(/free.text|textarea.*what went|optional.*name|contact|consent checkbox/.test(t)&&!sub.startsWith('5.2'))return originalReplacement('Original customer narrative/contact is superseded by anonymous structured-only service ratings. Do not implement patient/medical/contact collection.')
  if(/11 languages|tamil|code.mixed|manglish|hinglish/.test(t))return deferred('Phase 2 additional languages','Phase 1 is English/Hindi/Malayalam; no guarantee of extra languages/code-mixed model output.')
  if(/seed keyword/.test(t))return item('P','Phase 1','BRAND; AI','3–5 optional owned business phrases reach guarded prompt context, never compelled SEO claims. Automatic/trend keyword recommendation remains absent.')
  if(/ai|editable|copy|google path/.test(t))return item('IU','Phase 1','AI; PUB','Real-adapter result is editable/copyable and independent Google link remains available; no actual model quality or Google post proof.')
  if(/sub.1|4g|instant|load|performance/.test(t))return item('E','Phase 1 acceptance / operations','PUB; EXT','No representative device/4G/edge/P95 conformance evidence. Local browser timing is not the contracted field target.')
  if(/accessible|48px|screen reader/.test(t))return item('P','Phase 1 acceptance','PUB','Labels, keyboard controls and mobile browser tests exist; no complete WCAG AA/contrast/tap-target certification or representative assistive-device audit.')
  if(/offline/.test(t))return item('P','Phase 1','PUB','Exact canonical destination cached in same tab for 10 minutes, expiry checked before opening. First-ever offline load cannot safely invent an unknown Google destination.')
  if(/pwa|home screen/.test(t))return item('O','Optional UX / owner decision','NONE','Optional install prompt/service worker not implemented; no offline service or cached private data guarantee.')
  return item('IV','Phase 1 amended parallel-path','PUB; FB','Three-language anonymous controls, structured feedback, independent equal options and confirmations verified locally. Original rating-led selective presentation is not reintroduced.')
 }
 if(section==='3'){
  if(/reseller_id|merchant_id|arbitrary depth|row.level|rls|postgresql|supabase|nestjs|next.js/.test(t))return originalReplacement('Actual typed fixed-depth tenant tree, MariaDB FK ownership and per-query API RBAC replace original storage/stack details; no SELECT RLS claim.')
  if(/magic.link|otp|no passwords/.test(t))return item('O','Phase 1 authentication decision','AUTH','Owner explicitly preserves password-plus-MFA pending formal amendment. No new login policy or authentication replacement.')
  if(/oauth|google.*connect/.test(t))return item('N','Phase 1 / owner-provider dependency','NONE','No Google OAuth connector exists; approved OAuth app/scopes/privacy and later implementation/verification are required.')
  if(/redis|cache|cloudflare|edge|worker|kv|hosting|docker|railway|render/.test(t))return item('P','Phase 1 infrastructure / operations','EXT; PUB','Current Node SPA/redirect and process-local throttles exist; no shared Redis/edge/KV deployment or provider readiness. Deployment prohibited in this task.')
  if(/payment/.test(t))return policy('Razorpay adapter is locally protocol-tested but inactive; Stripe remains absent. No real provider transaction or approval.')
  if(/ai layer/.test(t))return item('IU','Phase 1','AI','Configured Claude adapter exists; real provider/models/quality/latency unverified. Later AI tasks deferred.')
  if(/performance|contentful|interactive|<.*(?:ms|s)|latency/.test(t))return item('E','Phase 1 acceptance','NONE','Field performance benchmark remains unverified.')
  if(/copy|star rating|qr generation|short.url|qr code|nfc/.test(t))return item('P','Phase 1 core / later NFC','FUN; PUB','Core QR/redirect/copy-open implemented. Physical NFC/edge delivery is not verified or implied.')
  return item('P','Phase 1 / operations','DB; AUTH; EXT','Actual code and local integration evidence are narrower than proposed full infrastructure; provider and architecture decisions remain explicit.')
 }
 return item('P','Scope principles / ongoing','TEN; PUB; FB','Read with approved amendments and explicit roadmap. Marketing/competitor/policy assertions are not independently validated guarantees or approved financial terms.')
}

const items=[],sections=[];let section='',sub='',module=null,code=false
for(const [index,line]of raw.toString('utf8').split(/\r?\n/).entries()){
 const text=line.trim();if(text.startsWith('```')){code=!code;continue}
 if(/^## /.test(text)){section=/^## (\d+)/.exec(text)?.[1]??section;sub=text.slice(3);module=null;sections.push({line:index+1,title:sub});continue}
 if(/^### /.test(text)){const m=/^### Module (\d+)/.exec(text);if(m)module=Number(m[1]);sub=text.slice(4);sections.push({line:index+1,title:sub});continue}
 if(/^#### /.test(text)){sub=text.slice(5);sections.push({line:index+1,title:sub});continue}
 if(!text||text==='---'||!/[\p{L}\p{N}]/u.test(text)||/^(?:Attribute\s+Specification|Metric\s+Description|Component\s+Description|Feature\s+Starter|Tier\s+Competitor|Layer\s+Technology|Rule\s+Implementation|Risk\s+Likelihood|Feature\s+ResellerBano)/.test(text))continue
 if(!/^[-*] /.test(text)&&!/^\d+\. /.test(text)&&!/^\*\*[^*]+\*\*/.test(text)&&!line.includes('\t')&&!(code&&/[├└•→]|Step [123]|SUPER ADMIN|SUB-RESELLER|CLIENT \(/.test(text))&&!/\b(must|shall|requires?|enforce|cannot|should|never|Every table|Each Industry Channel|Sub-Resellers are modeled|All other Client management|The platform uses|following restrictions)\b/i.test(text))continue
 if(/^\*\*(?:Purpose|Deliverables|Success metrics|Product Codename|Version|Prepared for|Date|Target build timeline|Performance targets)[:*]/.test(text))continue
 const current={id:'SOW-L'+String(index+1).padStart(3,'0'),line:index+1,section,sub,module,text:text.replace(/^[-*] /,'').replace(/\t/g,' / ')}
 items.push({...current,...classify(current)})
}
if(new Set(items.map(i=>i.id)).size!==items.length||items.some(i=>!states[i.status]||!i.note||!i.proof))throw Error('Incomplete or duplicate audit disposition')
for(const file of ['src/billing/approval.ts','src/business/presentation.ts','src/feedback/service.ts','src/funnels/print.ts','test/task22.test.mjs','test/setup.integration.mjs'])await access(new URL('../'+file,import.meta.url))
const escape=s=>String(s).replaceAll('|','/').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/\s+/g,' ').trim()
let out='# Task 22 complete SOW traceability matrix\n\n2026-11-06. Baseline: original SOW v1.0 plus separately preserved Task 02 corrections, Task 21 owner decisions and Task 22 restrictions. Original source is unchanged, SHA-256 `'+hash+'`. No numerical proposal is a commercial approval.\n\n'
out+='Each original bullet, numbered step, attribute/table row, meaningful flow-diagram line and normative statement has a stable source-line ID. Compound source lines retain their clauses; no prose has been silently promoted into a later phase. Nonfunctional marketing/projected figures remain contextual, not fabricated evidence. This is a reviewed mapping; the generator provides coverage and provenance, not independent proof that software works.\n\n'
out+='## Classification legend\n\n| Code | Classification |\n| --- | --- |\n'+Object.entries(states).map(([k,v])=>`| ${k} | ${v} |`).join('\n')+'\n\nIV means local contract evidence only, never external certification or full-product completion. IU means the implementation exists but its real external/quality behavior is not verified. N means actual missing code: do not relabel it as only missing credentials. E denotes external evidence/access dependencies. For an explicitly replaced original requirement, IV concerns the amended replacement and does not claim the original behavior exists. D uses the phase column to distinguish Phase 2, Phase 3, explicit Phase 4, Task 02 deferral and ongoing work.\n\n'
out+='## Evidence key\n\nBackend paths below are relative to backend unless prefixed src/application, test/frontend or scripts/e2e-real. Synthetic provider and browser fixtures are not external verification.\n\n| Key | Source / tests inspected |\n| --- | --- |\n'+Object.entries(evidence).map(([k,v])=>`| ${k} | ${v} |`).join('\n')+'\n\n'
out+='## Governing Task 02 and Task 22 requirements\n\nThese 12 authority rows are separate from the original-source coverage counts.\n\n| ID | Authoritative requirement | Status | Evidence / dependency |\n| --- | --- | --- | --- |\n'
out+='| A-01 | Four tiers with Platform→Merchant, Reseller→Merchant and Sub-Reseller→Merchant paths | IV | TEN; DB; actual E2E; invalid parent pairs refuse |\n'
out+='| A-02 | Fixed typed parent tree; no arbitrary depth or reparenting | IV | TEN; DB; immutable ownership/FK checks |\n'
out+='| A-03 | Merchant-owned subscriptions across acquisition paths | IV | QUO; DB; paid execution separately held |\n'
out+='| A-04 | Commissions, wallets, payouts and wholesale deferred | D | Task 02; no such implementation or synthetic commercial claims |\n'
out+='| A-05 | One industry per merchant; branches inherit | IV | DB; business/tenant/funnel integration tests |\n'
out+='| A-06 | Anonymous structured-only Clinic feedback, no medical/contact narrative or customer admin role | IV | FB; strict input/schema; language is bounded metadata, not identity |\n'
out+='| A-07 | MariaDB/Express/React baseline, API scopes rather than claimed SELECT RLS | IV | DB; TEN; AUTH; external deployment remains unverified |\n'
out+='| A-08 | No invented prices/quotas/commercial rules or paid default catalog | IV | CAT; FIN; owner catalog absent and test values synthetic |\n'
out+='| A-09 | Task 22 paid activation/collection/settlement/refund/credit-note/GST/dunning hold | IV | FIN; immutable current readiness false; commercial rows/signatures/environment cannot enable activation |\n'
out+='| A-10 | Google-only destination; both review paths independent; tenants cannot disable compliance | IV | PUB; FB; DB; all five rating choices and strict unknown-key refusal |\n'
out+='| A-11 | Owner says await legal/privacy/retention and authentication amendment; preserve current security | O | OD-06–09; no legal wording, deletion rules or new login policy invented |\n'
out+='| A-12 | No production database, hosting or service modification; no false external verification | IV | Task-local activity and disposable loopback harnesses; operations/provider prerequisites remain open |\n\n'
out+='## Requirement-by-requirement dispositions\n\n| ID / original reference | Original requirement | Approved phase / disposition | Status | Evidence | Remaining dependency / precise limit |\n| --- | --- | --- | --- | --- | --- |\n'
for(const i of items)out+=`| [${i.id}](../../docs/product/approved-scope-of-work-v1.md#L${i.line}) / ${escape(i.sub)} | ${escape(i.text)} | ${escape(i.phase)}; ${escape(i.disposition)} | ${i.status} | ${i.proof} | ${escape(i.note)} |\n`
const counts=Object.fromEntries(Object.keys(states).map(s=>[s,items.filter(i=>i.status===s).length]))
out+='\n## Coverage and counts\n\n'+items.length+' individually identified source items; '+sections.length+' source headings reviewed. Classification counts are audit rows, not tests and not a percentage-complete estimate.\n\n| Status | Rows |\n| --- | --- |\n'+Object.entries(counts).map(([s,n])=>`| ${s} | ${n} |`).join('\n')+'\n\n| Source heading | Source line | Mapped direct items |\n| --- | --- | --- |\n'+sections.map(s=>`| ${escape(s.title)} | ${s.line} | ${items.filter(i=>i.sub===s.title).length} |`).join('\n')+'\n\nThe final audit, remaining-gaps and owner-decisions reports distinguish true code gaps from blocked legal/financial/provider prerequisites. Phase 1 is not declared complete.\n'
await writeFile(new URL('../docs/task-22-sow-traceability-matrix.md',import.meta.url),out)
console.info(JSON.stringify({sourceItems:items.length,headings:sections.length,counts,sourceHash:hash}))
