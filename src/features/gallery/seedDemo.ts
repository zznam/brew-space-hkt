import {
  DEMO_CUSTOMER_ID,
  getAllVenues,
  getVenue,
  type Session,
  type Venue,
} from '@/core';
import { appStore } from '@/core/useAppStore';
import {
  cartTotal,
  modifiersFor,
  modifiersFromPreferences,
  type CartLine,
  type PlacedOrder,
} from '@/features/customer/cart/cartModel';
import { cartStore } from '@/features/customer/cart/useCart';
import {
  DEMO_OTP,
  initialLoyaltyState,
  joinProgramme,
  recordVisit,
  referralCode,
  setPreferences,
  toggleFavourite,
  type LoyaltyState,
  type Preferences,
} from '@/features/customer/loyalty/loyaltyModel';
import { loyaltyStore } from '@/features/customer/loyalty/useLoyalty';
import {
  buildVisitSnapshot,
  type VisitSnapshot,
} from '@/features/customer/shared/visit';
import { supportStore } from '@/features/customer/support/useSupport';
import { posStore } from '@/features/merchant/pos/usePosStore';

const SEEDED_PHONE = '0901234567';
const FRIEND_PHONE = '0912345678';
const SEEDED_PREFS: Preferences = {
  milk: 'oat',
  sweetness: 30,
  allergyNote: 'No peanuts, oat milk preferred',
};

const VISIT_TEMPLATES = [
  {
    seatIdx: 5,
    mode: 'BUNDLE_4H' as const,
    minutes: 240,
    drinks: 2,
    snacks: 1,
  },
  {
    seatIdx: 2,
    mode: 'BUNDLE_2H' as const,
    minutes: 120,
    drinks: 1,
    snacks: 1,
  },
  {
    seatIdx: 7,
    mode: 'BUNDLE_2H' as const,
    minutes: 90,
    drinks: 1,
    snacks: 1,
  },
  {
    seatIdx: 6,
    mode: 'BUNDLE_2H' as const,
    minutes: 120,
    drinks: 1,
    snacks: 1,
  },
  {
    seatIdx: 5,
    mode: 'METERED_OPEN' as const,
    minutes: 60,
    drinks: 1,
    snacks: 1,
  },
];

function buildHistoricalVisit(
  venue: Venue,
  index: number,
  template: (typeof VISIT_TEMPLATES)[number],
): VisitSnapshot {
  const seat = venue.seats[template.seatIdx] ?? venue.seats[0];
  if (!seat) throw new Error(`Venue ${venue.id} has no seats`);
  const drink = venue.menu[0];
  const snack = venue.menu[1];
  const orders: Session['orders'] = [];
  if (drink) {
    orders.push({
      menuItemId: drink.id,
      name: drink.name,
      unitPrice: drink.price,
      quantity: template.drinks,
    });
  }
  if (snack) {
    orders.push({
      menuItemId: snack.id,
      name: snack.name,
      unitPrice: snack.price,
      quantity: template.snacks,
    });
  }
  return buildVisitSnapshot({
    id: `hist-${venue.id}-${index + 1}`,
    venueId: venue.id,
    seatId: seat.id,
    customerId: DEMO_CUSTOMER_ID,
    mode: template.mode,
    elapsedMinutes: template.minutes,
    lockedHourlyRate: seat.hourlyRate,
    orders,
  });
}

/**
 * Populates loyalty memberships, referral bonuses, barista preferences, pinned
 * seats, and 5 historical visits per venue (858 points, 6/7 badges unlocked).
 */
export function seedLoyaltyHistory(): LoyaltyState {
  let state = initialLoyaltyState();
  const seededVenues = getAllVenues(appStore.getState().customVenues);

  for (const venue of seededVenues) {
    const joined = joinProgramme(state, venue.id, {
      phone: SEEDED_PHONE,
      code: DEMO_OTP,
      consent: true,
      friendCode: referralCode(venue.id, FRIEND_PHONE),
    });
    if (joined.ok) state = joined.state;

    const prefsRes = setPreferences(state, venue.id, SEEDED_PREFS);
    if (prefsRes.ok) state = prefsRes.state;

    for (const suffix of ['seat-6', 'seat-3', 'seat-8']) {
      const seatId = `${venue.id}-${suffix}`;
      if (venue.seats.some((seat) => seat.id === seatId)) {
        const favRes = toggleFavourite(state, venue.id, seatId);
        if (favRes.ok) state = favRes.state;
      }
    }

    for (const [index, template] of VISIT_TEMPLATES.entries()) {
      state = recordVisit(state, buildHistoricalVisit(venue, index, template));
    }
  }

  loyaltyStore.setState(state);
  return state;
}

