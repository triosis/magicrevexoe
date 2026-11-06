# Task 22 test report

2026-11-06. Windows Node 24, disposable MariaDB **11.8.9** ZIP server, random loopback
port/ephemeral credential, no installed service. Database integration files run
serially; concurrency scenarios use actual independent workers/connections. No
production, Hostinger or actual AI/payment/Google API connection occurred.

| Final command from repository root | Exact result |
| --- | --- |
| npm --prefix backend test | 45 passed; no failures/skips |
| npm --prefix backend run test:integration | 185 passed including parents; no failures/skips |
| npm test | 29 frontend tests passed; no failures/skips |
| npm run test:e2e:real | 13 passed including parent; actual React/HTTPS/Express/MariaDB, no local API mocks |
| npm run test:browser | 8 browser fixture tests passed |
| npm run test:server | 1 production frontend-server test passed |
| npm run typecheck; npm --prefix backend run typecheck | Passed |
| npm run build; npm --prefix backend run build | Passed |
| npm run lint | Passed, no warnings |
| git diff --check | Passed |

Total **281** across these nonoverlapping suites, including node:test parents.
Standalone reruns, audit generation, manifest generation and PDF QA are not counted
again. Frontend build uses a public API-origin build value only; this does not
change production configuration or call that service.

## New/changed contract evidence

- `task22.test.mjs`: immutable financial readiness with no catalog/role/environment
  bypass; strict bounded real PNG bytes/CRC/dimensions/tail/inflation; strict business
  keyword/version fields; valid archive transition; exact finite-capacity warnings
  including BIGINT beyond Number.MAX_SAFE_INTEGER, missing/unlimited and zero capacity.
- `setup.integration.mjs`: six added scenarios plus expanded Task 21 scenarios.
  Paid reactivation/internal allocation/counter initialization refuse despite a
  commercial approval; concurrent checkout creates no provider request/agreement;
  signed duplicate receipt records once with reconciliation and no allocation.
  Free synthetic allocations preserve all AI/quota regression checks.
- Actual scoped PNG/keyword updates, stale concurrent version refusal, staff/peer
  denial, public logo projection without keyword exposure and immutable ownership.
- Resolved-only concurrent archive, final history/version/filter/statistics, terminal
  refusal, immutable language and database refusal of unresolved archival. Injected
  final audit failure rolls archive/version back. Existing append-only history/guards
  remain intact.
- Actual bounded UTC analytics, exact recorded ratings/activity, peer denial, invalid
  date interval rejection and explicit null Google post/conversion metrics.
- Authorized ready QR PDF bytes, peer denial and refusal after link disable.
- Frontend: bounded canonical same-tab cache, expiry/malformed/future/cross-code/
  blocked-storage refusal, transient fallback, invalidation after explicit 404,
  five rating states with both options visible and unchanged failed-submit retry
  after changing the public rating. Invoice readiness still initiates no payment.
- Actual-stack E2E adds merchant keyword and PNG upload through real browser HTTP,
  public rendering, actual authorized PDF download and resolved/archive UI/history/
  scoped analytics. Existing hierarchy/MFA/invitation/QR/feedback/subscription/quota/
  isolation/suspension/logout assertions remain. All external navigation is blocked;
  Google clicks are observed and aborted, not posted.

Task 22 intentionally changes allowed financial behavior. Previous positive paid
checkout/activation expectations were replaced by stronger refusal assertions, not
skipped or hidden. Existing lifecycle/counter/rollback tests now allocate explicit
test-only free plans; configured-price/catalog assertions remain, along with new
approved-catalog bypass negatives. No runtime free catalog was seeded or policy
bypass added. No existing test/constraint/rate limit was disabled to make tests pass.

## Database and regression evidence

Full suites include auth/MFA/recovery/refresh replay, all approved merchant parent
paths, strict Clinic input, tenant scopes, quota admission/concurrency/atomic audit,
the original feedback deadlock reproducer and repeated fixed-path stress, migration
target/checksum/lock/drift/privileges/interruption/postconditions/forward repair,
TLS/SMTP refusal and actual encrypted native backup/fresh restore with application
verification. Expected schema counts were updated to actual 32 tables/46 triggers;
old SQL/checksums/history were not edited.

Fresh manifest generation applied every one of 85 ordered versions on another
disposable server. Compared all 77 pre-task checksums and structural prefixes with
the saved baseline: unchanged. The original SOW digest is also unchanged. Reproducible
scope inventory contains 503 classified source items under 92 headings; this is
coverage/provenance evidence, not a test-derived completion percentage.

## PDF QA

The PDF skill's marker was executed before authoring. Runtime export remains Node
vector generation to preserve the existing architecture; it does not start Python,
Chromium or a remote renderer. Temporary ignored PDF.js/canvas tools parsed and
rendered the generated one-page A6 file. Captions were extracted and the exact
synthetic source URL decoded from the framed QR pixels. The rendered PNG was visually
inspected for clipping, overlap, glyphs, QR quiet zone and legibility. This is local
software evidence, not a physical print/phone/NFC test or live destination.

`output/pdf/task-22-qr-print-preview.pdf` is deliberately synthetic and encodes an
example.invalid URL. It is not a live merchant asset, financial invoice or external
integration demonstration. Temporary QA dependencies did not change application
package manifests or locks.

## Development failures and limits

An added paid-refusal HTTP call initially exhausted an existing fixture's exact
write-rate budget; the additional policy assertion moved to the service boundary
without increasing or disabling the rate limit. Existing fixed-label CHECKs refused
a label variation; those constraints and fixed labels were preserved. Browser QA
found a success notice lost during panel refresh; it now persists outside the
refreshed form. The new archive browser case first attempted archive before resolving
the fixture; the case now executes and verifies both transitions. These failures
were investigated, not concealed with application retries.

Actual Claude output/latency/safety, Razorpay operation, Google OAuth/ownership/
import, native-language quality, complete WCAG, representative 4G/P95/capacity,
external inbox/DNS/grants/TLS/key rotation/off-site recovery, tax/legal compliance
and pilot metrics remain unverified or blocked as the other Task 22 reports state.
No test result authorizes financial execution, legal wording, retention/deletion,
production deployment or a declaration that Phase 1 is complete.
