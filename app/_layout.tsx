import { useEffect, useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeStore, useAppStore } from '@/core/useAppStore';
import { initializeCatalogue } from '@/core/catalogue/useCatalogue';
import { initializeLoyalty } from '@/features/customer/loyalty/useLoyalty';
import { seedSpeedrunDemo } from '@/features/gallery/seedDemo';
import { posStore } from '@/features/merchant/pos/usePosStore';
import { SimulatorBar } from '@/components/SimulatorBar';
import {
  Banner,
  Card,
  colors,
  IconButton,
  layout,
  radius,
  space,
  styles,
  type,
  useResponsive,
} from '@/components/ui';
import { LanguageToggle } from '@/i18n/LanguageToggle';
import { useT } from '@/i18n/useLanguage';
import { shellMessages } from '@/components/messages';
import { AccessNav } from '@/features/access/AccessNav';
import {
  CustomerNav,
  customerTabForPath,
} from '@/features/customer/shared/CustomerNav';
import {
  MerchantNav,
  merchantTabForPath,
} from '@/features/merchant/MerchantNav';
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const role = useAppStore((s) => s.role);
  const { isWide } = useResponsive();
  const { t } = useT(shellMessages);
  const onGallery = pathname === '/gallery';
  const onApiRoute =
    pathname.startsWith('/staff') ||
    pathname.startsWith('/v/') ||
    pathname === '/platform';

  useEffect(() => {
    let active = true;
    const init =
      Platform.OS === 'web'
        ? initializeStore()
        : Promise.all([initializeStore(), initializeLoyalty()]).then(
            ([message, loyaltyMessage]) => message ?? loyaltyMessage,
          );
    void init.then(async (message) => {
      await initializeCatalogue();
      if (active) {
        if (Platform.OS !== 'web' && posStore.getState().orders.length === 0) {
          seedSpeedrunDemo();
        }
        setWarning(message);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.paper }}
        >
          {/* App bar */}
          <View
            style={{
              minHeight: layout.appBarHeight,
              paddingHorizontal: space.lg,
              paddingVertical: space.sm,
              backgroundColor: colors.surface,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.sm,
                  backgroundColor: colors.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...type.label, color: colors.onPrimary }}>
                  B
                </Text>
              </View>
              <Text style={{ ...type.headline, color: colors.ink }}>
                BrewSpace
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
              }}
            >
              {ready ? <LanguageToggle /> : null}
              {!onApiRoute ? (
                <IconButton
                  accessibilityLabel={t('staffSignIn')}
                  icon="member"
                  onPress={() => router.push('/staff' as never)}
                />
              ) : null}
              {!onApiRoute ? (
                <IconButton
                  icon="journeys"
                  selected={onGallery}
                  accessibilityLabel={
                    onGallery ? t('closeJourneys') : t('openJourneys')
                  }
                  onPress={() => {
                    if (onGallery) {
                      router.push(
                        (role === 'merchant'
                          ? '/merchant/live-floor'
                          : '/customer/explore') as never,
                      );
                    } else {
                      router.push('/gallery' as never);
                    }
                  }}
                />
              ) : null}
            </View>
          </View>

          {ready && !onApiRoute ? <SimulatorBar /> : null}

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: isWide ? space.xxl : layout.screenPadding,
              paddingTop: space.lg,
              paddingBottom: space.xxxl,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: layout.contentMaxWidth,
                gap: space.lg,
              }}
            >
              {!ready && !onApiRoute ? (
                <Card>
                  <Text style={styles.subheading}>{t('loadingTitle')}</Text>
                  <Text style={styles.text}>{t('loadingBody')}</Text>
                </Card>
              ) : (
                <>
                  {warning && !onApiRoute ? (
                    <Banner tone="warning" role="alert">
                      {warning.includes('incompatible')
                        ? t('warnIncompatible')
                        : warning.includes('could not be loaded')
                          ? t('warnUnreadable')
                          : warning}
                    </Banner>
                  ) : null}
                  <Slot />
                </>
              )}
            </View>
          </ScrollView>

          {onApiRoute ? (
            <AccessNav pathname={pathname} />
          ) : ready && !onGallery && pathname !== '/' ? (
            role === 'merchant' ? (
              <MerchantNav current={merchantTabForPath(pathname)} />
            ) : (
              <CustomerNav current={customerTabForPath(pathname)} />
            )
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
