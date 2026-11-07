# Owner decisions required for Phase 1

2026-11-07. Decision register, not an approval record. No production access,
secret rotation, migration, financial execution or deployment is authorized by
this plan. The earlier `SEC-2026-001` text is a pending example; do not represent
it as approved. Preserve the owner's existing financial, legal and authentication
instructions until an explicit written superseding decision exists.

Read with [roadmap](PHASE1_COMPLETION_ROADMAP.md),
[implementation order/file map](PHASE1_IMPLEMENTATION_ORDER.md) and existing
[Task22 decisions](../backend/docs/task-22-owner-decisions.md). New IDs group those
earlier OD01-15 items plus the newly exposed-key incident; no decision has been
silently resolved by the 320-test baseline.

For each response record: actual decision/document reference, authorized approver
and role, date, accepted scope, conditions, effective/review date and evidence
location. “Approved” alone is insufficient where commercial/legal rules are missing.
Use protected custody for actual credentials; provide only non-secret references
and configuration availability in chat/reports. Do not paste MFA/signing/OAuth/SMTP/
payment credentials, database dumps or patient/customer records.

## P0 safety and release decisions

| ID / accountable party / prior reference | Exact decision or evidence needed | Safe current state / milestone blocked |
| --- | --- | --- |
| OD-K1 / Owner + authorized security/operator | Was the exposed MFA candidate ever installed? Is any current/pending MFA ciphertext encrypted with it? Fresh read-only operator confirmation of actual target and counts/use status only | Do not install exposed key; preserve old key/ciphertext if in use. M0 actual remediation blocked until status known. Earlier empty DB report is historical, not a current guarantee. |
| OD-K2 / Owner + security/operator | Approve unused-key replacement or, if used, reviewed re-encryption/incident plan, maintenance/rollback and key custody. Confirm secure comparison against existing production AUTH_ACCESS_SECRET through private operator process | No access-secret rotation or secret export assumed. Existing production access key only in hPanel; its local availability/independence comparison remains unverified. M0 completion blocked. |
| OD-H1 / Owner risk approver + Hostinger support / old OD14 | Final Hostinger-only transport exception with genuine reference, approver/dates/conditions/review; confirm 127.0.0.1 routing, local proxy/downstream hops and tenant/process/network boundary | HOSTINGER_LOCAL code exists but no production activation approval. Unencrypted loopback has no TLS peer identity. M10/M12 production gate blocked; local tests may proceed. |
| OD-H2 / Owner/security + Hostinger / old OD14 | Accept/amend original TLS1.3 transit requirement versus current verified TLS1.2 minimum and loopback exception; actual at-rest encryption, storage isolation and credential grants/definer/lock capabilities | Do not lower TLS further or assert provider assurances. Current Hostinger-only preference stands; no external DB silently introduced. |
| OD-H3 / Owner/DBA/recovery operator / old OD14 | Actual schema/account inventory, runtime/operator grant feasibility, backup/offsite custody, restore rehearsal, RPO/RTO and retention, release/bootstrap/initialization change approvals | No production schema change or bootstrap simply because tables were reported empty. M10/M12 operations blocked until separate approval. |
| OD-L1 / Owner/legal / old OD06 | Approved ToS/DPA/legal text, legal entity, version/effective dates, accepting role, who accepts for each tenant and effect of new/unaccepted version | No invented text/acceptance. M8a blocked; tests can use explicitly synthetic documents after contract approval. |
| OD-P1 / Owner/legal/privacy / old OD07 | Data purposes/minimization, processor approval and transfers (Google/Claude/SMTP), consent requirements, permitted telemetry/device/IP treatment, contact/internal notes/escalation scope | Anonymous structured feedback stays. No medical details/contact narrative or extra tracking by inference. Blocks M3 persistence/provider use, M8b and expanded analytics collection. |
| OD-R1 / Owner/legal/DBA / old OD08 | Approved retention periods, deletion/erasure process, legal holds/audit/financial exceptions, backup erasure treatment and authority for destructive operations | No fabricated default periods or deletion guarantees; no purge job executed. M8b design/implementation blocked. |
| OD-AUTH / Owner/security/product / old OD09 | Does password plus mandatory SuperAdmin MFA replace or supplement original magic-link/OTP? Supply formal amendment or specify approved supplementary flow | Preserve existing security. M9 either documentation-only acceptance or separately reviewed new flow; reset/invitation links do not satisfy passwordless login. |

