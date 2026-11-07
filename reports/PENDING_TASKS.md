# Pending tasks

2026-11-07. No production activity authorized or performed by this audit.

| Priority | Exact remaining task | Owner / completion evidence |
| --- | --- | --- |
| P0 | Recover/provision valid AUTH_ACCESS_SECRET and matching existing AUTH_MFA_KEY; provide approved DB CA path/hash | Security operator, protected custody; successful validation without secret disclosure; never silently replace existing MFA key |
| P0 | Resolve 127.0.0.1 verified-TLS dependency | Hostinger must confirm supported TLS DNS endpoint matching certificate, trusted CA bundle, file-byte hash and network access. If unavailable, review hosting/database design; no IP/hostname-verification bypass |
| P0 | Verify actual runtime target/account and least privileges | DB operator, independent application DML profile, exact existing schema/version/manifest; no production migration authorized here |
| P0 | Establish real process/ingress startup | Hosting operator confirms Node24/native Argon2, prebuilt dist/server.js, working directory, assigned PORT, HOST, probe semantics. Capture listening/liveness/readiness evidence after security configuration |
| P1 | Complete SMTP and externally verify TLS/auth/inbox/sender DNS | Owner/provider config, explicit no-mail diagnostic then separately authorized synthetic delivery |
| P1 | Separate startup liveness from readiness | Provider supports proper probe path/deadline/grace; /ready may take four seconds; route traffic only when ready |
| P1 | Approve financial policy/catalog before future enablement | Owner plus finance/accounting: prices/capacities, scans/overages/settlement, billing identity/place of supply, invoice numbering, refunds/credit notes/dunning. Current hold remains |
| P1 | Supply legal/privacy/retention/authentication amendment | Owner/legal; no invented consent/terms/period/deletion guarantee or replacement login policy |
| P1 | Implement Google connector/import once prerequisites approved | Development plus owner: OAuth consent/project/scopes/callback/access/privacy; separately authorized real API verification |
| P1 | Complete approved keyword recommendations and real AI evaluation | Define data/entitlements/usage treatment; owner-approved provider/model, factual/clinical/language/latency tests |
| P1 | Shared rate limits/proxy/edge and capacity/accessibility acceptance | Approved topology, client-IP trust, distributed state, field device/native-language/WCAG/P95 evidence; do not blindly enable trust proxy |
| P1 | Provider backup/restore/key custody/restart/draining/monitoring acceptance | Security/DB/hosting operators, approved RPO/RTO and actual isolated restore; existing executor is local-only |
| P2 | Durable mail outbox/alerts and reconciliation operations | Separate design for ambiguous delivery and explicit resend; never arbitrary duplicate retries |
| P2 | Review browser token storage and CSP hardening | Preserve API/session semantics; threat-model XSS and frontend changes with targeted tests |
| P3 | Later approved phases | White-label, hardware, broader languages/advanced AI/analytics/builders/mobile; commissions/wallets/payouts stay deferred |

Current backend startup has no unnecessary DB wait to remove. Adding health aliases
and safe diagnostics does not supply missing trust material or production secrets,
and does not establish that Hostinger deployment succeeds.
