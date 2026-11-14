import { router } from 'expo-router';
import { View } from 'react-native';
import {
  Button,
  EmptyState,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
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
      <Screen>
        <ScreenHeader
          overline="CUSTOMER / VISIT SUMMARY"
          title={t('noVisitHeading')}
        />
        <EmptyState message={t('noVisitBody')}>
          <Button
            variant="primary"
            fullWidth={!isWide}
            label={t('exploreSeats')}
            onPress={() => router.replace('/customer/explore')}
          />
        </EmptyState>
      </Screen>
    );
  return (
    <Screen>
      <ReceiptView receipt={receipt} />
      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: space.lg,
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
    </Screen>
  );
}
