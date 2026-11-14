import { useStore } from 'zustand';
import { createPosStore, type PosStore } from './posStore';

export const posStore = createPosStore();
export const usePosStore = <T>(selector: (state: PosStore) => T) =>
  useStore(posStore, selector);
