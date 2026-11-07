# Exact backend deployment settings and artifact verification

2026-11-07. Source-derived intended settings, not observed current hPanel values.
No deployed commit/root/Node/build/start setting has been supplied. The latest log
confirms a CA configuration rejection, not that a particular build is deployed.
Do not deploy automatically or apply these values before prerequisites/approval.

## Correct backend settings

| Setting | Exact intended value / requirement |
| --- | --- |
| Website |api.revexoe.com; backend process separate from revexoe.com frontend |
| Node |Patched24.x, matching package engines; current local test runtime Node24.14.0. Provider availability/native Linux Argon2 must be verified |
| App/project root relative to repository |backend (directory containing backend/package.json), not Windows absolute workspace path or repository frontend root |
| Dependency installation phase |npm ci in backend, using its package-lock; prepare already builds TypeScript. Do not install during listen-detection runtime |
| Build command from backend root |npm run build (tsc -p tsconfig.json); harmless repeat if prepare already built |
| Production start command from backend root |npm start, whose exact script is node dist/server.js |
| Compiled entrypoint from backend root |dist/server.js, generated from src/server.ts; ESM type=module |
| If provider only supports repository root |Equivalent explicit scoped install/build npm ci --prefix backend / npm --prefix backend run build; runtime node backend/dist/server.js. Configure consistently rather than mixing package roots |
| Backend artifact |backend/dist/**/*.js, backend package.json/lock, installed production dependencies/native build for target OS, migrations/schema manifest and required static runtime files. No private env/CA committed |
| Bind |HOST=0.0.0.0, provider-assigned PORT1?65535. Do not hardcode guessed port3001 simply because it is local fallback |
| Production mode |NODE_ENV=production; production does not load .env or .env.hostinger |
| Liveness |GET /health or /health/live ?200 status alive after secure configuration validates; no DB query |
| Readiness |GET /ready or /health/ready ?200 ready/database up after DB SELECT1, auth dependency present/no shutdown; otherwise503 |
| Probe timing |Listener has no intentional network wait; latest local432ms is not Hostinger guarantee. Readiness can take4s; allow separate >4s plus ingress margin, not strict3s readiness deadline |
| Drain |SIGTERM/SIGINT HTTP drain then pool.end; application deadline10s; provider supervisor grace must exceed it |

hPanel field availability/labels and actual install/build wrapper behavior need
operator confirmation. Map these equivalent commands to supported controls; do not
invent a provider start-command field if the selected product only asks entrypoint.
The runtime command must not run tsc/npm ci/migrations/SMTP or database diagnostics.
Root npm start launches the frontend server.mjs and is wrong for the API. Direct
src/server.ts is not a plain-node production entrypoint. dist is gitignored and must
be built in the correct package; git commit presence does not prove dist exists.

## Unsupported-process / limits / artifact investigation

Current backend is one foreground HTTP process, one lazy DB pool, in-memory rate
limiter state and optional on-demand provider calls. No startup worker daemon,
cron, PM2 dependency, shell-background process, startup migration, DB connection
loop or require.main guard was found. Explicit operator CLIs run separately.
HTTP timers keep normal request limits; no background task delays listener startup.

Actual Hostinger CPU/RAM/process/connection limits, OOM/restart records, native module
ABI, stdout visibility, outbound routing and proxy paths have **not** been provided.
Do not diagnose process exhaustion from the generic listen message. Ask for current
runtime/build exit codes and resource metrics if failure persists after secure
configuration is complete. No process-limit or infrastructure setting changed here.

## Compare the actual deployed build (manual read-only evidence)

1. Obtain Hostinger deployment ID/time, Git commit or uploaded artifact version,
   build log root/Node/install/build details, selected entrypoint and last runtime
   exit/listening logs. Do not include environment values, tokens or connection strings.
2. CI/operator runs the read-only fingerprint utility against the **approved built
   backend artifact** before upload, preserving its JSON manifest privately:

~~~sh
node backend/scripts/deployment-fingerprint.mjs
~~~

   From backend root use node scripts/deployment-fingerprint.mjs. No arguments or
   credentials are accepted. Include this script in the reviewed source/utility set;
   it is not automatically run at startup or part of the compiled-artifact digest.
3. Operator runs the same trusted utility in the deployed artifact environment, or
   obtains a trusted complete provider artifact manifest. Compare artifactSha256 AND
   file list/per-file hashes with the same approved build. Missing files/digest
   mismatch fail parity. Tooling authenticity and native dependency installation
   still require separate release controls; this is not remote attestation.
4. Match Node24, OS/native Argon2 and installed locked dependencies separately. Do not
   compare a Windows native installation to Linux or assume an independently rebuilt
   file-byte digest must match across OS/compiler settings. The current local digest
   is in HOSTINGER_503_ROOT_CAUSE.md and is only the tested local-artifact reference.
5. Verify actual deployed startup/liveness/readiness after operator-approved runtime
   change. A fingerprint match says nothing about CA mounts, secrets, DB networking
   or correct hPanel process routing. A health200 alone does not identify the build.

No remote manifest/commit was supplied, so deployed parity remains **UNKNOWN**. No
public endpoint was added to leak deployment metadata. The new utility reads only
curated release files and never exposes protected environment or certificate data.

## Manual hPanel sequence after external prerequisites pass

- Select api.revexoe.com backend dashboard and verify current root/runtime/build/
  entrypoint. Capture redacted evidence before changing anything.
- Supply approved external RDS MariaDB11.8 writer DNS/port/schema/account/password,
  authenticated CA mount/path/hash and unchanged auth/MFA/SMTP values from the
  environment checklist. Local127.0.0.1 is not a supported TLS workaround.
- Apply/restart only with owner release authorization, all values ready and approved
  backup/migration/rollback gates satisfied. Runtime values need a new process;
  changed build-time VITE_ values require rebuild but are not part of this DB fix.
- Collect listening logs and expected production HTTPS health/readiness responses,
  verify actual target TLS/grants/schema and one authoritative DB before routing.
- On failure keep security checks intact and use stage-specific rollback/maintenance;
  never turn off validation or reenable an insecure source connection.

See PRODUCTION_ENVIRONMENT_CHECKLIST.md and PRODUCTION_BLOCKERS.md. No settings
were applied, deployment triggered, production service started or credentials changed.
