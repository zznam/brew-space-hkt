import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Heading, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages } from './messages';
import { RatingForm } from './RatingForm';
import { RefundRequestCard } from './RefundRequestCard';
import { ReceiptView } from './ReceiptView';
import { useSupport } from './useSupport';

export function ReceiptScreen() {
  const { t } = useT(supportMessages);
  const receipt = useSupport((state) => state.lastReceipt);
  if (!receipt)
    return (
      <Card>
        <Heading>{t('noVisitHeading')}</Heading>
        <Text style={styles.text}>{t('noVisitBody')}</Text>
        <Button
          label={t('exploreSeats')}
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
        label={t('backToExplore')}
        onPress={() => router.replace('/customer/explore')}
      />
    </View>
  );
}
