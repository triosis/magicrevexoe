# QR, short links and public funnel API

Task 13 now enforces the five existing quotas at service transaction boundaries.
See [current quota contract](quotas-api.md). Earlier no-enforcement/pre-billing notes
are historical; merchant subscription/counters must precede first admin acceptance
and metered resources. Google remains independent; no production change.

Task 10 implements the React customer page at `/r/:code` and adds an optional
trusted browser bridge. See [frontend integration](../../docs/frontend-integration.md).
Earlier absence-of-frontend notes below describe the historical task scope.

Task 09 adds [private feedback APIs](feedback-api.md). Public projection now
advertises submissionAvailable=true, a submissionUrl and a signed 15-minute form
token. QR URLs remain backend JSON URLs. No frontend page is implemented.

Task 08, 2026-11-04. Prefix `/api/v1`. This is a backend JSON API; no frontend
page, Google ownership verification, SMTP verification or production deployment
is included. See [funnels-implementation-report.md](funnels-implementation-report.md).

## Configuration and workflow

The operator must supply `PUBLIC_FUNNEL_ORIGIN`, an exact HTTPS origin without a
trailing slash, path, credentials, query or fragment, for example
`https://api.example.invalid`. No production value or secret file was changed.
Invalid supplied configuration fails validation. If absent, existing health/auth
and public resolution still work with configured auth, but link creation and QR
URL operations return 503. URLs are never derived from Host/forwarded headers.

The QR encodes precisely
`<PUBLIC_FUNNEL_ORIGIN>/api/v1/public/funnels/<random-code>`. JSON requests remain
JSON. When the operator supplies PUBLIC_WEB_ORIGIN as an exact HTTPS frontend
origin, explicit HTML browser requests validate the same active funnel and return
303 to that fixed origin's `/r/:code`. The response is no-store and Vary:Accept;
invalid links never redirect. No request/Host/query can choose another destination.
If unset, original JSON behavior is retained. The operator must separately verify
both DNS/HTTPS deployments, API CORS and frontend routing. Printed QR bytes/URLs
are not rewritten and no production environment was modified by Task 10.

Workflow: publish a channel version using the platform channel API; create an
active branch and canonical Google destination; publish a branch funnel; create
a short link bound to that revision; generate SVG/PNG for that link. All three
seeded industry channels follow the same workflow. No sample channel versions,
businesses, customers, passwords or production URLs are seeded by this task.

## Authenticated endpoints

Send the existing selected-membership Bearer access token. IDs/cursors are decimal
strings; lockVersion is a positive integer. Input objects are strict allowlists.
All write results and success audits share one transaction. Reads are scoped to
the selected account and actual descendants. Inactive ancestry or archived branch
blocks access. Merchant staff have read access through tenant.read, not write
authority. Platform actions require explicit platform scope, not an omitted WHERE.

| Method / path | Input | Authority / output |
| --- | --- | --- |
| POST `/branches/:id/funnels` | `{channelVersionId,brandTitle,accentHex,locale:"en"}` | funnel.manage; 201 `{id,revision,status}` |
| POST `/branches/:id/short-links` | `{funnelId}` | funnel.manage; 201 short-link metadata/publicUrl |
| GET `/branches/:id/short-links` | Query `{afterId?,limit?}` | tenant.read; `{shortLinks,nextCursor}` |
| POST `/short-links/:id/disable` | `{lockVersion}` | funnel.manage; disabled state/version |
| POST `/branches/:id/qr` | `{shortLinkId,format?:"svg"|"png",regenerate?:boolean}` | qr.manage; 200 QR metadata |
| GET `/branches/:id/qr` | Query `{afterId?,limit?}` | tenant.read; `{qrAssets,nextCursor}` |
| GET `/qr-assets/:id/content` | None | tenant.read; authenticated SVG/PNG attachment |

Pagination defaults to 50 and bounds limit to 1-100. Brand title is 1-120 trimmed
characters; accent is exactly a six-digit hex color. Only `en` locale is supported
at present. No raw HTML, CSS, JSON settings, gating flag or arbitrary locale string
is accepted. Render public strings as text in a future UI.

Publication validates the same-merchant/branch destination, matching industry,
published channel version and active channel. It assigns the next branch revision
under the existing serialized write guard and directly publishes an immutable
configuration. Published rows are never edited. A new publication does not retarget
existing links: each remains pinned to exactly one published revision. No version
retirement/retargeting API is added here.

Codes use `crypto.randomBytes(16)` encoded as 22 base64url characters: 128 random
bits, globally unique in the database with bounded collision retries. Code/tenant/
branch/status/redirect fields cannot be supplied by the caller. Links have no
expiry setter in this API, but stored expirations are enforced. Disable requires
the latest lockVersion, is irreversible through this API and never recycles codes.
One disabled link does not disable other links for that branch.

QR generation requires an active link with a valid published funnel. Only its
public URL is encoded, with a four-module quiet zone and medium error correction.
SVG and PNG (512-pixel width target) use trusted qrcode output, not uploaded SVG.
Metadata stores a tenant-prefixed opaque virtual object key and SHA-256 digest.
No private database identifier, credential, auth token or direct Google URL is
encoded in the QR.