## P0 finance policy, followed by P1 implementation

No approved policy/catalog currently exists. Original SOW numerical examples are
not commercial authorization. All of these need actual written decisions reviewed
with finance/accounting, not engineering-selected defaults.

| ID / accountable party / prior reference | Required commercial definition | Blocked work / consequence |
| --- | --- | --- |
| OD-F1 / Owner/finance / old OD01-02 | Complete approved Starter/Professional/Enterprise catalog: price, currency, cycle, explicit staff/feedback/short-link/branch/asset resource limits, scans/drafts/tokens, feature/language entitlements and overage treatment | M7a; do not assume unlimited or auto-seed prices/quotas. Keep production values unset pending real catalog. |
| OD-F2 / Owner/finance/product / old OD03 | What exactly is billable: measurable event, exclusions, uniqueness, bot/failed/replayed requests, period/time-zone definition, permitted measurement sources and rounding/rates | M7c and billable reconciliation; M1 can report measurement failure without answering any of these. Browser receipt is not a proven physical scan. |
| OD-F3 / Owner/finance / old OD01,03,05 | Paid activation condition, settlement/overage timing, upgrade/downgrade/proration/cancellation/access rules, ambiguous provider outcome resolution, payment-method permissions | M7b-c; no charge or renewal rule invented. No reseller splits/commission/wallets added. |
| OD-F4 / Owner/finance/accountant / old OD04 | Merchant legal billing identity/address/GSTIN, place of supply, rates/exemptions/rounding, financial year and entity invoice sequence, issuance timing, retention/immutability | M7d; data preparation remains non-issuable. No invoice number/tax/amount due invented. |
| OD-F5 / Owner/finance/accountant / old OD04 | Refund/credit eligibility, approver, calculation, tax adjustments, links to original financial records and provider reconciliation | Conditional M7d; refund/credit execution disabled until approved implementation. |
| OD-F6 / Owner/finance/legal / old OD05 | Retry/reminder schedule, consent/channel, grace and suspension/restoration, dispute handling and whether any public QR behavior may change | M7e; no automated dunning/discounts/QR cutoff from sample SOW schedule. Public choices never become rating-gated. |
| OD-F7 / Owner/finance/release / old OD01 | Written authorization for narrowly defined sandbox verification and separately for any live activation/collection after reviewed code/evidence | Adapter configuration or signature cannot lift unconditional hold. M7b-e local synthetic tests are not permission to move money. |

## Provider inputs and functional scope

