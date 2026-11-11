# Phase 2 Nginx, systemd and lifecycle evidence

2026-11-11. **Real Linux/Nginx/systemd tests NOT_RUN**: no usable Linux runtime.
Production NO-GO. No configuration installed or service/user created.

## Inspected review-only artifacts

nginx-api.conf.example uses named/default servers, rejected unknown handshakes/
hosts, HTTPS, preserved URI proxy_pass without a suffix, authoritative XFF from
socket peer and XFP=https, removal of XFH/Forwarded/alternative identity headers,
no proxy cache, retries or error interception. Application needs one direct Nginx
hop and HOST127.0.0.1; inherited real_ip/PROXY/CDN config must not reinterpret the
socket identity. No arbitrary trust CIDR or unrestricted trust proxy was added.

magicreview-api.service.example proposes a dedicated nonroot/nologin user, protected
root-owned environment and immutable release, no capabilities/escalation, filesystem
sandbox, private temp, restart-on-failure with5s delay and3 starts/60s, SIGTERM and
20s stop allowance. No build/install/migration/bootstrap hook. ExecStart placeholder
deliberately prevents treating it as ready for deployment. systemd syntax checks
alone cannot validate lifecycle or filesystem/native Argon2 compatibility.

Templates retain unresolved PKI/Node paths, renewal and complete installation
context. No new effective service/firewall configuration is claimed.

## Execution matrix

| Requirement | Linux/native result | Available other evidence |
| --- | --- | --- |
| Complete nginx.conf, nginx -t/-T/inherited include review | NOT_RUN | Text/template source review only. |
| HTTPS, unknown SNI/Host rejection, HTTP308 | NOT_RUN | Proposed directives; no certificate/renewal readiness proof. |
| Actual URI/Authorization/webhook raw-body/header preservation | NOT_RUN through Nginx | Windows Express/model regressions revalidated separately. |
| CORS/OPTIONS/no-store,413/429/502/503/timeout | NOT_RUN through Nginx | Windows app parser/rate-limit/health tests only. |
| Real distinct-client IPs/spoofing across complete chain | NOT_RUN | Phase1 one-hop HTTP model is not the Nginx binary. |
| systemd-analyze verify | NOT_RUN | No systemd-analyze available. |
| OS user/code/env/CA-key permissions and journal secrecy | NOT_RUN | Proposed modes, not actual filesystem enforcement. |
| Crash/backoff/rate-limit/restart | NOT_RUN under systemd | Existing Node tests do not establish supervisor control. |
| SIGTERM/active-request drain, restart without setup | NOT_RUN under systemd | Windows Node shutdown evidence only. |
| Encrypted-volume reboot/unlock | NOT_RUN | No disposable VM/encrypted volume. |

## Reproducible next exercise

Use the [Linux packet](../ops/option-c/linux-validation/README.md) inside an approved
isolated VM. Render copies with synthetic hostname/cert/paths, full events/http
config and private pid/log/temp paths. Confirm no unintended include/real_ip trust
with nginx -T privately, then nginx -t. Run the service verifier against a correctly
named rendered .service with actual users/paths. Syntax-only validation can occur
without a service manager; lifecycle requires a working systemd PID1.
[systemd verification reference](https://freedesktop.org/software/systemd/man/latest/systemd-analyze.html)

Generate unknown SNI/Host, invalid/multiple forwarding headers, two distinct actual
client sources, direct Node and correctly proxied HTTPS. Confirm overwritten attacker
headers, all per-IP/email/user/global limits, preserved body/signature/path and no
write retries. Exercise Nginx64KB cap and app16KB JSON/64KB raw/logo contracts;
Nginx HTML413/other proxy errors must not be mislabeled as application JSON behavior.
Test502 by controlled Node unavailability,503 by DB readiness failure and timeout
with an isolated test upstream; do not add a production debug route. Record upstream
invocation counts and timings; the35s read timeout is not a total request deadline.

Install rendered units/users only in the approved VM, verify nonroot immutable
runtime, denied key access, secret-free journaling and env injection. Exercise
missing/invalid CA/config, DB unavailable/lost, crash/restart, active requests,
SIGTERM10s application limit vs20s supervisor budget and cleanup. No global kill,
service install, host restart or elevated action occurred on the developer machine.

Approval still needed for real topology, PKI/renewal, permissions, native hardening,
resource/alert budgets and independently reviewed deployment. A test CA cannot
establish public HTTPS certificate authority or renewal preparedness.