Bytes are deterministically rendered on demand, not persisted to a filesystem or
claimed to exist in an object store. Content downloads reauthorize ownership and
active state, regenerate bytes and verify the stored digest. They return no-store,
nosniff and attachment headers. The content URL requires Bearer authentication;
it is not a public storage capability. Object keys never appear in responses.

Repeating generation without regenerate returns the existing matching ready asset;
regenerate=true re-renders the same URL and atomically updates metadata/audit.
Unique ownership/link/format keys prevent duplicate assets. Library/origin drift
that changes bytes returns 409 until an authorized regeneration. SVG/PNG bytes
are computed outside write locks; state/ownership is rechecked before metadata
commit. There is no external storage write to orphan on transaction rollback.

## Public endpoints

No login, tenant selector or customer identity is needed.

| Method / path | Input | Output |
| --- | --- | --- |
| GET `/public/funnels/:code` | No query parameters | Safe published projection, records a view event |
| POST `/public/funnels/:code/events` | `{event:"google_option_selected"}` or `{event:"private_feedback_option_selected"}` | `{recorded:true}` |

Only exactly 22 URL-safe code characters are accepted. Invalid, unknown, expired,
disabled, archived, suspended or otherwise unavailable configurations return the
same 404 `{"error":"Funnel unavailable"}`. No Location header is produced.
Database/internal failures use the existing safe 500 path, never driver details.
This does not claim constant-time hiding of valid public links: valid links are
intentionally public capabilities. Random entropy, strict validation, no listing
endpoint and throttling address enumeration attempts.

The projection contains only:

- Merchant public business name, branch business name/address/timezone.
- Active industry code/name, published channel version number/title.
- Funnel revision, brand title, accent and locale.
- Google review label/canonical URL and private feedback label/structured fields;
  both have independent=true in the same response.
- Structured-only/medical-details-forbidden policy.

It excludes internal IDs, parent hierarchy, admin names/emails, place ID as a
separate database field, permissions, object keys, hashes and audit records. The
Google URL necessarily contains the public Google place identifier.

No rating, sentiment, previous action, plan or customer attribute is an input to
resolution. Both option-selection events are independently accepted and neither
requires the other. Unknown event fields (ratings, medical details, narrative,
arbitrary metadata) are rejected. The server does not redirect on event receipt or
claim that an outbound selection proves Google review completion.

Private form fields are the schema-approved overall rating (required) and optional
service/cleanliness/waiting-time ratings, integers 1-5. Dimension labels come from
the pinned published channel configuration. Clinic has no text/contact/medical
fields; the same structured-only Phase 1 contract applies to the other channels.

Task 09 now implements POST `/public/funnels/:code/feedback`, with a signed
version-bound token issued by this projection and structured-only allowlisted
answers. `privateFeedback.submissionAvailable=true` declares backend availability;
see the feedback contract for token expiry, idempotency and accounting behavior.
Selection telemetry is still distinct from submitted feedback. The Google option
remains independently available. A public customer page remains future work.

## Events, concurrency and privacy

Minimum events use existing append-only audit_logs rather than inventing a usage
metric or storing personal analytics data. Actor fields are NULL for registered
system public actions; internal affected merchant/link ownership is stored only
in the audit row. Public safe_metadata is exactly `{}`. Actions:

- funnel.published, short_link.created, short_link.disabled.
- qr.generated, qr.regenerated (an idempotent existing-asset response adds no event).
- public.funnel_viewed, public.google_option_selected,
  public.private_feedback_option_selected.

No IP, user agent, fingerprint, referrer, body, medical detail or visitor ID is
stored in these events. Counts are request/selection counts, not unique people or
verified Google reviews. Client selection events are untrusted telemetry; repeat
requests may add events. No IP retention or deduplication identity is introduced.
Define retention and storage growth policy before public rollout.

Public resolution/state validation and its event insertion share one transaction.
Failure to insert an event fails the response; it is never silently reported as
recorded. A shared platform-root lock serializes public checks against the existing
root-locked administrative writes and suspensions. Authenticated writes use the
existing transaction/context guard. Direct DBA writes are outside this service
locking contract. Append-only trigger protections remain unchanged.

Public routes share a bounded per-process limiter: 120 requests per socket-derived
IP per 15 minutes plus 6,000 requests per process per minute. Keys are hashed in
memory; spoofed forwarding headers are ignored because trust proxy stays disabled.
429 includes Retry-After:900 (conservative for the global minute limit). A trusted
reverse-proxy deployment may collapse users to one socket IP; verify topology and
provide a trusted shared edge limiter before production scaling. Authenticated
funnel writes share a separate 30/user/15-minute limiter.

## Deployment limits

Existing auth signing configuration is required to construct this service; missing
service configuration yields a fixed 503. HTTPS/CORS deployment configuration,
restricted runtime grants, backup/restore, public rate limits and retention remain
operator verification gates. No production values were read or changed.
Subscription quotas/usage admission are intentionally not implemented in Task 08.
No Google ownership or SMTP operational claim is made.
