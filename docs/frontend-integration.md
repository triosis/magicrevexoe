# MagicReview AI application guide

Task 13 now enforces the five existing quotas at service transaction boundaries.
See [current quota contract](../backend/docs/quotas-api.md). Earlier no-enforcement/pre-billing notes
are historical; merchant subscription/counters must precede first admin acceptance
and metered resources. Google remains independent; no production change.

Task 12 adds separate real-stack verification: `npm run test:e2e:real` uses actual
React/Express/MariaDB and real browser/HTTP requests, without local API mocks.
See [integration report](e2e-integration-report.md), [browser setup/results](e2e-browser-report.md)
and [security verification](e2e-security-report.md). Local results do not establish
Hostinger/SMTP/Google deployment readiness.

Task 10 implements the React application against the existing APIs. No production
connection, migration or environment change was performed. Test evidence and all
changed files: [frontend-implementation-report.md](frontend-implementation-report.md).

## Configuration and running locally

The frontend and backend remain independent npm packages. Install them separately:

```text
npm ci
npm --prefix backend ci
```

Copy the public-only root `.env.example` when configuring your own environment.
For a local development backend set `VITE_API_URL=http://127.0.0.1:3001/api/v1` in
an uncommitted local file. The intended HTTPS deployment value is
`https://api.revexoe.com/api/v1`. This is a public build-time setting, never a place
for database, JWT or SMTP credentials. Changing it requires a new frontend build.
Missing/invalid configuration shows a safe application error without preventing
the landing page from rendering. No default production API connection is made.

Run `npm run dev` and your separately configured local `npm run dev:api`. The
backend's existing CORS allowlist must allow the frontend's exact origin. Do not
point local investigation/tests at Hostinger production. This task does not create
or bootstrap an administrator, execute migrations or configure SMTP.

Production commands remain `npm run build` then `npm start`; the Express static
server supports deep links and adds CSP, no-referrer and nosniff headers. If using
different static hosting, supply equivalent SPA fallbacks and security headers.
The frontend server deliberately does not masquerade as the backend `/api/v1`.

## Routes and live features

| Route | Experience |
| --- | --- |
| `/` | Preserved landing, isolated labelled sample demo/pricing and a new sign-in link |
| `/login` | Invited-account sign-in, generic errors, current-session continuation |
| `/forgot-password` | Generic recovery request; service failures remain explicit |
| `/reset-password#token=...` | Single-use reset, then sign-in |
| `/accept-invitation#token=...` | Single-use invitation acceptance; existing identities use their current password |
| `/recover#token=...&purpose=invite` | Compatibility entry for a single configured email recovery page; other purpose uses reset |
| `/app` | Current role overview and authorized feedback statistics |
| `/app/accounts` | Authorized accounts, parent/child provisioning, merchant onboarding entry, names/status, invitations, descendants and recent history |
| `/app/channels` | Active industry catalog, published versions; platform-only draft creation/publication |
| `/app/business` | Current merchant profile, setup checks, branches, destinations, links and QR assets |
| `/app/merchants/:id` | Parent administrator's authorized merchant workspace |
| `/app/feedback` | Scoped inbox, filters/pagination/statistics, detail/history and status workflow |
| `/app/profile` | Current identity/role and workspace selection |
| `/r/:code` | Anonymous customer page and structured private form |

Navigation uses permissions returned by `/auth/me`; selected membership is sent
to the existing selection API, not trusted as an authorization grant. Main content
remounts on workspace/path changes, and keyed loads discard stale results. Inactive
or unrelated scopes produce backend errors, not fallback demo data. Super Admin,
Reseller, Sub-Reseller and Merchant use the same scoped API foundation with the
appropriate navigation/actions. Customers never receive administrative memberships.

Account creation options follow the five permitted edges. Eligible parent choices
come from the authorized account page; choose another page if its parent is not
listed. Merchant industry is selected only at creation and remains read-only later.
Invitations display the actual result: provider acceptance is not confirmed delivery;
delivery failure is distinct from a saved account and can be resent where permitted.

## Session policy

The centralized API client uses Bearer headers, `credentials:omit`, explicit JSON
Accept headers and a configurable base. Access tokens live only in memory. A refresh
token and selected membership identifier are kept in **tab-scoped sessionStorage**
to support reload restoration; no token, profile, role, password or private feedback
is written to localStorage. Blocked storage falls back to memory-only sign-in.
Logout clears tab state even when remote revocation cannot be confirmed and reports
that condition. Password reset clears the local session.

Concurrent expiry/restore calls share one rotation promise. A rotated refresh token
is saved before tenant reselection; the server revalidates that selection. Revoked
selection falls back to an unselected session for choosing another active account.
401 recovery retries the original authenticated request only once. Failed/ambiguous
refresh requests are never automatically resubmitted, because replay can revoke the
family. A generation guard prevents a late rotation from restoring a cleared session.

sessionStorage is readable by same-origin JavaScript; it is a deliberate residual
XSS risk, not HttpOnly protection. The production server restricts scripts to self,
uses no third-party runtime scripts and prevents embedding. Review same-origin
content, headers, dependencies and CSP before deployment. This client coordinates
requests within one tab, not duplicated tabs sharing a copied refresh token. Sign
in separately in another tab; replay fails closed through the backend. There is
no cross-tab persistence or automatic recovery that bypasses replay detection.

