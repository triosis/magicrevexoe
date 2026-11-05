# Task 21 test report

2026-11-05. Local Windows workspace, Node 24, disposable MariaDB **11.8.9** ZIP
server; random loopback port/ephemeral credential, no installed service or external
database. Integration suites run serially; concurrency scenarios use independent
connections. No production or Hostinger connection occurred.

| Final command / check from repository root | Result |
| --- | --- |
| npm --prefix backend test | 41 passed; no failures/skips |
| npm --prefix backend run test:integration | 179 passed, including parent tests; no failures/skips |
| npm test | 24 frontend tests passed; no failures/skips |
| npm run test:browser | 8 browser fixture tests passed |
| npm run test:e2e:real | 11 actual-stack tests passed, including parent; no API mocks |
| npm run test:server | 1 frontend production-server test passed |
| npm run typecheck; npm --prefix backend run typecheck | Passed |
| npm run build; npm --prefix backend run build | Passed |
| npm run lint | Passed, no warnings |
| git diff --check | Passed |

Total: **264** tests across these nonoverlapping suites, including parent tests.
This count does not add standalone reruns or manifest generation a second time.
Frontend build used a public local-build VITE_API_URL value, not production credentials
or a production service call. No dependency/package-lock change was required.

## New evidence

`backend/test/ai-billing.test.mjs`: complete/partial/missing provider configuration,
explicit commercial schema, no free-text mass assignment, configured model routing,
bounded token/response parsing, two-to-four-sentence output, language checks,
unsafe/plaintext screening, single network attempt, raw byte HMAC and exact bigint
monetary rounding. Injected transport returns synthetic protocol fixtures; these are
not real AI output, real payments or evidence that an external account works.

`backend/test/setup.integration.mjs`: 16 scenarios + parent, actual complete schema:

- Incomplete ledger refuses bootstrap; parallel bootstrap creates one root, owner,
  membership and audit; repeats preserve password; conflicting identity refuses.
- Actual AuthService first owner must enroll and verify MFA before selecting platform.
- Missing catalog fields refuse; concurrent identical create deduplicates; conflicting
  terms refuse; publication is explicit/immutable/idempotent with one audit.
- Valid authenticated staff/peer principals cannot access another merchant's billing
  or author catalogs (403 or scope-masking 404 as appropriate).
- Unapproved paid assignment/checkout makes no provider request and no agreement;
  exact commercial approval repeats safely, conflicting approval refuses.
- Four concurrent checkout workers create one remote subscription request and one
  local agreement. Repeating the ready UUID reuses the URL and grants no allocation.
- Concurrent signed captured-payment redelivery creates one receipt/allocation,
  five counters and success audit. Invalid signatures and immutable-row updates refuse.
- Concurrent signed browser-view receipts deduplicate; overage estimate remains not_charged.
- Four concurrent AI workers generate once; same-input repeat returns cached text and
  exact token counts; mismatched duplicate input and medical/free-text fields refuse.
- Ambiguous AI failure retains an unknown reservation; duplicate does not regenerate.
- Injected audit failure rolls back completed draft/text/tokens together, retaining
  conservative reservation. Subsequent over-allowance admission makes no generation call.
- Explicit cancellation calls provider once and preserves paid local access; repeated
  cancellation and new checkout during that allocation refuse.
- Scoped invoice preparation returns no issued financial document, invoice number,
  recipient, calculated tax or amount due; lists finance approvals and makes no provider call.

Frontend adds Hindi/Malayalam independent-path and structured-clinic checks, structured
AI request/editable-result checks, and invoice-readiness behavior without issuing or
initiating payment. Existing private-feedback duplicate-safe retry tests remain intact.
Real-stack E2E now mounts catalog/billing/draft services (external adapters unconfigured),
opens the actual catalog UI and preserves all existing browser/HTTP/MFA/hierarchy,
QR, feedback, subscription, quota and logout assertions. Network access is loopback
only; Google navigation is captured/aborted and no provider is contacted.

## Existing regressions and schema integrity

Aggregate integration covers authentication/MFA/replay, hierarchy/isolation, business
and funnels, feedback original deadlock reproducer/fixed repeat/stress, quota concurrent
admission, subscriptions, restricted runtime/migration accounts, locking/interruption/
postcondition failure/forward recovery, exact schema checks, actual encrypted native
backup/restore and services against restored data. Tests were not removed, disabled
or weakened. Full-schema expected counts changed from 26/35 to 30/41 tables/triggers.
Existing paid positive fixtures now explicitly insert **test-only** commercial approval;
new negative cases prove missing approval fails. No runtime seeds import that helper.

Manifest generation applied all 77 prefixes to another fresh disposable server.
Compared all 67 original checksums and prefix fingerprints byte-for-byte in parsed
form: unchanged. Original SOW digest remains
`212492f82241a9072b28f1b3aad9e86cdd55b6f2d19666a35855a5bdfaeb47d4`.

During development an incorrect channel fixture code and a token-object versus
token-string fixture failed and were corrected. An E2E run timed out while source
edits triggered Vite reload; clean reruns passed. A duplicate React sibling key
warning and lint warnings were corrected. Final passing runs are reported above;
earlier failures were not hidden by retries in application code.

## Limits

No live Claude/Razorpay response, tax/legal acceptance, native-speaker review,
production grant/secret/configuration validation or network latency/load target was
established. Local injected provider tests do not verify availability, payment
methods, real webhook ordering, GST invoices or an external account. Owner explicitly
requires financial settlement/refunds/credit notes/dunning to stay disabled pending
written finance-reviewed policy. Passing tests does not complete the SOW or authorize
deployment. See task-21-remaining-gaps.md.
