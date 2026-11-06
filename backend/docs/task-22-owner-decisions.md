# Task 22 owner decisions

2026-11-06. No production change or provider connection is authorized by this record.
Original SOW and Task 02 remain unchanged. The owner's Task 21 and Task 22 replies
are recorded as explicit instructions, not fabricated signed legal amendments.

| ID | Required decision / evidence | Current instruction and effect |
| --- | --- | --- |
| OD-01 | Written Billing, Settlement and GST Policy, owner-approved with finance/accounting review | None exists. Paid activation, checkout, overage collection, settlement, refunds/credit notes, GST issuance and automated dunning stay disabled. Catalog approval, administrator role, a provider signature or environment variable cannot enable them |
| OD-02 | Actual versioned commercial catalog: price/currency/cycles, five resource capacities, scan/draft/token allowances/rates and feature entitlements | Original numerical grid is not approved. All actual values remain unset; test fixtures are explicitly synthetic. Do not transplant test values or silently interpret omissions as unlimited |
| OD-03 | Billable-scan definition, counting exclusions/uniqueness, settlement timing, overage treatment | Browser view receipts and Google-link clicks are measured only. They are not unique customers, physical QR scans, verified posts or permission to charge |
| OD-04 | Merchant legal billing identity/address/GSTIN, place of supply, financial year/entity numbering, tax/rounding, refunds/credit notes and adjustments | Invoice preparation stays non-issuable: no invoice number, recipient, tax breakdown or amount due. The QR PDF is a print asset, never a financial document |
| OD-05 | Payment retry/reminder schedule, consent, grace, suspension/restoration and dispute/reconciliation rules | Owner explicitly requires automated dunning to stay disabled; original example schedules are not adopted. Existing period/ancestry/quota controls remain unchanged |
| OD-06 | Approved ToS text/version and acceptance requirements, who accepts for each legal entity, approval/effective dates | Owner confirms no approved legal text/acceptance requirements exist. No invented terms, dummy acceptance or compulsory legal policy is published |
| OD-07 | Privacy/consent requirements, processors/transfers, allowed internal notes/contact/escalation recipients | Owner confirms no approved privacy/consent document exists. Anonymous structured feedback remains; no patient narrative/contact collection or automatic customer messages added |
| OD-08 | Retention periods, deletion procedures, erasure/legal holds and audit exceptions | Owner confirms no approved policy exists. Conflicting source examples are not chosen. No purge scheduler, retention guarantee or destructive deletion is introduced |
| OD-09 | Formal authentication amendment: whether password plus Super Admin MFA replaces or supplements SOW magic-link/OTP | Owner explicitly says preserve current security and do not invent/replace login policy. Current password/MFA/session/recovery implementation remains. This does not falsely establish a signed amendment or delivery of magic-link login |
| OD-10 | Google OAuth project/API access, approved scopes/consent, redirect/verified origins, business ownership and privacy review | No Google connector or import code is delivered. These are real Phase 1 code and external/owner dependencies, not merely unverified credentials. Manual canonical Google Place ID remains the safe current destination path. Do not provide secrets in reports/chat |
| OD-11 | Authorized Claude account, approved model IDs/API version, processor/data handling and separately approved live evaluation | Adapter/prompt context/reservation exist, but no actual AI response, latency or language/factual/clinical-safety evaluation occurred. Keep missing configuration unavailable; no demo fallback |
| OD-12 | Acceptance of fixed structured labels versus original custom industry questions; prompt/keyword library, advanced layout and branch-manager phase decisions | Fixed historical database CHECKs are preserved. Merchant business keywords and PNG logo are new; tenants cannot change question fields or compliance rules. Custom builders/later branch-role expansion are not silently promoted into Phase 1 |
| OD-13 | Delegated support impersonation, custom role grants/API keys, bulk announcements and note/escalation policies | No unsafe support bypass, arbitrary permission authoring, unapproved message delivery or financial bulk action is implemented |
| OD-14 | Hosting/proxy/shared-rate-limit/edge topology, provider restricted grants/TLS/definers, SMTP sender/recipient verification, backup custody/off-site restore and RPO/RTO | Local tests do not establish these operations. No Hostinger connection or production changes occurred. Redis/edge delivery remains a code/architecture-and-provider prerequisite; process-local limits are not distributed limits |
| OD-15 | Representative performance/accessibility/physical-device/native-speaker acceptance and pilot/business metrics | No complete WCAG AA, field 4G/P95/sub-second, physical QR/NFC, live Google-post, pilot/customer or revenue evidence. Automated browser tests are narrower |

The owner answered the Task 22 policy clarification explicitly: no legal-policy
document or authentication amendment has been provided. ToS, privacy/consent,
retention/deletion and authentication reconciliation must remain **awaiting owner
approval**. Work that does not depend on them continues; their absence must not be
hidden as a test success or an invented deferral.

Deferred scope is unchanged: commissions/wallets/payouts/wholesale under Task 02;
white-label, additional languages and merchant AI replies/hardware in Phase 2;
advanced classification/audit/content/fraud/analytics/builders/integration APIs in
Phase 3; voice, marketplace/mobile/self-encoding and advanced policy monitoring in
Phase 4. Ambiguous acceptance details remain decisions, not silent waivers.

Provider prerequisites were checked against primary documentation, without making
provider calls: [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
requires an authorized project/consent configuration and protected callback flow;
[Business Information locations](https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list)
is a separate API surface. These references do not prove project approval, ownership,
implemented connector behavior or live access.
