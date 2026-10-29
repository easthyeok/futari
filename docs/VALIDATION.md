# Validation record

Automated Node VM tests cover migration/backups, two independently loaded clients sharing a mocked compare-and-swap database, durable transaction acknowledgements, lost-response replay and offline retry, in-flight editing, commutative watering, duplicate harvest rejection and field conflicts, calendar recurrence and legacy reviews, NPC coordinate/boundary simulation, Canvas draw commands, furniture layers/collision/storage, crop timing, care, mail read receipts, missions and PWA shell assets.

Interaction tests also exercise device-pixel-ratio scaling, mobile coordinate conversion, NPC touch hit testing, offscreen/background RAF shutdown, unmount cleanup and interior drag/confirmation/storage using mocked DOM events. They do not measure browser layout.

App integration test loads every production module and traverses cached startup, farm/calendar/mail routes, confirmed notification badge, targeted navigation and committed reads. These are mock integration checks, not two physical devices or a browser layout engine.

Not yet verified in this environment:
- Physical iPhone/Android Safari/Chrome layout, gestures, animation performance and actual photo decoding.
- Actual two-device Supabase realtime delivery, deployed RLS policies, and production CAS under latency.
- GitHub Pages deployment and installed PWA upgrade on an actual device.

Playwright installation was attempted; npm DNS resolution failed (`EAI_AGAIN registry.npmjs.org`). GitHub push/network failures are reported in the final delivery. Never interpret passing mocks as live backend verification.

Release checks: export a production backup; audit policies; enable Realtime if intended; open a copy of an old room in two browsers; test independent schedule/card/harvest edits, same-slot conflicts and recovery; test offline/online transitions; verify 320/375/390/768px widths, reduced motion, keyboard dialogs and iOS safe areas; run every file in tests/; push main and verify `futari-build`, every shell asset and `/recover.html` over HTTPS.

Room patch regression: `node tests/sync-patch.cjs` verifies that an unchanged 8 MB photo is absent from the write payload, independent concurrent edits rebase through CAS, pending device caches recover, and lost acknowledgements do not duplicate changes. `supabase/tests/room-patch.sql` runs under `anon` against a transaction-local clone of the largest live room, checks small metadata and existing photo-record title edits within 3 seconds, verifies photos/unknown fields and stale-version rejection, and rolls back all test rows. This validates direct DB execution and RLS; it does not replace installed-client or HTTP/PostgREST checks.
