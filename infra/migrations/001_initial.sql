PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, nickname TEXT NOT NULL, mode TEXT NOT NULL,
  cookie_encrypted TEXT, created_at TEXT NOT NULL, bound INTEGER NOT NULL DEFAULT 1, UNIQUE(provider_id, mode)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS collection_runs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('queued','processing','completed','failed','cancelled')),
  started_at TEXT NOT NULL, finished_at TEXT, snapshot_id TEXT, unchanged INTEGER NOT NULL DEFAULT 0,
  error_json TEXT, idempotency_key TEXT, UNIQUE(user_id, idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_run ON collection_runs(user_id) WHERE status IN ('queued','processing');
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, algorithm_version TEXT NOT NULL, checksum TEXT NOT NULL,
  snapshot_json TEXT NOT NULL, normalized_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS snapshots_user_time ON snapshots(user_id, created_at);
CREATE TRIGGER IF NOT EXISTS snapshots_immutable BEFORE UPDATE ON snapshots BEGIN SELECT RAISE(ABORT, 'snapshots are immutable'); END;
CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, metadata_json TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS artists (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS albums (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS song_artists (
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE, artist_id TEXT NOT NULL REFERENCES artists(id), PRIMARY KEY(song_id, artist_id)
);
CREATE TABLE IF NOT EXISTS playback_records_summary (
  run_id TEXT NOT NULL REFERENCES collection_runs(id) ON DELETE CASCADE, song_id TEXT NOT NULL,
  window TEXT NOT NULL, play_count REAL NOT NULL, PRIMARY KEY(run_id, song_id, window)
);
CREATE TABLE IF NOT EXISTS user_song_state (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, song_id TEXT NOT NULL,
  liked INTEGER, updated_at TEXT NOT NULL, PRIMARY KEY(user_id, song_id)
);
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE, insight_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_responses (
  run_id TEXT PRIMARY KEY REFERENCES collection_runs(id) ON DELETE CASCADE, encrypted TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_cache (
  key TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, encrypted TEXT NOT NULL, expires_at TEXT NOT NULL
);
PRAGMA user_version = 1;
CREATE TABLE IF NOT EXISTS favorite_inputs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, selection_json TEXT NOT NULL
);
