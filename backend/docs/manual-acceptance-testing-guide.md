# Owner manual acceptance guide — Task 20

Prepared 2026-11-05. This guide covers the **implemented subset**, not approval of
the full original SOW or a production deployment. Overall verdict remains
APPLICATION INCOMPLETE — DEVELOPMENT WORK REMAINS. Use the traceability matrix for
missing requirements and scope decisions. Never use Hostinger/production for this
guide without separate future authorization.

## Entry conditions and evidence sheet

A developer/QA operator must prepare a persistent isolated acceptance environment:
actual React frontend, Express API and disposable MariaDB 11.8.9, full 67 migrations,
synthetic accounts in all three merchant paths, published structured channel and a
clearly synthetic approved test plan with explicit limits. No real customer data.
The application has **no shipped secure platform bootstrap or plan-authoring API**.
Do not tell an owner to sign into an empty database or create secret defaults.
Review a controlled fixture/setup procedure before handing over credentials.

The existing `npm.cmd run test:e2e:real` proves this workflow with its own ephemeral
fixtures and then shuts everything down. It is a test command, not a persistent
manual-acceptance server or production bootstrap. Reuse its documented fixture
relationships only in a reviewed local QA setup; never bypass guards or repoint it
at an existing server. Use protected transient test credentials and a local mail
sink. Capture invitation links through that sink; don't send external test mail.

Set MARIADB_TEST_BIN to the installed local Windows ZIP bin for automated tests.
For normal frontend/backend start/build instructions use production-environment-reference.md
and ../../docs/frontend-integration.md with **local QA targets**. Never load ignored
production env files. Local self-signed HTTPS needs an independently trusted local
test CA; the automated harness's isolated certificate exception is not deployment
guidance. Keep production certificate verification enabled.

Record for each case: ID, tester, date, commit, local environment identifier,
browser/device/viewport, expected result, actual result, pass/fail/blocked and issue
reference. Screenshots must exclude passwords, tokens, MFA QR/seeds/recovery codes
and invitation URLs. Record API status/error code and safe resource identifiers,
not raw credentials, feedback bodies or database dumps. A blocked case is not a pass.

## Acceptance cases