/**
 * Seeds POS orders across all venues: 4 kitchen tickets covering every
 * Kanban stage (queued, preparing, ready, served) plus 2 active drafts.
 */
export function seedPosTickets(): void {
  const pos = posStore.getState();
  pos.reset();

  for (const venue of getAllVenues(appStore.getState().customVenues)) {
    const drink = venue.menu[0];
    const snack = venue.menu[1] ?? drink;
    if (!drink || !snack) continue;

    const seat1 = venue.seats[0]?.id ?? null;
    const seat2 = venue.seats[1]?.id ?? null;
    const seat6 = venue.seats[5]?.id ?? seat1;

    const queuedId = pos.createOrder(venue.id, seat1);
    pos.addLine(queuedId, drink.id, drink.name, drink.price);
    pos.addLine(queuedId, drink.id, drink.name, drink.price);
    pos.addLine(queuedId, snack.id, snack.name, snack.price);
    pos.pay(queuedId, 'cash');

    const preparingId = pos.createOrder(venue.id, seat6);
    pos.addLine(preparingId, drink.id, drink.name, drink.price);
    pos.addLine(preparingId, snack.id, snack.name, snack.price);
    pos.pay(preparingId, 'online');
    pos.advanceTicket(preparingId, 'preparing');

    const readyId = pos.createOrder(venue.id, null);
    pos.addLine(readyId, drink.id, drink.name, drink.price);
    pos.pay(readyId, 'online');
    pos.advanceTicket(readyId, 'preparing');
    pos.advanceTicket(readyId, 'ready');

    const servedId = pos.createOrder(venue.id, seat2);
    pos.addLine(servedId, snack.id, snack.name, snack.price);
    pos.pay(servedId, 'cash');
    pos.advanceTicket(servedId, 'preparing');
    pos.advanceTicket(servedId, 'ready');
    pos.advanceTicket(servedId, 'served');

    const walkInDraft = pos.createOrder(venue.id, null);
    pos.addLine(walkInDraft, drink.id, drink.name, drink.price);
    pos.addLine(walkInDraft, snack.id, snack.name, snack.price);

    if (seat2) {
      const seatDraft = pos.createOrder(venue.id, seat2);
      pos.addLine(seatDraft, drink.id, drink.name, drink.price);
    }
  }
}

function defaultSessionOrders(venue: Venue): Session['orders'] {
  const orders: Session['orders'] = [];
  const drink = venue.menu[0];
  const snack = venue.menu[1];
  if (drink) {
    orders.push({
      menuItemId: drink.id,
      name: drink.name,
      unitPrice: drink.price,
      quantity: 1,
    });
  }
  if (snack) {
    orders.push({
      menuItemId: snack.id,
      name: snack.name,
      unitPrice: snack.price,
      quantity: 1,
    });
  }
  return orders;
}

/**
 * Ensures `demo-guest` has a 45-minute active session with drink/snack items
 * in every venue, plus placed order history, a prefilled cart line, support
 * requests, and a completed receipt ready for refund/rating flows.
 */
