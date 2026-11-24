# Cloudflare migration (staging only)

The currently deployed app still uses Supabase. Do not switch its config until
the copy and two-device verification succeed. The R2 bucket must remain private.
The current room code is a shared secret, not a user account; guessing it permits
access to that room. Use a strong room code and do not enable public bucket access.

This implementation stores D1 metadata and immutable, content-addressed photo
packs in R2. Old packs are intentionally not deleted: removing them during a
concurrent read could lose photos. Storage grows when the set of photos changes;
safe garbage collection and independent backups are future work. Full room data
is transferred on saves and changed-version reads, so check Workers and R2
usage. The D1 metadata JSON must fit below 1.8 MB. The initial import rejects
an existing room and never modifies Supabase.

1. Export independent backups from both devices. Check both devices have no
   pending changes. Close the app on both devices and do not write to Supabase
   until cutover is completed. Keep the old app closed after cutover.
2. In a network-connected WSL shell from the project directory, log in to
   Wrangler. Apply `npx wrangler d1 execute futari-db --remote --file cloudflare/schema.sql`.
3. Set a new random migration secret in the shell without printing it:
   `export FUTARI_MIGRATION_KEY="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"`
   then `printf '%s' "$FUTARI_MIGRATION_KEY" | npx wrangler secret put MIGRATION_KEY`.
4. Deploy with `npx wrangler deploy`. Copy the resulting HTTPS Worker URL.
   Set it in the same shell using `export FUTARI_CLOUDFLARE_URL='https://YOUR-WORKER.workers.dev'`.
5. Run `node tools/migrate-supabase.mjs` and enter the room code. The code is
   visible while typed. The tool compares the full imported room with the
   source, checks the source version, and will not replace an existing room.
   If any check fails, do not switch the app; retain the Supabase source.
6. Only after verification, set `CLOUDFLARE_API_URL` in `config.js` to the
   Worker URL, test the app on two devices including simultaneous changes,
   photo display, and offline recovery, then deploy the frontend. Never switch
   both backends independently or write to both after this point.
7. Remove the migration secret from the Worker using
   `npx wrangler secret delete MIGRATION_KEY` and `unset FUTARI_MIGRATION_KEY`.

The migration does not import unsaved device outboxes. If either device has
pending changes, resolve or preserve them before copying. If Supabase changes
after copying, the copied room will be stale; do not start the new app until
the discrepancy is reconciled. No automatic re-import or rollback is provided.
