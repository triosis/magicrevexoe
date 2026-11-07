# Phase 1 completion roadmap

Prepared 2026-11-07 from the six current completion-audit reports; source baseline
9e04eef. **Planning only.** No application code, secrets, migrations, infrastructure
or production settings changed. The six input audit files were already untracked
at the start; this task preserves them and adds only the three requested plans.

## Target and boundaries

Complete the approved Phase 1 core loop: four scoped consoles and all corrected
merchant acquisition paths; safe onboarding; Google-only public destinations;
Salon/Clinic/Restaurant; English/Hindi/Malayalam editable drafts; private structured
feedback; approved merchant subscription/payment functionality; and accepted security,
legal, integration and operational requirements. Existing working hierarchy,
branch/QR/inbox/quota/MFA services are regression baselines, not rewrite targets.

Source reports: [audit](APPLICATION_COMPLETION_AUDIT.md),
[feature matrix](SOW_FEATURE_COMPLETION_MATRIX.md),
[gaps](FRONTEND_BACKEND_GAP_ANALYSIS.md),
[security](SECURITY_AND_PRODUCTION_READINESS.md),
[backlog](PENDING_DEVELOPMENT_TASKS.md),
[launch checklist](LAUNCH_READINESS_CHECKLIST.md). Matrix row numbers below are
traceability IDs, not independent equally weighted units for completion percentages.
Original SOW and recorded Task02 corrections still govern acceptance; a plan cannot
waive an original requirement or lift the owner's financial/legal holds.

P0 means safety/decision/release gate; P1 means missing Phase1 code or acceptance;
P2 means polish or explicit later-phase work. Category C=code, O=owner/legal/finance,
E=credentials/provider approval/real verification, I=infrastructure/operator action.
An item can have several categories: approving credentials does not implement code.

## Complete Phase 1 gap extraction and disposition

| Gap ID / audit rows / original SOW | Outstanding requirement | Category / severity | Milestone / remaining dependency |
| --- | --- | --- | --- |
| G01 / 69,75 / M11.3 | Exposed candidate MFA key; production-key independence and use status unknown | O/I, P0 | M0; operator confirms deployment/ciphertext status, approved remediation/custody, no blind rotation |
| G02 / 71,75 / M3.3,11.3 | HOSTINGER_LOCAL production approval/routing isolation; TLS1.3 original versus TLS1.2 minimum | O/E/I, P0 | M10; pending exception must address actual residual risks, not assert TLS or dedicated isolation |
| G03 / 74 / M3.2,11.3 | Actual schema/grants/definers/locks, guarded initialization, backup/offsite restore/RPO/RTO | O/E/I, P0 | M10/M12; separate production approvals; empty DB is operator-reported only |
| G04 / 70 / M3.3 | Original magic-link/OTP versus password plus SuperAdmin MFA | O then conditional C, P0 | M9; owner amendment first, preserve existing security |
| G05 / 15,52,67 / M1.6,4.10,11 | Approved ToS/version/acceptance, privacy/DPA/consent, retention/erasure/legal holds | O then C/I, P0 | M8; no invented legal text, retention periods or deletion promises |
| G06 / 10 / M1.5,4.9,10.1 | Approved three-tier production catalog and complete resource/AI feature terms | O then C/I, P0 | M7a; no source-grid/test-price defaults or quotas |
| G07 / 11,13,51,63 / M10 | Usage billing definition, activation/checkout, settlement/GST/refund/credit/dunning policies and code | O then C/E/I, P0/P1 | M7b-e; unconditional execution hold remains until reviewed approved implementation |
| G08 / 31,32 / M4.1,§5.3 | Google OAuth, consent/callback, location/category/ownership import | C+O+E, P1 | M2-M4; actual missing connector, plus project/scopes/business access/privacy approvals |
| G09 / 34 / M4.1,6.1 | Category/location-based seed keyword suggestions | C+O+E, P1 | M5b; manual editor already works; source/data/entitlement approval needed; trend insight remains later scope |
| G10 / 31,35 / M4.1,4.2 | Guided onboarding, colors/template minimum, funnel preview and <5-minute acceptance | C+O+E, P1 | M5a; agree Phase1 theming/print minimum, preserve existing PNG/QR functionality |
| G11 / 06,61 / M1.2,8.1 | Full basic vertical questions/keyword libraries/prompt/routing expectations versus protected fixed fields | O then conditional C, P1 | M5b/M6; confirm acceptance without weakening Clinic or immutable historical CHECKs; custom builder deferred |
| G12 / 16 / M1.7,6.1 | Draft model selection/complex routing, prompt version/rollback/quality handling minimum | C+O+E, P1 subset | M6; reviewed code-versioned prompt/release evidence now possible; admin model console/full multi-task workflow needs phase decision |
| G13 / 17,44,54,64 / M5.2,6.1,11.1 | Live Claude, en/hi/ml factual/negative/clinical safety, token budgets, model role and latency | C as needed+O+E, P1 | M6; local guarded adapter exists, real/native evaluation absent; no model demo fallback |
| G14 / 03,40 / M1.4,4.3,7.1 | Basic dashboard/usage truthful metrics; missing physical scans/posts/review velocity/conversion provenance | C+O+E, P1 minimum | M1/M7a/M11; distinguish views/clicks from actual scans/posts, owner decides acceptance; Google review inbox/advanced revenue analytics remain later scope |
| G15 / 65 / M4.10,11.1 | Original every-scan/rating/post device/IP audit versus current anonymous events/admin audit | O then conditional C, P1 | M8b/M11; approve privacy/minimal telemetry and available provenance before new collection |
| G16 / 42,52 / M4.4,4.10 | Contact/notes/escalation/response and compliance panel expectations | O then conditional C, P1 ambiguity | M8/M11; structured anonymous feedback supersedes free text/contact; do not add them by inference; advanced replies/automation deferred |
| G17 / 57,58 / M5.4 | Full accessibility/mobile/offline/clipboard and native-language acceptance | C+E, P1 | M11; bounded cache exists; optional PWA prompt is not a mandatory launch gate; unknown first-offline destination cannot be invented |
| G18 / 58,72 / M3.3-3.4,5.4 | Original edge/Redis/KV/shared limits/object storage versus Hostinger-only topology and field P95 | O+C+E+I, P1 | M10/M11; formal topology reconciliation; no external DB/provider introduced without authorization |
| G19 / 27,69,73 / M3.3 | Actual SMTP invitation/recovery delivery, DNS sender and outbound configuration | E+I, P1 | M10/M12; local protocol tests pass, real inbox unverified; generic digests/WhatsApp not promoted into Phase1 |
| G20 / 75,77 / M11.3,§6,§9 | Release artifact/health/monitoring/advisory/pentest/incident/manual acceptance and pilot metrics | O+E+I, P0/P1 | M12; real launch evidence separate from tests; pilot business/revenue goals measured after controlled rollout, not fabricated prerequisites to first pilot |

