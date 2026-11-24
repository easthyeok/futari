CREATE TABLE IF NOT EXISTS rooms (
  room_hash TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  photo_pack TEXT NOT NULL
);
