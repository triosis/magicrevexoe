# Pending development, decisions and effort

2026-11-07. Audit only; this backlog does not authorize execution. Estimates are
engineering person-days for an experienced team with approved inputs and existing
architecture, including tests/docs. They exclude procurement/provider approval,
legal/finance review, translation review, scheduling and production change windows.
Ranges overlap and must not be summed as a committed delivery date. Re-estimate
after discovery; no prices, quotas, policy rules or new scope invented.

## P0 launch gates

| Task / requirement | Type / dependency | Work and acceptance | Effort range |
| --- | --- | --- | --- |
| Resolve candidate MFA key exposure; M11.3/Auth | Owner/security + operator evidence | Establish installation/encryption status without sharing keys; unused candidate replaced securely or used key rotated with approved reencryption and verified recovery. Preserve existing signing key. No action performed here. | 0.5-2 days for first setup; 3-8+ for used-key tooling/rehearsal |
| Production transport exception; M3.3/11.3 | Written approval + Hostinger support | Genuine approver/reference/conditions/review date, confirm routing/proxy/tenant isolation; no false TLS claims. Risk acceptance alone is not proof of isolation. | 1-3 engineering days, external waiting unknown |
| DB readiness/release/recovery; M3.2/11.3 | Separate ops/release authorization | Inventory actual schema/roles/grants/definers, backup and restore rehearsal, fresh guarded preflight/apply/bootstrap only if approved, deployed commit/native module/probes verified. | 2-5 days plus host privilege resolution |
| ToS/privacy/consent/retention/deletion; M11.1-3 | Owner/legal decisions OD06-08 | Obtain approved content/lifecycle; then versioned acceptance, consent where applicable, retention/legal-hold/erasure workflow, tests. Do not invent data deletion promises. | 5-12+ engineering days after legal approval |
| Authentication scope reconciliation; M3.3 | Owner decision OD09 | Confirm current password+SuperAdmin MFA replaces/supplements original magic-link/OTP. Preserve current security; implement passwordless only if explicitly approved. | 0.5-1 documentation day; 5-10+ if new secure login required |
| Commercial and GST policy/catalog; M1.5/4.9/10 | Owner + finance decisions OD01-05 | Approve actual prices/cycles/limits/usage semantics/rounding/identity/tax/numbering/refund/dunning. Existing unconditional execution hold stays until reviewed implementation. | Owner review unbounded; 1-3 engineering discovery days |

## P1 approved Phase 1 code/verification gaps

| Task / SOW reference | Current gap | Completion evidence | Effort range |
| --- | --- | --- | --- |
| Google onboarding connector; M4.1/§5.3 | Missing OAuth callback, connection storage, location/category import and ownership linkage | Approved scopes/consent/redirects; state/PKCE/CSRF and encrypted-token custody/refresh/revoke; strict merchant ownership, retry/audit tests; real authorized sandbox/owned-business evaluation. No Google-post or reply feature implied. | 8-15 days plus Google approvals |
| Onboarding keyword/theme acceptance; M4.1/6.1/8.1 | Manual keywords/logo work; suggestions/colors/gallery/full wizard incomplete or ambiguous | Approve Phase1 minimum, safe bounded settings and source-backed recommendations; no invented SEO facts; preserve immutable channel/compliance fields. | 4-10 days after scope/source approval |
| Live AI and language acceptance; M5.2/6.1 | Adapter and guarded reservation contract pass fixtures only | Approved models/account/data processing, actual factual/negative/clinical safety cases, en/hi/ml native review, cost/latency and ambiguity reconciliation. | 3-7 days + reviewers/provider availability |
| Financial policy implementation; M1.5/4.9/10 | Paid paths held; no settlement/GST/refund/dunning completion | Versioned policy-driven activation, verified Razorpay sandbox/webhook replay/reconciliation, approved usage definition, lawful issuance/numbering/credit handling if in accepted Phase1. No wholesale/wallet/split added. | 12-25+ days after finance approval; may split into independent releases |
| Metering observability; M4.3/7.1/10.2 | Browser view receipts can fail silently; not physical scan or verified post | Define measurement/charging distinctions, non-blocking public UX, monitoring/reconciliation/idempotency and concurrency acceptance; do not charge unknown data. | 2-5 days after semantics approval |
| Hosting/shared-state/performance; M3.3-3.4/5.4 | No Redis/edge/KV; process-local limits; field P95 absent | Approved Hostinger-only topology/amendment or implementation plan, trusted proxy/IP behavior, distributed-abuse decision, representative 4G/mobile/concurrency benchmarks and regressions. | 4-10+ days; architecture approval prerequisite |
| Accessibility/offline/public acceptance; M5.4 | Some keyboard/mobile checks; no complete WCAG/native/device audit | Assistive technology, contrast/48px targets, offline expiry/security, clipboard/popups and all ratings/languages; fixes based on measured failures. | 3-7 days plus independent review |
| Email and production acceptance; M3.3 | SMTP fixture TLS/auth not real inbox | Authorized synthetic recipient invitation/recovery, sender SPF/DKIM/DMARC, expired/reused links, no raw log leakage, provider outage behavior. | 1-3 days after protected config |

Google code is a genuine missing Phase1 implementation, not just an account key.
Billing/legal blocks require subsequent code and cannot be closed by changing an
environment flag. External quality targets must not be relabelled COMPLETE after
a mocked response. No destructive schema/retention operation is authorized here.

## P2 deferred and operational improvements

| Work package | Disposition / dependencies | Preliminary effort |
| --- | --- | --- |
| Reseller white-label/domains/email/login styling | Phase2; ownership/DNS/certification/mail policies | 8-15 days |
| Google review inbox/reply approval/auto-post | Phase2; approved Google connector/scopes/rules | 10-20 days |
| Assigned-branch manager/staff role expansion/comparison | Phase2; explicit permission matrix | 5-10 days |
| Commissions/wallet/withdrawal/payout/wholesale | Task02 deferred; separate accounting/commercial approval, not current launch blocker | 15-30+ days |
| Hardware SKU/order/CSV or partner/shipping/NFC fulfillment | Phase2; vendor process and physical devices | 10-20 days plus hardware QA |
| Eight extra languages/Hotel/Retail/other channels | Phase2; language count/registry acceptance and native review | 5-12 days plus content review |
| GBP audit/PDF, content/images/scheduling, sentiment/topic tagging, fraud classifier | Phase3; Google/model/data/provider and safety policy | 20-40+ days combined; individual discovery needed |
| Advanced cohort/MRR/keyword/report exports/digests/custom builder/automation API | Phase3 or ambiguous original reporting clauses; agree acceptance, no false phase waiver | 15-30+ days |
| Voice, WhatsApp/SMS automation, mobile/self-NFC, marketplace, automated compliance toolkit | Phase4/ongoing; consent, provider/mobile and policy scope | Not responsibly estimated without separate design |
| Read-only audit search/export and support delegation | Original undated requirements: agree phase, least privilege, approval/revocation/audit | 4-10+ days after policy |
| Remove stale compatibility wording/production-demo marketing alignment | P2 product clarity; demo remains labelled | 0.5-2 days |
| Independent pentest/incident/offsite recovery/advisory process | Ongoing security, prelaunch baseline review required; not substituted by tests | External quote/schedule needed |

Postponement requires a recorded acceptance scope: do not silently defer original
undated clauses simply because they are absent. The explicit roadmap and Task02
deferrals may be postponed without treating them as Phase1 implementation defects.