## Small implementation milestones and exits

Effort is engineering person-days including focused tests/docs, not elapsed dates.
Provider/legal/finance/native-reviewer waiting is excluded. Slices can be reviewed
and merged independently while integrations stay disabled; merge/push/deployment
still require their own authorization. File-level changes are in the implementation
order report. No milestone here authorizes production execution.

| ID / priority / effort | Deliverable and dependencies | Acceptance and required tests |
| --- | --- | --- |
| M0 / P0 / 0.5-2 unused-key; 3-8+ used-key | Security remediation workstream. Needs fresh private operator use-status evidence and explicit secret-operation approval | No secret printed/committed; candidate treated exposed; existing access signing key preserved; replacement validated privately against actual signing key. If encrypted records exist, old-key recovery, approved decrypt/reencrypt rehearsal and rollback required; wrong-key/tamper/user-AAD tests; no blind overwrite. This task does not generate/rotate. |
| M1 / P1 / 1-2 | Non-blocking public view-receipt failure awareness; immediate local code milestone, no provider/policy inputs | Replace swallowed failure with neutral local state/message; do not add identifiers/storage/charge semantics or automatic retry. Google/private paths usable for all five ratings, expired/unavailable AI independent, no duplicate submission. Tests cover 409/429/503/network failure, reload/unmount/language change, en/hi/ml, no unhandled rejection or new tracking. |
| M2 / P1 / 2-4 | Disabled Google adapter/config and synthetic protocol contracts. Local interfaces/error handling can start now; no live call or persistence until OD-G approvals | Fail closed on partial configuration, bounded time/size, no leaked tokens, no fabricated locations. Mock transport tests for denial/timeout/malformed payload/redirect; not marked live verified. OAuth protocol details checked against official provider contract during implementation. |
| M3 / P1 / 3-5 | OAuth transaction/state/callback/account binding and encrypted connection persistence. Depends on M2 plus approved scopes/data/key-custody design | Single-use expiring state bound to authenticated merchant/action; reject cross-tenant/session/callback/replay; supported PKCE and redirect protections; encrypted tokens never returned to UI or audit; refresh/revoke/disconnect failures explicit. Real MariaDB ownership/concurrency/rollback and crypto negative tests. |
| M4 / P1 / 2-4 | Merchant connect/select-owned-location/import preview and explicit commit. Depends M3 and category/ownership mapping acceptance | Auto-filled permitted business fields are reviewed; no arbitrary tenant linking or silent overwrite/channel transfer. Denial/disconnect/manual-path recovery, stale mapping, duplicate imports, changed ancestry; local actual-stack E2E then separately authorized owned-business provider verification. |
| M5a / P1 / 2-4 | Guided manual/Google onboarding completion, preview and approved minimal presentation. Depends theme/acceptance decisions; can first test existing manual journey | No invented color/template or gallery scope; explicit progress/resume/errors, merchant-only edits, safe PNG, immutable public versions, Google option retained. Frontend tests plus tenant negative/concurrency tests and representative timed onboarding acceptance. |
| M5b / P1 / 2-5 | Safe keyword suggestion/launch-channel minimum. Depends M4 category source and OD-S scope/data/model decisions | Suggestions attributable to approved business/category/location context, no claimed rankings/medical outcomes or invented trends; merchant explicitly accepts 3-5 phrases; plan/token limits and prompt-injection tests. If richer questions required, use reviewed additive versioning with preserved historical constraints; no custom builder. |
| M6a / P1 / 1-3 | Local AI safety/quality acceptance cases and code-versioned prompt/change evidence; immediate fixtures only | Baseline en/hi/ml ratings1-5, sparse tags, hostile business context, clinical exclusions, timeout/unknown reservation and no automatic generation retry; primary/complex routing tested. Do not claim fixtures prove native quality. No new user-content telemetry without privacy decision. |
| M6b / P1 / 2-4 | Approved real Claude/model/native-speaker evaluation, targeted fixes only. Depends OD-A/entitlements/processor approval | Approved models/task mapping, requested language and editable factual drafts, low-rating sentiment preserved, clinical safety cases, measured latency/token billing vs reservations; unsupported output unavailable safely. Real evaluation evidence kept separate from unit mocks. |
| M7a / P0/P1 / 1-3 | Finance-approved catalog/usage definitions and acceptance cases. Owner input first; current authoring already exists | All tier prices/currency/cycle/resource quotas/AI allowances/overages explicit, no defaults from SOW. Publish/approval immutability, peer denial and gauge/counter reconciliation. Rates not activated; view is never renamed physical scan. |
| M7b / P1 / 3-5 | Policy-driven paid activation and Razorpay checkout/lifecycle sandbox. Depends M7a and written financial authorization | Replace unconditional hold only through reviewed scoped authorization design; default remains denied, configuration/signature alone insufficient. Provider-owned plan/payment identity, amount/currency/period/tenant bound; duplicate/out-of-order/replay/concurrent and audit rollback tests. No live billing yet. |
| M7c / P1 / 3-5 | Approved upgrade/downgrade/payment-method and overage reconciliation/settlement slice. Depends M7b and exact owner rules | Timing/proration/collection/rounding follow written policy, no charge on unknown usage, retries idempotent and audit reconciles local/provider state. Failure injection and transaction/provider ambiguity tests, no wallet/commission split. |
| M7d / P1 / 3-6 | Approved billing identity/GST issuance/refund/credit-note slice if required in signed Phase1. Depends finance/legal/numbering decisions | Non-issuable preparation remains distinct; exact approved identity/tax/sequence/date/rounding, immutable issued records and credit linkage, no duplicate financial documents under concurrency. Accountant-reviewed examples, PDF/data consistency and authorization tests. |
| M7e / P1 / 2-4 | Approved retries/grace/suspension/restoration/dunning if in Phase1 acceptance. Depends M7b-c plus owner schedule/consent | No guessed timeouts, discounts or QR shutdown rules; repeated events/jobs idempotent; missed schedules/provider outages/ancestry changes tested; communications require approved channel/consent. Remains disabled until authorized. |
| M8a / P0/P1 / 2-4 | Versioned legal text/acceptance and compliance UI. Depends OD-L legal source and accepting legal entity definition | Required version/effective-date acceptance logged for correct actor/tenant; no fake ToS; existing evidence not retroactively assumed. Supersession, concurrent acceptance, wrong-role and onboarding/session behavior tests per approved policy. |
| M8b / P0/P1 / 3-8+ | Privacy/telemetry/retention/erasure/legal-hold and any approved notes minimum. Depends OD-P/OD-R | No patient/contact narrative added; only approved data fields/purposes; tenant/actor scope, retention holds, archive/audit exceptions and dry-run/restore rehearsal. No purge or destructive production run; standalone future operation approval required. |
| M9 / P0 / 0.5-1 amendment; 5-10+ extra code | Reconcile authentication. Owner chooses whether current security satisfies Phase1 or passwordless supplements it | Signed scope decision; if new flow required, independently reviewed single-use expiring login token/OTP with generic responses, replay/rate-limit/session/MFA bypass negatives and real email. Password/MFA never silently removed. |
| M10 / P0/P1 / 3-7 plus topology-dependent code | Hostinger-only transport/shared-state/proxy/email/storage/recovery design and isolated rehearsal. Depends owner/support evidence; distributed code 3-7 additional if approved | Approved exception with genuine reference and isolation facts; no plaintext remote/downgrade; shared-limit topology tested if required, failure closed; correct sender/outbound/domain verification, restricted grants/definers/locks and restore evidence. Production actions separate. |
| M11 / P1 / 3-7 plus measured fixes | Core user-journey/accessibility/performance/offline and analytics acceptance. Local baselines can start now; field/native metrics later | Four roles/direct paths plus peer denial; truthful unavailable post/revenue metrics; approved observability without extra identity data; keyboard/contrast/48px/mobile, clipboards/offline expiry and three-language QA; representative 4G/P95/AI latency, not startup timing. No physical NFC launch gate beyond agreed QR scope. |
| M12 / P0/P1 / 2-5 + external review | Release/manual acceptance package; requires relevant M0-M11 exits plus owner sign-off | Full suite/build/typecheck/Oxlint/diff; online dependency review and independent security/incident/restore evidence; exact artifact/probe verification only under separate approval. Assisted synthetic acceptance first, controlled pilot next, no real customers before accepted gates. |

