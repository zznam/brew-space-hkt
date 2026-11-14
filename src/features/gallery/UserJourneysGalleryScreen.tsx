import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DEMO_CUSTOMER_ID, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  CollapsibleSection,
  colors,
  Heading,
  radius,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { galleryMessages, type GalleryKey } from './messages';
import {
  seedCustomerSessionAndSupport,
  seedLoyaltyHistory,
  seedPosTickets,
  seedSpeedrunDemo,
} from './seedDemo';

type JourneyCategory = 'all' | 'customer' | 'loyalty' | 'merchant' | 'ai3d';

interface JourneyStep {
  id: string;
  key: string;
  highlightCount: number;
  stepNumber: string;
  journey: Exclude<JourneyCategory, 'all'>;
  route: string;
  roleBadge: 'Customer' | 'Merchant';
  onLaunch: () => void;
}

const JOURNEY_KEYS = {
  customer: 'journeyCustomer',
  loyalty: 'journeyLoyalty',
  merchant: 'journeyMerchant',
  ai3d: 'journeyAi3d',
} as const;

export function UserJourneysGalleryScreen() {
  const router = useRouter();
  const { isWide } = useResponsive();
  const { t, lang } = useT(galleryMessages);
  const venueId = useAppStore((s) => s.venueId);
  const sessions = useAppStore((s) => s.sessions);
  const setRole = useAppStore((s) => s.setRole);

  const [activeCategory, setActiveCategory] = useState<JourneyCategory>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const venue = getVenue(venueId);
  const venueSessions = sessions.filter((s) => s.venueId === venueId);
  const customerSession = venueSessions.find(
    (s) => s.customerId === DEMO_CUSTOMER_ID,
  );
  const customerSeat = customerSession
    ? venue.seats.find((s) => s.id === customerSession.seatId)
    : undefined;

  const steps: JourneyStep[] = [
    // Journey 1: Customer Space Discovery, 3D Seat Picking & Live Session
    {
      id: 'cust-explore',
      key: 'custExplore',
      highlightCount: 4,
      stepNumber: '1.1',
      journey: 'customer',
      route: '/customer/explore',
      roleBadge: 'Customer',
      onLaunch: () => {
        seedLoyaltyHistory();
        setRole('customer');
        router.push('/customer/explore' as never);
      },
    },
    {
      id: 'cust-deeplink',
      key: 'custDeeplink',
      highlightCount: 3,
      stepNumber: '1.2',
      journey: 'customer',
      route: `/customer/explore?venue=${venueId}&seat=${venue.seats[0]?.id ?? 's-1'}`,
      roleBadge: 'Customer',
      onLaunch: () => {
        setRole('customer');
        const seatId = venue.seats[0]?.id ?? 's-1';
        router.push(
          `/customer/explore?venue=${venueId}&seat=${seatId}` as never,
        );
      },
    },
    {
      id: 'cust-session',
      key: 'custSession',
      highlightCount: 4,
      stepNumber: '1.3',
      journey: 'customer',
      route: '/customer/active-session',
      roleBadge: 'Customer',
      onLaunch: () => {
        seedLoyaltyHistory();
        seedCustomerSessionAndSupport();
        setRole('customer');
        setStatusMessage(t('prepared'));
        router.push('/customer/active-session' as never);
      },
    },
    {
      id: 'cust-receipt',
      key: 'custReceipt',
      highlightCount: 3,
      stepNumber: '1.4',
      journey: 'customer',
      route: '/customer/receipt',
      roleBadge: 'Customer',
      onLaunch: () => {
        seedLoyaltyHistory();
        seedCustomerSessionAndSupport();
        setRole('customer');
        router.push('/customer/receipt' as never);
      },
    },

    // Journey 2: Customer Loyalty, Privacy & Bilingual Concierge
    {
      id: 'loyalty-profile',
      key: 'loyaltyProfile',
      highlightCount: 4,
      stepNumber: '2.1',
      journey: 'loyalty',
      route: '/customer/profile',
      roleBadge: 'Customer',
      onLaunch: () => {
        seedLoyaltyHistory();
        setRole('customer');
        router.push('/customer/profile' as never);
      },
    },
    {
      id: 'loyalty-privacy',
      key: 'loyaltyPrivacy',
      highlightCount: 2,
      stepNumber: '2.2',
      journey: 'loyalty',
      route: '/customer/privacy',
      roleBadge: 'Customer',
      onLaunch: () => {
        setRole('customer');
        router.push('/customer/privacy' as never);
      },
    },
    {
      id: 'loyalty-concierge',
      key: 'loyaltyConcierge',
      highlightCount: 3,
      stepNumber: '2.3',
      journey: 'loyalty',
      route: '/customer/assistant',
      roleBadge: 'Customer',
      onLaunch: () => {
        setRole('customer');
        router.push('/customer/assistant' as never);
      },
    },

    // Journey 3: Merchant Live Floor, POS & Ticket Board
    {
      id: 'merch-floor',
      key: 'merchFloor',
      highlightCount: 3,
      stepNumber: '3.1',
      journey: 'merchant',
      route: '/merchant/live-floor',
      roleBadge: 'Merchant',
      onLaunch: () => {
        setRole('merchant');
        router.push('/merchant/live-floor' as never);
      },
    },
    {
      id: 'merch-pos',
      key: 'merchPos',
      highlightCount: 3,
      stepNumber: '3.2',
      journey: 'merchant',
      route: '/merchant/pos',
      roleBadge: 'Merchant',
      onLaunch: () => {
        seedPosTickets();
        setRole('merchant');
        router.push('/merchant/pos' as never);
      },
    },
    {
      id: 'merch-tickets',
      key: 'merchTickets',
      highlightCount: 3,
      stepNumber: '3.3',
      journey: 'merchant',
      route: '/merchant/tickets',
      roleBadge: 'Merchant',
      onLaunch: () => {
        seedPosTickets();
        setRole('merchant');
        router.push('/merchant/tickets' as never);
      },
    },

    // Journey 4: Merchant AI 3D Onboarding Studio
    {
      id: 'ai-onboarding',
      key: 'aiOnboarding',
      highlightCount: 4,
      stepNumber: '4.1',
      journey: 'ai3d',
      route: '/merchant/onboarding',
      roleBadge: 'Merchant',
      onLaunch: () => {
        setRole('merchant');
        router.push('/merchant/onboarding' as never);
      },
    },
  ];

  const visibleSteps =
    activeCategory === 'all'
      ? steps
      : steps.filter((step) => step.journey === activeCategory);

  const categories: { id: JourneyCategory; label: GalleryKey }[] = [
    { id: 'all', label: 'catAll' },
    { id: 'customer', label: 'catCustomer' },
    { id: 'loyalty', label: 'catLoyalty' },
    { id: 'merchant', label: 'catMerchant' },
    { id: 'ai3d', label: 'catAi3d' },
  ];
  const countFor = (id: JourneyCategory) =>
    id === 'all'
      ? steps.length
      : steps.filter((step) => step.journey === id).length;
  const copy = (step: JourneyStep, part: string) =>
    t(`${step.key}.${part}` as GalleryKey);

  // Steps arrive ordered by journey, so consecutive runs form the groups.
  const groups: { journey: JourneyStep['journey']; steps: JourneyStep[] }[] =
    [];
  for (const step of visibleSteps) {
    const last = groups[groups.length - 1];
    if (last && last.journey === step.journey) last.steps.push(step);
    else groups.push({ journey: step.journey, steps: [step] });
  }

  return (
    <Screen>
      <ScreenHeader
        overline={t('overline')}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <View style={styles.row}>
        <Badge label={venue.name} tone="success" />
        <Badge
          label={t('activeSessions', { n: venueSessions.length })}
          tone="info"
        />
        <Badge
          label={
            customerSession
              ? t('yourSession', {
                  seat: seatLabelText(
                    customerSeat?.label ?? customerSession.seatId,
                    lang,
                  ),
                  minutes: customerSession.elapsedMinutes,
                })
              : t('noSession')
          }
          tone={customerSession ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.row}>
        <Button
          label={t('speedrunCta')}
          variant="primary"
          fullWidth={!isWide}
          onPress={() => {
            seedSpeedrunDemo();
            setStatusMessage(t('speedrunDone'));
          }}
        />
      </View>

      {statusMessage ? (
        <Banner tone="success" role="alert">
          {statusMessage}
        </Banner>
      ) : null}

      <View style={styles.row}>
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={t('catChip', { label: t(cat.label), n: countFor(cat.id) })}
            accessibilityLabel={t('catA11y', {
              label: t(cat.label),
              n: countFor(cat.id),
            })}
            selected={activeCategory === cat.id}
            onPress={() => setActiveCategory(cat.id)}
          />
        ))}
      </View>

      {groups.map((group) => (
        <View key={group.journey} style={{ gap: space.md }}>
          <Heading style={{ marginTop: space.sm }}>
            {t(JOURNEY_KEYS[group.journey])}
          </Heading>
          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              flexWrap: isWide ? 'wrap' : 'nowrap',
              gap: space.md,
            }}
          >
            {group.steps.map((step) => (
              <Card
                key={step.id}
                style={
                  isWide ? { width: '48.5%', flexGrow: 1 } : { width: '100%' }
                }
              >
                <View style={{ gap: space.xs }}>
                  <View style={styles.row}>
                    <Badge
                      label={t('stepBadge', {
                        n: step.stepNumber,
                        role: t(
                          step.roleBadge === 'Customer'
                            ? 'roleCustomer'
                            : 'roleMerchant',
                        ),
                      })}
                      tone={step.roleBadge === 'Customer' ? 'success' : 'info'}
                    />
                  </View>
                  <Heading level={2}>{copy(step, 'title')}</Heading>
                  <Text style={styles.text}>{copy(step, 'summary')}</Text>
                </View>

                <CollapsibleSection
                  title={t('lookFor')}
                  summary={t('highlightCount', { n: step.highlightCount })}
                >
                  {Array.from({ length: step.highlightCount }, (_, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: space.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          marginTop: space.sm - 2,
                          borderRadius: radius.pill,
                          backgroundColor: colors.green,
                        }}
                      />
                      <Text
                        style={[styles.caption, { flex: 1, color: colors.ink }]}
                      >
                        {copy(step, `h${index + 1}`)}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.caption} numberOfLines={1}>
                    {t('opens', { route: step.route })}
                  </Text>
                </CollapsibleSection>

                <Button
                  label={copy(step, 'cta')}
                  onPress={step.onLaunch}
                  variant="secondary"
                  fullWidth={!isWide}
                />
              </Card>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
