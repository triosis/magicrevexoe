# Authentication secret rotation runbook

Task 16, 2026-11-05. Procedure only: no production secret was generated, read,
changed or rotated. Production execution requires separate authorization and an
approved target-specific deployment, backup and rollback plan. Never include
values, QR images, bearer credentials or reusable recovery codes in tickets/logs.

## Inventory and prerequisites

| Secret class | Current implementation | Rotation consequence |
| --- | --- | --- |
| AUTH_ACCESS_SECRET | One HS256 key, canonical base64, 32–128 random bytes | Invalidates access JWTs and signed public feedback forms; does not itself invalidate opaque refresh/reset/invite credentials |
| Refresh credentials | Random opaque values; SHA-256 digests in auth_sessions | There is no refresh signing secret; invalidate stored sessions/families explicitly |
| AUTH_MFA_KEY | Independent AES-256-GCM key, exactly 32 random bytes, canonical base64 | Existing MFA ciphertext requires its original key until successfully reencrypted; blind replacement locks out authenticators |
| TOTP seed | Unique 160-bit cryptographic seed per platform identity, encrypted in DB | Compromise requires verified reenrollment, recovery-code replacement and session revocation |
| Recovery credentials | Ten random 192-bit codes per generation, SHA-256 digests | Regeneration invalidates old codes and all user sessions |
| Reset/invite credentials | Random opaque values with purpose, expiry and consumption | Consume/revoke affected credentials and issue new invitations/recovery messages through authorized workflows |
| SMTP/database credentials | Environment-managed external provider credentials | Coordinate provider revocation and application rollout; effective grants and delivery/TLS must be checked separately |

Assign an incident/change owner. Privately inventory replicas, jobs, secret-store
versions, affected accounts, exposure interval and available revocation controls.
Use an operator-approved cryptographic generator/secret manager; never examples,
human phrases, repository source, shell history or values printed by this agent.
Startup rejects malformed/short/repetitive keys and equal access/MFA keys, but
cannot prove randomness or custody. Confirm clocks/NTP and HTTPS first.

## JWT signing key and credential exposure response

1. Rehearse in isolated staging with synthetic accounts. Obtain a protected backup
   and prove restoration. Decide a maintenance window and user communication.
2. Generate a new independent signing key in the protected secret store. Record
   its version identifier and owner, never its value or a reusable hash.
3. Drain/stop **all** API replicas and workers. This implementation has one JWT
   signing key and no overlapping keyring; mixed-key replicas are unsupported.
4. Through a separately reviewed, authorized operator database procedure, revoke
   all affected auth_sessions and increment affected users.auth_version. Consume
   affected outstanding reset/invite tokens without deleting audit/history.
   Use transactions, expected affected-row checks and an atomic operator audit.
   No production executor or privileged mutation endpoint is supplied here.
5. Install the new AUTH_ACCESS_SECRET on every replica. Preserve AUTH_MFA_KEY
   unless following the separate encryption procedure below. Remove the old JWT
   key from active deployment configuration. Start patched approved artifacts.
6. Check startup/readiness, normal non-platform login and actual Super Admin
   password→MFA login. Prove old JWT rejection **and** old opaque refresh rejection;
   checking only JWT signatures is insufficient. Check reset/invite invalidation,
   logout and refresh replay using synthetic staging credentials.
7. Existing public feedback forms signed with the old key must reload their
   public funnel; communicate that safely. Clients must sign in again.
8. Revoke obsolete secret versions/provider credentials after verification,
   retaining only approved encrypted incident/backup material. Record dated
   deployment and non-secret rejection evidence. Monitor error/lockout rates.

Rollback is a reviewed release decision. Reintroducing a compromised key is not
an acceptable rollback. Preserve session revocations; restore functionality with
a fresh trusted key and corrected application/configuration instead.

## MFA encryption key rotation

There is **no online multi-key decryption or shipped reencrypt CLI**. Do not swap
AUTH_MFA_KEY and restart against ciphertext encrypted with a different key.
The following maintenance process requires reviewed operator tooling and staging
proof before production authorization; that operational gate remains open.

1. Take and restore-test an encrypted backup; keep old encryption-key access in
   the protected recovery store under restricted, audited custody. DB backups
   alone cannot recover TOTP seeds. Never store keys beside their DB backup.
2. Stop/drain every writer/replica. Prepare an independently generated new key.
   Have a second operator review the temporary offline reencrypt program.
3. With one database transaction and row locks, read each user_mfa row and decrypt
   every non-NULL secret_cipher and pending_cipher with the old key. Envelope:
   bytes 0–11 nonce, 12–27 GCM tag, remaining bytes ciphertext; AAD is UTF-8
   `MagicReview MFA:` followed by the decimal user ID. Reject any authentication
   failure. Do not log plaintext, envelope bytes or QR content.
