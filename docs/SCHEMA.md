# Schema 2

The room remains in the existing Supabase `rooms(code,data,updated_at)` table. No SQL table migration is required for the implemented client features. `updated_at` must round-trip with exact precision and be allowed in compare-and-swap updates. A server trigger may override the supplied timestamp; the client uses the version returned by the database.

| Field | Purpose | Compatibility |
| --- | --- | --- |
| `schemaVersion: 2` | Validated, additive version migration | Future versions refuse to write |
| `activities[]` | Unique event ID, actor, kind, timestamp, destination and target | Domain mutation and event saved in one row update |
| `notificationReads.me/you[eventId]` | Independent read state | Concurrent read updates merge |
| `commits[transactionId]` | Durable acknowledgement IDs | Retrying a committed transaction skips its effects |
| Local cache `base,data,version,pending,outbox[]` | Recovery snapshot and uncommitted operations | Each operation stores path, expected base and resulting value; old pending caches without a recoverable base remain available for manual recovery |
| `dates[].kind,time,endTime,place,allDay,repeat,repeatUntil,reminder,cancelled` | Classified schedules and soft cancellation | Existing date/title/memo records still display |
| `dates[].reviews.me/you` | Personal review, rating, compressed photos | Existing `memoryId`, `sourceId`, `photo` and `photos` stay intact |
| `farm` and crop timestamps | Existing village/economy/growth state | Same building IDs and 16 slots; original crop IDs and timestamps retained |
| `collection.crops`, `collection.teamHarvests` | Collected crops and joint care achievements | New harvests only; do not invent historical harvest data |
| `animalCare[id].name,feed[day][member]` | Animal names, care history, derived affection | No health, death or decay fields |
| `house.owned,equipped` | Original ownership and surface choices | Purchase IDs and costs preserved |
| `house.placements[itemId] = {x,y,rotation}` and `layoutVersion` | Free room placement | Legacy equipped furniture gets a valid preview layout; layout persisted on first explicit placement/storage |
| `house.avatars.me/you` | Color and hair/cap choice | Each member edits their own avatar |
| `mail[]` | ID, sender, recipient, text, day, sentAt, readAt/readBy | Read receipts are ordinary committed activities |

Existing `settings`, anniversaries, memories/photos, places, buckets, together, answers, polls, moods, boardGames, gameResults and dodge records are retained, including unknown non-dangerous fields. Prototype-manipulation keys are rejected rather than interpreted.

Currency remains derived from existing rewards and costs. Small missions add at most 4 coins per day. Joint watering adds 1 coin to a future harvest, once. Special sunflower decor has zero coin cost and requires 3 collected sunflowers; it cannot be purchased early. Seed timestamps, counters and owned furniture are not reset.

Conflicts are resolved by resource semantics: disjoint item edits and independent watering/care merge; identical acknowledged transactions skip; competing values or duplicate harvesting by distinct transactions stop and retain the local outbox. The client cannot enforce trust against malicious callers; server-side Auth, RLS and transactional validation remain necessary for a public service.
