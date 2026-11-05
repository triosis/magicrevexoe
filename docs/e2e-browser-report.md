# Task 12 real browser verification

2026-11-05, installed headless Chrome/Playwright against actual React/Vite, Express
HTTPS and fresh MariaDB 11.8.9 migrations. Local API responses are not mocked or
intercepted. The main context only denies non-loopback external traffic; local API
calls still traverse actual CORS, bearer authentication, services and database.

Desktop: 1440×1000. Mobile: 390×844. Separate actor tabs preserve real sessions.
Browser invitation pages consume actual memory-delivered single-use tokens and
remove fragments. No frontend auth bypass or raw token in test artifacts.

Successful browser interactions: four administrative logins; hierarchical account
creation/acceptance; industry selection; branch/timezone creation; Google destination;
business setup complete; funnel/link creation; SVG QR preview/download; actual
printed-link redirect; parallel Google/private controls; overall rating 1 submission;
merchant inbox/status/history; platform subscription assignment; merchant terms/usage
panel; logout. Direct merchant edge provisioning additionally uses actual HTTP APIs
and browser invitation acceptance.

Google click opened a tab and attempted the canonical search.google.com review
path; external-network interception aborted it before contact. Google page rendering,
listing validity and review completion are unverified. Private feedback still worked
afterward; both controls remained visible after confirmation. No textarea/contact/
medical-detail input appeared.

Generated screenshots were visually inspected:

- `.tmp-frontend/real-e2e/onboarding-desktop.png`: destination/link/QR workspace.
- `.tmp-frontend/real-e2e/feedback-desktop.png`: inbox, real rating, status form/history.
- `.tmp-frontend/real-e2e/public-mobile.png`: independent actions and confirmation.
- `.tmp-frontend/real-e2e/subscription-mobile.png`: onboarding, configured terms/usage.

Public and merchant mobile pages pass document-width assertions. The metric table
scrolls inside its wrapper for remaining/state columns; the page does not overflow.
No overlapping controls or clipped page layout observed. Zero unhandled page errors
in the final run. This is not all-device, accessibility or cross-browser certification.

## Reproduce

Prerequisites: Node 24 dependencies installed in both packages, local MariaDB 11.8.9
Windows ZIP binaries, installed Chrome and OpenSSL (defaults to Git for Windows).
No production configuration or .env file is needed.

```powershell
$env:MARIADB_TEST_BIN=(Resolve-Path '.tmp-mariadb/extracted/mariadb-11.8.9-winx64/bin').Path
# Optional when installed elsewhere:
# $env:OPENSSL_TEST_BIN='C:/local/path/openssl.exe'
npm.cmd run test:e2e:real
```

The command builds backend TypeScript, owns all local services and closes them in
finally. It never targets an existing DB or installs a service. Self-signed TLS
acceptance is restricted to test contexts. Outputs go to ignored .tmp-frontend/;
result.json records successful scenarios and denied external navigation, no secrets.
Main scenarios fail fast on unmet dependencies, without falsely reporting later
workflows successful. All 10 scenarios plus parent passed. The existing 8 mocked
browser tests passed separately. See [full report](e2e-integration-report.md).
