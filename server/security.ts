import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import type { Deps } from '../src/core/pilot/types';

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: Buffer) =>
  scryptSync(password, salt, 32, options);
const dummySalt = Buffer.alloc(16);

/** No deterministic demo crypto is used by the network service. */
export const credentials: NonNullable<Deps['credentials']> = {
  hashPassword(_email, password) {
    const salt = randomBytes(16);
    return `scrypt-v1:${salt.toString('hex')}:${derive(password, salt).toString('hex')}`;
  },
  verifyPassword(_email, password, digest) {
    const match = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(
      digest ?? '',
    );
    // Unknown users do the same expensive work; stored hashes fix the cost parameters.
    const actual = derive(
      password,
      match ? Buffer.from(match[1]!, 'hex') : dummySalt,
    );
    return (
      match !== null && timingSafeEqual(actual, Buffer.from(match[2]!, 'hex'))
    );
  },
  newToken: () => randomBytes(32).toString('hex'),
  tokenDigest: (token) => createHash('sha256').update(token).digest('hex'),
};
