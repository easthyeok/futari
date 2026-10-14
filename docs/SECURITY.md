# Security and backend boundary

## Current implementation

`config.js` contains a Supabase publishable key, not a secret/service-role key. The browser's member selection (`me`/`you`) and shared room code are convenience mechanisms, NOT authentication or authorization. Any user capable of accessing a room's row can alter its JSON, scores or activity actors. In-app event attribution and score validation are not server attestations.

Repository access does not reveal deployed RLS policies. Live policy inspection has not been performed. Do not assume rooms are private because the client filters by code. Realtime must obey the same SELECT policies as ordinary reads. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [publishable keys](https://supabase.com/docs/guides/api/api-keys).

## Non-destructive audit

In the Supabase SQL editor, first export existing rooms and inspect policies:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'rooms';
select relrowsecurity from pg_class where oid = 'public.rooms'::regclass;
select pubname, schemaname, tablename from pg_publication_tables
where tablename = 'rooms';
```

If necessary, enable `rooms` in the `supabase_realtime` publication through the dashboard. This repository subscribes to Postgres changes, re-fetches on subscription/reconnect/online/focus and polls every 5 seconds. Realtime disabled on the server results in polling, not lost history. [Supabase setup](https://supabase.com/docs/guides/realtime/postgres-changes).

## Recommended production migration (not automatically applied)

1. Export database and storage, identify existing couples, and keep the legacy app read-only during ownership claiming.
2. Add Supabase Auth (email OTP or OAuth), immutable room IDs and a `room_members(room_id,user_id,member_slot)` table. Add unique `(room_id,member_slot)` and `(room_id,user_id)` constraints; only two slots per room.
3. Claim old rooms with an explicit recovery/invitation process. A guessable old code alone must not grant ownership. Preserve every existing `rooms.data` payload and keep an audit of ownership claims.
4. Replace anonymous room access with membership-based SELECT/UPDATE policies using `auth.uid()`. Server functions validate invitations, grant membership, and enforce activity actor and currency rules. Enable RLS only after membership backfill and rollback checks, so existing couples are not inadvertently locked out.
5. Use expiring, single-use, hashed invitation tokens. Rate-limit room creation, joins and claims server-side. Keep secret/service-role keys in backend environment variables only.
6. Move activities into an indexed append-only table with a unique event ID and server-side transaction/RPC if event volume grows. The current JSON transaction keeps an activity and its domain change atomic but transfers full room history and cannot attest to actors.

## Push notifications are a separate deployment

The current app provides in-app notifications and foreground schedule/crop reminders. It does not claim to alert a fully closed app. OS push requires explicit opt-in, Push API and service-worker push handlers, a protected subscription table, VAPID secrets and a server sender (e.g. an Edge Function plus scheduler). A service-role key must never enter the front end. Test permission denial, unsubscribe, device rotation and Safari installed-web-app constraints before release.
