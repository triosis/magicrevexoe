# Task 10 frontend integration and validation report

Implemented locally on 2026-11-04. No Hostinger/Google/SMTP connection, production
environment update or production migration. No administrator credentials were seeded.
Guide and current limits: [frontend-integration.md](frontend-integration.md).

## Discovered architecture and delivered result

The original frontend was React 19/Vite/TypeScript with a landing page, labelled
interactive demo and example pricing, without authentication, API utilities or app
routes/tests. These remain at `/` with the same visual identity; a sign-in entry
and accurate invited-access FAQ were added. Scoped forest-green/cream responsive
application styles do not rewrite the landing styles.

New application modules provide one typed configurable API client; tab restoration,
single-flight refresh, tenant reselection and logout; login/recovery/invitation
screens; all four administrative workspace types; account hierarchy/provisioning,
merchant onboarding, branch/destination/QR/link management; anonymous customer
funnel and duplicate-safe structured feedback; private inbox/filtering/statistics/
history/status controls. No live application feature falls back to mock business
data. Test fixtures are only in test files. Subscription visibility honestly remains
unavailable because the API does not exist; landing prices remain labelled examples.

One minimal backend adaptation makes printed API QR URLs usable in browsers:
optional trusted PUBLIC_WEB_ORIGIN and an HTML-only 303 redirect after existing
public validation. JSON clients are unchanged. No new auth/business API, pool,
migration or duplicated SQL layer was created. A backend test verifies fixed
origin, valid HTML redirects, safe invalid-link refusal and unchanged JSON projection.

## Security decisions

- Access token memory only; refresh token/membership ID in sessionStorage, no
  localStorage/role/profile/password persistence. Passwords/tokens are not logged.
- Single rotation promise prevents conflicts within a tab, generation checks reject
  late rotations after logout, and ambiguous refresh failures fail closed. Rotations
  reselect membership through the server. Cross-tab copied sessions remain a stated
  limitation, not an invented distributed lock guarantee.
- Public requests omit authentication/cookies even when navigating from an admin
  workspace. Public JSON form metadata uses an explicit field/type allowlist and
  canonical Google URL check. There is no free text, gating threshold, customer
  account, AI action, or private-data exposure on public routes.
- Navigation and visible actions follow current server-returned permissions, with
  server authorization/CAS preserved. IDs stay strings; unknown scope/backend errors
  do not reveal unrelated data or trigger a demo fallback. Resource loads discard
  stale scope results and workspace switches remount sensitive content.
- Recovery fragments are removed from history. Authenticated QR bytes use revocable
  blob URLs and server-generated IDs/URLs. Public Google links use noopener/noreferrer.
- Production static server adds self-only scripts, no-referrer, nosniff, frame/object
  restrictions and SPA deep-link handling. sessionStorage remains XSS-accessible;
  these headers are mitigation, not HttpOnly-equivalent security.

## Actual validation

| Check | Result |
| --- | --- |
| npm test | 10 frontend Vitest tests passed |
| npm run test:browser | 7 Chrome browser scenarios passed |
| npm run test:server | 1 production static-server smoke test passed |
| npm --prefix backend test | 22 passed |
| backend test:feedback:integration | 13 passed |
| backend test:funnels:integration | 10 passed, including trusted HTML bridge assertions |
| backend test:business:integration | 11 passed |
| backend test:tenants:integration | 12 passed |
| backend test:auth:integration | 16 passed |
| backend test:schema:integration | 10 passed |
| backend test:migrations:integration | 8 passed |
| npm run typecheck / npm run build | Passed |
| Backend build / strict TypeScript via each suite | Passed |
| npm run lint | Exit 0; two existing landing/demo warnings retained |
| git diff --check | Passed |

Total: **120 passing tests**, including backend integration parent tests. There
were no earlier frontend tests to regress; the preserved landing is now checked
in Chrome. Backend suites run on fresh disposable local MariaDB **11.8.9** with
synthetic data, random loopback ports and ephemeral credentials.

Frontend tests use intercepted local API fixtures matching the documented contracts,
not a deployed backend. Chrome blocks all non-loopback external requests in fixtures.
API-client unit tests stub transport, so they cannot contact production. They cover
restoration/concurrent rotation, selected-tenant recovery, token storage, credential-
free public requests, safe errors/configuration, blocked storage, logout and late
refresh protection. Browser scenarios cover sign-in/errors/logout/reload, recovery/
invitation fragment removal, explicit workspace selection and role navigation,
merchant creation through branch/destination/funnel/link setup, branch editing/
archive, SVG/PNG preview/download, disable links, feedback filters/pages/statuses,
mobile clinic independent options and structured submission, and invalid public links.

