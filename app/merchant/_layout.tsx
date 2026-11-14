import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { appStore } from '@/core/useAppStore';
export default function MerchantLayout() {
  useEffect(() => appStore.getState().setRole('merchant'), []);
  return <Slot />;
}
