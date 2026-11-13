# Scoped recovery jobs

Owner diagnostic confirms the entire prefix differs only in the known first-trigger
connection collation, unchanged checksums, 24 applied entries and one failed tail.
Files pin deployed release a4fc4efd82385443cd0ccf103499f8eb0929858b8c8e1a001f6a9c4bd9acffbd.

Valid November 13, 2026, 11:03?12:03 UTC (4:33?5:33 PM India time).

Run separately in order: repair-first-trigger, resume-preflight, resume-apply.
For each, set INITIALIZATION_CRON_JOB to the second line of its matching .txt file.
Use the existing cron command without --diagnose, collect its first output, then
delete the schedule. Stop on failure or uncertainty; never clear markers or retry.
Resume-apply must run within 15 minutes of the new resume-preflight and before
the overall policy expires. Do not redeploy between these actions.

Repair preserves the old failure code and records; it changes only the verified
trigger collation and reconciles the corresponding ledger entry after full-prefix
verification. Remaining original migrations run only in the separate resume-apply.
No production action was executed while generating these files.
