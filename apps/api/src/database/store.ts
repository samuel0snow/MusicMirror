import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Account, FavoriteSelection, NormalizedData, Run, Snapshot } from '../../../../packages/contracts/src/index.js';
import { Vault, tokenHash } from '../modules/auth/crypto.js';

type UserRow = { id: string; provider_id: string; nickname: string; mode: Account['mode']; cookie_encrypted: string | null };
export class Store {
  readonly db: DatabaseSync;
  readonly vault: Vault;
  constructor(dataDir: string, encryptionKey?: string) {
    mkdirSync(dataDir, { recursive: true });
    this.vault = new Vault(dataDir, encryptionKey);
    this.db = new DatabaseSync(join(dataDir, 'musicmirror.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    // Root-relative migration path is independent of source / compiled module location.
    this.db.exec(readFileSync(join(process.cwd(), 'infra/migrations/001_initial.sql'), 'utf8'));
    this.cleanup();
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  cleanup() {
    const now = new Date().toISOString();
    for (const table of ['sessions', 'raw_responses', 'api_cache']) this.db.prepare(`DELETE FROM ${table} WHERE expires_at < ?`).run(now);
  }
  account(row: UserRow): Account { return { userId: row.id, providerId: row.provider_id, nickname: row.nickname, mode: row.mode }; }
  createAccount(providerId: string, nickname: string, mode: Account['mode'], cookie?: string): Account {
    const id = randomUUID();
    this.db.prepare('INSERT INTO users(id, provider_id, nickname, mode, cookie_encrypted, created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(provider_id, mode) DO UPDATE SET nickname=excluded.nickname, cookie_encrypted=excluded.cookie_encrypted, bound=1').run(id, providerId, nickname, mode, cookie ? this.vault.encrypt(cookie) : null, new Date().toISOString());
    return this.account(this.db.prepare('SELECT * FROM users WHERE provider_id=? AND mode=?').get(providerId, mode) as UserRow);
  }
  getAccount(id: string): Account | undefined { const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow | undefined; return row && this.account(row); }
  bound(id: string): boolean { return this.db.prepare('SELECT bound FROM users WHERE id=?').get(id)?.bound === 1; }
  cookie(id: string): string | undefined {
    const row = this.db.prepare('SELECT cookie_encrypted FROM users WHERE id=?').get(id) as { cookie_encrypted: string | null } | undefined;
    return row?.cookie_encrypted ? this.vault.decrypt(row.cookie_encrypted) : undefined;
  }
  session(userId: string, token: string) { this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token), userId, new Date(Date.now() + 7 * 86400000).toISOString()); }
  authenticate(token: string): Account | undefined {
    const row = this.db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(token), new Date().toISOString()) as UserRow | undefined;
    return row && this.account(row);
  }
  logout(token: string) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token)); }
  unbind(userId: string) {
    this.transaction(() => {
      this.db.prepare('UPDATE users SET cookie_encrypted=NULL, bound=0 WHERE id=?').run(userId);
      this.db.prepare('DELETE FROM api_cache WHERE user_id=?').run(userId);
      this.db.prepare('DELETE FROM raw_responses WHERE run_id IN (SELECT id FROM collection_runs WHERE user_id=?)').run(userId);
    });
  }
  deleteUser(userId: string) { this.db.prepare('DELETE FROM users WHERE id=?').run(userId); }
  favoriteSelection(userId: string): FavoriteSelection | undefined { const row = this.db.prepare('SELECT selection_json FROM favorite_inputs WHERE user_id=?').get(userId); return row ? JSON.parse(String(row.selection_json)) : undefined; }
  saveFavoriteSelection(userId: string, selection: FavoriteSelection) { this.db.prepare('INSERT OR REPLACE INTO favorite_inputs VALUES(?,?)').run(userId, JSON.stringify(selection)); }
  createRun(userId: string, key?: string): Run {
    const id = randomUUID();
    this.db.prepare('INSERT INTO collection_runs(id,user_id,status,started_at,idempotency_key) VALUES(?,?,?,?,?)').run(id, userId, 'queued', new Date().toISOString(), key ?? null);
    return this.getRun(userId, id)!;
  }
  private run(row: Record<string, unknown>): Run { return { runId: String(row.id), userId: String(row.user_id), status: row.status as Run['status'], startedAt: String(row.started_at), finishedAt: row.finished_at as string | null, snapshotId: row.snapshot_id as string | null, unchanged: !!row.unchanged, error: row.error_json ? JSON.parse(String(row.error_json)) : null }; }
  getRun(userId: string, id: string): Run | undefined { const row = this.db.prepare('SELECT * FROM collection_runs WHERE user_id=? AND id=?').get(userId, id); return row && this.run(row); }
  findRun(userId: string, key?: string): Run | undefined {
    const row = key ? this.db.prepare('SELECT * FROM collection_runs WHERE user_id=? AND idempotency_key=?').get(userId, key) : this.db.prepare("SELECT * FROM collection_runs WHERE user_id=? AND status IN ('queued','processing')").get(userId);
    return row && this.run(row);
  }
  lastRun(userId: string): Run | undefined { const row = this.db.prepare('SELECT * FROM collection_runs WHERE user_id=? ORDER BY rowid DESC LIMIT 1').get(userId); return row && this.run(row); }
  setRun(userId: string, id: string, state: Run['status'], snapshotId: string | null = null, unchanged = false, error: Run['error'] = null) {
    this.db.prepare('UPDATE collection_runs SET status=?,finished_at=?,snapshot_id=?,unchanged=?,error_json=? WHERE user_id=? AND id=?').run(state, ['queued','processing'].includes(state) ? null : new Date().toISOString(), snapshotId, Number(unchanged), error ? JSON.stringify(error) : null, userId, id);
  }
  recoverRuns(): Run[] {
    this.db.prepare("UPDATE collection_runs SET status='queued' WHERE status='processing'").run();
    return this.db.prepare("SELECT * FROM collection_runs WHERE status='queued' ORDER BY rowid").all().map(row => this.run(row));
  }
  snapshots(userId: string, limit = 100, offset = 0): Snapshot[] { return this.db.prepare('SELECT snapshot_json FROM snapshots WHERE user_id=? ORDER BY rowid DESC LIMIT ? OFFSET ?').all(userId, limit, offset).map(row => JSON.parse(String(row.snapshot_json))); }
  snapshot(userId: string, id: string): Snapshot | undefined { const row = this.db.prepare('SELECT snapshot_json FROM snapshots WHERE user_id=? AND id=?').get(userId, id); return row && JSON.parse(String(row.snapshot_json)); }
  latest(userId: string) { return this.snapshots(userId, 1)[0]; }
  snapshotInput(userId: string, id: string): NormalizedData | undefined {
    const row = this.db.prepare('SELECT normalized_json FROM snapshots WHERE user_id=? AND id=?').get(userId, id);
    return row ? JSON.parse(String(row.normalized_json)) : undefined;
  }
  saveCollection(run: Run, normalized: NormalizedData, raw: unknown, snapshot: Snapshot, unchanged: boolean) {
    this.transaction(() => {
      if (!unchanged) {
        this.db.prepare('INSERT INTO snapshots VALUES(?,?,?,?,?,?,?)').run(snapshot.snapshotId, run.userId, snapshot.createdAt, snapshot.algorithmVersion, snapshot.checksum, JSON.stringify(snapshot), JSON.stringify(normalized));
        for (const insight of snapshot.insights) this.db.prepare('INSERT INTO insights VALUES(?,?,?)').run(insight.id, snapshot.snapshotId, JSON.stringify(insight));
      }
      for (const song of normalized.songs) {
        for (const [window, count] of [['long', song.longPlayCount], ['week', song.weekPlayCount], ['recent', song.recentPlayCount]] as const) this.db.prepare('INSERT INTO playback_records_summary VALUES(?,?,?,?)').run(run.runId, song.songId, window, count);
        this.db.prepare('INSERT INTO user_song_state VALUES(?,?,?,?) ON CONFLICT(user_id,song_id) DO UPDATE SET liked=excluded.liked,updated_at=excluded.updated_at').run(run.userId, song.songId, song.liked === null ? null : Number(song.liked), normalized.dataWindow.collectedAt);
      }
      this.db.prepare('INSERT INTO raw_responses VALUES(?,?,?)').run(run.runId, this.vault.encrypt(JSON.stringify(raw)), new Date(Date.now() + 86400000).toISOString());
      this.setRun(run.userId, run.runId, 'completed', snapshot.snapshotId, unchanged);
    });
  }
  cacheGet(userId: string, key: string): unknown | undefined {
    const row = this.db.prepare('SELECT encrypted FROM api_cache WHERE user_id=? AND key=? AND expires_at>?').get(userId, `${userId}:${key}`, new Date().toISOString());
    return row ? JSON.parse(this.vault.decrypt(String(row.encrypted))) : undefined;
  }
  cacheSet(userId: string, key: string, value: unknown, ttl: number) { this.db.prepare('INSERT OR REPLACE INTO api_cache VALUES(?,?,?,?)').run(`${userId}:${key}`, userId, this.vault.encrypt(JSON.stringify(value)), new Date(Date.now() + ttl).toISOString()); }
  metadata(id: string): unknown | undefined { const row = this.db.prepare('SELECT metadata_json FROM songs WHERE id=? AND expires_at>?').get(id, new Date().toISOString()); return row ? JSON.parse(String(row.metadata_json)) : undefined; }
  saveMetadata(id: string, value: unknown, artists: Array<{ id: string; name: string }>, album?: { id: string; name: string }) {
    this.transaction(() => {
      this.db.prepare('INSERT INTO songs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET metadata_json=excluded.metadata_json, expires_at=excluded.expires_at').run(id, JSON.stringify(value), new Date(Date.now() + 30 * 86400000).toISOString());
      this.db.prepare('DELETE FROM song_artists WHERE song_id=?').run(id);
      for (const artist of artists) { this.db.prepare('INSERT INTO artists VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').run(artist.id, artist.name); this.db.prepare('INSERT OR IGNORE INTO song_artists VALUES(?,?)').run(id, artist.id); }
      if (album) this.db.prepare('INSERT INTO albums VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').run(album.id, album.name);
    });
  }
  close() { this.db.close(); }
}
