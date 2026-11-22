import type { Db, Ms } from './types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function nextId(db: Db, prefix: string): string {
  db.seq += 1;
  return `${prefix}_${db.seq.toString(36).padStart(5, '0')}`;
}

/** mulberry32 over state kept in the database, for reproducible local
 * simulations. This PRNG is not cryptographically secure; its tokens must never
 * be used as production credentials. */
export function rand(db: Db): number {
  db.rng = (db.rng + 0x6d2b79f5) | 0;
  let t = db.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const HEX = '0123456789abcdef';
export function token(db: Db, length = 32): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += HEX[Math.floor(rand(db) * 16)];
  return out;
}
/** No 0/O/1/I/L, so a code survives being read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function shortCode(db: Db, length = 8): string {
  let out = '';
  for (let i = 0; i < length; i += 1)
    out += CODE_ALPHABET[Math.floor(rand(db) * CODE_ALPHABET.length)];
  return out;
}

function fnv1a(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
/** Demo digest. Stands in for a real hash/HMAC; never use it to protect money. */
export function hash(text: string): string {
  return (
    fnv1a(text, 0x811c9dc5).toString(16).padStart(8, '0') +
    fnv1a(text, 0x01000193).toString(16).padStart(8, '0')
  );
}
export const sign = (secret: string, payload: string) =>
  hash(`${secret}|${payload}`);

/** Stable JSON with sorted keys, for idempotency payload comparison. */
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export const hm = (time: string): number => {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
};
export const isHm = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value);
export const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Wall-clock parts of `ms` in a zone `offsetMinutes` ahead of UTC. */
export function local(ms: Ms, offsetMinutes: number) {
  const d = new Date(ms + offsetMinutes * MIN);
  return {
    date: d.toISOString().slice(0, 10),
    dow: d.getUTCDay(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}
export function localToUtc(
  date: string,
  minutes: number,
  offsetMinutes: number,
): Ms {
  return Date.parse(`${date}T00:00:00Z`) + (minutes - offsetMinutes) * MIN;
}
/** `YYYY-MM-DD HH:MM` in the branch timezone. */
export function formatLocal(ms: Ms, offsetMinutes: number): string {
  return new Date(ms + offsetMinutes * MIN)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
}

export const isMoney = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export const isText = (value: unknown, max = 200): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
export const overlaps = (a0: Ms, a1: Ms, b0: Ms, b1: Ms) => a0 < b1 && b0 < a1;
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  return sorted.length % 2 ? hi : Math.round(((sorted[mid - 1] ?? 0) + hi) / 2);
}
