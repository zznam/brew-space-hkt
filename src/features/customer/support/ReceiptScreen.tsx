import { router } from 'expo-router';
import { Text, View } from 'react-native';
import {
  Button,
  Card,
  Eyebrow,
  Heading,
  styles,
  useResponsive,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { CustomerNav } from '../shared/CustomerNav';
import { supportMessages } from './messages';
import { RatingForm } from './RatingForm';
import { RefundRequestCard } from './RefundRequestCard';
import { ReceiptView } from './ReceiptView';
import { useSupport } from './useSupport';

export function ReceiptScreen() {
  const { t } = useT(supportMessages);
  const { isWide } = useResponsive();
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
            fullWidth={!isWide}
            label={t('exploreSeats')}
            onPress={() => router.replace('/customer/explore')}
          />
        </View>
      </Card>
    );
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <CustomerNav current="session" />
      </Card>
      <ReceiptView receipt={receipt} />
      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        <View style={isWide ? { flex: 1 } : undefined}>
          <RefundRequestCard receipt={receipt} />
        </View>
        <View style={isWide ? { flex: 1 } : undefined}>
          <RatingForm sessionId={receipt.sessionId} />
        </View>
      </View>
      <View style={styles.row}>
        <Button
          variant="primary"
          fullWidth={!isWide}
          label={t('backToExplore')}
          onPress={() => router.replace('/customer/explore')}
        />
      </View>
    </View>
  );
}