| ID | Steps | Expected result / evidence |
| --- | --- | --- |
| M01 | Open landing, pricing and demo; then Sign in | No invented commercial prices, discounts or allowances. AI/Google-import/NFC demo is explicitly disconnected. Sign in opens actual login, not demo workspace |
| M02 | Super Admin submits wrong password, then correct password | Wrong password generic. Correct password yields MFA/enrollment challenge; no privileged workspace access before factor completion |
| M03 | Enroll authenticator through private QR; try invalid then valid code | Invalid code rejected; valid activation displays one-time recovery codes. Store privately; don't include in test evidence. Platform opens only after MFA |
| M04 | Sign out; repeat login with TOTP, then one recovery code; retry used code | Login requires factor each time; recovery code works once; reuse rejected. Persistent limits tested with synthetic account only, not operator lockout |
| M05 | Exercise secure recovery-code regeneration/disable through documented API with password + factor | Unauthorized/wrong reauthentication denied; successful change revokes sessions and old codes; disable requires enrollment next login. These actions have no profile UI; API coverage does not imply one |
| M06 | Super Admin creates Reseller; local recipient accepts invitation; reseller logs in | Reseller appears under platform; invitation removed from URL fragment after consumption; actual scoped workspace opens |
| M07 | Reseller creates Sub-Reseller; invitation acceptance/login | Only permitted parent/child choices; sub-reseller cannot create another sub-reseller or peer reseller |
| M08 | Sub-Reseller creates Merchant and chooses one active industry | Merchant is owned by the real sub-reseller; no fake intermediary; first admin is pending |
| M09 | Before merchant invitation acceptance, attempt it with no subscription; then have Super Admin assign published QA plan/current period | Missing subscription/seat quota fails without consuming invite token. Plan assignment initializes exact current counters. Authorized retry of invitation succeeds once. No commercial payment occurs |
| M10 | Repeat merchant provisioning directly under Platform and directly under Reseller | Both paths work; reseller sees its own merchant and cannot see platform-direct peer; subscriptions always merchant-owned |
| M11 | Merchant opens Business & branches, edits name and reads setup checks | Real API data. Stale version conflicts rather than overwriting. Checks explicitly separate business setup from subscription/QR readiness. Industry is immutable |
| M12 | Create branch with code/timezone, edit it, submit duplicate code | Valid branch persists; bad timezone/duplicate fails safely; no extra quota charge after failure |
| M13 | Enter an authorized test business Google Place ID; attempt arbitrary URL through API | Server constructs only canonical Google URL; unsafe/extra redirect rejected. This is not proof of Google ownership. Never post fabricated public reviews |
| M14 | Platform publishes structured industry version; branch publishes funnel, creates short link and generates SVG and PNG | Published content immutable; both assets preview and download; QR encodes the server public URL; retries do not consume duplicate quota |
| M15 | Open printed QR short URL in desktop browser and 390×844 mobile viewport | HTML redirect opens actual /r/:code page; business/branch only, no private IDs, quotas or administrative data. No page-wide horizontal overflow; tables may scroll within their container |
| M16 | Open private form, choose rating 1, submit; separately choose Google | Both options remain visible and independent before/after low rating and private submission. No rating-based redirection or gate. Google opens a separate safe tab. Verify only navigation; no synthetic review posting |
| M17 | Inspect Clinic form and submit unsupported fields via API | Structured 1–5 service ratings only. No name/contact/text/medical fields. Unknown fields fail; no optional narrative input or compliance override |
| M18 | Double submit/retry same signed form; then modify answers using same token | Same exact request returns original confirmation and one stored feedback/charge; changed reuse conflicts. A lost network response must not prompt an unkeyed duplicate write |
| M19 | Merchant opens feedback inbox, date/branch/status filters, details and statistics | Real feedback/mean/counts; loading, safe error/retry and empty states. No Google review import or demo analytics mixed into inbox |
| M20 | Move feedback new→in progress→resolved; submit stale status concurrently | Exactly one permitted transition/event/audit per version; stale request conflicts. Current terminal alternative is dismissed, not original SOW archived; record scope reconciliation |
| M21 | Open subscription/usage; compare all five known metrics and recorded history before/after branch/link/QR/feedback activity | Configured limits only. Finite remaining = max(limit-used,0). Explicit unlimited labelled configured. Feedback is period ledger; resource gauges are live counts. Historical gauge records are snapshots/reconciliations, not precise lifecycle timings |
| M22 | Test exact finite boundary and one beyond with parallel requests | Boundary succeeds; beyond returns structured quota error with no partial resource/audit or extra charge. No Super Admin bypass. Do not invent a merchant-count or AI/scan metric |
| M23 | In controlled fixtures only: missing counter/limit, expired/canceled/past_due subscription, suspended ancestor | New consumption fails closed; missing never means unlimited. History persists. Google remains independent when only private quota is unavailable; disabled/suspended funnels remain unavailable |
| M24 | Merchant/staff/peer tenant submits foreign IDs or administrative plan/status writes | Denied 401/403/404 as applicable without foreign data. Staff lacks management; merchant cannot assign its own plan/quotas. Parent sees only permitted descendants |
| M25 | Disable short link, archive eligible branch and try old QR/public URL | Unavailable; no new anonymous submission. Historical private feedback retained. Archive requires active links disabled first |
| M26 | Logout and reuse old access/refresh; exercise refresh replay in a separate QA case | Revocation enforced; replay revokes family. Frontend clears tab storage. Do not test by copying real operator tokens |
| M27 | Force local API outage, empty list and failed save; reload/switch workspace | Loading ends, safe error and retry shown, no optimistic success; empty state honest; previous tenant data removed |
| M28 | Repeat login/accounts/business/QR/feedback/subscription/public cases at desktop 1440×1000 and mobile 390×844 | Usable labels/actions, visible independent options, navigation and contained scroll; keyboard focus and zoom checks. Chrome local coverage alone is not full WCAG/cross-browser approval |
| M29 | DBA runs approved local migration preflight + restricted runtime negatives, then backup/actual fresh restore | Exact schema/checksums/grants; preserved 26 tables/35 triggers/36 FKs/34 CHECKs/ledger; restored MFA/feedback/usage work. Wrong key/corrupt/incomplete archive rejected. Never call source checksum alone a restore |

## Not available for acceptance as working features

AI drafts/translations, GBP OAuth/import/replies, payment/invoices/renewal, ToS
acceptance/retention UI, full compliance/analytics/export, branch-manager scoping,
white-label domains, physical NFC/fulfillment and later roadmap tools are absent
or partial as mapped. Do not substitute the labelled landing demo. An owner scope
decision may defer a requirement, but a tester cannot mark it passed because it
was not exercised. Provider TLS/grants/mailbox/DNS/secret rotation/off-site restore
belong to a separately authorized acceptance plan; none were externally verified.
