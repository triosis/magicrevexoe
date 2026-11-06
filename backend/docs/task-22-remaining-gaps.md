# Task 22 remaining gaps

2026-11-06. **Phase 1 is not complete. No production readiness or full-SOW acceptance
is claimed.** The itemized matrix covers original source requirements and explicitly
distinguishes missing code, deferred phases, owner holds and external evidence.

## Genuine Phase 1 dependencies and incomplete requirements

| Requirement | Status / remaining work | Dependency |
| --- | --- | --- |
| SOW 4.1, §5.3: Google OAuth/autofetch/category/ownership onboarding | **Not implemented**, not merely unverified. Current flow uses explicit manual business information and canonical Google Place ID. A connector/import workflow still requires implementation and real evaluation | OD-07/10: approved privacy/consent, OAuth project/scopes/redirect/API approval, owned business access and separately authorized provider testing |
| SOW 4.1, 5.2, 6.1: automatic keyword recommendations | **Partial**. Manual 3–5 business phrase editor, owned prompt context and immutable industry-specific service guardrails now exist. No fabricated AI/local-trend recommendations | Approved task entitlements/usage treatment, data handling and actual model/GBP/local-trend sources. Do not confuse customer review generation with a keyword insight service |
| SOW 6.1, §6: real AI quality, model routing, latency, supported-language/factual/clinical safety | **Implemented but externally unverified**. No real provider response was generated. Guarded plain text and transactional metering pass local synthetic-protocol tests | OD-11/15: protected account/model/version configuration, processor approval, native-speaker and actual output/latency evaluation |
| SOW 1.5, 4.9, 10: three paid tiers, activation/payment/overage/invoice/dunning | **Awaiting owner approval; execution disabled**. Catalog/usage/receipts/non-issuable invoice preparation exist. A commercial row or signed payment cannot bypass the written policy hold | OD-01–05: approved financial policy/catalog and later reviewed activation/settlement/tax implementation. No default prices, limits, tax rules or retries |
| SOW 1.6, 4.10, 11: ToS, privacy, consent, retention/erasure and legal exceptions | **Awaiting owner approval**. No legal wording, acceptance records for dummy terms, chosen retention periods, purge or deletion guarantees | Owner explicitly confirmed OD-06–08 have no approved source |
| SOW 3.3 authentication: magic-link/OTP versus current password plus MFA | **Awaiting owner approval**. Current secure implementation deliberately preserved; no replacement or invented login policy | Owner explicitly confirmed OD-09; a formal amendment is still absent |
| SOW 3.3–3.4, 5.4, §6: shared Redis/edge/KV and representative sub-second/4G delivery | **Partial / unimplemented infrastructure plus external prerequisites**. Actual SPA, Node redirect and process-local controls exist; no claim they satisfy Redis/edge or P95 targets | Approved hosting/proxy/shared-state topology, external configuration and representative benchmark. Deployment is prohibited in Task 22 |
| SOW 5.4: complete WCAG AA, touch-target, native-language and device acceptance | **Partial / unverified**. Labels, keyboard/mobile browser checks, bounded images and preserved choices exist; not a complete conformance audit | OD-15: independent assistive-device/contrast/tap-target/native-speaker evaluation |
| SOW 5.4: offline behavior | **Partial**. A previously verified canonical destination can be retained briefly in the same tab with expiry; no private form token cached. No safe direct destination can be invented for a first-ever offline visit | Actual browser offline/field testing; optional PWA/install decision. No service-worker/private-data cache claim |
| SOW 4.3/7.1: verified Google posts, review velocity and posting conversion | **Unavailable / external integration and evidence dependency**. Actual views/clicks/private ratings/language/token records are shown; unavailable metrics are null, never sample data | Authorized Google connector and posting/review provenance, approved semantics. A click/copy is not proof of a post |
| SOW 8.1/§5: full vertical libraries/questions/routing/widgets and branded hardware layouts | **Partial; phase/scope decisions remain explicit**. Three launch channels, protected fixed fields, business keywords/logo, guarded AI context, QR PDF/SVG/PNG and basic metrics exist | Historical fixed-field/label CHECKs cannot be weakened. Full custom builder, advanced widgets and hardware gallery are later scope; OD-12 for ambiguous original examples |

## Deferred requirements, not Phase 1 defects

- Task 02: commissions, reseller wallets, payouts, wholesale pricing/split settlement.
- Phase 2: reseller white-label/custom domains/email/branding, merchant AI replies,
  additional languages/verticals, hardware order/partner/shipping workflows and full
  assigned-branch manager expansion. Existing hierarchy/branches are early delivery,
  not proof those later modules are complete.
- Phase 3: sentiment/topic tagging, GBP scored audits, AI posts/images, broader fraud
  classifier, advanced cohort/keyword/commercial analytics, custom channel builders,
  third-party automation APIs and bug bounty.
- Phase 4/ongoing: voice, WhatsApp/SMS automation, mobile/self-NFC encoding,
  marketplace, white-label mobile application, automated policy-monitoring/audit
  toolkit and continuing operational/legal assurance.

## Closed implementable defects in this task

Paid execution is blocked regardless of commercial approval; receipt replay does
not allocate. Added scoped concurrent-safe merchant keyword/PNG setup and public
logo; server-selected keyword context reaches guarded AI prompts. Added actual UTC
rating distributions/daily feedback/event/language/token/activity analytics, language
capture with unknown historical values preserved, 80%/100% in-app usage warnings,
resolved-to-archived history with immutable archive/audit/rollback, bounded cached
Google fallback, and authorized print-ready vector QR PDF. Existing tests and
constraints remain; original migration prefixes/checksums are preserved.

## Manual acceptance readiness

**Ready only for assisted acceptance of the implemented local subset**, using an
isolated synthetic setup and agreed cases. Not ready for unrestricted paid/provider
testing, full Phase 1 acceptance, legal/commercial sign-off or production deployment.
Automated fixtures shut down; a persistent owner QA environment still needs preparation.
No real credentials should be sent in chat/reports or copied from test fixtures.
