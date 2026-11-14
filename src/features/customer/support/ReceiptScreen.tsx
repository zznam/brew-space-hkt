import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Eyebrow, Heading, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { CustomerNav } from '../shared/CustomerNav';
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
        <CustomerNav current="session" />
        <Eyebrow>CUSTOMER / VISIT SUMMARY</Eyebrow>
        <Heading>{t('noVisitHeading')}</Heading>
        <Text style={styles.text}>{t('noVisitBody')}</Text>
        <View style={styles.row}>
          <Button
            variant="primary"
            label={t('exploreSeats')}
            onPress={() => router.replace('/customer/explore')}
          />
        </View>
      </Card>
    );
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <CustomerNav current="session" />
      </Card>
      <ReceiptView receipt={receipt} />
      <RefundRequestCard receipt={receipt} />
      <RatingForm sessionId={receipt.sessionId} />
      <View style={styles.row}>
        <Button
          variant="primary"
          label={t('backToExplore')}
          onPress={() => router.replace('/customer/explore')}
        />
      </View>
    </View>
  );
}
