import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { appStore } from '@/core/useAppStore';
export default function CustomerLayout() {
  useEffect(() => appStore.getState().setRole('customer'), []);
  return <Slot />;
}
