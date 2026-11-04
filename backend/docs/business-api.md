# Merchant, branch and industry channel API

Task 09 implements structured private feedback submission and management:
[feedback-api.md](feedback-api.md). Earlier task notes about absent submission
refer to historical scope; the customer-facing frontend remains separate work.

Task 08 adds branch funnel publication, short links, QR assets and public JSON
projection/events: [funnels-api.md](funnels-api.md). Task 07 absence/scope notes
below describe that earlier implementation; private submission remains future work.

Task 07, implemented locally on 2026-11-04. All paths below start with `/api/v1`.
No production deployment, migration, frontend integration or Google API call is
part of this implementation. See [business-implementation-report.md](business-implementation-report.md).

## Authentication and scope

Send JSON and `Authorization: Bearer <accessToken>` after selecting an active
membership through the existing auth API. Identity, membership, permissions and
actual ancestry are revalidated in each service transaction. Client merchant IDs
are selectors, never proof of ownership. BIGINT identifiers and pagination cursors
are decimal strings; clients must not convert them to JavaScript numbers.

Platform administrators use the explicit selected-platform path. Resellers can
manage their direct merchants and merchants under their own sub-resellers;
sub-resellers can manage their own merchant children. Merchant administrators
manage their merchant only. Merchant staff can read, but do not receive the seeded
management permissions. A suspended merchant or any suspended ancestor blocks
business access. Use the existing tenant APIs for authorized status restoration.

Read operations require `tenant.read`. Profile updates require `tenant.manage`,
branch writes `branch.manage`, and destination writes `destination.manage`.
Channel writes additionally require the explicit platform super-admin guard.
Responses use `Cache-Control: no-store`. CORS retains exact allowed origins,
Authorization/Content-Type and GET/HEAD/POST/PATCH/OPTIONS, with no cookies or
implicit credentials. Business writes are limited to 30 per authenticated user
per 15 minutes per application instance (bounded existing in-memory limiter).

## Merchant APIs

| Method and path | Body / result |
| --- | --- |
| POST `/merchants` | `{parentId,name,industryChannelCode,invitation:{email,displayName}}`; 201 provisioned merchant and invitation delivery result |
| GET `/merchants/:id` | Profile, immutable assigned industry channel and computed onboarding checks |
| PATCH `/merchants/:id` | `{name,lockVersion}`; updated name/version |

Onboarding delegates to the existing tenant provisioning transaction with
server-fixed `kind=merchant`. Parent type, ancestry, permissions and active channel
are checked there. Industry codes are `salon_spa`, `clinic_healthcare`,
`restaurant_cafe`. No role, owner, status or hierarchy field is accepted. Industry
assignment cannot be changed later because the existing immutable-ownership
schema prohibits it. General account suspension/reinstatement remains in
[tenants-api.md](tenants-api.md).

Invitation delivery uses the existing abstraction. Production writes require a
configured and verified SMTP adapter; no raw invitation token appears in the API
response or logs. Delivery occurs after commit and a failed send is reported
honestly, as documented in the tenant API. This task does not verify live SMTP.

Profile `onboarding.scope` is `merchant_business_setup`. `complete` requires an
active account/channel, an active verified merchant administrator with a password,
a published channel version and at least one active branch with a valid timezone
and active Google destination. `readyBranchCount` is a string. These are business
setup checks, not Google ownership verification or billing/funnel/QR readiness.
Inactive ancestry is rejected before profile access rather than reported ready.

## Industry channel APIs

| Method and path | Body / result |
| --- | --- |
| GET `/industry-channels` | `{channels:[...]}`; active catalog only |
| GET `/industry-channels/:id` | Channel details, including its status |
| GET `/industry-channels/:id/versions` | `{versions:[...]}`; published versions, descending version number |
| GET `/industry-channels/:id/versions/:versionId` | Same envelope with one published version; draft/unknown returns 404 |
| PATCH `/industry-channels/:id` | Platform only; `{name?,status?}` with at least one field; status active/retired |
| POST `/industry-channels/:id/versions` | Platform only; `{version,displayName,title}`; creates draft, 201 |
| PATCH `/industry-channels/:id/versions/:versionId` | Platform only; `{displayName?,title?}`; draft only |
| POST `/industry-channels/:id/versions/:versionId/publish` | Platform only; `{}`; publishes draft |

