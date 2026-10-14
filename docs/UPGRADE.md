# Futari upgrade / implementation and operational checks

The app remains a static React application. No existing remote data is deleted or reset.
Before editing, export each room from Settings → 백업 내보내기. Pre-migration snapshots are also kept locally per room before schema upgrades. Keep an external copy: browser storage is not an independent backup. A failed backup stops migration.

Schema 2 adds activity events, per-member read maps, committed transaction IDs, durable client outbox, mailbox, NPC care, crop collection and free furniture placements. Existing keys, photos, crop timestamps, purchase IDs, game history and economic counters are retained. Unknown future schemas fail closed. Shared currency retains the existing derived balance; new costs and rewards are explicit. Import/export covers all new fields.

Activity events and domain data are committed atomically in `rooms.data`. Notification UI reads only acknowledged server snapshots. Realtime is an acceleration; polling and reconnect fetch the full event history. This is in-app notification delivery, not OS push.

Concurrent saves use `updated_at` compare-and-swap. Independent keyed changes merge. Incompatible edits to the same value stop with an explicit conflict; both local pending state and remote state are kept. No last-write-wins overwrite. Purchases are revalidated after merge to prevent overspending. Pending state includes its base and per-transaction diff operations for offline replay. Already-acknowledged transaction IDs are skipped even after a lost response. Simultaneous watering and separate crop/animal operations commute; incompatible same-resource changes remain recoverable.

Security: the publishable key is intended for the browser, but member selection is NOT authentication. Production database policies cannot be established or audited from repository files alone. Do not expose this legacy room-code system as an authenticated private service. See SECURITY.md for a phased Auth + membership transition without blocking old rooms.

Stages: (1) schema/sync/activities, (2) calendar (immediate sharing; proposal/acceptance removed per follow-up), (3) SVG world/NPC/crops, (4) free interior, (5) mail/missions/catalog. Tests must pass after each stage. Browser, live Supabase and deployed Pages checks are reported separately from mocks.
