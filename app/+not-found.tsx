import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Eyebrow, Heading, styles } from '@/components/ui';

export default function NotFound() {
  return (
    <Card>
      <Eyebrow>NAVIGATION / 404</Eyebrow>
      <Heading>Page not found</Heading>
      <Text style={styles.text}>This route is not part of the app yet.</Text>
      <View style={styles.row}>
        <Button
          label="Return to live floor"
          variant="primary"
          onPress={() => router.replace('/merchant/live-floor')}
        />
        <Button
          label="Open Customer Explore"
          onPress={() => router.replace('/customer/explore')}
        />
      </View>
    </Card>
  );
}
