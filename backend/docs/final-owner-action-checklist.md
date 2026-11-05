# Final owner actions — Task 20

2026-11-05. Application incomplete against the full recovered SOW. Local implemented
workflows are available for assisted acceptance in a prepared isolated environment.
No production activity is authorized by this checklist.

## Before product acceptance

- [x] Recover original SOW v1.0 and copy exact source to docs/product/approved-scope-of-work-v1.md; preserve separate Task 02 amendment and source digest.
- [ ] Product owner reconciles original §6 Phase 1 AI drafts/English-Hindi-Malayalam, Razorpay/billing and onboarding with recorded exclusions/later task restrictions. Approve explicit amendments or authorize scoped remaining development; do not assume removal.
- [ ] Confirm accepted terminal feedback workflow: original Archived versus implemented Dismissed; decide whether API-only MFA maintenance and current limited dashboards meet acceptance.
- [ ] Resolve original branch-manager scope, ToS/compliance/retention, onboarding/branding/print, offline fallback and Phase 1 performance/accessibility gaps using the matrix. Roadmap Phase 2–4 features stay deferred.
- [ ] Approve a secure first-platform bootstrap and versioned plan provisioning/authoring procedure. Neither ships as an app workflow. Never hand out shared/default admin passwords or transplant synthetic E2E prices/limits.
- [ ] Approve actual commercial plan versions and all five represented limits independently; resource metrics differ from original scans/AI tokens. Do not silently translate them or invent prices.
- [ ] QA/developer prepares persistent isolated actual-stack environment and local mail sink with all three merchant paths. Existing E2E fixture shuts down automatically; it is not the owner acceptance server.
- [ ] Owner executes manual-acceptance-testing-guide.md, recording pass/fail/blocked with issue references, reviewed commit and secret-free evidence. Sign-off is on agreed scope, not a green aggregate test count.

## Before any separately authorized provider staging/release

- [ ] Security owner records credential/signing-key rotation/revocation evidence and old-session rejection; protect independent MFA/backup keys, recovery codes, clock synchronization and identity-recovery policy.
- [ ] DBA/provider proves MariaDB version/capabilities, exact target inventory, no conflicting history/data, effective restricted runtime/migration/backup grants including PUBLIC/roles and stable trigger definers.
- [ ] Operations validates trusted DNS identity/CA checksum/TLS cipher for runtime and migration clients. No IP or certificate-verification bypass; no insecure fallback if provider cannot meet requirements.
- [ ] Operations validates domain HTTPS/renewal, exact CORS/API/public origins, proxy headers, current patched Node 24/native Argon2, independent builds, graceful shutdown/restart and protected environment injection.
- [ ] Explicit SMTP verify command, then separately approved test recipient/inbox/SPF/DKIM/DMARC checks; plan for ambiguous sends without automated duplicate resend. Durable outbox, alerting and incident routing still absent.
- [ ] Product/merchant verifies actual Google listing/Place ID/ownership and solicitation policy. Navigation success alone does not prove ownership or posting.
- [ ] Backup owner proves provider complete export/import, independent encrypted off-site/versioned retention and key recovery, representative restore, approved RPO/RTO and named primary/backup incident operators.
- [ ] Security/operations implements shared ingress/client abuse controls and documented proxy trust; capacity/lock-wait/COUNT-SUM/N+1/public-audit storage budgets and protected monitoring/alerts need evidence.
- [ ] Privacy/legal owner approves notice/contact/DPA, retention/erasure and clinic-context policies; commission/wallet/payout deferral is retained. No audit document certifies legal compliance.
- [ ] DBA/release follows production-migration-runbook.md, restored-clone rehearsal, fresh non-mutating preflight, explicit target/approval/confirmation and protected execution audit. Never automatically rerun incomplete DDL.
- [ ] Release owner separately authorizes an actual deployment after all blockers close. No production readiness, production secret rotation, provider restore or live mailbox delivery is asserted here.

Related: sow-traceability-matrix.md, final-application-completion-report.md,
production-blockers.md, deployment-runbook.md and provider-backup-validation.md.
