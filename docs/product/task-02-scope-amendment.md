# Task 02 scope amendment — separately preserved record

Recorded 2026-11-05 for the Task 20 audit. The owner instructed this audit to use
original SOW v1.0, Task 02 corrections and Task 20 together. This amendment does
not edit the original SOW or invent an approval for an unrecorded scope reduction.

## Source and provenance

The original SOW is [approved-scope-of-work-v1.md](approved-scope-of-work-v1.md),
downloaded through the owner's ChatGPT Library from **Pasted markdown(5).md**,
title **Application Scope of Work — AI Review QR SaaS Platform**, version
**1.0 — Full SOW**, prepared for Rainhopes, 16 September 2026. Download and repository
copy have identical SHA-256:
`212492f82241a9072b28f1b3aad9e86cdd55b6f2d19666a35855a5bdfaeb47d4`.
The owner supplied Library ID `file_0000000017488211a308dcf24b41447c`; the UI confirmed
filename/title/version/date. The download interface did not independently expose
that ID. No original text was reconstructed or rewritten.

Task 02's raw instruction artifact is absent from the repository. Its recorded
corrections are preserved in backend/docs/database-architecture.md, sections 1–2,
and database-compatibility-checklist.md. The following is a separate consolidation
of that record, not a claim to be a verbatim recovered Task 02 instruction.

## Recorded corrections applied by this implementation

| Correction | Effect on original SOW |
| --- | --- |
| Platform→Reseller→Sub-Reseller→Merchant, optional intermediary levels | Permit Platform→Merchant and Reseller→Merchant as well as Sub-Reseller→Merchant; no artificial intermediate tenants |
| Single tenants parent tree and fixed maximum hierarchy depth | Replace arbitrary-depth reseller identifiers/duplicate relationships with actual typed parent links; no reparenting API |
| Merchant-owned subscriptions | Subscription ownership is always the merchant, regardless of acquisition path |
| Commissions, reseller wallets, payouts and wholesale billing deferred | Original Modules 1.5, 2.4, 10.3–10.4 do not authorize these features in current Phase 1 |
| One industry per merchant; branches inherit | No mixed-industry branch or merchant channel-transfer feature |
| Anonymous structured feedback; no customer account | No customer identity/contact capture, patient narrative, medical fields or free-text feedback in current implementation |
| MariaDB 11.8.9/Express/React implementation baseline | Composite FKs and query authorization replace the original proposed PostgreSQL/RLS design; never claim MariaDB provides SELECT row-level security |
| No invented commercial terms | Original proposed plan grid is retained as source history, not auto-seeded into current schema. Explicit owner approval and versioned provisioning are still required |

## Conflicts that are not silently declared resolved

The architecture record also excludes AI drafts/replies/Google OAuth/import, whereas
original SOW section 6 expressly includes Phase 1 AI drafts in English, Hindi and
Malayalam and section 4 includes GBP onboarding. Later task restrictions prohibit
payment integration, while original Phase 1 names Razorpay. Preserve these as
**scope reconciliation required / functionality absent**, not as completed features
or an invented signed deferral. The owner must approve a revised acceptance scope
or commission the remaining work. No AI, gateway, OAuth, billing or new feature is
implemented as part of this final audit.

The SOW itself conflicts on launch channels (five in Module 8.2 versus three in
Phase 1) and launch languages (11 in Module 5.2 versus three in Phase 1). The matrix
uses the explicit roadmap for phase allocation and records the inconsistency.
Phases 2–4 stay deferred; already implemented hierarchy/branches do not imply their
other phase features are complete. Policy/legal/competitor statements in the
original are historical source claims, not independently verified audit findings.
