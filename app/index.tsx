import { Redirect } from 'expo-router';
import { useAppStore } from '@/core/useAppStore';
export default function Index() {
  const role = useAppStore((state) => state.role);
  return (
    <Redirect
      href={role === 'merchant' ? '/merchant/live-floor' : '/customer/explore'}
    />
  );
}