Catalog reads do not expose draft content. Create/update returns the authorized
platform draft directly; there is no general draft-list endpoint in this task.
Publication timestamps are server generated. Published versions cannot be edited,
including case-only changes, and are also protected by existing database triggers.
Retiring a channel prevents new onboarding, branch creation and version publication;
it does not mutate previously published content. Catalog/draft updates serialize
using the existing transaction guard; they are last-write-wins, without a schema
lock-version field. Version-number conflicts return 409.

Only title/display name can vary in version content. Google/private action labels
and structured service question labels are generated by the server. Arbitrary JSON,
HTML, medical questions, free text, gating flags and visibility switches are not
accepted. Future public UI must render both independent paths; this admin API
does not implement or certify that future UI.

## Branch APIs

| Method and path | Body / result |
| --- | --- |
| POST `/merchants/:id/branches` | `{code,name,timezone,address?}`; created branch, 201 |
| GET `/merchants/:id/branches` | Query `afterId?`, `limit?` (1-100, default 50); `{branches,nextCursor}` |
| GET `/branches/:id` | Scoped branch details |
| PATCH `/branches/:id` | `{lockVersion,code?,name?,timezone?,address?}`; at least one changed field |
| POST `/branches/:id/archive` | `{lockVersion}`; archived branch |

Codes use 1-64 ASCII letters/digits/underscore/hyphen and are unique per merchant.
Names are 1-160 trimmed characters, optional nullable address at most 500.
Timezone must be UTC or a supported IANA zone such as `Asia/Kolkata`; unknown zones,
offsets and abbreviations are rejected. ICU canonicalization may return an alias.
Branches inherit their merchant's channel; tenant/channel ownership fields are
never accepted in bodies. Lists include active and archived branches.

Updates/archive require the current numeric `lockVersion`; stale writes return
409. Archived branches retain history and cannot be edited or receive destination
writes. No branch restore/delete API is implemented. Archive is blocked while an
active, unexpired short link depends on the branch. Manage those links through a
separately implemented authorized workflow before archival; never bypass guards.

## Google review destinations

| Method and path | Body / result |
| --- | --- |
| POST `/branches/:id/review-destination` | `{placeId,reviewUrl?}`; one Google destination per branch, 201 |
| GET `/branches/:id/review-destination` | Scoped destination, including status/version |
| PATCH `/branches/:id/review-destination` | `{placeId,reviewUrl?,lockVersion}`; preserves current enabled/disabled state |
| POST `/branches/:id/review-destination/disable` | `{lockVersion}` |
| POST `/branches/:id/review-destination/enable` | `{lockVersion}` |

The server generates `https://search.google.com/local/writereview?placeid=<placeId>`.
Place IDs must contain 1-255 ASCII letters/digits/underscore/hyphen. If reviewUrl is
provided it must equal that canonical URL exactly. Arbitrary hosts, redirects,
fragments, extra query parameters, userinfo, unsafe protocols and mismatched IDs
are rejected. This validates safe syntax and association, not Google's existence,
ownership or listing eligibility; there is no outbound URL fetch or Google OAuth.

Duplicate creation and repeated state transitions return 409. Disabling is blocked
when active unexpired links use that destination, so this API cannot leave such a
funnel with only a private feedback path. Editing a destination is authorized and
audited; it intentionally changes the operational destination referenced by funnels.

## Errors and transaction semantics

Strict body/query allowlists reject unknown fields with 400. Missing/expired auth
returns 401; missing permission or suspended ancestry 403; inaccessible/unknown
resources 404; duplicate/version/lifecycle conflicts 409; limits 429. Missing auth
configuration returns 503 on these API prefixes. Raw driver errors stay private.

All writes and success audit events commit on one existing pool connection; audit
failure rolls back the resource mutation. Audit metadata records fixed change
flags and identifiers, not addresses, names, destination URLs, credentials or raw
payloads. Existing root-to-actor transaction locks serialize writes and suspension;
reads share locks. No new pool, loader, migration or schema change was introduced.

Subscription quota admission/usage accounting is not integrated into branch
creation in Task 07 and remains required before enforcing paid plan entitlements.
No public funnel, QR, feedback, billing or AI endpoint is implemented here.