Recovery/invitation fragments are captured in component memory then removed from
browser history before the user submits. Tokens are never sent as query strings or
rendered into links/logs. No frontend secret or password hashing implementation was
added. MFA remains unimplemented and is identified for platform administrators.

## Merchant onboarding and collection

1. An authorized parent creates a Merchant, selects an active industry and invites
   the derived administrator. The saved account links to its business workspace.
2. Review/update the business name and server-computed setup checks. Invitation
   acceptance and published channel availability can remain incomplete honestly.
3. Create the first branch using an ASCII code, business address and IANA timezone.
4. Add its Google Place ID. The server constructs and validates the destination;
   this UI does not verify ownership or fetch arbitrary Google URLs.
5. Choose a published channel version and publish a branch funnel. If no version
   exists, a platform administrator can create/publish one in Industry channels.
6. Create the server-controlled short link, then generate SVG or PNG, preview the
   authenticated bytes and download the generated asset. Regeneration is explicit.

Funnel publication and link creation are separate API transactions. If link creation
fails after publication, the current tab retains the saved funnel ID and offers a
link-only retry. It never silently repeats account provisioning. On full reload a
saved immutable revision can remain without a link; publishing another revision
is explicit. QR errors leave the valid short link intact. Downloads fetch protected
bytes with Bearer authentication and use revocable blob URLs; object storage URLs
or client-generated QR payloads are never invented.

Branch editing/archive and destination enable/disable retain backend lockVersion
checks and active-link guards. Disable links before archiving or disabling their
destination. Conflicts show safe errors and current data can be reloaded. There
is no branch restore/delete API, no arbitrary ownership reassignment and no billing
or payment processing.

## Printed QR URLs and the customer page

Existing QR bytes continue to encode the backend's canonical
`PUBLIC_FUNNEL_ORIGIN/api/v1/public/funnels/:code` URL. To bridge a normal browser
to the React page, the backend now optionally accepts **PUBLIC_WEB_ORIGIN**, an
exact HTTPS frontend origin, for example `https://revexoe.com`.

An operator must configure/verify it separately; this task did not change any
production variable. With it set, an explicit HTML Accept request first validates
the active public funnel, then returns no-store **303** to the fixed frontend
`/r/:code`. No query/body/Host header selects the redirect origin. The response
varies on Accept. JSON requests (including this client) remain JSON. If the setting
is absent, the existing JSON behavior is unchanged. Invalid/disabled links never
redirect. API CORS and both DNS/HTTPS deployments still need operator verification.

The public page fetches only anonymous APIs. Google and private options have equal
visual treatment and stay available before rating, during private submission and
after confirmation. The destination must match the backend's canonical safe Google
URL. Unknown/unsafe form configuration fails the entire projection instead of
rendering a selectively available alternative. Google selection opens the controlled
URL independently of telemetry success; it is not labelled a completed review.

Only published integer rating fields are rendered for all channels. There are no
text/contact/medical inputs, including Clinic. The signed version token is sent
only in the feedback body. After the first attempt, ratings/token are held fixed
for duplicate-safe retry until confirmation or an explicit new form. Loading a
new form is a deliberate action after expiry/conflict/unknown outcome. No public
page reads administrative feedback, customer identities or subscriptions.

## Feedback and commercial boundaries

Feedback uses the existing scoped APIs for lists, details, statistics, dates
(inclusive start/exclusive end in UTC), branch/status filters and ID-cursor pages.
Status choices reflect the supported transition/reason matrix; the backend remains
authoritative and enforces permissions/CAS. No private notes, AI sentiment, generated
replies or customer contact collection were added.

Task 11 connects the merchant subscription area to the authenticated
subscription/usage APIs. It shows current configured plan terms/status/period,
live usage, limits and calculable remaining quota. Missing subscription, catalog,
counter or API results have explicit empty/unavailable/loading/error states.
Only authorized non-merchant managers see assignment, status and initialization
controls; the current seeded manager is Super Admin. Catalog selection displays
the first 100 published plans with a notice if more exist; subscription and recorded
usage history have cursor paging. No prices or quotas are invented. Current gauge
counts are live resources; recorded gauge history contains initialization snapshots,
not continuous lifecycle history. The UI states this limitation. No payment,
renewal automation or quota admission is added. See
[the API contract](../backend/docs/subscriptions-api.md) and
[Task 11 report](../backend/docs/subscriptions-implementation-report.md).
The landing's illustrative pricing/demo remains isolated from live API screens.

## Known limits

- No production deployment, administrator bootstrap, schema rollout, SMTP delivery
  verification, Google ownership verification or payment integration.
- Current account list is paginated; parent choices use that page. Descendants and
  recent account history display one API page. Branch lists and feedback inbox have
  paging; link/QR and branch-filter pickers display the first 100 records with
  explicit link/QR notices. Large-account navigation needs a searchable API picker.
- Channel draft create/publish is usable in the current tab. The backend has no
  draft-list endpoint; unsaved-tab draft discovery and channel retirement recovery
  still require the existing API/operator workflow.
- Safe but ambiguous non-idempotent network outcomes need checking current state
  before manual retry. Only public private-feedback submission has per-form server
  idempotency; the frontend does not invent transaction rollback across requests.
- Token storage remains tab-scoped/XSS-accessible; secure cookie migration would
  require an approved backend CSRF/CORS design. Provider proxy limits/retention,
  effective DB grants, synchronized keys/clocks and backups remain rollout gates.
