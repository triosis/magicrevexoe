# Frontend, backend and workflow gaps

2026-11-07; audit baseline 9e04eef. No application code changed.

## Screen and route inventory

`src/main.tsx` renders application/Root.tsx, not the marketing demo alone. `/` is
the public landing page, `/r/:code` is the real public funnel, `/login`,
`/forgot-password`, `/reset-password`, `/accept-invitation` and `/recover` route to
real auth flows. `/app`, `/app/accounts`, `/app/business`, `/app/channels`,
`/app/feedback`, `/app/catalog`, `/app/profile` and `/app/merchants/:id` are
membership-aware screens. Four tenant consoles are scoped versions of this shared
workspace; there are not four complete independent SOW dashboards.

Existing real API groups are auth, tenants, merchants/branches/destinations,
industry-channel versions, presentation/logo, funnels/links/QR, feedback/analytics,
subscription catalog/allocations/usage, public draft/view receipts and billing
scaffolding. `/api/v1/admin/subscription-plans` is the catalog API; `/app/catalog`
is its frontend screen. No Google OAuth/import/review/post, wallet/payout,
hardware fulfillment, custom-domain, scored audit or content scheduler routes
were found in app/service/route inventories. Future screens cannot be completed
by merely adding navigation labels.

## Critical journeys traced

| Journey | FE → API → DB / external evidence | Result and exact boundary |
| --- | --- | --- |
| 1 Super Admin creates Reseller | Accounts → tenant create → typed parent/membership/audit; actual E2E hierarchy test | COMPLETE locally, MFA/permission required; external invitation inbox unverified |
| 2 Reseller creates Sub-Reseller | Accounts → tenants → same transactional scope/type checks | COMPLETE locally; cannot create peer platform/reseller |
| 3 Sub-Reseller creates Merchant | Accounts/onboard → tenants/business → merchant channel/branch ownership | COMPLETE locally, direct platform/reseller merchant paths also tested |
| 4 Merchant onboarding | Merchant forms → business/presentation/destination → relational records | PARTIAL full SOW: manual name/channel/Place ID/keywords/logo works, no OAuth category fetch, full wizard/theming or five-minute field benchmark |
| 5 Connect GBP | No connect UI/callback/service/token storage/import | MISSING, not an already-built feature awaiting only keys |
| 6 Branch and QR | Merchant panel → branches/publish/link/QR content/PDF → owned metadata/digest | COMPLETE for generic SVG/PNG/vector PDF; no physical NFC/fulfillment/gallery |
| 7 Customer scans | QR URL → Node content-negotiated public route → SPA /r/:code → resolve/config | Local QR/browser path works; physical tag, carrier 4G and edge/P95 unverified |
| 8 Public option regardless rating | PublicPage fixed choices plus validPublicFunnel → Google destination checks | COMPLETE locally for all five rating choices; Google URL click is not a posted review |
| 9 Private feedback | Structured form → signed revision validation → idempotent feedback/history/counter transaction | COMPLETE amended anonymous contract; missing policy does not authorize patient narrative/contact capture |
| 10 Customer AI draft/edit | DraftForm → draft service → reservation/token accounting → Claude adapter → editable text | PARTIAL overall; actual provider response/quality/latency unverified, requires approved subscription entitlements, no fake fallback |
| 11 Merchant receives/manages feedback/replies | Feedback page → scoped list/detail/status/archive → audit/history | Inbox/status COMPLETE locally; contact replies, templates, notifications and Google replies not implemented |
| 12 Billing/subscription/limits | Subscription/catalog/billing panels → resource quota and terms services → allocations/counters/receipts | Local limits/lifecycle work; paid activation, settlement, issuance and dunning BLOCKED, production catalog unset |
| 13 Commission/payout | No live screen/service/ledger/provider integration | MISSING and explicitly Task02 deferred, not a Phase1 defect |
| 14 Peer-tenant access | Token + selected membership → ancestor/permission revalidation → scoped repositories/composite keys | Tested peer/ancestor/suspension denial; no claim MariaDB SQL SELECT RLS or exhaustive proof |
| 15 MFA/recovery/sessions | Auth forms → challenge/enrollment/verify/refresh/logout → encrypted factors, hashed recovery/session state | COMPLETE local protocol; exposed-key incident and real custody/SMTP acceptance remain production gates |

## Demonstrations, empty controls and contract boundaries

- `src/Interactive.tsx` has hardcoded review statistics, location figures, prepared
  AI responses and QR/NFC interaction under explicit SAMPLE DATA / no AI connection
  labels. Those are MOCK marketing interactions, never production Google/AI/NFC
  integrations. `src/App.tsx` marketing descriptions are not acceptance evidence.
- Live unavailable states are intentional: no Google review feed means analytics
  cannot show actual posted-review conversion/velocity; no billing policy means
  non-issuable preparation, no checkout permission; missing Claude yields 503 while
  both public paths remain available. Do not replace these states with fake data.
- `public.tsx` view-receipt POST uses `.catch(()=>{})`. This can silently drop
  measurement on outage/no subscription while the funnel remains usable. Current
  feedback and Google options are independent, but metering completeness cannot
  be guaranteed or used for charging. P1 before billing: observable consented
  metering/reconciliation policy without blocking public reviews.
- Event delivery failures set a notice, submission retries bind a fixed payload,
  AI ambiguity is not automatically retried, and ApiClient refresh is single-flight.
  No sampled tested core FE/API mismatch was found; there is no proof all possible
  contracts and browser states are covered.
- `Root.tsx` retains a conditional fallback text saying MFA is not implemented if
  the API reports mfaImplemented=false. Current backend implements MFA; this is
  stale compatibility wording, not evidence that deployed MFA is absent. Review
  API-version handling before mixed-release deployment (P2).
- No TODO/FIXME/HACK markers were found in the inspected production TS/TSX source
  search. Absence of markers is not absence of missing features: unavailable
  integrations and missing service modules are the stronger evidence.
- Schema availability is not feature delivery: auth/feedback/usage/audit ownership
  tables have services, but billing agreement/event/usage preparation tables do
  not establish invoice issuance or settlement. QR metadata does not implement a
  hardware inventory, NFC encoder or fulfillment ledger.

## Scope and security-sensitive mismatches

The original Manager role is assigned-branch scoped; the implemented merchant
admin/staff model is tenant-scoped. Do not advertise assigned-branch isolation as
delivered. Original magic-link login is not password recovery; it awaits an explicit
owner authentication amendment. Original custom styling/vertical templates are
broader than a merchant PNG logo and generic QR PDF. Original device/IP scan/post
audit is broader than current anonymous recorded events and privileged audit rows.
Legal/privacy review is required before introducing additional identity telemetry.
Redis/edge deployment is absent; the later Hostinger-only preference is a deployment
direction, not measured proof of original edge latency/distributed-abuse requirements.

The full matrix records phase dispositions. None of these later-scope gaps should
be implemented during this audit or silently added to Phase 1.
