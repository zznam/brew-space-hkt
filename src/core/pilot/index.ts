/** Separate namespace: this prototype never changes the existing app or POS stores. */
export { createPilotEngine } from './engine';
export type { Command, Reply } from './engine';
export { createPilotWorld } from './fixtures';
export { PilotError, ERROR_CODES } from './errors';
export type { ErrorCode } from './errors';
export type { Auth, World } from './types';