4. Reencrypt the **same plaintext** with the new key, a fresh cryptographic
   12-byte nonce and the same user-bound AAD. Verify decryption under the new key
   in memory before binding the new envelope. Preserve enabled_at, last_step,
   failed-attempt/lockout data, recovery hashes and ownership. Update using bound
   parameters and expected row counts. Roll back all updates on any failure.
5. Write one secret-free rotation audit event through the reviewed operator
   procedure and commit. With traffic still stopped, install the matching new
   key on all replicas and revoke all affected sessions/challenges using the
   authorized procedure. Never create a period with traffic and mismatched data.
6. Verify known synthetic staging TOTP/recovery login, old-code replay rejection,
   pending-enrollment expiry, rotation/revocation and a restart. For rollback,
   restore the matching database/key pair under maintenance; never mix versions.
7. Restrict retention of the old key to backups that still require it, according
   to the approved retention schedule. Record counts and version identifiers,
   never cryptographic material. Delete temporary tooling/plaintext memory only
   through the approved operator process.

Key compromise also requires assessing copied seeds; encryption rotation alone
does not revoke an authenticator secret already disclosed. Require controlled
reenrollment with established identity verification. The ordinary disable API
requires current password plus fresh TOTP/recovery possession and then forces
enrollment at next login. Password reset never clears MFA. If both factors and
recovery codes are lost, stop and use an independently approved identity-recovery
process; this application provides no automatic bypass or backdoor.

## External credentials and evidence

Coordinate database/SMTP credential generation and old-credential revocation with
the provider. Apply least privilege, verified transport and all-replica rollout;
do not test by connecting this workspace to Hostinger. Check synthetic provider
staging operations, mail receipt, reconnect/restart and denied old credentials.
Keep non-secret owner/timestamp/version/rejection evidence. SMTP operation,
historical credential rotation and production grants remain unverified locally.

## Task 19 backup-key rotation and failure recovery

Prepared procedure only; no production secret has been changed. BACKUP_ENCRYPTION_KEY
is independent of JWT/MFA/database/SMTP credentials. BACKUP_KEY_ID is a non-secret
version identifier recorded in the authenticated archive metadata, not a keyring or
an automatic key lookup service. The executor accepts one operator-supplied key.

1. Security/backup owners approve rotation, retention and a two-person key recovery
   test. Inventory every retained archive and its key version, including off-site
   replicas. Keep encryption keys in a separate protected recovery store.
2. Generate a new independent 32-byte key through approved secret management;
   record only its version identifier. Never overwrite the sole old-key copy.
3. In an isolated disposable rehearsal, make a new backup with the new key/version;
   authenticate, restore and compare all schema/data/ledger/application behavior.
   Demonstrate old archives still restore with their matching old key, and fail
   authentication with the wrong key. File checksums alone are insufficient.
4. After separate owner approval, switch the backup job's protected key/version
   together; verify the first new archive and actual restore before retiring any
   old job configuration. No API runtime or user session changes are needed for
   backup-only key rotation. JWT rotation still requires explicit session revocation;
   opaque refresh tokens have no signing key to rotate.
5. Retain old keys for every retained archive that needs them. If rewrapping old
   archives is necessary, use separately reviewed tooling, a fresh nonce and new
   exclusive artifact paths, full authenticated restore verification and reviewed
   metadata; no in-place archive reencrypt utility is shipped.
6. On failure pause publication, quarantine incomplete archives and retain the last
   verified backup/key pair. Diagnose in isolation. Never label a failed archive
   complete or delete the only usable key. Suspected compromise requires incident
   review: returning to a compromised key is not safe recovery. Retire keys only
   after all dependent backups expire or are safely replaced under approved policy.

Owner actions remain: actual provider credential/signing-key revocation evidence,
protected MFA/backup key custody and recovery, reviewed MFA reencryption tooling,
off-site immutable/versioned storage, scheduling/retention and incident ownership.
No automatic rotation, multi-key MFA decryption, remote backup executor or production
rotation is claimed. Runtime verified database TLS and explicit TLS SMTP diagnostics
are now implemented; provider compatibility/delivery are still unverified.

## Task 21 external keys

ANTHROPIC_API_KEY, RAZORPAY_KEY_SECRET and the independent RAZORPAY_WEBHOOK_SECRET
are protected environment inputs. No actual keys were generated or rotated here.
Coordinate provider-side replacement and deployment through a separately approved
change. Verify the new configuration in isolated provider test mode first. Never
print keys or place them in catalog approval JSON. The current webhook adapter
uses one configured secret: drain/reconcile historical deliveries before a cutover,
and retain old verification material in the approved secret store for authorized
reconciliation. Do not disable signature checks to accept old deliveries. No
automatic overlapping-key rotation or provider continuity is claimed.