Visual inspection of `.tmp-frontend/public-mobile.png` verified equal option styling,
the received-feedback confirmation, readable mobile layout and no horizontal
overflow at 390×844. A mobile workspace overflow check also passed. This is not a
claim of exhaustive cross-browser/accessibility testing or live full-stack UAT.
The desktop feedback workspace screenshot was also inspected for navigation,
readable forms, statistics, pagination and status-history layout.

The first backend run exposed missing local dependencies after the separate root
install; restoring `npm --prefix backend ci` resolved that environment issue. All
backend suites then passed. Browser checks found label targeting/hidden-form
ambiguities; explicit accessible labels and visible role selectors fixed them.
The Windows browser harness now owns Vite in-process and closes it cleanly, avoiding
stale child-server shutdown during tests. No backend authorization was weakened.

Dependency installation reported an existing body-parser advisory. A compatible
root lockfile patch was applied; npm audit then reported zero known vulnerabilities
at that time. No runtime UI dependency was added; new dependencies are test-only.
The two remaining lint warnings are the pre-existing Date-in-render in App.tsx and
saved-demo-state effect in Interactive.tsx, left outside this integration's behavior.

## Complete file inventory

### New application and configuration files

- src/application/api.ts — centralized transport/session/rotation/storage.
- src/application/types.ts — API contracts and navigation/form choices.
- src/application/navigation.tsx — history navigation, path hook, app branding.
- src/application/ui.tsx — accessible fields, forms, notices, keyed loads/cursors.
- src/application/auth.tsx — provider, tenant picker, auth/recovery/invitation UI.
- src/application/Root.tsx — route composition, role shell/overview/profile.
- src/application/accounts.tsx — accounts, invitations and industry version UI.
- src/application/merchant.tsx — merchant/branch/destination/funnel/link/QR UI.
- src/application/feedback.tsx — inbox, filters/pages/details/history/statistics.
- src/application/public.tsx — independent public options and structured form.
- src/application/live.css — isolated responsive application/customer styles.
- .env.example — public API URL example only, no production variable change.
- vitest.config.ts — local-only jsdom component/client test configuration.
- playwright.config.ts — Chrome local browser configuration.
- scripts/browser-tests.mjs — owned in-process local Vite/browser test lifecycle.

### New test files

- test/frontend/setup.ts — isolated DOM/storage/object-URL test setup.
- test/frontend/fixtures.ts — synthetic typed API fixtures, no runtime mock data.
- test/frontend/api.test.ts — API/session/refresh/error/security tests.
- test/frontend/public.test.tsx — clinic form, independent options, retry/privacy.
- test/frontend/navigation.test.ts — role navigation/hierarchy/workflow choices.
- test/browser/app.spec.ts — seven user journey/mobile browser scenarios.
- test/frontend-server.test.mjs — production SPA/security-header smoke check.

### Existing files modified

- src/main.tsx — mount route-aware Root.
- src/App.tsx — sign-in link and invited-access FAQ; existing design/demo preserved.
- package.json — frontend unit/browser/server/typecheck commands and test tools.
- package-lock.json — locked test dependencies and compatible advisory patch.
- .gitignore — ignore generated local frontend test artifacts.
- server.mjs — production static-server browser security headers.
- backend/src/funnels/service.ts — optional validated web origin/public-page bridge.
- backend/src/funnels/routes.ts — HTML-only fixed-origin redirect and Vary:Accept.
- backend/src/server.ts — optional PUBLIC_WEB_ORIGIN runtime wiring.
- backend/test/funnels.integration.mjs — bridge/no-redirect/JSON regression checks.
- README.md — live application guide and validation pointers.
- backend/docs/database-architecture.md — Task 10 integration status note.
- backend/docs/funnels-api.md — trusted browser bridge versus JSON contract.

### New documentation

- docs/frontend-integration.md — configuration, routes, flows, session policy, limits.
- docs/frontend-implementation-report.md — this implementation/test/security inventory.

## Unfinished/external capabilities

No subscription/usage read endpoints or payments were invented. Initial admin
bootstrap, production schema rollout, SMTP verification, Google listing ownership,
provider proxy/shared rate limiting, DB grants/backups/retention and live deployment
remain separate operator tasks. Large-account picker pagination/search and channel
draft discovery are limited by the current first-page UI/API contracts described
in the guide. A real staging full-stack walkthrough is still required before public
rollout; local fixture browser tests plus independent real-DB backend tests do not
establish that Hostinger DNS/CORS/HTTPS/environment configuration is correct.