| ID / accountable party / prior reference | Required decision/input | Work that can proceed / blocked boundary |
| --- | --- | --- |
| OD-G / Owner/privacy + Google account admin / old OD10 | Approved Google project/GBP access, scopes/consent, callback origins, legal business ownership/mapping and data retention; protected client credentials; token encryption key custody independent of MFA signing/encryption keys; authorized owned-business verification | M2 local disabled adapter/tests can start. M3 actual persistence and M4 live consent/import require approved design/inputs. Do not add Phase2 reviews/replies solely for onboarding. |
| OD-A / Owner/privacy/product + model account admin / old OD11 | Authorized Claude account/model IDs/version and primary/complex roles, processor approval, token budget/language entitlement, real evaluation budget, allowed reviewed examples/native speakers | M6a synthetic safety cases can start. M6b live quality and recommendations require actual configuration/permission; no fake fallback or unsupported model ID guess. |
| OD-S1 / Product owner / old OD12 | Phase1 acceptance checklist for guided manual/Google onboarding, brand colors/templates, generic QR PDF versus gallery/EPS, fixed structured launch-channel questions/keyword libraries/routing minimum and <5-minute test | Existing core stays. M5a/b design depends on explicit minimum; no custom builder, medical narratives or historic CHECK weakening. |
| OD-S2 / Product owner/data/privacy / old OD12,15 | Approve category/location suggestion source and plan/cost treatment; distinguish initial seed suggestions from later search-trend/keyword insights | M5b blocked; safe merchant manual editor remains usable. No fabricated local search rankings or clinical efficacy claims. |
| OD-S3 / Product owner / old OD12-13 | Assign undated original clauses to acceptance phase: support impersonation, reseller vertical restriction/A-B, audit-log search/settings, custom permissions/API keys, announcements/notes/escalation, model admin/prompt rollback and report exports | Do not mark them completed or silently defer. If required in Phase1, add policy-backed small milestones and explicit file/schema/test design before coding. Standard scoped roles/history already work. |
| OD-S4 / Product owner/privacy / old OD03,12,15 | Which dashboard metrics are accepted before Google review import: recorded views/feedback/clicks/tokens versus physical scans/posts/velocity/keyword acceptance, and required provenance | M11 basic truthful analytics can be tested now; never replace unknown Google metrics with samples or redefine clicks as posts. Resolve rather than automatically pulling Phase2 inbox into Phase1. |
| OD-S5 / Product owner / old OD12 | Confirm three launch channels and en/hi/ml roadmap precedence over contradictory five-channel/11-language launch examples; identify any contrary approved contract | Keep recorded three-channel/three-language Phase1 baseline. Additional verticals/languages remain Phase2 unless expressly changed. |
| OD-N / Owner/operator + email provider / old OD14 | SMTP host/port/security, private credentials/sender, outbound allowance, domain authentication and authorized synthetic verification recipient | Existing SMTP local tests remain. Actual invitation/recovery inbox evidence M10/M12 blocked; no production mail sent by this plan. |
| OD-I / Owner/Hostinger/security / old OD14 | Hostinger-only approved topology for shared rate limits/proxy IP/cache/asset storage and original Redis/edge requirements; available service/process boundaries, approved architecture amendment and capacity budget | M11 local measurements proceed; do not silently add external infrastructure or assume Redis/edge is installed. M10 shared-store design depends on facts. |
| OD-Q / Product owner/QA/security / old OD15 | Agreed representative devices/4G/network/P95 sample, accessibility/native reviewers, load profile/security assessment, scope of physical QR/NFC tests and acceptance evidence | M11 automated baselines start now. Original performance targets remain recorded; tests cannot be weakened to create success. Full NFC fulfillment not a Phase1 launch requirement by inference. |
| OD-RELEASE / Owner/release/security | Named operator/reviewer, exact artifact, accepted outstanding risks, maintenance/rollback and permission for any production check/migration/configuration/deployment; controlled pilot plan and monitoring | M12 release action blocked. Pilot growth/MRR targets are ongoing goals, not fabricated prelaunch evidence. Local readiness and business acceptance remain separate. |

## What is not an owner dependency

M1 non-blocking view-failure handling, disabled M2 transport contracts, M6a synthetic
safety cases and M11 local baseline checks can be implemented without credentials
or commercial/legal invention after a development task is authorized. Existing
RBAC/isolation/Clinic/parallel-path tests must keep passing. Owner waiting must not
be used to stop all independent local progress or to label absent code complete.

## How to close decisions

Use a real document/change reference and authorized reviewer, not a generated token
that merely passes a regex. Record approval scope separately for local code, live
provider tests, production secrets/configuration, migrations and release. Provider
credentials are delivered through private configuration, never committed to these
reports. Close an item only when the decision is explicit and subsequent code/tests/
provider evidence required by its milestone exist. A plan, a green build or a
provider API key alone is not launch sign-off.
