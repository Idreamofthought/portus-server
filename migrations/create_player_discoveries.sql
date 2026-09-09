CREATE TABLE IF NOT EXISTS player_discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  discovery_id TEXT NOT NULL,
  discovery_type TEXT NOT NULL CHECK(discovery_type IN ('artifact', 'archaeological_find')),
  category TEXT NOT NULL,
  rarity TEXT,
  activity TEXT NOT NULL,
  fragment_index INTEGER NOT NULL DEFAULT 0,
  fragment_count INTEGER NOT NULL DEFAULT 1,
  discovered_at INTEGER NOT NULL,
  UNIQUE(user_id, discovery_id, discovery_type, fragment_index),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_codex_unlocks (
  user_id INTEGER NOT NULL,
  entry_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY(user_id, entry_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_discovery_rolls (
  user_id INTEGER NOT NULL,
  activity TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  rolled_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, activity, turn_number),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);