export function seedCustomerSessionAndSupport(): void {
  const coreState = appStore.getState();
  const allVenues = getAllVenues(coreState.customVenues);
  let nextSessionId = coreState.nextSessionId;
  const sessions = [...coreState.sessions];

  for (const venue of allVenues) {
    const existingIndex = sessions.findIndex(
      (s) => s.venueId === venue.id && s.customerId === DEMO_CUSTOMER_ID,
    );
    if (existingIndex !== -1) {
      const existing = sessions[existingIndex]!;
      if (existing.elapsedMinutes === 0 && existing.orders.length === 0) {
        sessions[existingIndex] = {
          ...existing,
          elapsedMinutes: 45,
          orders: defaultSessionOrders(venue),
        };
      }
      continue;
    }

    const occupiedSeatIds = new Set(
      sessions.filter((s) => s.venueId === venue.id).map((s) => s.seatId),
    );
    const preferredSeat = venue.seats.find(
      (s) => s.id === `${venue.id}-seat-6` && !occupiedSeatIds.has(s.id),
    );
    const seat =
      preferredSeat ?? venue.seats.find((s) => !occupiedSeatIds.has(s.id));
    if (!seat) continue;

    while (sessions.some((s) => s.id === `demo-${nextSessionId}`)) {
      nextSessionId += 1;
    }

    sessions.push({
      id: `demo-${nextSessionId}`,
      venueId: venue.id,
      seatId: seat.id,
      customerId: DEMO_CUSTOMER_ID,
      mode: 'BUNDLE_2H',
      elapsedMinutes: 45,
      lockedHourlyRate: seat.hourlyRate,
      orders: defaultSessionOrders(venue),
    });
    nextSessionId += 1;
  }

  const activeVenue = getVenue(coreState.venueId, coreState.customVenues);
  const activeSession = sessions.find(
    (s) => s.venueId === activeVenue.id && s.customerId === DEMO_CUSTOMER_ID,
  );

  appStore.setState({
    sessions,
    nextSessionId,
    selectedSeatId: activeSession?.seatId ?? coreState.selectedSeatId,
  });

  cartStore.getState().reset();
  if (activeSession) {
    const drink = activeVenue.menu[0];
    const snack = activeVenue.menu[1];
    const placedOrders: PlacedOrder[] = [];
    let orderCounter = 1;

    if (drink) {
      const modifiers = modifiersFor(
        drink.id,
        modifiersFromPreferences(SEEDED_PREFS),
      );
      const line: CartLine = {
        menuItemId: drink.id,
        name: drink.name,
        unitPrice: drink.price,
        quantity: 1,
        note: 'Extra shot',
        modifiers,
      };
      placedOrders.push({
        id: `order-${orderCounter++}`,
        venueId: activeVenue.id,
        sessionId: activeSession.id,
        lines: [line],
        total: cartTotal([line]),
        placedAtMinute: Math.min(5, activeSession.elapsedMinutes),
      });
    }
    if (snack) {
      const line: CartLine = {
        menuItemId: snack.id,
        name: snack.name,
        unitPrice: snack.price,
        quantity: 1,
        note: '',
        modifiers: null,
      };
      placedOrders.push({
        id: `order-${orderCounter++}`,
        venueId: activeVenue.id,
        sessionId: activeSession.id,
        lines: [line],
        total: cartTotal([line]),
        placedAtMinute: Math.min(30, activeSession.elapsedMinutes),
      });
    }

    cartStore.setState({
      orders: placedOrders,
      nextOrderId: orderCounter,
    });

    if (drink) {
      cartStore.getState().addItem(drink);
    }
  }

  const support = supportStore.getState();
  support.reset();

  const latestVisit =
    loyaltyStore
      .getState()
      .visits.filter((v) => v.venueId === activeVenue.id)
      .pop() ?? buildHistoricalVisit(activeVenue, 4, VISIT_TEMPLATES[4]!);
  support.setLastReceipt(latestVisit);

  if (activeSession) {
    support.reportSeatIssue(
      {
        venueId: activeVenue.id,
        seatId: activeSession.seatId,
        sessionId: activeSession.id,
        minute: 20,
      },
      'outlet_broken',
    );
    support.submitNote(
      {
        venueId: activeVenue.id,
        seatId: activeSession.seatId,
        sessionId: activeSession.id,
        minute: activeSession.elapsedMinutes,
      },
      'No peanuts, oat milk preferred — allergy check',
    );
  }
}

/** Populates every store in the app so any demo journey can be speedrun immediately. */
export function seedSpeedrunDemo(): void {
  seedLoyaltyHistory();
  seedPosTickets();
  seedCustomerSessionAndSupport();
}

/** Restores every demo store (core, POS, loyalty, support, cart) back to empty/initial fixtures. */
export function resetAllDemoStores(): void {
  appStore.getState().reset();
  posStore.getState().reset();
  loyaltyStore.setState(initialLoyaltyState());
  supportStore.getState().reset();
  cartStore.getState().reset();
}
