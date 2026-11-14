import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Heading, styles } from '@/components/ui';
import { RatingForm } from './RatingForm';
import { RefundRequestCard } from './RefundRequestCard';
import { ReceiptView } from './ReceiptView';
import { useSupport } from './useSupport';

export function ReceiptScreen() {
  const receipt = useSupport((state) => state.lastReceipt);
  if (!receipt)
    return (
      <Card>
        <Heading>No recent visit</Heading>
        <Text style={styles.text}>
          Your receipt appears here after you end a session.
        </Text>
        <Button
          label="Explore seats"
          onPress={() => router.replace('/customer/explore')}
        />
      </Card>
    );
  return (
    <View style={{ gap: 16 }}>
      <ReceiptView receipt={receipt} />
      <RefundRequestCard receipt={receipt} />
      <RatingForm sessionId={receipt.sessionId} />
      <Button
        label="Back to explore"
        onPress={() => router.replace('/customer/explore')}
      />
    </View>
  );
}
