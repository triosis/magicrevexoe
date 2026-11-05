# Task 12 real end-to-end integration report

Task 13 now enforces the five existing quotas at service transaction boundaries.
See [current quota contract](../backend/docs/quotas-api.md). Earlier no-enforcement/pre-billing notes
are historical; merchant subscription/counters must precede first admin acceptance
and metered resources. Google remains independent; no production change.

Verified locally on 2026-11-05. This is bounded local verification, **not production
readiness or deployment approval**. No Hostinger connection, production credentials,
production environment files, production migrations, payments or quota enforcement.

## Scope and environment

Inspected the source/test/script/configuration inventory, schema/migration contracts,
architecture, auth/tenant/business/funnel/feedback/subscription API documentation,
frontend guide and implementation/security reports through Task 11. Historical
absent-feature notes were interpreted against current source and later updates.
This does not claim a line-by-line security audit of dependencies/generated files.

`npm run test:e2e:real` runs actual React/Vite and Express createApp with the same
Auth/Tenant/Business/Funnel/Feedback/Subscription services wired at runtime, the
existing pool and real readiness probe, real HTTP requests, Chrome automation,
and migrations 000000–000063 on a fresh MariaDB **11.8.9** process. It verifies no
incomplete migration remains. **No local API response is mocked.**

Frontend/backend use random loopback HTTPS ports and a one-day self-signed local
certificate. Only test contexts accept that certificate; global TLS verification
is not disabled. No dotenv/application environment loader runs; Vite environment
file loading is disabled. MariaDB datadir/password, signing key and temporary admin
password are generated for the test. The database is magicreview_migration_e2e
inside the fixture-owned process, not a supplied database or service.

Platform/admin bootstrap and a synthetic published plan (17.25 INR, fixture limits
5/20) exist only in the test database. No production seed is introduced. Invitations
use the real delivery abstraction with a memory-only `test` adapter; browser
acceptance uses the actual single-use API and fragment removal. SMTP is unverified.
Actor tabs retain separate sessions, normal SPA navigation and unchanged rate limits.

## Exact workflow results

| Workflow | Final result |
| --- | --- |
| Super Admin login | Browser login and real platform membership selection passed |
| Platform channel publication | Actual draft and publish HTTP APIs passed |
| Platform → Reseller | Browser provisioning and browser invitation acceptance passed |
| Reseller login; Reseller → Sub-Reseller | Browser login, provisioning and acceptance passed |
| Sub-Reseller login; Sub-Reseller → Merchant | Browser login, provisioning and acceptance passed |
| Industry assignment | Clinic fixed at merchant creation and confirmed through scoped API |
| Merchant onboarding | Active administrator/channel/branch/destination; UI business setup complete |
| Branch and destination | Browser created IANA-timezone branch and canonical Google destination |
| Funnel, short link and QR | Browser published funnel, created link, previewed/downloaded SVG; digest matched metadata |
| Printed QR URL | Actual HTTPS HTML request redirected to fixed local React /r/:code |
| Independent public options | Both visible before rating and after overall rating 1 submission |
| Google navigation | Browser attempted canonical external path; harness blocked external contact |
| Anonymous feedback | Real browser submission, confirmation, database record and audit passed |
| Merchant feedback dashboard | Browser login, retrieval, new→in_progress update and history passed |
| Subscription assignment | Super Admin browser assigned fixture plan; five counters persisted |
| Merchant subscription panel | Real terms/status/period/usage displayed; assignment controls absent |
| Platform → Merchant | Real HTTP provisioning and browser invitation acceptance passed |
| Reseller → Merchant | Real HTTP provisioning and browser invitation acceptance passed |
| Counter persistence | Two concurrent initialize requests preserved counters/events; created zero duplicates |
| Snapshot versus live gauges | Second branch changed live usage to 2; opening counter remained 1; history labelled snapshots |
| Ongoing feedback accounting | New real public HTTP submission incremented period usage once |
| Missing counter state | Synthetic uninitialized allocation reported counter_missing and null remaining |
| Expired allocation | Synthetic elapsed allocation reported effective expired without read-side mutation |
| Suspended ancestry | Actual suspension blocked merchant token/public link; parent saw effective suspended; reinstate passed |
| Link disable and branch archive | Live-link archive denied; disable then archive passed; public API/browser unavailable |
| Logout | Actual browser revocation and cleared tab session storage passed |

Security results: [e2e-security-report.md](e2e-security-report.md).
Browser evidence: [e2e-browser-report.md](e2e-browser-report.md).

## Failed attempts, defect handling and known limits

No intended application workflow in the final matrix failed. Adversarial denials
are successful security tests. No genuine runtime defect was reproduced requiring
an application fix. Task 12 changes verification/docs only.

