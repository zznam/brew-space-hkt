import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Heading } from '@/components/ui';
export default function NotFound() {
  return (
    <Card>
      <Heading>Page not found</Heading>
      <Text>This route is not part of the app yet.</Text>
      <Button
        label="Return to live floor"
        onPress={() => router.replace('/merchant/live-floor')}
      />
    </Card>
  );
}
