# Owner-requested initial migration configuration

**Current files refreshed at 09:48 UTC, November 13, for deployed strict-session release `3ecc8451ce4a036e7f79fc994835fabc36045941e2c4ee1910ff29be943b3189`. Valid until 4:18 PM India time that day. Preserve all earlier failed preflight records and use the explicit reviewed-preflight input.**

**Current files were refreshed from the owner-supplied diagnostic output at 08:41 UTC on November 13. They pin release `aa67e00ac7e1f7e68c3a484cba9920cea72d2d7784333a4be2d8ff5ce1f9aa26` and expire at 3:11 PM India time that day.** Earlier windows below are historical. Any failed job records must still be preserved.

Prepared November 13, 2026, for the owner's explicit request to create application
tables through migrations. Configuration was validated locally without connecting
to production, changing environment variables or scheduling/executing a job.

`OWNER-INIT-20261113-0434` identifies this conversation's initialization request and
these files. It is a newly recorded owner instruction, not a provider-issued
approval or an independent infrastructure/security review. The owner supplied a
successful read-only inspection of the deployed release and requested proceeding
on the existing account/transport. Existing unencrypted TCP loopback and wildcard
schema-authority/shared-definer characteristics remain unchanged; these files do
not grant any new SQL privileges.

`OWNER-BACKUP-STATEMENT-20261113` identifies the owner's statement that backup is
already done and their direction not to require another backup. No backup archive,
independent restore result or provider recovery guarantee was inspected or verified
by the assistant. This record must not be represented as independently tested
recovery evidence. The user instruction supersedes earlier report workflow
requirements for further backup proof in preparing this initial setup.

`RUNTIME-NOT-AUTHORIZED` explicitly records that no runtime-phase authorization is
being supplied by these initial-phase files. These jobs cannot verify runtime
privileges or bootstrap an owner. Later phases require their own actual policies.

## Inputs and scope

- Application: `u676472791_magicreview_db`, zero tables in supplied inspection.
- Server: `in-mum-web789.main-hosting.eu`, MariaDB 11.8.9.
- Account: `u676472791_magicrev_user@127.0.0.1`, TCP `127.0.0.1:3306`.
- Control database: `u676472791_initstate`, separately created by the owner.
- Control user: `u676472791_inituser`; verify against hPanel's full username.
- Release: `9277d66ef3bcd69a757e92bf40f8daa8ddf8792e2802dcd46d38b321dc749df2`.
- The manifest/grant fingerprints come from the owner's supplied inspection.
- Policy expires at **12:51 PM India time, November 13, 2026**. Do not use it later.

## Execute manually in order

1. Remove the old `--inspect` recurring cron if it still exists.
2. In API environment settings, add/update the nonsecret fields in
   `common-variables.txt`. Keep `MIGRATION_DB_PASSWORD` set privately to the existing
   application user's password. Keep `INITIALIZATION_STATE_DB_PASSWORD` set to the
   separate control user's password. Neither password is present in these files.
3. Add/update `INITIALIZATION_CRON_JOB`: copy only the second line of
   `preflight.txt` as its value. The first line is the variable name.
4. Create the custom cron below, using all five scheduling fields as `*`.

```bash
/opt/alt/alt-nodejs24/root/bin/node --env-file=/home/u676472791/domains/api.revexoe.com/hbuilds/config/.env /home/u676472791/domains/api.revexoe.com/hbuilds/current/nodejs/dist/setup/cron-cli.js
```

5. Once its output is `{"action":"preflight","completed":true}`, delete the
   recurring cron. The control database contains its detailed completed record.
   Preflight creates no application tables.
6. Change only `INITIALIZATION_CRON_JOB` to the second line of `apply.txt`. Run the
   same cron once, then delete it after retrieving its output. Apply must begin and
   continue within the original preflight's 15-minute window and the policy window.
   Do not redeploy code, change other policy values or alter SQL between phases.
7. Expected successful output: `{"action":"apply","completed":true}`. Check
   application database tables in phpMyAdmin; successful apply does not create an
   administrator. Full verification and bootstrap are later explicit actions.

If any action fails, times out or produces uncertain output, stop and preserve the
state. Do not clear `initialization_records`, switch control databases or retry
apply. An absent completion message does not prove that no DDL committed.

## Local validation

Both generated objects pass the existing `cronJob` and nested `targetPolicy`
schemas. Their confirmation values use the SHA-256 digest of the parsed canonical
policy, including its default `allowedTriggerDefiners` array. Preflight and apply
have exactly the same parsed policy/release and different action confirmations.
No backend source or migration bytes were changed to prepare these files.

## Window refreshed after owner state inspection

At 06:21 UTC on November 13 the owner supplied a screenshot of the selected
control database showing no tables. The prior window expired before this update.
Both initial-phase jobs now use 06:21?07:21 UTC (11:51 AM?12:51 PM India time).
Existing references, target/grant/manifest/release fingerprints and credentials
are unchanged. Both canonical action confirmations were recalculated and validated.
No job or database operation was executed by this local refresh.

## Diagnostic-based refresh at 08:41 UTC

The supplied read-only diagnostic confirms zero application tables, both reference
IDs matching, all five protected input variables present and a distinct control
database name. It reports an expired policy and a stale release fingerprint.
Both files now pin the newly observed release and use the 08:41?09:41 UTC window
(2:11?3:11 PM India time). Policy digest and both action confirmations were
recalculated and validated locally. Presence is not proof of correct operator
passwords or control-database access; the diagnostic does not test those. No
production migration or setup run was performed by this local refresh.

## Latest refresh: 09:48 UTC

The owner supplied diagnostic evidence of release `3ecc8451ce4a036e7f79fc994835fabc36045941e2c4ee1910ff29be943b3189`, zero application
tables, matching reference IDs and presence of all required operator inputs.
The jobs now use 09:48?10:48 UTC (3:18?4:18 PM India time). Both were locally
validated after updating the release and canonical policy confirmation digests.
Older timestamps and deployment warnings below the latest notice are historical.
No production job was executed or state changed by this refresh.
