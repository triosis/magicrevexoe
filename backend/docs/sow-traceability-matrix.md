# SOW traceability — Task 20

## Task 22 current status (2026-11-06)

Phase 1 remains incomplete. The current authoritative audit is
[Task 22 final audit](task-22-final-audit-report.md), with
[itemized traceability](task-22-sow-traceability-matrix.md),
[remaining dependencies](task-22-remaining-gaps.md),
[owner decisions](task-22-owner-decisions.md) and [tests](task-22-test-report.md).
Historical Task 20/21 statements below describe earlier snapshots.

Task 22 adds business keyword/PNG setup, scoped recorded analytics, immutable
archival/language, bounded offline fallback, large independent rating controls,
configured-capacity warnings and QR-only print PDF. Paid execution now remains
blocked even with a commercial approval; no written finance policy exists.
Legal/privacy/retention and authentication reconciliation explicitly await owner
approval. Google OAuth/import remains missing code with owner/provider prerequisites;
actual AI/payment/provider quality and operational targets remain unverified.
See [current API/schema changes](task-22-api-changes.md). No production activity occurred.

## Task 21 superseding rows (2026-11-05)

The Task 20 rows below remain historical evidence. These rows supersede their
absence claims; full product completion remains unestablished. Owner has explicitly
withheld approval of all proposed commercial numbers. Reference original SOW §6
Phase 1 and separate Task 02 amendment; no source text or hierarchy was changed.

| Requirement | Updated status | UI / API / persistence | Evidence / unresolved boundary |
| --- | --- | --- | --- |
| §6 Phase 1, Module 6.1 drafts | L/E: real provider adapter and local contract tests | /r/:code; POST public/funnels/:code/drafts; billable_usage, audit | ai-billing.test.mjs, setup.integration.mjs, public.test.tsx; external quality/models/latency unverified |
| Module 5.1 three languages/copy-open | L/E: English/Hindi/Malayalam controls and editable draft | Public language selector; structured ratings/tags; clipboard then independent Google link | Frontend language/draft tests; no proof Google review posted; native-speaker/accessibility/performance acceptance pending |
| Module 10.1 three tiers/catalog | L for authoring; E for commercial catalog | /app/catalog; admin/subscription-plans create/publish/commercial-approval; subscription_plans, plan_limits, commercial_approvals | Concurrent idempotency/conflict tests; no approved catalog/prices/quotas supplied or auto-seeded |
| §6 Razorpay / Module 10.4 | P/E: checkout, verified captured-payment allocation, cancellation | Merchant payment panel; billing checkout/cancel/webhook; agreements/events/counters/audit | Actual MariaDB plus synthetic injected provider protocol; no real external payment or GST claim |
| Modules 1.5/10.2 usage billing | P: view/token ledger and exact rate estimates | Public view receipts/drafts; merchant billing/metering; billable_usage | Concurrency, conservative reservations, audit rollback; settlement explicitly not_charged. Automatic overage collection unresolved |
| Module 1.5 GST PDF invoice | G: not delivered | Provider invoice/payment binding only; explicit issuer/tax configuration | Recipient/tax/immutable invoice/PDF/credit-note workflow still required |
| §6 onboarding bootstrap/catalog | L/E: operator CLI, no web bypass | bootstrap command + explicit policy digest; atomic root/user/membership/audit | Partial-store rejection, parallel first-run, password-preserving repeat, actual first-login MFA. Provider least-privilege bootstrap rehearsal pending |
| Modules 6.2–6.7 | D/P as original roadmap | No later AI modules silently enabled | Auto-reply/additional languages Phase 2; audits/content/sentiment/broader fraud Phase 3; voice Phase 4 |
| Other Task 20 Phase 1 gaps | P/G/E retained | See original rows and task-21-remaining-gaps.md | GBP onboarding, branding/print, broader analytics/compliance and acceptance are not declared complete |

Full requirement/change/test inventory: [Task 21 implementation](task-21-implementation-report.md),
[test report](task-21-test-report.md), [remaining gaps](task-21-remaining-gaps.md).

