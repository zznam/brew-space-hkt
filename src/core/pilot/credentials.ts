import type { Tx } from './types';
import { hash, token } from './util';

/** Deterministic defaults are for the offline demo only. The API injects crypto. */
export const demoPasswordHash = (email: string, password: string) =>
  hash(`${email.toLowerCase()}:${password}`);
export const hashPassword = (tx: Tx, email: string, password: string) =>
  (tx.deps.credentials?.hashPassword ?? demoPasswordHash)(email, password);
export const verifyPassword = (
  tx: Tx,
  email: string,
  password: string,
  digest?: string,
) =>
  tx.deps.credentials
    ? tx.deps.credentials.verifyPassword(email, password, digest)
    : digest !== undefined && digest === demoPasswordHash(email, password);
export const newSessionToken = (tx: Tx) =>
  tx.deps.credentials?.newToken() ?? token(tx.db);
export const sessionDigest = (tx: Tx, value: string) =>
  tx.deps.credentials?.tokenDigest(value) ?? value;
