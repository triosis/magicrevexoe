# Task 09 feedback security and privacy report

Implementation contract: [feedback-api.md](feedback-api.md).
Actual tests/inventory: [feedback-implementation-report.md](feedback-implementation-report.md).
No production connection, migration, secret/configuration update or frontend change.

## Submission boundary

The service reuses FunnelService's exact public validation in a single transaction:
strict short code, active unexpired link, active branch/channel/destination, published
immutable version and active typed ancestor chain. A write lock on the existing
platform root serializes admission with the existing manager suspension/configuration
guard and concurrent duplicate submissions. Ownership and version IDs come only
from the validated stored projection; there are no public tenant/branch selectors.

Strict Zod allowlists run in the route and submission service. Ratings are integers
1-5; optional dimensions must occur in the pinned channel configuration. All current
channels are structured-only. No patient/customer registration, notes, medical,
contact, narrative, attachment or arbitrary answer fields were introduced. Rejecting
unknown fields avoids silently discarding medical content while pretending it was
accepted. Existing DB ownership/composite FKs and rating/immutability CHECKs/triggers
remain unchanged.

Tokens use domain-separated HMAC-SHA-256 derived from the existing validated auth
key, timing-safe signature comparison, bounded canonical signatures and strict
claims. Payloads contain public code/revision, random nonce and 15-minute expiry,
not tenant IDs. They do not authenticate an admin or customer and cannot be used
as JWTs (separate key/domain and format). Tokens are only returned in no-store
JSON and sent in bodies. Only SHA-256 token digests are persisted.

Database uniqueness plus serialized transactions provides per-form duplicate
protection: identical retries return the existing random confirmation; changed
answers conflict. Token expiry, link revision and active states are rechecked
before retries too. This does not identify unique people or stop a visitor from
requesting another form. There is no fingerprinting or claim of bot-proof admission.

Feedback creation, optional current-subscription usage/counter updates and success
audit commit together. Audit/accounting failure rolls everything back. Usage cannot
silently create/reset a missing initialized counter. Without a current subscription,
feedback/audit rows measure submissions without fictitious billing records. Quota
enforcement and billing activation remain separate tasks.

## Management boundary

Existing authenticated transaction guards recheck active user, verified email,
authentication version, live session, membership and current role permissions.
Selected tenant IDs in access claims are insufficient authority. All list/count/
detail/status SQL is constrained by the actor's actual recursive subtree and
effective ancestor state. Explicit merchant/branch filters are scoped selectors,
not ownership grants; branch/merchant disagreement is rejected. IDs remain strings.
Parameters are bound through mysql2; user-controlled sorting/SQL is not accepted.

The explicit selected-platform path permits Super Admin's platform-wide active
scope. Resellers cannot see peer-reseller or platform-direct merchant feedback;
sub-resellers cannot see sibling branches/merchants. Merchant isolation is tested.
Collections exclude suspended subtrees; archived branch history is retained for
authorized management while public submission is denied. Read permission does not
grant status permission. Seeded merchant_staff legitimately has both permissions;
tests add a synthetic read-only role solely in disposable fixtures to prove denial.

Status writes use a fixed transition/reason matrix, optimistic lockVersion and
owner-bound updates. Status/history/audit commit together. DB triggers preserve
customer answers/source identifiers, and append-only events reject modification.
There is no public status or feedback-content lookup capability. No administrative
notes or assignment API is smuggled into status updates.

## Data minimization and compliance

Public confirmation exposes a random reference only; authenticated projection
omits token digests and actor identities. Public analytics still cannot read
individual feedback. Audit metadata contains fixed identifiers/status codes and
no ratings or request bodies. No IP/user agent/contact data is added to feedback,
usage or permanent events. Application errors use existing fixed safe messages.
Tests capture error logging during injected failures and reject token/body leakage.
Reverse-proxy/provider request logging is outside this code; verify it does not
capture request bodies or access tokens before public rollout.

Google/private options remain independent of ratings, feedback state or billing
admission. Low ratings and failed private accounting do not suppress Google. Clinic
fields stay structured service ratings; structured clinic context may still be
sensitive. This implementation does not assert legal/privacy compliance by itself.
Define retention, authorized access reviews, encrypted backups/restoration and
jurisdictional obligations before rollout. No retention/purge endpoint is added.

## Remaining operational limits

- Keep auth keys synchronized across replicas, clocks synchronized and HTTPS/CORS
  correctly configured. Rotating the auth key invalidates pending feedback forms.
- Verify least-privilege runtime grants for feedback, counters, append-only usage
  and audit tables, MariaDB provider behavior and existing data before deployment.
- Configure shared/trusted edge limits; current hashed in-memory limits are bounded
  but process-local. With trust proxy disabled, a reverse proxy can collapse users
  to one IP bucket. Do not trust arbitrary X-Forwarded-For as a workaround.
- Root locking is conservative and may constrain throughput; load test before
  optimization. Direct privileged DBA writes are outside the service lock contract.
- Plans with current subscriptions need correctly preinitialized counters. No quota
  enforcement, subscription creation, commercial grace policy or retroactive usage
  reconciliation was implemented.
- The backend submission journey now works; customer-facing rendering remains a
  future frontend task. No AI, SMTP operational claim or Google ownership check.
