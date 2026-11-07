# SOW feature completion matrix

2026-11-07, baseline 9e04eef. COMPLETE means the specified **local contract** is
implemented and exercised, not external certification. PARTIAL means some code
works. MOCK is labelled demonstration. MISSING means no implementation located.
BLOCKED means owner/provider dependency, often with missing follow-on code.
UNVERIFIED means insufficient evidence. Deferred is a phase disposition, not a
completion status: absent later features remain MISSING but are not Phase 1 defects.

Scope references use the original Module numbers/subsections, distinct from the
later numbered document sections. Phase assignments follow explicit §6 roadmap
and recorded Task 02 corrections; ambiguous undated original clauses remain open
for acceptance reconciliation rather than invented deferrals. Four consoles and
direct merchant onboarding are required by the amended baseline. Hotel/Retail and
multi-platform expansion are not Phase 1 requirements. Free-text/contact feedback
is replaced by anonymous structured input; arbitrary-depth/RLS by typed MariaDB
ownership plus repository authorization. Wholesale/commissions/wallet/payouts are
explicitly deferred. Native-language public drafting is three languages in Phase 1.

Evidence keys (paths relative to repository):

| Key | Actual implementation / endpoints / test evidence |
| --- | --- |
| AUTH | backend/src/auth/{service,authorization,mfa,tokens,routes}.ts; /api/v1/auth/{login,refresh,select-tenant,mfa/enrollment,mfa/activate,mfa/verify,forgot-password,reset-password,accept-invitation}; auth.test.mjs, auth.integration.mjs, mfa.integration.mjs |
| TEN | backend/src/tenants/{service,routes}.ts; /api/v1/tenants; src/application/accounts.tsx; tenants.integration.mjs, actual hierarchy E2E |
| BIZ | backend/src/business/{service,validation,routes,presentation}.ts; /api/v1/merchants, /branches, /industry-channels; merchant.tsx, presentation.tsx; business.integration.mjs, setup.integration.mjs |
| FUN | backend/src/funnels/{service,qr,print,routes}.ts; /public/funnels/:code, /branches/:id/{funnels,short-links,qr}, /qr-assets/:id/{content,print.pdf}; public.tsx, merchant.tsx; funnels.integration.mjs, E2E QR/PDF tests |
| FB | backend/src/feedback/{service,validation,tokens,routes}.ts; /public/funnels/:code/feedback, /feedback, /feedback/:id/status; feedback.tsx; feedback.integration.mjs and feedback-concurrency.integration.mjs |
| AI | backend/src/ai/{provider,service,routes}.ts ClaudeProvider.generate, DraftService.generate/scan; /public/funnels/:code/{drafts,views}; drafts.tsx, languages.ts; ai-billing.test.mjs, setup.integration.mjs |
| SUB | backend/src/subscriptions/{service,quota,model,catalog,routes}.ts; /merchants/:id/subscriptions, /merchants/:id/usage, /admin/subscription-plans; subscriptions.tsx, catalog.tsx; subscriptions.integration.mjs, quotas.integration.mjs |
| FIN | backend/src/billing/{approval,terms,provider,service,routes}.ts; /merchants/:id/billing, /billing/webhooks/razorpay; billing.tsx; task22.test.mjs, setup.integration.mjs |
| ANA | FeedbackService.analytics/statistics, /feedback/analytics; src/application/analytics.tsx; setup.integration.mjs and E2E analytics |
| SEC | backend/src/config/{env,tls,database-transport}.ts, db/pool.ts, auth/smtp.ts; /health/live or /health, /health/ready or /ready; external.integration.mjs, startup.test.mjs, hostinger-local.test.mjs, hostinger-local.integration.mjs |
| OPS | backend/src/migrations/{operator,runner,privileges,schema}.ts, setup/bootstrap.ts, scripts/recovery; schema.integration.mjs, migration-safety.integration.mjs, recovery.integration.mjs |
| DEMO | src/App.tsx, src/Interactive.tsx; marketing route /, explicitly sample data/no connected AI; landing.test.tsx |
| NONE | Current app registrations, frontend navigation, service/route/schema inventory have no corresponding service; no positive feature test located |

