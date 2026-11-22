import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  createPilotEngine,
  type Command,
  type Input,
} from '../src/core/pilot/engine';
import { createPilotWorld } from '../src/core/pilot/fixtures';
import type { Auth, World } from '../src/core/pilot/types';
import { credentials } from './security';

/** One serialized aggregate for the first API slice. No stale per-process cache.
 * BEGIN IMMEDIATE protects read/validate/write across connections and processes.
 * Refusal-side rate limits are committed too. Never reseed a damaged database. */
export function openDatabase(path: string, clock = Date.now) {
  if (path !== ':memory:')
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec(`PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL, world TEXT NOT NULL CHECK (json_valid(world))) STRICT;
    CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, hits TEXT NOT NULL) STRICT;`);
  const read = db.prepare('SELECT version, world FROM state WHERE id = 1');
  const save = db.prepare('UPDATE state SET world = ? WHERE id = 1');
  function transaction<T>(run: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = run();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  function world(): World {
    const row = read.get();
    if (!row || row.version !== 1 || typeof row.world !== 'string')
      throw new Error(
        'Database is uninitialized or has an unsupported schema.',
      );
    const result = JSON.parse(row.world) as World;
    if (result.db?.schema !== 1 || !Array.isArray(result.db.tenants))
      throw new Error('Invalid database state. Restore a verified backup.');
    return result;
  }
  return {
    initialized: () => read.get() !== undefined,
    /** Explicit one-time local provisioning; no bootstrap HTTP endpoint. */
    bootstrap(email: string, password: string) {
      if (
        !/^\S+@\S+\.\S+$/.test(email) ||
        email.length > 254 ||
        password.length < 12 ||
        password.length > 100
      )
        throw new Error(
          'Use a valid admin email and a 12–100 character password.',
        );
      transaction(() => {
        if (read.get()) throw new Error('Database is already initialized.');
        const initial = createPilotWorld(clock(), 1, []);
        initial.db.secrets.webhook = '';
        initial.db.assets = []; // Real approved assets are provisioned separately.
        initial.db.platformAdmins = [
          {
            id: 'platform',
            name: 'Platform administrator',
            email: email.trim().toLowerCase(),
            passwordHash: credentials.hashPassword(email, password),
          },
        ];
        db.prepare(
          'INSERT INTO state (id, version, world) VALUES (1, 1, ?)',
        ).run(JSON.stringify(initial));
      });
    },
    execute<K extends Command>(command: K, input: Input<K>, auth: Auth = {}) {
      return transaction(() => {
        const engine = createPilotEngine(world(), { credentials }, clock);
        const result = engine.execute(command, input, auth);
        save.run(JSON.stringify(engine.snapshot()));
        return result;
      });
    },
    /** IP limit is independent of body/email so rotating usernames cannot evade it. */
    allowRequest(key: string, limit: number, windowMs: number): boolean {
      return transaction(() => {
        const now = clock();
        const row = db
          .prepare('SELECT hits FROM request_limits WHERE key = ?')
          .get(key);
        const hits = row
          ? (JSON.parse(row.hits as string) as number[]).filter(
              (t) => t > now - windowMs,
            )
          : [];
        if (hits.length >= limit) return false;
        hits.push(now);
        db.prepare(
          'INSERT INTO request_limits (key, hits) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET hits = excluded.hits',
        ).run(key, JSON.stringify(hits));
        return true;
      });
    },
    close: () => db.close(),
  };
}
export type AppDatabase = ReturnType<typeof openDatabase>;
