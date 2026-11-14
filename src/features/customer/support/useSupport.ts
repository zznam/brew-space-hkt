import { useStore } from 'zustand';
import { createSupportStore, type SupportStore } from './supportStore';

/** In-memory singleton on purpose: support requests, the last receipt and
 * ratings are demo-only and reset on reload. They are never written to the
 * core persisted snapshot (`vibing-hkt:demo:v1`), so no storage migration is
 * needed and this module stays free of native storage imports. */
export const supportStore = createSupportStore();
export const useSupport = <T>(selector: (state: SupportStore) => T) =>
  useStore(supportStore, selector);