Audit date: 2026-11-05. Baseline is the recovered
[original SOW v1.0](../../docs/product/approved-scope-of-work-v1.md), the separately
preserved [Task 02 amendment](../../docs/product/task-02-scope-amendment.md), later
explicit task restrictions, and Task 20. Original text remains unchanged. This is
an implementation audit, not permission to restore unsafe superseded requirements.

Status: **L** = implemented and locally tested; **P** = partial; **G** = absent or
scope conflict requiring an owner decision/development; **D** = explicitly deferred
by amendment/roadmap; **E** = operational/business evidence external or unverified.
L never means production verified. A dash means no implemented screen/endpoint/table
or positive feature test; absence is established by source/schema inspection.

All HTTP paths use `/api/v1`. UI paths are actual SPA routes. Test aliases name
real files, not assertions inferred from mocks:

| Alias | Automated evidence |
| --- | --- |
| AUTH | backend/test/auth.integration.mjs, auth.test.mjs |
| MFA | backend/test/mfa.integration.mjs |
| TEN | backend/test/tenants.integration.mjs |
| BUS | backend/test/business.integration.mjs |
| FUN | backend/test/funnels.integration.mjs, funnels.test.mjs |
| FB | backend/test/feedback.integration.mjs, feedback.test.mjs |
| CON | backend/test/feedback-concurrency.integration.mjs, feedback-concurrency.test.mjs |
| SUB | backend/test/subscriptions.integration.mjs, subscriptions.test.mjs |
| QUO | backend/test/quotas.integration.mjs, quotas.test.mjs |
| DB | backend/test/schema.integration.mjs, migrations.integration.mjs, migrations.test.mjs |
| MIG | backend/test/migration-safety.integration.mjs, migration-safety.test.mjs |
| REC | backend/test/recovery.integration.mjs, recovery.test.mjs |
| EXT | backend/test/external.integration.mjs, external.test.mjs, foundation.test.mjs |
| E2E | scripts/e2e-real.mjs: actual React, Express, HTTP/browser, disposable MariaDB; test mail adapter and synthetic bootstrap/catalog, no API mocks |
| UI | test/frontend/*.test.ts(x), test/browser/app.spec.ts: component/fixture regressions, separately identified from E2E |

Documentation aliases: A=auth-api.md/auth-security-report.md/mfa-implementation-report.md;
T=tenants-api.md/tenants-security-report.md; B=business-api.md/business-implementation-report.md;
F=funnels-api.md/funnels-implementation-report.md; P=feedback-api.md/feedback-security-report.md;
S=subscriptions-api.md/subscriptions-security-report.md; Q=quotas-api.md/quotas-security-report.md;
R=disaster-recovery-runbook.md/restore-rehearsal-report.md;
M=production-migration-runbook.md/database-privilege-matrix.md;
X=external-integration-report.md/deployment-runbook.md;
W=../../docs/frontend-integration.md. All are repository documentation, not external certification.

## Original architecture and platform/partner modules

| SOW requirement | Status / actual functionality | Frontend | API | Database relationship | Tests | Docs | Limitation / disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| §§1,3.1 four administrative levels | L: explicit roles and hierarchy | /login, /app, /app/accounts | /auth/login, /auth/select-tenant, /tenants | tenants.parent_id; memberships→roles/users | AUTH,TEN,DB,E2E | A,T | Bootstrap absent; customer is anonymous, not a fifth admin role |
| Task 02 three merchant parent paths | L: platform-, reseller-, sub-reseller-owned merchants | /app/accounts | POST /merchants | typed tenants parent FK | TEN,BUS,E2E | T,B | Actual ancestry only; no transfer/reparenting |
| §3.2 shared multi-tenant ownership | L under amended MariaDB architecture | all live workspaces | all protected resources | tenant composite FKs and scoped queries | DB,TEN,FB,SUB,E2E | database-architecture.md | Not original arbitrary-depth two-ID tree or native RLS |
| §3.3 PostgreSQL/Supabase, Next/Nest, Docker/Railway/Render | Replaced implementation baseline: React/Vite, Express, MariaDB | all live SPA | Express routes | MariaDB InnoDB | DB,E2E,EXT | X, amendment | No claim original stack deployed; provider acceptance outstanding |
| §3.3 Redis/session cache/async event queue | G: bounded process-local limits only | — | route limiters | no Redis/queue | AUTH,EXT (local limits only) | A,X | Shared rate limits/queue absent |
| §3.3 magic-link/OTP merchant login + GBP OAuth | G: password/invitation + platform TOTP instead | /login, /recover | /auth/* | users/auth_sessions/auth_tokens/user_mfa | AUTH,MFA,E2E | A | No passwordless merchant login or GBP OAuth |
| §§3.3–3.4 edge/KV shell, cached redirect, copy/open AI critical path | P: server-controlled opaque links and HTML redirect | /r/:code | GET /public/funnels/:code | short_links→funnel→branch | FUN,E2E | F,W | No Cloudflare edge/KV, AI draft, clipboard workflow or performance proof |
| §3.3 object storage/Postmark/WhatsApp | P: TLS SMTP only, QR bytes rendered locally | recovery/invite, QR preview | auth delivery; /qr-assets/:id/content | qr_assets metadata, auth_tokens | EXT,FUN,E2E | X,F | No R2/S3, WhatsApp or provider-specific delivery proof |
| Module 1.1 reseller create/edit/suspend | L | /app/accounts | POST/GET/PATCH /tenants; suspend/reinstate | tenants, memberships, audit_logs | TEN,E2E | T | No self/root suspension; CAS required |
| Module 1.1 wholesale tiers/pricing floors | D: Task 02 commercial amendment | — | — | none | — | amendment | Do not invent or reintroduce wholesale billing |
| Module 1.1 reseller MRR/churn/hardware performance | G/D: only scoped accounts/feedback summary | /app | /feedback/statistics | private_feedback | FB,E2E (limited summary) | P,W | Commercial/hardware analytics not implemented; later-phase allocation needs approval |
| Module 1.1 support impersonation | G: no impersonation | — | — | none | AUTH/TEN deny escalation | A,T | Never bypass MFA or tenant scope to simulate support |
| Module 1.2 industry CRUD | P: seeded three channels, status/name/version editing/publish | /app/channels | /industry-channels, versions, publish | industry_channels→channel_versions | BUS,DB,E2E | B | No create/delete channel API or general draft browser |
| Module 1.2 question/prompt/keyword/routing/print templates | P: fixed structured rating labels and published copy | /app/channels | channel versions | channel_versions JSON | BUS,FUN,DB | B,F | AI templates, keyword libraries, routing and print designs absent |
| Module 1.2 reseller channel restrictions and A/B tests | G | — | — | no assignment/experiment tables | — | B | Merchant one-channel ownership is not reseller vertical licensing |
| Module 1.3 order queue, print API/CSV, SKUs/inventory/shipping notifications | D: hardware fulfillment in roadmap Phase 2 | demo only | — | no orders/inventory | — | original §6 Phase 2 | No physical fulfillment evidence |
| Module 1.4 MRR/ARR/churn/LTV, AI cost, scans/conversion, anomaly alerts | G/D: feedback count/average only | /app, /app/feedback | /feedback/statistics | private_feedback, audit_logs | FB,E2E (partial only) | P | Not equivalent to complete platform analytics |
| Module 1.5 billing engine/feature tiers/scan and AI overages | P/G: administrative subscription/5 resource quotas only | merchant subscription panel | /subscription-plans; merchant subscription/usage | plans/limits→merchant subscription→usage | SUB,QUO,E2E | S,Q | No payment/billing automation; SOW Phase 1 conflict remains |
| Module 1.5 commissions, wallet credits and payouts | D: explicit Task 02 deferral | — | — | none | schema inventory | amendment | No financial settlement code |
| Module 1.5 GST invoices/PDF | G/D | — | — | none | — | S | No invoice/tax system; current task does not authorize it |
| Module 1.6 monitor/flag funnels, PDF audits and ToS acceptance | G | — | — | no terms/acceptance/monitor tables | FUN/FB prove fixed options only | P,F | Fixed compliant structure is not a compliance dashboard or signed ToS |
| Module 1.7 task/model selection, prompts/rollback, AI budgets/quality flags | D/G: AI expansion absent; draft Phase 1 conflict separate | demo only | — | no AI tables | — | amendment, original §6 | No AI provider requests |
| Module 2.1 reseller domains/logo/colors/favicon/email/login/badge | D: roadmap Phase 2 white-label | shared branded SPA only | — | no reseller branding config | — | original §6 | Funnel heading/accent not full white-label |
| Module 2.2 sub-reseller create/edit/suspend | L: promoted by Task 02/current scope | /app/accounts | /tenants + status/invitations | tenants parent tree | TEN,E2E | T | No arbitrary permission override or wholesale pricing |
| Module 2.2 sub-reseller performance and custom grants | G/D | overview only | scoped basic reads | fixed role_permissions | TEN,AUTH | A,T | No permission authoring UI/API, MRR or commission reports |
| Module 2.3 downstream merchant/status lists | P: ancestry/status displayed, paginated list | /app/accounts | /tenants, /:id/descendants | tenants | TEN,E2E | T | No account status filter/search; some selectors stop at first page |
| Module 2.3 bulk announce/upgrade/discount | G/D | — | — | none | — | T,S | No bulk communication or commercial discount automation |
| Module 2.3 support impersonation/API key regeneration | G | — | — | no API key system | AUTH/TEN scope negatives | A,T | Destination editing exists through normal authorized merchant route |
| Module 2.4 commissions, wallet balances, withdrawal/config tiers | D | — | — | none | schema inventory | amendment | Explicitly deferred; not a defect to implement now |
| Module 2.5 bulk SKU/quantity/address/customization/tracking/reorders | D: hardware Phase 2 | demo only | — | none | — | original §6 | QR download is not an order system |
| Module 2.6 MRR/churn/cohort/top merchants/scans/AI cost | D/G | partial feedback overview | /feedback/statistics | private_feedback | FB | P | Revenue/AI/hardware data unavailable, never fabricated |
| Module 3 scoped client management, cannot create sub-resellers | L | /app/accounts | /tenants,/merchants | tenants + fixed roles | TEN,AUTH,E2E | T,A | Scope is selected membership's actual descendants |
| Module 3 inherited branding/pricing/commission/withdrawals/hardware | D | — | — | none | — | amendment, original §6 | No wholesale or wallet functionality |

## Merchant and customer modules

| SOW requirement | Status / actual functionality | Frontend | API | Database relationship | Tests | Docs | Limitation / disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 onboarding / name / industry / test / go-live | P: parent invites, setup checklist, branch/destination/funnel/QR | /app/business, /app/merchants/:id | /merchants, /branches, /funnels, /qr | tenant→branch→destination/funnel→link/QR | BUS,FUN,E2E | B,F,W | No <5 minute benchmark; setup is computed, not a separate complete API |
| 4.1 GBP OAuth/autofetch/category suggestion | G: manually entered name/Place ID, parent-selected channel | business setup | canonical destination API only | review_destinations | BUS,E2E | B | No OAuth, live review count/star import or category detection |
| 4.1 seed keywords/AI suggestions | G/D: absent under recorded implementation boundary | — | — | none | — | amendment | Phase 1 AI scope conflict must be resolved |
| 4.1 branding upload/templates | P: heading and accent on funnel only | collection form | POST /branches/:id/funnels | funnel_configurations | FUN,E2E | F | No logo upload/template gallery |
| 4.2 SVG/PDF/PNG sizes, dynamic destination, multiple assets | P: SVG/PNG per link/branch; canonical Google destination updates | collection/preview/download | short-links, qr, qr content | short_links, qr_assets, review_destinations | FUN,E2E | F | No PDF/EPS/print sizes; channel ownership/published config immutable |
| 4.2 NFC encoding/hardware/gallery | D/G: not connected | explicitly labelled demo | — | none | UI confirms disclosure | W | QR URL can be used externally; no NFC tool or hardware claim |
| 4.3 scans/ratings/posts/feedback snapshots and distribution/trends/activity | P: feedback status counts and mean overall rating | /app,/app/feedback | /feedback/statistics | private_feedback | FB,E2E | P | No Google posts, conversion, velocity, scan chart or general activity feed |
| 4.4 feedback inbox/details/date/branch/status | L under structured amendment | /app/feedback | GET /feedback, /:id | private_feedback→tenant/branch/funnel | FB,E2E | P | Anonymous ratings only; no customer language/text/AI tags |
| 4.4 New→In Progress→Resolved→Archived | P: controlled new/in_progress/resolved/dismissed | inbox status form/history | PATCH /feedback/:id/status | feedback_status_events + audit | FB,CON,E2E | P | Dismissed is current schema; not an archived enum. Owner reconcile terminal semantics |
| 4.4 internal notes/urgent email-SMS-WhatsApp/templates | G: deliberately absent in current services | — | — | no notes/escalation tables | — | P | Structured-only does not itself implement routing/notifications |
| 4.5 Google inbox/AI replies/one-click posting/sentiment/tags/auto-post | D/G: roadmap Phase 2 AI replies; OAuth import absent | demo only | — | none | — | original §6, amendment | Never present demo saves as actual posting |
| 4.6 draft preview/GBP PDF audit/post image generator/keyword insight | D/G: Phase 1 draft conflict; other tools Phase 3 | demo only | — | none | UI disclosure only | original §6 | No AI API integration or live external trend source |
| 4.7 branch add/edit/deactivate | L | branch workspace | /merchants/:id/branches, /branches/:id, archive | branches→merchant | BUS,QUO,E2E | B,Q | Archive requires no active links; history retained; no restore/delete |
| 4.7 rollup/comparison/branch managers | P/G: merchant-scoped feedback filters/aggregate only | /app/feedback | /feedback/statistics | branches, merchant memberships | FB,TEN | P,A | No branch-only membership authorization or comparison dashboard |
| 4.8 owner/manager/staff roles/API RBAC | P: merchant_admin/merchant_staff and fixed tenant permissions | role navigation/invite | tenant invitations + auth | roles/role_permissions/memberships | AUTH,TEN,E2E | A,T | No assigned-branch manager role or demotion/removal UI/API |
| 4.9 plan/period/usage/limits | L for supported five metrics | business subscription panel | subscription, usage/history/:metric | subscriptions/plans/limits/counters/records | SUB,QUO,E2E | S,Q | No scan/AI-token metric; read state never invents usage |
| 4.9 upgrades/downgrades/payment history/invoices/methods | G/D: admin assign/end only | admin subscription controls | assign/status endpoints | subscriptions | SUB | S | No self-service billing, renewal, gateway, invoice or proration |
| 4.9 80%/100% notifications | P: remaining/over-limit display and blocked-operation error | subscription table/forms | structured quota errors | plan_limits + usage | QUO,UI,E2E | Q | No 80% proactive email/push alert |
| 4.10 compliance status/ToS/audit browser/retention controls | G/P: setup checklist and scoped account/feedback history | accounts/feedback | tenant history; feedback detail | audit_logs, status events | TEN,FB | T,P | No ToS record, full audit explorer, retention setting or compliance certification |
| 5.1 public page, independent Google/private options before/after rating | L under stricter Task 20 parallel-path contract | /r/:code | GET /public/funnels/:code; events | active link→published funnel/channel/destination | FUN,FB,E2E,UI | F,P | Never require a positive rating to expose Google |
| 5.1 logo/star-entry/language selector/rating-specific content/confirmations | P: names, branch, fixed heading, private selects + confirmation | /r/:code | public resolve/feedback | channel_versions/private_feedback | FB,E2E | F,P | No logo, public star-first wizard, AI copy, languages or Google-post confirmation |
| 5.2/6.1 multilingual editable AI drafts, tags, keywords, fallback model | G: absent; Phase 1 conflict | labelled demo only | — | no AI/provider/keyword records | — | amendment; original §6 | English/Hindi/Malayalam not delivered as actual AI or multilingual feature |
| 5.3 private free text/contact/consent | Replaced by Task 02/20 anonymous structured-only rules | structured form | POST public feedback (strict fields) | ratings only, no medical/contact columns | DB,FB,UI,E2E | P,amendment | Do not implement original unsafe clinic narrative/contact capture |
| 5.4 anonymous mobile/no app install | L for local mobile browser flow | /r/:code | public endpoints | anonymous private_feedback | FUN,FB,E2E | F,P | Actual phone/network/browser diversity not established |
| 5.4 WCAG 2.1 AA / 48px / contrast / screen reader | P/E | labels/landmarks/responsive styles | — | — | limited UI/browser assertions | W | No complete accessibility conformance audit |
| 5.4 sub-second 4G/FCP/TTI/AI latency | E/G | current SPA | current API | actual DB | no representative performance benchmark | X | Local test duration is not these P95 targets |
| 5.4 offline Google fallback/try again/PWA | P: error+retry only | unavailable page | — when unreachable | no offline cache | UI failure state | W | Initial config outage cannot safely reconstruct destination; no service worker/PWA |

## AI, analytics, channels, hardware and commercial modules

| SOW requirement | Status / actual functionality | Frontend | API | Database relationship | Tests | Docs | Limitation / disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.2 suggest/5-star opt-in auto-reply/guardrails | D: roadmap Phase 2, no connected provider | demo only | — | none | — | original §6 | No posting or legal-sensitive escalation implementation |
| 6.3 sentiment/topics/urgency | D: roadmap Phase 3 | — | — | no AI classifier | — | original §6 | Structured service ratings are not sentiment extraction |
| 6.4 audit completeness/photos/posts/replies/keywords/categories/hours/Q&A/scored PDF | D: Phase 3 | — | — | none | — | original §6 | No GBP API access |
| 6.5 content text/images/social captions | D: Phase 3 | — | — | none | — | original §6 | No image/model integration |
| 6.6 burst/duplicate/self-scan/timing/device anomaly classifier/flag/block | P/D: throttles, form duplicate protection only; Phase 3 broader detector | generic errors | public routes/limits | submission hash/audit | AUTH,FB,CON | A,P | Not unique-human/fraud detection; no fingerprints or alerts |
| 6.7 voice transcript→editable AI draft | D: Phase 4 | — | — | none | — | original §6 | No audio processing |
| 7.1 scans/rating distribution/completion/public conversion/feedback rate/velocity/languages/peak times/keywords/AI acceptance | P: private status counts + mean only | overview/feedback | /feedback/statistics | private_feedback | FB,E2E | P | None of the other listed metrics may be claimed from sample charts |
| 7.2 MRR/ARR/churn/acquisition/ARPM/top channels/hardware margin/commissions | D/G | scoped overview only | — for commercial analytics | no commercial ledger | — | original §6,amendment | No finance/business KPI evidence |
| 7.3 global MRR/churn/rankings/AI cost/infrastructure/incident metrics | D/G | basic platform overview only | — for these metrics | no AI/billing models | — | original §6 | No operational dashboard |
| 7.4 branded PDF/CSV/share card/email digest | D/G: not implemented | — | — | none | — | original §6 | No exports, opt-in digest or WhatsApp card |
| 8.1 question sets/prompts/keywords/routes/print/widgets/compliance notes | P: fixed structured config/copy only | industry channels | version publish | industry_channels/channel_versions | BUS,DB,FUN | B | Original full vertical configuration absent |
| 8.2 Salon/Clinic/Restaurant launch | L for three permitted structured channels | channels + parent selector | /industry-channels | three seeds | DB,BUS,E2E | B,amendment | SOW Module 8.2 also lists Hotel/Retail; roadmap resolves them to later phase |
| 8.2 Hotel/Retail; 8.3 Automotive/Real Estate/Education/Fitness/Professional/Home/Pet/Events | D: Phase 2+; not seeded | — | — | no extra channels | seed tests | original §6 | No additional launch verticals invented |
| 8.4 drag-drop/custom prompt/keyword/routing/print builder | D: Phase 3 | — | — | none | — | original §6 | Current fixed publication screen is not a custom builder |
| 9.1 five hardware SKUs/prices | D: Phase 2 fulfillment | — | — | no catalog | — | original §6 | Source targets retained, not product prices or orders |
| 9.2 NDEF/partner encoding/custom domain/mobile re-encode | D/P: shareable short URL only | QR short-link list | public resolver | short_links | FUN,E2E | F | No physical NFC verification/tool; self-encoding Phase 4 |
| 9.3 branded SVG/PDF/PNG300DPI/EPS/industry templates/tagline | P: actual SVG/PNG QR content | QR preview/download | /qr-assets/:id/content | qr_assets→short_link | FUN,E2E | F | No PDF/EPS/300DPI print template/layout/logo claim |
| 9.4 order→approve→produce/ship→notify→activate | D: Phase 2 | — | — | none | — | original §6 | Public links activate through normal authorized workflow, not shipment |
| 10.1 three priced plans/feature grid and support tiers | P/G: empty-by-default versioned plan store, five metrics | subscription panel | GET plans/details; assign | subscription_plans→plan_limits | DB,SUB,QUO | S,Q | No approved catalog authoring; original proposed terms not auto-adopted |
| 10.2 scan/AI/reply/audit paid overages | D/G: no corresponding metrics or charges | — | — | none | QUO proves only existing metrics | Q | Resource quota enforcement is not usage-based billing |
| 10.3 tiers/markup/revenue share; 10.4 split payments/wallet/payout | D: Task 02 explicit deferral | — | — | none | schema inventory | amendment | No gateway/commissions/wallet/payout implementation permitted here |
| 10.5 payment retries/grace/churn/winback sequences | D/G | — | — | no billing scheduler | SUB/QUO test inactive rejection | S,Q | Current past_due/elapsed states block; no invented grace or dunning |

## Compliance, security, roadmap and Task 20 additions

| SOW requirement | Status / actual functionality | Frontend | API | Database relationship | Tests | Docs | Limitation / disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11.1 Google always visible/no selective solicitation | L: independent options even after private quota failure | public funnel | resolve/events/feedback | fixed channel JSON/public projection | DB,FUN,FB,QUO,E2E | F,P,Q | No ownership/policy certification or off-app merchant conduct claim |
| 11.1 no review targets/staff scripts/incentives/on-premises pressure | L for existing resource contracts | public structured form | strict allowlists | no review-target/reward fields | DB,FB,FUN | P | Subscription feedback capacity is a usage ceiling, not a staff review target |
| 11.1 editable AI draft | G where Phase 1 required | demo only | — | none | — | amendment | Do not label as implemented because AI is absent |
| 11.1 scan/rating/feedback/post device/IP/tenant audit trail | P: scoped append-only events/audits and feedback status | limited history UI | events, feedback/status, tenant history | audit_logs, status events | FB,CON,DB,E2E | P,T | No Google post proof, general ratings event, device/IP fingerprint analytics |
| 11.1 ToS version/log/monitor alert | G | — | — | no ToS/monitor models | — | production-blockers.md | Owner policy and implementation required |
| 11.2 policy summary/staff checklist/request templates/PDF audit | G/D | — | — | none | — | original §6 | Documentation runbooks are not a reseller compliance toolkit |
| 11.3 DPA/contact consent/erasure/retention | G/E: data minimization only | no contact capture | strict feedback schema | no erasure/retention workflow | DB,FB | P | No legal certification; no chosen retention values inserted |
| 11.3 encryption/OAuth tokens/TLS1.3/DB at rest | P/E: AES-GCM MFA + encrypted backups, TLS>=1.2 verified | MFA QR, HTTPS configuration | auth, SMTP; DB transport | user_mfa; encrypted archive | MFA,REC,EXT | A,R,X | OAuth absent; at-rest provider encryption and TLS1.3-only target unverified |
| 11.3 RBAC/RLS/admin audit | L/P under amended MariaDB isolation | role-aware UI | per-service scopes and platform guard | FK ownership/role tables/audit | AUTH,TEN,DB,E2E | A,T | No database SELECT RLS; denied attempts not fully audited |
| 11.3 annual pentest/bug bounty/IR/breach process | E/D | — | — | — | no external certification | production-blockers.md | Bug bounty Phase 3; owner security/legal incident process required |
| §5 industry deep dive/examples/activation | P: three structured channels + manual assignment/publication | channels/business/public | channel versions, merchants/funnels | channel→merchant→funnel | BUS,FUN,E2E | B,F | No GBP suggestion, per-industry AI/SEO/manager routing/widgets/templates |
| §6 Phase 1 billing engine/Razorpay/AI three languages | G: not delivered; conflicting later restrictions recorded | no live screens | no gateway/AI APIs | no payment/AI tables | no positive tests | amendment | Material acceptance gap until approved revised scope or separately authorized implementation |
| §6 Phase 1 core accounts/onboarding/QR/inbox/dashboard/three channels/parallel path | L/P as mapped above | live app | existing resource APIs | 26 current tables | TEN,BUS,FUN,FB,E2E | W,B,F,P | Limited dashboard, manual onboarding, English only |
| §6 Phase 2 all remaining white-label/AI replies/languages/hardware | D; hierarchy/branches already implemented | shared role UI only | existing tenant/branch APIs | tenants/branches | TEN,BUS,E2E | original §6 | Partial early implementation does not complete Phase 2 |
| §6 Phase 3 tools/classification/fraud/analytics/builder/webhooks | D | — | no webhook/integration API | none | — | original §6 | No third-party automation claim |
| §6 Phase 4 WhatsApp/voice/NFC app/marketplace/mobile app/auto-policy audits | D | — | — | none | — | original §6 | Explicitly outside current implementation |
| §§6,9 pilot/scale/MRR/P95/completion/conversion/uptime/zero-violation targets | E: business/performance acceptance metrics, not test fixtures | — | — | synthetic fixtures not customers | no production metric evidence | original SOW | No pilot, SLA, conversion, revenue or legal-policy success claim |
| §7 commercial benchmarks/revenue/unit economics | E/D: source projections only | no invented public pricing after Task 20 fix | no payment processing | no commercial seeds | DB,UI | amendment | Do not treat projections as actual sales or approved production catalog |
| §8 risk register | P/E: local security controls/recovery, broader risks open | safe state/error UI | fixed errors/limits | audit/session/quota records | AUTH,MFA,CON,REC,EXT | production-blockers.md | No provider/AI/supply-chain/merchant-churn acceptance evidence |
| §10 competitor comparisons | E: retained source claims, not independently validated requirements | demo disclosure | — | — | — | original source | No new competitor/policy assertions made by audit |
| Task 20 platform MFA/recovery/session revocation/refresh replay | L | password→MFA QR/code/recovery display | /auth/mfa/*, refresh/logout | user_mfa, recovery codes, auth_sessions | MFA,AUTH,E2E | A | Recovery regeneration/disable only through secure API; no profile maintenance UI |
| Task 20 quota initialization/persistence/history/concurrent boundaries | L for branches/staff_seats/feedback_submissions/short_links/qr_assets | subscription table/action errors | usage/initialize + consuming services | counters/append-only records | SUB,QUO,CON,E2E | S,Q | No missing-counter unlimited interpretation, bypass or billing automation |
| Task 20 feedback deadlock fix/atomic audit/duplicates | L | feedback form/status conflict errors | submit/status transactions | unique submission hash; platform_slot root lock | CON,FB,E2E | feedback-concurrency-report.md | Root lock serializes writes; capacity still unverified; no unsafe retry |
| Task 20 migrations/checksums/locks/drift/privilege separation | L/E | operator CLI | migrate:operator | immutable 67-prefix ledger/schema manifest | DB,MIG | M | Provider grants/DDL/definers still unverified; no production execution |
| Task 20 backup integrity/restore/FK/trigger/ledger preservation | L/E | operator CLI | recovery CLI | all 26 tables, 35 triggers, 36 FKs, 34 CHECKs | REC | R | Disposable local only, no off-site/provider restore proof |
| Task 20 secrets/CSP/TLS/public-safe projections | L/E | production SPA/CSP; generic public states | config, health, SMTP verify | verified pool transport | EXT,UI,E2E | X | Secret rotation/provider TLS/DNS/inbox evidence remains external |

No absent feature is assigned a positive test merely because an unrelated suite
passes. Historical reports describe earlier scope and are superseded by later
contracts where explicitly stated. Full original-SOW completion is **not established**;
the final completion report lists the resulting owner/development decisions.