Test names are file-level unless quoted; significant named paths include E2E
“browser Super Admin login, platform channel publication and reseller provisioning”,
“browser reseller and sub-reseller login, invitation acceptance and merchant onboarding hierarchy”,
“actual merchant keyword/logo upload and authorized print-ready PDF download”, and
MFA “TOTP replay rejected, recovery single-use, and concurrent challenge consumption has one winner”.

FE=frontend, BE=backend, DB=schema/storage. “local” never means provider accepted.

| ID / module / SOW reference | Feature / phase | FE | BE | DB | Integration | Test/evidence | Overall / remaining work |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Super Admin M1.1 | Reseller create/edit/suspend; P1 | Live accounts | Scoped service | Typed tenants/history | Local | TEN | COMPLETE for local lifecycle |
| 02 Super Admin M1.1/10 | Wholesale tiers/global floors; Task02 deferred | Absent | Absent | No wholesale engine | None | NONE | MISSING; deferred, no commercial rules invented |
| 03 Super Admin M1.1/1.4 | Command center/MRR/ARR/LTV/churn/rankings; P1 basic/P3 advanced | Feedback overview only | Feedback analytics only | Recorded activity | No revenue source | ANA | PARTIAL; no commercial dashboard |
| 04 Super Admin M1.1 | Support impersonation; phase/authority unresolved | Absent | No delegated sessions | None | None | NONE | MISSING; needs audited delegation design, no admin bypass |
| 05 Super Admin M1.2/8 | Three channel catalog and immutable versions; P1 | Channels panel | Version CRUD/publish; fixed taxonomy | Channels/versions | Local | BIZ, schema tests | COMPLETE for fixed launch taxonomy; not arbitrary new channel creation |
| 06 Super Admin M1.2/8.1 | Full question/prompt/keyword/routing/template controls; P1 basic/P3 builder | Limited fixed fields | Protected versions/guarded code prompt | Versions, fixed CHECKs | No notification routing | BIZ, AI | PARTIAL; richer vertical acceptance unresolved |
| 07 Super Admin M1.2 | Restrict reseller vertical assignments; undated scope | Absent | No assignment workflow | No assignment relation located | None | NONE | MISSING; confirm delivery phase |
| 08 Super Admin M1.2 | Channel A/B experiments; undated/advanced | Absent | Absent | No experiments | None | NONE | MISSING; scope/phase reconciliation |
| 09 Super Admin M1.3/9.4 | Fulfillment queue/print API or CSV/SKU/stock/shipping; P2 | Absent | Absent | No fulfillment ledger | None | NONE | MISSING; deferred P2 |
| 10 Super Admin M1.5/10.1 | Three named paid tiers/feature flags; P1 | Catalog authoring | Explicit resources/terms authoring | Plans/limits/terms | No approved catalog | SUB, FIN | BLOCKED; no approved production prices/limits, not seeded defaults |
| 11 Super Admin M1.5/10.2 | Usage overage collection; P1 | Metering only | Receipts/estimates, execution held | billable_usage | No approved charging | FIN, AI | BLOCKED; scan definition/rates/settlement policy and follow-on code |
| 12 Super Admin M1.5/10.3-4 | Commissions/wallets/payout approval/split; Task02 deferred | Absent | Absent | No wallet/commission ledger | None | NONE | MISSING; deferred, not a launch gap |
| 13 Super Admin M1.5/10 | GST financial PDFs/refunds/credit notes/dunning; P1 policy dependent | Non-issuable preparation | No issuance/settlement workflow | Preparation inputs only | None verified | FIN | BLOCKED; approved tax/financial policies and implementation required |
| 14 Super Admin M1.6/11 | Live risk monitoring/alerts/compliance export; P4/ongoing | No dedicated dashboard | Guardrails exist, no monitor | Audit/events only | None | FB, FUN | PARTIAL; prevention is not monitoring or PDF audit |
| 15 Super Admin M1.6/11.1 | ToS version management/acceptance; P1/legal | Absent | Absent | No acceptance workflow | Legal text absent | NONE | BLOCKED; owner/legal approval and implementation |
| 16 Super Admin M1.7 | AI model controls, version rollback, task routing/quality loop; P1 draft/P2-3 expansion | No model admin console | Env-selected primary/complex model, code prompt | No prompt release/rollback workflow | Claude unverified | AI | PARTIAL; model role/quality/prompt lifecycle not full SOW management |
| 17 Super Admin M1.4/1.7 | Token usage and budgets; P1 | Metering surfaces | Reservations/allowances | Usage rows/terms | Synthetic Claude | AI, FIN | PARTIAL; usage real locally, costs and reseller budgets incomplete |
| 18 Super Admin audit/settings | General audit-log viewer/platform integrations UI; undated | No dedicated viewer/settings | Transactional audit writes | Append-only audit_logs | Env config only | TEN, OPS | PARTIAL; not a complete audit search/export/settings product |
| 19 Reseller M2.1 | Domain/logo/colors/favicon/email/login hero/badge; P2 | No reseller brand panel | No custom-domain delivery | No full white-label model | DNS/mail unverified | NONE | MISSING; merchant logo is not reseller white-label |
| 20 Reseller M2.2 | Sub-reseller lifecycle; amended P1 | Accounts | Scoped create/update/status | Typed parents | Local | TEN, E2E | COMPLETE for fixed-role lifecycle |
| 21 Reseller M2.2 | Wholesale/performance/custom permission overrides; deferred/advanced | Absent | Fixed role assignment only | Roles/permissions, no pricing | None | AUTH, NONE | PARTIAL; no arbitrary permission authoring or pricing |
| 22 Reseller M2.3 | Downstream merchants/direct paths/status listing; amended P1 | Accounts/merchant details | Ancestor-aware list/filter | Typed tenants | Local | TEN, business integration | COMPLETE for implemented status/filter contract; trial/churn not tenant status |
| 23 Reseller M2.3 | Bulk announcements/discounts/upgrades/API-key support tools; phase/policy unresolved | Absent | No bulk messaging/keys/impersonation | None for these actions | None | NONE | MISSING; do not treat owner decisions as delivered code |
| 24 Reseller M2.4 | Wallet balances/withdrawals/commercial tier rules; Task02 deferred | Absent | Absent | Absent | None | NONE | MISSING; deferred |
| 25 Reseller M2.5 | Bulk SKU order/custom preview/reorder/tracking; P2 | Absent | Absent | Absent | None | NONE | MISSING; deferred |
| 26 Reseller M2.6 | Acquisition/cohort/MRR/channel performance/AI cost; P2-3 | Basic scoped feedback | Scoped feedback aggregates | Feedback/events | Revenue/provider absent | ANA | PARTIAL; no full reseller analytics |
| 27 Reseller/team M2.2 | Fixed memberships/invites/permission bounds; amended P1 | Account team workflows | Scoped roles/invitation acceptance | Membership FK/token hashes | SMTP unverified | TEN, AUTH | COMPLETE locally; real inbox delivery separate |
| 28 Sub-reseller M3 | Dashboard/client onboarding/no child sub-reseller escalation; amended P1 | Shared scoped workspace | Parent/type/permission checks | Fixed tree | Local | TEN, E2E | COMPLETE for core scoped journey |
| 29 Sub-reseller M3 | Branding inheritance/pricing floors; P2/Task02 | Absent | Absent | Absent | None | NONE | MISSING; restrictions alone do not implement inheritance |
| 30 Sub-reseller M3 | Commission/withdrawal/stock/support escalation; deferred/undated | Absent | Absent | Absent | None | NONE | MISSING; commissions/hardware deferred, support scope unresolved |
| 31 Merchant M4.1 | Manual business/channel/Place ID onboarding; P1 | Live forms | Validated explicit setup | Merchant/branch/destination | Manual Google link | BIZ, E2E | PARTIAL relative to full wizard; manual path works |
| 32 Merchant M4.1/§5.3 | Google OAuth/autofetch/category/ownership; P1 | No connect screen | No OAuth callback/import service | No OAuth token/location model | Missing implementation | NONE | MISSING; not merely missing credentials |
| 33 Merchant M4.1/4.6 | 3-5 manual keywords/logo; P1 | Live editor/PNG upload | Ownership/version/PNG validation | merchant_presentation | Local | BIZ, setup/E2E | COMPLETE for manual editor/logo |
| 34 Merchant M4.1/4.6 | Automatic keyword/location suggestions/trend insight; P1/advanced insight | Manual only | No recommender/data connector | Manual keyword storage | External data absent | AI, BIZ | PARTIAL; context injection is not recommendations |
| 35 Merchant M4.1/4.2 | Brand colors/template chooser/full onboarding <5 min; P1 ambiguous extent | Logo only | No complete theming/gallery | Limited presentation | Timing unverified | BIZ | PARTIAL; agree acceptance and finish wizard |
| 36 Merchant M4.2/9.3 | QR SVG/PNG/basic vector PDF per branch; P1 | Preview/download | Server generation, authorized content | qr_assets/digests | Local | FUN, E2E | COMPLETE for these formats; generic A6 PDF, not gallery/EPS/300-DPI certification |
| 37 Merchant M4.2/9.2 | Dynamic short links/public funnel; P1 | Link list/disable | Published ownership/readiness checks | short_links/funnel versions | Local redirect | FUN | COMPLETE locally; safe update constraints, no industry transfer |
| 38 Merchant M4.2/9 | Physical NFC encoding/self-tool/hardware gallery/EPS; P2/P4 | Absent | URL can be encoded externally; no encoder | No NFC provisioning ledger | Physical tags untested | NONE | MISSING; URL/QR is not verified NFC hardware |
| 39 Merchant M4.3/7.1 | Star/daily/branch/language/activity metrics; P1 | Live analytics | Recorded aggregates | Feedback/events/usage | Local | ANA, E2E | COMPLETE for measured local data, not verified Google metrics |
| 40 Merchant M4.3/7.1 | Physical scans/posts/velocity/conversion/edit acceptance; P1/advanced | Unavailable metrics honest | Views/clicks only, no post provenance | No imported reviews | Google absent | ANA, AI | PARTIAL; browser views/clicks are not scans or posts |
| 41 Merchant M4.4 | Private structured inbox/filter/detail/status/archive; P1 amended | Live | Scoped/idempotent/optimistic transitions | Feedback/history | Local | FB, concurrency | COMPLETE for amended anonymous structured contract |
| 42 Merchant M4.4 | Free-text/contact/consent/AI topic escalation/replies/internal notes; amended/deferred/policy | No such inputs | Strict structured input; no escalation/notes | No contact/narrative | No SMS/WhatsApp | FB, NONE | BLOCKED or superseded; do not add medical/contact fields, approve notes/escalation first |
| 43 Merchant M4.5 | Google review inbox/import/reply post/auto reply; P2 | Absent | No Google review service | No imported-review store | No GBP connection | NONE | MISSING; OAuth prerequisite overlaps P1 |
| 44 Merchant M4.6/6.1 | Customer editable 2-4 sentence draft; P1 | Live rating/tags/editor/copy | Claude bounded protocol, metering | Token reservation/results | Real Claude unverified | AI, setup tests | PARTIAL overall; local contract works, live quality/entitlements pending |
| 45 Merchant M4.6/6.4 | Scored GBP audit/PDF lead magnet; P3 | Absent | Absent | No audit model | None | NONE | MISSING; QR PDF is not GBP audit |
| 46 Merchant M4.6/6.5 | Posts/images/social generation/scheduling; P3 | Demo only on landing | No production service/scheduler | Absent | None | DEMO, NONE | MISSING in product; marketing demo not delivery |
| 47 Merchant M4.7 | Add/edit/archive branches/owned assets/roll-up; early P2 delivered | Live | Owned scoped service | Branch ownership keys | Local | BIZ, FB | COMPLETE for core branch lifecycle |
| 48 Merchant M4.7/4.8 | Assigned-branch managers/staff-only branches/comparison; P2 | No full branch assignment UI | Tenant roles, no assigned-branch manager contract | No full branch-role allocation | None | AUTH, NONE | PARTIAL; tenant RBAC is not branch-scoped role delivery |
| 49 Merchant M4.8 | Merchant admin/staff permissions; P1 baseline | Team panel | Fixed role permission checks | Membership roles | Local | TEN, AUTH | COMPLETE for existing fixed roles; original Manager role absent |
| 50 Merchant M4.9 | Plan/current period/resource quotas/warnings; P1 | Live status/80-100 warnings | Transactional quota admission/history | Subscription/counter/event records | Local | SUB, quotas tests | COMPLETE for explicit synthetic/non-paid allocations; no approved paid activation |
| 51 Merchant M4.9/10 | Upgrade/downgrade/payment method/history/invoice; P1 | Partial history/preparation | Razorpay scaffolding, paid hold | Agreements/events, no issued invoices | Real provider unverified | FIN | BLOCKED; policy approval plus further implementation, Stripe absent |
| 52 Merchant M4.10 | Compliance status/ToS/retention UI; P1/legal | No full compliance panel | Guardrails but no legal lifecycle | Audit only | Legal absent | FUN, FB | PARTIAL/BLOCKED; no fabricated consent/retention guarantees |
| 53 Public M5.1/11.1 | Independent Google/private at every rating; P1 | Persistent choices | Fixed options/canonical Google-only | Immutable publish constraints | Direct Google URL | FUN, FB, public/browser tests | COMPLETE locally; never claim actual Google post |
| 54 Public M5.2/6.1 | en/hi/ml auto/manual language and editable drafts; P1 | Three public languages | Bounded language enum, script checks | Language metadata | Native quality unverified | AI, public tests | PARTIAL overall; native-speaker/live output evaluation missing |
| 55 Public M5.2 | Other languages/code mixing; P2 | Three only | No full extra-language support | Three enum | None | NONE | MISSING; deferred, ambiguous launch language count documented |
| 56 Public M5.3 | Anonymous private submission/token/retry; P1 amended | Live bounded ratings | Signed revision/idempotent receipt | Structured ratings unique keys | Local | FB, concurrency | COMPLETE; no customer account/contact |
| 57 Public M5.4 | Mobile/no login/labels/keyboard/48px; P1 | Responsive controls | No customer auth required | N/A | Field unverified | Browser/public tests | PARTIAL; full WCAG AA and physical-device certification absent |
| 58 Public M5.4/3.4 | Offline fallback/sub-1s/edge/PWA; P1/optional | Bounded same-tab cached URL | Node/API, no edge KV/Redis | DB-backed config | No representative benchmark | offline tests, SEC | PARTIAL; first-ever offline cannot resolve unknown URL, no service worker/install prompt |
| 59 AI M6.2-6.7 | Replies/tagging/audit/content/fraud/voice; P2/P3/P4 | No live tools | Rate limiter only, no full classifiers/tools | No supporting feature models | None | NONE, AUTH | MISSING; rate limiting not fraud classifier, deferred scope |
| 60 Analytics M7.1-7.4 | Heatmap/cohorts/keywords/MRR/exports/digest/share cards; P2-4/undated | Basic feedback charts only | No full reporting/digest/export pipeline | Limited metrics | Mail/Google absent | ANA, NONE | PARTIAL; later/ambiguous acceptance must be scoped |
| 61 Channels M8.2/§6 | Salon/Clinic/Restaurant; P1 | Fixed catalog | Service-safe fixed labels | Three channel seeds | Local | BIZ, schema | COMPLETE for protected catalog; richer vertical question libraries partial in row06 |
| 62 Channels M8.3-8.4 | Hotel/Retail/additional registry/custom builder; P2/P3 | Absent | Fixed taxonomy only | No expanded registry | None | NONE | MISSING; deferred, no Phase1 penalty |
| 63 Billing M10.5 | Retry/grace/churn/winback; owner hold/roadmap | Absent | No automated dunning | No configured policies | None | FIN | BLOCKED; no approved retries or consent |
| 64 Compliance M11.1 | No incentives/quotas/staff scripting/medical detail; P1 | Structured/guarded | Strict input/system guardrails | CHECKs/triggers | Real AI safety unverified | FB, AI | PARTIAL overall; local guardrails complete, cannot certify all model output |
| 65 Compliance M11.1 | Every scan/rating/post device/IP audit; P1/privacy | No full audit panel | Admin audit/events, no Google post proof | Audit/event tables | Data policy absent | TEN, FUN, ANA | PARTIAL; no full original telemetry guarantee |
| 66 Compliance M11.2 | Toolkit/training/messages/compliance PDFs; P4/ongoing | Absent | No automated toolkit | None | Policy review absent | NONE | MISSING; deferred/ongoing |
| 67 Security M11.3 | ToS/DPA/privacy/consent/retention/erasure; legal | Absent | No policy/erasure jobs | No approved lifecycle | Owner legal decision | NONE | BLOCKED; no data privacy certification |
| 68 Architecture M3.2 | Typed 4-tier/direct paths/tenant isolation; P1 amended | Explicit tenant selection | Recursive ancestry/revalidation/parameterized SQL | Composite ownership/FKs | Local | AUTH, TEN, DB tests | COMPLETE local tested cases; MariaDB not SELECT RLS |
| 69 Auth M3.3 | Password/SuperAdmin MFA/session/recovery; current baseline | Live challenge/enrollment | Argon2id/JWT/refresh/TOTP | Hashes/encrypted seed/recovery | SMTP inbox unverified | AUTH, E2E | COMPLETE locally for existing contract; production key custody separate |
| 70 Auth M3.3 | Original magic-link/OTP replacement decision; P1 | Password only | No login magic-link/OTP | No such flow | Owner amendment absent | AUTH | BLOCKED; preserve current MFA, do not equate email reset with passwordless login |
| 71 Infrastructure M3.3/11.3 | Verified TLS or explicit loopback exception; P1/security | N/A | Strict shared validator/no downgrade | MariaDB TLS metadata | Hostinger topology unverified | SEC, local integration | BLOCKED for production; local exception implemented, production approval pending |
| 72 Infrastructure M3.3 | Redis/distributed rate limits/edge/cache/object storage; P1 topology | SPA, local cache | Process-local limits/Node redirect | DB-stored presentation | No distributed services | SEC, NONE | PARTIAL; Hostinger-only architecture reconciliation required |
| 73 Email/notifications M3.3/7.4 | Invitation/recovery SMTP vs digests/WhatsApp/SMS; P1/P4 | Invite/recovery live | Verified SMTP, no general notification system | Auth tokens | Real delivery unverified | AUTH, external tests | PARTIAL; SMTP protocol fixtures not inbox/notification assurance |
| 74 Operations M11.3 | Safe migrations/bootstrap/backup/recovery; P1 | Operator tools | Guarded identity/grants/approval/audit | 85 ordered migrations | Offsite/provider unverified | OPS | PARTIAL overall; strong local rehearsal, no production restore evidence |
| 75 Security M11.3 | Pentest/IR/bug bounty/DB at-rest encryption; ongoing/P3 | N/A | Runbooks not operational certification | Provider property unverified | Independent review absent | OPS, NONE | UNVERIFIED; bug bounty deferred, incident operation must be rehearsed |
| 76 Marketing / non-product | Interactive review/AI/NFC/location demo | Labelled sample | No corresponding demo service | None | Explicitly disconnected | DEMO | MOCK; exclude from product completion and acceptance metrics |
| 77 Operations / success metrics | Pilots/scans/MRR/uptime/P95 business targets; ongoing | No verified business data | No production evidence | Empty DB operator report | Not verified | NONE | UNVERIFIED; never substitute sample numbers or local tests |
| 78 Destination expansion / roadmap | Multi-platform destinations/platform registry; P2/P3 | Google only | Canonical Google-only contract | Provider-limited destination | No other platform connector | FUN, NONE | MISSING; deferred, do not weaken Phase1 Google-only constraint |

Exact original-source subclauses and phase conflicts remain linked in
[Task 22 line-by-line provenance](../backend/docs/task-22-sow-traceability-matrix.md).
This matrix groups related subclauses explicitly in their feature rows; a COMPLETE
row does not promote adjacent BLOCKED/PARTIAL clauses into delivery. Missing source
implementation is not relabelled as a credential-only blocker. See the audit's
score method rather than computing percentages from differently sized rows.
