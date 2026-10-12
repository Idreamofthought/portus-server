# Database backups and recovery

Production database: `/data/portus2.db`. Confirm `/data` is the mounted persistent Railway volume. A mounted volume alone is not a backup.

The current Railway plan's dashboard requires Pro to create snapshots or schedules. Do not assume these features are enabled and do not upgrade without the owner's decision. Use the consistent application snapshot below and keep a private copy outside Railway. If platform backups become available later, enable daily, weekly and monthly schedules and verify current retention and pricing in https://docs.railway.com/volumes/backups . Do not wipe the volume: that also deletes its platform backups.

## Consistent application snapshot

From an authenticated Railway shell in the deployed repository, create a private backup directory outside the public website and make a new snapshot:

```sh
mkdir -p /data/backups
chmod 700 /data/backups
node scripts/database-recovery.js backup /data/portus2.db /data/backups/portus-YYYY-MM-DD-HHMM.db
```

Use a new timestamp each time. The tool opens the source read-only and uses SQLite's online backup API so committed data in the WAL is included. It refuses to overwrite an existing destination. It creates a separate restored copy and checks SQLite integrity, foreign keys, required tables and row counts without printing account records. This local snapshot is still on the same volume; it does not replace independent backups.

## Recovery drill

1. Confirm a completed online SQLite snapshot or Railway backup and record its time and source. Keep the live service and its current volume untouched. A manual snapshot and downloaded copy were verified on 12 October 2026; this does not establish recurring backups.
2. Railway restores are limited to the same project and environment. Restoring stages a replacement volume; applying it to the live service would roll back live data. Do not deploy a production restore merely to test it.
3. In Railway, use an isolated temporary service to inspect a restored backup volume if the dashboard permits attaching the staged restored volume separately. Do not apply the staged restore to production. If that operation is unavailable, use an online SQLite snapshot exported through authenticated Railway tools and test a separate copy locally or in an isolated service instead. Clearly label which backup source was actually tested.
4. Verify the restored database, preserving the database and WAL together if using a volume snapshot:

```sh
node scripts/database-recovery.js verify /path/to/restored/portus2.db
```

5. In isolation, start the matching application version with `NODE_ENV=test`, the copied database, a dummy signing secret and dummy payment/mail keys. Disable outbound mail, webhooks and public access. Check health, a known test login, a saved game and prepaid time. Never run payment or mail workflows against real accounts during a drill.
6. Record backup timestamp, tested copy, integrity/foreign-key results, row counts, application checks, elapsed recovery time and any failures. Keep the production database unchanged. Treat snapshots as confidential because they contain account and purchase data.

The repository's recovery tests use synthetic data. Passing them is not evidence that a production backup exists or that a Railway snapshot has been restored successfully.

## GitHub main branch

In repository Settings → Branches, protect `main`: require a pull request, require successful checks `test` (CI) and `Analyze JavaScript` (CodeQL), require the branch to be up to date, block force pushes and deletions, and apply rules to administrators. Do not require Railway's deployment status as a pre-merge check: production deploys after merge. For a sole maintainer, avoid a required approval count that prevents you merging your own reviewed PRs. See https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches . Verify the rule is active after saving. Keep GitHub recovery codes privately offline; never commit them.