Initial **harness** defects were corrected: using Browser instead of Playwright's
request factory; repeatedly reloading/rotating/revoking sessions and exhausting the
60-request auth bucket; and expecting an old account tab to discover another tab's
writes without navigation. Corrections use the request factory, separate actor tabs,
SPA navigation and fail-fast dependent scenarios. No limiter, revocation, permission,
constraint or assertion was weakened; no test was disabled or replaced with mocks.
Earlier failed attempts are not counted as passing runs.

External Google rendering/review completion/listing ownership and SMTP/inbox delivery
are not verified. Production bootstrap, Hostinger configuration/grants/proxy/CORS,
MFA, backup/restore, retention, provider logging and load/capacity remain unverified.
The main browser journey uses Clinic; existing MariaDB suites cover all channels.
Direct merchant edges use real HTTP provisioning plus browser acceptance, not an
additional complete UI branch/feedback journey for each edge. Test root credentials
do not establish least-privilege feasibility. Existing gauge history remains opening
snapshots, not continuous lifecycle accounting. No production readiness is claimed.

## Future quota enforcement boundaries — not implemented

| Metric / operation | Required future transactional point |
| --- | --- |
| branches | BusinessService.createBranch before branch INSERT: lock/admit, resource + lifecycle ledger/counter + audit together. Archive must release under the same state/ownership guard. |
| staff_seats | TenantService.invitation and AuthService.acceptInvitation: approve whether pending invitations reserve seats, then reserve/consume once before activation. Future revoke/demotion/user-disable needs consistent release/reconciliation. |
| short_links | FunnelService.createLink before INSERT; disable and expiry workflow need idempotent lifecycle decrements. Current expiry changes live counts without a scheduled ledger event. |
| qr_assets | FunnelService.generateQr after rendering/state revalidation, before first ready INSERT (or future pending→ready). Regeneration must not double-charge; retirement/archive/link-state release policy must be explicit. |
| feedback_submissions | FeedbackService.submit after duplicate detection, before feedback INSERT: admission plus feedback + usage + counter + audit atomically. Existing usage() checks initialized accounting, not quota limits. |
| Period activation/replacement | SubscriptionService.assign/changeStatus/initialize: complete limits/counters and gauge carry-forward must serialize with admissions. Future renewal/plan changes must share that protocol. |

Before enforcement, replace snapshot-only gauge counters with idempotent lifecycle
accounting. Missing counters/limits must fail closed, not imply unlimited. Declining
private feedback must never hide/block the independent Google option.

## Final validation

| Command | Result |
| --- | --- |
| npm --prefix backend test | 25 passed |
| npm --prefix backend run test:subscriptions:integration | 12 passed |
| npm --prefix backend run test:feedback:integration | 13 passed |
| npm --prefix backend run test:funnels:integration | 10 passed |
| npm --prefix backend run test:business:integration | 11 passed |
| npm --prefix backend run test:tenants:integration | 12 passed |
| npm --prefix backend run test:auth:integration | 16 passed |
| npm --prefix backend run test:schema:integration | 10 passed |
| npm --prefix backend run test:migrations:integration | 8 passed |
| npm test | 15 passed |
| npm run test:browser | 8 existing fixture-browser tests passed |
| npm run test:e2e:real | 10 real-stack scenarios plus parent: 11 passed |
| npm run test:server | 1 passed |
| npm run typecheck / npm --prefix backend run typecheck | Passed |
| npm run build / npm --prefix backend run build | Passed |
| npm run lint | No errors; two existing App.tsx/Interactive.tsx warnings |
| git diff --check | Passed |

**152 tests passed**, none failed/skipped in final validation; Node parent tests
are included. Existing mocked browser tests remain separate regression evidence.
The successful real-stack run took about 35 seconds.

## Complete Task 12 file inventory

| File | Change |
| --- | --- |
| ../scripts/e2e-real.mjs | New isolated real-stack/browser/HTTP/MariaDB suite and artifacts |
| ../package.json | Explicit test:e2e:real command; no lifecycle/dependency change |
| e2e-integration-report.md | This workflow/result/limitations/quota-boundary/inventory report |
| e2e-browser-report.md | Browser/layout evidence and reproduction instructions |
| e2e-security-report.md | Security/compliance results and remaining gates |
| frontend-integration.md | Document separate real-stack command and boundaries |
| ../backend/docs/database-architecture.md | Task 12 verification/report pointer |

Ignored artifacts: `.tmp-frontend/real-e2e/result.json`, qr.svg,
onboarding-desktop.png, feedback-desktop.png, public-mobile.png,
subscription-mobile.png. They contain synthetic business data, no credentials or
tokens. Temporary TLS key/certificate and MariaDB data live in fixture-owned OS
temporary directories. Services close in finally; datadirs are retained as in the
existing harness, with no destructive cleanup SQL. No application source, migration,
schema constraint, environment, lockfile or commercial configuration was changed.
