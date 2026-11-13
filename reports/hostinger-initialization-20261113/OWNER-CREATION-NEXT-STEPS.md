# Verification and owner creation

Owner supplied resume-apply.completed showing all 85 migrations applied and none
pending on the pinned deployed release. Prepared verify-complete and bootstrap
jobs for 11:35?12:35 UTC, November 13 (5:05?6:05 PM India time). No production
verification or bootstrap was executed while preparing these local files.

First run verify-complete using its job JSON and existing cron command without
flags. Preserve the first output and remove its schedule. Then configure bootstrap
protected inputs: BOOTSTRAP_PLATFORM_NAME, BOOTSTRAP_OWNER_NAME,
BOOTSTRAP_OWNER_EMAIL=rxadmin@revexoe.com, BOOTSTRAP_OWNER_PASSWORD. The password
must meet the unchanged 16?128 character and 10-distinct-character bootstrap
validation. Keep it private. The existing fixed login credential remains separate
and still overrides the stored hash for this specific owner at login.

Bootstrap uses MIGRATION_DB_USER/PASSWORD in the cron implementation, not the
legacy BOOTSTRAP_DB_USER/PASSWORD. Select the second line of bootstrap.txt for
INITIALIZATION_CRON_JOB only after successful verification and input validation.
Never automatically retry a failed or uncertain bootstrap. Runtime privilege
reduction/check-runtime and removal of temporary inputs remain separate work.
