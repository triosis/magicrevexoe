# Task 12 security verification evidence

Local integration verification, 2026-11-05. No external penetration test, provider
grant validation or production-readiness claim.

| Control | Observed real-stack result |
| --- | --- |
| Identity/membership | Browser selected actual stored memberships; real bearer authentication on resources |
| Cross-tenant access | Peer reseller/unrelated merchant: branch, feedback and subscription IDs returned 404 |
| Actual ancestry | Reseller denied platform-direct merchant; sub-reseller denied reseller-direct merchant |
| Hierarchy escalation | Sub-reseller creating another sub-reseller returned 403 |
| Plan authority | Merchant assignment returned 403; Super Admin browser assignment succeeded |
| Feedback authority | Anonymous status mutation returned 401; peer feedback inaccessible; authorized merchant update succeeded |
| Suspended ancestors | Actual reseller suspension blocked merchant token (403) and public resolution (404); authorized parent saw effective suspended subscription |
| Published configuration | Platform attempt to PATCH published channel returned 409 |
| Branch/link lifecycle | Live-link archive returned 409; disable then archive succeeded; public API/browser unavailable |
| Public minimization | Projection omitted internal owner IDs, email, password hash, permissions and subscription data |
| Parallel-path compliance | Both options visible before rating and after low-rating submission; Google independent |
| Clinic structure | No narrative/contact/medical input; signed structured feedback accepted |
| Counters/history | Five counters persisted, concurrent initialization did not reset/duplicate; missing counters unknown; live gauges differed from preserved snapshots |
| Audit | Actual tenant/funnel/QR/public-feedback/status/subscription events persisted |
| Logout | Actual revocation endpoint and cleared tab storage |

Existing real-MariaDB regressions additionally passed forbidden parent pairs, role/
ID spoofing, last-admin invitation protection, refresh replay, single-use reset/invite
reuse, all-ancestor suspension, archived-branch denial independent of disabled links,
medical/gating payload refusal, cross-owner FKs, immutable/append-only triggers and
audit/transaction failure rollback. These complement the browser workflow; they
are not represented as browser clicks. Main archive workflow disables the link first
as required by the service and does not bypass that guard.

No environment file/production credential loaded. Credentials/signing keys are
ephemeral; invitation tokens remain in trusted memory adapter and acceptance body.
Test artifacts omit secrets; failure wrapping discards matcher metadata that can
contain password-input snapshots. No local API mock, token forgery, grant override,
rate-limit disabling or constraint weakening. TLS relaxation applies only to local
test contexts. Google traffic is blocked before external contact.

An early harness's redundant sessions exhausted the existing auth limiter, which
stayed enabled. Normal navigation/separate tabs corrected the harness; this does
not validate production proxy/NAT aggregation behavior.

Remaining gates: MFA unimplemented; refresh tab storage XSS-accessible; SMTP/inbox/
durable mail retry unverified; process-local rate limits; global root lock capacity;
provider grants/TLS/proxy/CORS, production data inventory/backups/restoration,
retention and provider logging. Root fixture credentials do not prove least-privilege
feasibility. Google listing ownership/existence/completion remain unverified. No
payments, quota enforcement, purge process or legal certification was introduced.
Exact future quota points: [integration report](e2e-integration-report.md).
