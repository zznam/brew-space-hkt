import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DEMO_CUSTOMER_ID, getVenue } from '@/core';
import { appStore, useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  Eyebrow,
  radius,
  StatTile,
  styles,
  type,
  useResponsive,
  space,
} from '@/components/ui';

type JourneyCategory = 'all' | 'customer' | 'loyalty' | 'merchant' | 'ai3d';

interface JourneyStep {
  id: string;
  stepNumber: string;
  journey: Exclude<JourneyCategory, 'all'>;
  journeyLabel: string;
  title: string;
  route: string;
  roleBadge: 'Customer' | 'Merchant';
  summary: string;
  highlights: string[];
  ctaLabel: string;
  onLaunch: () => void;
}

export function UserJourneysGalleryScreen() {
  const router = useRouter();
  const { isWide } = useResponsive();
  const venueId = useAppStore((s) => s.venueId);
  const sessions = useAppStore((s) => s.sessions);
  const setRole = useAppStore((s) => s.setRole);
  const selectSeat = useAppStore((s) => s.selectSeat);
  const startSession = useAppStore((s) => s.startSession);
  const advanceTime = useAppStore((s) => s.advanceTime);
  const addItem = useAppStore((s) => s.addItem);

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

  const ensureCustomerSession = () => {
    setRole('customer');
    const currentSessions = appStore
      .getState()
      .sessions.filter((s) => s.venueId === venueId);
    const existing = currentSessions.find(
      (s) => s.customerId === DEMO_CUSTOMER_ID,
    );
    if (existing) {
      return existing.id;
    }
    const occupiedIds = new Set(currentSessions.map((s) => s.seatId));
    const freeSeat =
      venue.seats.find((s) => !occupiedIds.has(s.id)) ?? venue.seats[0];
    if (freeSeat) {
      selectSeat(freeSeat.id);
      startSession('METERED_OPEN');
      const created = appStore
        .getState()
        .sessions.find(
          (s) => s.venueId === venueId && s.customerId === DEMO_CUSTOMER_ID,
        );
      if (created && venue.menu[0]) {
        addItem(created.id, venue.menu[0].id);
        advanceTime();
        return created.id;
      }
    }
    return null;
  };

  const steps: JourneyStep[] = [
    // Journey 1: Customer Space Discovery, 3D Seat Picking & Live Session
    {
      id: 'cust-explore',
      stepNumber: '1.1',
      journey: 'customer',
      journeyLabel: 'Journey 1 · Customer Space & Session',
      title: 'Explore & 3D Floor Discovery',
      route: '/customer/explore',
      roleBadge: 'Customer',
      summary:
        'Browse real-time seat availability, filter by amenity tags (Quiet, Power Outlet, Monitor, Window), and inspect the interactive 3D floor map or accessible seat list.',
      highlights: [
        'Hero availability banner with free/occupied KPIs & hourly pricing range',
        'Multi-amenity filter pills with live match counter',
        'Interactive 3D Orbit Floor Map with floating HUD & accessible list fallback',
        'Seat Detail preview drawer with deep-link share URL & package vs hourly selector',
      ],
      ctaLabel: 'Open Explore & 3D Map',
      onLaunch: () => {
        setRole('customer');
        router.push('/customer/explore' as never);
      },
    },
    {
      id: 'cust-deeplink',
      stepNumber: '1.2',
      journey: 'customer',
      journeyLabel: 'Journey 1 · Customer Space & Session',
      title: 'Shared Seat Deep Link (?venue & ?seat)',
      route: `/customer/explore?venue=${venueId}&seat=${venue.seats[0]?.id ?? 's-1'}`,
      roleBadge: 'Customer',
      summary:
        'Deep-linked seat invitation shared by a teammate that preselects the venue and seat, highlights zone details, and opens the check-in card immediately.',
      highlights: [
        'Automatic venue and seat preselection via query parameters',
        'Contextual deep-link banner confirming the shared seat selection',
        'Venue showcase card with zone breakdown, Wi-Fi credentials, and house rules',
      ],
      ctaLabel: 'Launch Shared Seat Link',
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
      stepNumber: '1.3',
      journey: 'customer',
      journeyLabel: 'Journey 1 · Customer Space & Session',
      title: 'Live Workspace Session, Menu Cart & Focus Timer',
      route: '/customer/active-session',
      roleBadge: 'Customer',
      summary:
        'Active customer dashboard displaying running bill breakdown, Pomodoro focus timer, customized drink ordering (milk/ice/sweetness), order history, and table support.',
      highlights: [
        'Elevated dark live-bill summary with seat charge + itemized orders',
        'Interactive Focus Timer with preset durations (15m / 25m / 45m)',
        'Expandable drink customization drawer & cart with loyalty point redemption',
        'Quick staff call buttons (Water, Power/Adapter, Clean Table, Bill Help)',
      ],
      ctaLabel: 'Launch Active Session',
      onLaunch: () => {
        ensureCustomerSession();
        setStatusMessage('Prepared active customer session with sample drink.');
        router.push('/customer/active-session' as never);
      },
    },
    {
      id: 'cust-receipt',
      stepNumber: '1.4',
      journey: 'customer',
      journeyLabel: 'Journey 1 · Customer Space & Session',
      title: 'Digital Receipt, Refund Request & 5-Star Rating',
      route: '/customer/receipt',
      roleBadge: 'Customer',
      summary:
        'Post-checkout itemized invoice showing VAT breakdown, loyalty points earned, self-serve refund request tracking, and customer feedback rating.',
      highlights: [
        'Monospace receipt header with invoice ID, timestamps, and tax summary',
        'Self-serve issue & refund request card with live review status badge',
        'Interactive 1–5 star rating widget with comment submission',
      ],
      ctaLabel: 'Open Receipt & Feedback',
      onLaunch: () => {
        ensureCustomerSession();
        router.push('/customer/receipt' as never);
      },
    },

    // Journey 2: Customer Loyalty, Privacy & Bilingual Concierge
    {
      id: 'loyalty-profile',
      stepNumber: '2.1',
      journey: 'loyalty',
      journeyLabel: 'Journey 2 · Loyalty, Privacy & Concierge',
      title: 'Member OTP Login, Loyalty Tier & Drink Preferences',
      route: '/customer/profile',
      roleBadge: 'Customer',
      summary:
        'Phone + OTP verification flow (demo code 123456), member tier progression (Bronze → Silver → Gold), milestone badges, and saved barista preferences.',
      highlights: [
        'One-tap demo OTP verification or guest preview mode',
        'Tier progress bar with lifetime points and redeemable VND balance',
        'Saved default milk, ice, sweetness, and dietary notes for faster ordering',
        'Achievement badge grid with unlock progress bars',
      ],
      ctaLabel: 'Open Loyalty Profile',
      onLaunch: () => {
        setRole('customer');
        router.push('/customer/profile' as never);
      },
    },
    {
      id: 'loyalty-privacy',
      stepNumber: '2.2',
      journey: 'loyalty',
      journeyLabel: 'Journey 2 · Loyalty, Privacy & Concierge',
      title: 'Transparency & Personal Data Controls',
      route: '/customer/privacy',
      roleBadge: 'Customer',
      summary:
        'Clear breakdown of locally stored session, loyalty, and preference records with one-click personal data erasure.',
      highlights: [
        'Structured inventory of stored data categories',
        'Two-step confirmation flow to wipe personal profile & local history',
      ],
      ctaLabel: 'Open Privacy Controls',
      onLaunch: () => {
        setRole('customer');
        router.push('/customer/privacy' as never);
      },
    },
    {
      id: 'loyalty-concierge',
      stepNumber: '2.3',
      journey: 'loyalty',
      journeyLabel: 'Journey 2 · Loyalty, Privacy & Concierge',
      title: 'Bilingual (EN / VI) Venue Concierge Assistant',
      route: '/customer/assistant',
      roleBadge: 'Customer',
      summary:
        'Instant Q&A assistant answering Wi-Fi, quiet seat recommendations, power outlets, pricing, and drink picks using live venue state.',
      highlights: [
        'Quick-tap topic chips for Wi-Fi, Quiet Seats, Power, Pricing, and Drinks',
        'Conversational message bubbles with live seat availability lookups',
        'Full English & Tiếng Việt language toggle support across customer chrome',
      ],
      ctaLabel: 'Open Venue Concierge',
      onLaunch: () => {
        setRole('customer');
        router.push('/customer/assistant' as never);
      },
    },

    // Journey 3: Merchant Live Floor, POS & Ticket Board
    {
      id: 'merch-floor',
      stepNumber: '3.1',
      journey: 'merchant',
      journeyLabel: 'Journey 3 · Merchant Floor, POS & Kitchen',
      title: 'Live Floor Command Center & Session Inspector',
      route: '/merchant/live-floor',
      roleBadge: 'Merchant',
      summary:
        'Real-time operational overview with occupancy rate, active tabs, accrued revenue KPIs, 3D floor map, seat inspector, and active session table.',
      highlights: [
        '4-tile KPI strip (Occupancy %, Occupied vs Free, Open Tabs, Live Revenue)',
        'Side-by-side 3D floor map and contextual Seat Inspector panel',
        'One-click Hourly or 3-Hour Study Pass check-in, quick drink add, and checkout',
      ],
      ctaLabel: 'Open Merchant Floor',
      onLaunch: () => {
        setRole('merchant');
        router.push('/merchant/live-floor' as never);
      },
    },
    {
      id: 'merch-pos',
      stepNumber: '3.2',
      journey: 'merchant',
      journeyLabel: 'Journey 3 · Merchant Floor, POS & Kitchen',
      title: 'Counter POS Terminal & Sold-Out Inventory Control',
      route: '/merchant/pos',
      roleBadge: 'Merchant',
      summary:
        'Fast barista point-of-sale terminal supporting walk-in or seat-linked orders, category filtering, live sold-out toggles, and Cash / Online checkout.',
      highlights: [
        'Category filter pills with instant stock status badges and sold-out switches',
        'Seat assignment selector linking orders directly to occupied floor desks',
        'Order confirmation modal with receipt number and direct Ticket Board link',
      ],
      ctaLabel: 'Open POS Terminal',
      onLaunch: () => {
        setRole('merchant');
        router.push('/merchant/pos' as never);
      },
    },
    {
      id: 'merch-tickets',
      stepNumber: '3.3',
      journey: 'merchant',
      journeyLabel: 'Journey 3 · Merchant Floor, POS & Kitchen',
      title: 'Barista & Kitchen Ticket Board (KDS)',
      route: '/merchant/tickets',
      roleBadge: 'Merchant',
      summary:
        'Kanban-style fulfillment board tracking orders from Queued → Preparing → Ready → Served with elapsed timers and one-tap status progression.',
      highlights: [
        'Status filter tabs with live ticket counts per stage',
        'Color-coded ticket cards showing seat badge, payment method, and line items',
        'Single-tap progression (Start Preparing → Mark Ready → Mark Served)',
      ],
      ctaLabel: 'Open Ticket Board',
      onLaunch: () => {
        setRole('merchant');
        router.push('/merchant/tickets' as never);
      },
    },

    // Journey 4: Merchant AI 3D Onboarding Studio
    {
      id: 'ai-onboarding',
      stepNumber: '4.1',
      journey: 'ai3d',
      journeyLabel: 'Journey 4 · AI 3D Onboarding & Spatial Studio',
      title: 'Multimodal AI 3D Venue Generator & Spatial Editor',
      route: '/merchant/onboarding',
      roleBadge: 'Merchant',
      summary:
        'End-to-end onboarding wizard where cafe owners upload photos, videos, floorplans, or menus, generate a 3D venue with AI, refine it via chat prompts, and publish live.',
      highlights: [
        '4-step visual progress tracker (Upload → AI Refine → 3D Studio → Publish)',
        'Multimodal media upload cards + optional runtime OpenAI API key input',
        'Multi-turn conversational refinement with saved iteration snapshots',
        'Interactive 3D room dimension, wall/floor palette, and furniture inspector',
      ],
      ctaLabel: 'Open 3D Onboarding Studio',
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

  const categories: { id: JourneyCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Journeys', count: steps.length },
    {
      id: 'customer',
      label: '1. Customer Space & Session',
      count: steps.filter((s) => s.journey === 'customer').length,
    },
    {
      id: 'loyalty',
      label: '2. Loyalty & Concierge',
      count: steps.filter((s) => s.journey === 'loyalty').length,
    },
    {
      id: 'merchant',
      label: '3. Merchant Floor & POS',
      count: steps.filter((s) => s.journey === 'merchant').length,
    },
    {
      id: 'ai3d',
      label: '4. AI 3D Studio',
      count: steps.filter((s) => s.journey === 'ai3d').length,
    },
  ];

  return (
    <View style={{ gap: space.lg }}>
      {/* Hero Banner */}
      <Card
        style={{
          backgroundColor: colors.ink,
          gap: space.lg,
        }}
      >
        <View
          style={
            isWide
              ? styles.rowBetween
              : { gap: space.md, alignItems: 'stretch' }
          }
        >
          <View style={{ gap: space.xs, flex: isWide ? 1 : undefined }}>
            <Text
              style={{
                fontSize: type.overline.fontSize,
                fontWeight: '800',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: colors.greenBorder,
              }}
            >
              Interactive Product Tour · 4 End-to-End Flows
            </Text>
            <Text
              style={{
                fontSize: type.display.fontSize,
                fontWeight: '800',
                color: colors.surface,
                letterSpacing: -0.6,
              }}
            >
              BrewSpace — User Journeys Gallery
            </Text>
            <Text
              style={{
                fontSize: type.body.fontSize,
                color: colors.border,
                lineHeight: 20,
              }}
            >
              Explore every redesigned screen across the Customer and Merchant
              experiences. Click any step card below to auto-configure the demo
              state and jump straight into the live screen.
            </Text>
          </View>
          <View
            style={{
              gap: space.sm,
              alignItems: isWide ? 'flex-end' : 'flex-start',
            }}
          >
            <Badge label={`Active Venue: ${venue.name}`} tone="success" />
            <Badge
              label={`${venueSessions.length} active floor sessions`}
              tone="info"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <StatTile
            label="Total Journeys"
            value="4 Flows"
            sublabel="Customer + Merchant"
            accentColor={colors.green}
          />
          <StatTile
            label="Redesigned Screens"
            value="11 Routes"
            sublabel="25+ UI modules"
          />
          <StatTile
            label="Customer Session"
            value={customerSession ? 'Active' : 'Ready'}
            sublabel={
              customerSession
                ? `${customerSeat?.label ?? customerSession.seatId} · ${customerSession.elapsedMinutes}m`
                : 'Auto-created on launch'
            }
            accentColor={customerSession ? colors.green : colors.amber}
          />
        </View>
      </Card>

      {statusMessage && (
        <Card variant="accent" style={{ padding: 12 }}>
          <Text style={{ color: colors.green, fontWeight: '700' }}>
            {statusMessage}
          </Text>
        </Card>
      )}

      {/* Journey Category Filter Tabs */}
      <Card variant="subtle" style={{ padding: 14, gap: 10 }}>
        <Eyebrow>Filter by User Journey</Eyebrow>
        <View style={styles.row}>
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setActiveCategory(cat.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.green : colors.border,
                  backgroundColor: active ? colors.green : colors.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: type.caption.fontSize,
                    fontWeight: '700',
                    color: active ? colors.surface : colors.ink,
                  }}
                >
                  {cat.label}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 1,
                    borderRadius: radius.pill,
                    backgroundColor: active
                      ? 'rgba(255,255,255,0.22)'
                      : colors.paperAlt,
                  }}
                >
                  <Text
                    style={{
                      fontSize: type.overline.fontSize,
                      fontWeight: '800',
                      color: active ? colors.surface : colors.muted,
                    }}
                  >
                    {cat.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Journey Step Cards Grid */}
      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          flexWrap: isWide ? 'wrap' : 'nowrap',
          gap: 12,
        }}
      >
        {visibleSteps.map((step, index) => (
          <Card
            key={step.id}
            style={{
              gap: 10,
              width: isWide ? '48.5%' : '100%',
              flexGrow: isWide ? 1 : 0,
            }}
          >
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.sm,
                    backgroundColor:
                      step.roleBadge === 'Customer'
                        ? colors.greenSurface
                        : colors.blueSurface,
                    borderWidth: 1,
                    borderColor:
                      step.roleBadge === 'Customer'
                        ? colors.greenBorder
                        : colors.blueBorder,
                  }}
                >
                  <Text
                    style={{
                      fontSize: type.caption.fontSize,
                      fontWeight: '800',
                      color:
                        step.roleBadge === 'Customer'
                          ? colors.green
                          : colors.blue,
                    }}
                  >
                    Step {step.stepNumber}
                  </Text>
                </View>
                <Badge
                  label={step.roleBadge}
                  tone={step.roleBadge === 'Customer' ? 'success' : 'info'}
                />
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.sm,
                  backgroundColor: colors.paperAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  maxWidth: '100%',
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: type.overline.fontSize,
                    fontWeight: '700',
                    color: colors.ink,
                    fontFamily: 'monospace',
                  }}
                >
                  {step.route}
                </Text>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.subheading}>{step.title}</Text>
              <Text style={styles.text}>{step.summary}</Text>
            </View>

            <Divider />

            <View style={{ gap: 6, flex: 1 }}>
              <Eyebrow>Mobile-First Highlights</Eyebrow>
              {step.highlights.map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: colors.green,
                      fontWeight: '800',
                      fontSize: type.caption.fontSize,
                    }}
                  >
                    ✓
                  </Text>
                  <Text
                    style={{
                      fontSize: type.caption.fontSize,
                      color: colors.ink,
                      flex: 1,
                      lineHeight: 19,
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ paddingTop: 4 }}>
              <Button
                label={`${step.ctaLabel} →`}
                onPress={step.onLaunch}
                variant={index === 0 ? 'primary' : 'secondary'}
                fullWidth={!isWide}
              />
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}