## Work allowed immediately, without new external inputs

M1 local non-blocking failure handling; M2 disabled adapter interfaces with synthetic
tests; M6a fixture/evaluation harness; M11 local accessibility/offline baseline and
measured fixes that preserve behavior. Document gaps/acceptance and prepare M0's
synthetic remediation tests without accessing or rotating actual keys. Owner requests
implementation in a subsequent task; this turn implements none of those milestones.
No paywall, new sensitive telemetry, OAuth data retention, automatic charging,
legal wording or provider configuration is authorized by these safe slices.

## Scope decisions and deferred work

Audit rows 04,07,08,18,21,23,30,60 and portions of 06,16,35,42,52,65 contain undated
support delegation, reseller channel assignments/A-B, audit viewer/settings,
custom grants, bulk actions/announcements, escalation/notes, model console, templates
and report-export expectations. Record an explicit Phase1 acceptance disposition
in OD-S; do not quietly delete them or presume all are mandatory launch work.
If promoted, add separately estimated milestones/file maps before starting.

Task02 wholesale/commissions/wallet/payouts; Phase2 reseller white-label, Google
review inbox/replies, additional languages/Hotel/Retail/multi-platform destinations,
hardware orders, branch-manager expansion; Phase3 GBP audits/posts/images, advanced
analytics/fraud/classification/custom builder/registry; Phase4 voice/mobile/marketplace/
WhatsApp/SMS/advanced policy monitoring stay outside mandatory Phase1. PWA install
prompt is optional. Google OAuth is Phase1, but does not automatically pull in
Phase2 review inbox or posting. Source-reported verified-post metrics need an
approved provenance/acceptance decision; do not make fake metrics or silently
promote the full review product to satisfy a chart.

## Estimation and completion

Milestone ranges are planning bounds, not quotes or dates. M2-M4 total 7-13 local
engineering days before real-provider verification; billing M7a-e totals 12-23
days after complete policy inputs, not a promise of finance acceptance. Legal,
used-key rotation and hosting may add significant conditional work. M5/6/11 fixes
overlap: estimate remaining aggregate effort only after decisions; do not sum
all ranges into an asserted launch date. Provider/finance/legal wait has no known
upper bound. Staffing parallelism does not remove approval dependencies.

Phase1 development exits only when agreed code/contract cases are complete and
every original ambiguity has a recorded decision. Release readiness additionally
requires live provider, security/legal, infrastructure, backup and manual acceptance
evidence. The previous 320 passing tests are the starting baseline, not a new run
or a completion percentage. Phase1 remains incomplete until those gates close.
