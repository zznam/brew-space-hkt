/* Customer visit lifecycle; pure rules for the HTML prototype. */
(function (root, factory) {
  const services =
    typeof module === 'object' && module.exports
      ? require('./services.js')
      : root.NepServices;
  const api = factory(services);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NepJourney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (S) {
  const VENUE = 'nep-q3';
  const freshDraft = () => ({
    seatId: null,
    method: null,
    items: {},
    minutes: 120,
    baseSessionId: null,
    review: null,
  });
  function ensureState(input) {
    const state = S.ensureState(input);
    return {
      ...state,
      seats: state.seats.map((seat, index) => ({
        ...seat,
        number: seat.number || index + 1,
      })),
      profile: state.profile || {
        id: 'guest-demo',
        isMember: false,
        name: 'Khách tại quán',
        phone: '',
        email: '',
        marketingConsent: false,
      },
      loyalty: state.loyalty || {
        memberId: 'member-demo',
        balance: 250,
        ledger: [
          {
            id: 'seed-demo',
            type: 'opening',
            points: 250,
            label: 'Điểm tài khoản mẫu',
            createdAt: Date.UTC(2026, 10, 14),
          },
        ],
      },
      prepaidPackages: state.prepaidPackages || [
        {
          id: 'pack-2h',
          code: 'NEP2H',
          memberId: 'member-demo',
          venueId: VENUE,
          name: 'Gói 2 giờ & cà phê',
          minutes: 120,
          products: { latte: 1 },
          seatKinds: ['window', 'focus', 'bar'],
          status: 'available',
          expiresAt: Date.UTC(2030, 0, 1),
          claimedBy: null,
        },
      ],
      customerSessions: Array.isArray(state.customerSessions)
        ? state.customerSessions
        : [],
      customerReceipts: Array.isArray(state.customerReceipts)
        ? state.customerReceipts
        : [],
      journey: state.journey || {
        phase: 'arrival',
        draft: freshDraft(),
        activeSessionId: null,
        lastReceiptId: null,
        clockOffsetMs: 0,
      },
    };
  }
  function createModel({ kinds, menu }) {
    const products = [
      ...menu.map((p) => ({ ...p, kind: 'drink', unitPrice: p.price })),
      ...S.catalog.map((p) => ({
        ...p,
        kind: p.mode === 'borrow' ? 'borrow' : 'sale',
        unitPrice: p.price,
      })),
    ];
    const fail = (state, error, code = 'INVALID_ACTION') => ({
      ok: false,
      state,
      error,
      code,
    });
    const ok = (state, extra = {}) => ({ ok: true, state, ...extra });
    const time = (state, now = Date.now()) =>
      now + (state.journey.clockOffsetMs || 0);
    const getSession = (state, id = state.journey.activeSessionId) =>
      state.customerSessions.find((s) => s.id === id) || null;
    const update = (state, patch) => ({
      ...state,
      journey: { ...state.journey, ...patch },
    });
    const fingerprint = (state) =>
      JSON.stringify({
        id: state.profile.id,
        seat: state.journey.draft.seatId,
        items: state.journey.draft.items,
        minutes: state.journey.draft.minutes,
        base: state.journey.draft.baseSessionId,
      });
    function linesFor(items) {
      return Object.entries(items).map(([id, quantity]) => {
        const product = products.find((p) => p.id === id);
        if (
          !product ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > 20
        )
          throw new Error('Dịch vụ hoặc số lượng không hợp lệ.');
        return {
          id,
          name: product.name,
          quantity,
          unitPrice: product.unitPrice,
          kind: product.kind,
          group: product.group || 'drinks',
        };
      });
    }
    function allowedPackage(
      state,
      p,
      seat,
      now,
      access = false,
      sessionId = null,
    ) {
      return (
        p &&
        seat &&
        p.venueId === VENUE &&
        (p.expiresAt > time(state, now) ||
          (p.status === 'in_use' &&
            p.claimedBy === sessionId &&
            sessionId !== null)) &&
        p.seatKinds.includes(seat.kind) &&
        ((p.status === 'available' && !p.claimedBy) ||
          (p.status === 'in_use' && p.claimedBy === sessionId)) &&
        (access ||
          (state.profile.isMember && p.memberId === state.profile.id) ||
          (p.claimedBy === sessionId && sessionId !== null))
      );
    }
    function quote(state, session, minutes, packageId, now) {
      const p =
        session.packageSnapshot ||
        state.prepaidPackages.find((p) => p.id === packageId);
      const coveredMinutes = p ? Math.min(minutes, p.minutes) : 0;
      const lines = [
        {
          id: 'seat-time',
          name: 'Thời gian sử dụng bàn',
          quantity: minutes,
          unitPrice: session.rate,
          kind: 'time',
          gross: Math.round((session.rate * minutes) / 60),
          covered: Math.round((session.rate * coveredMinutes) / 60),
        },
      ];
      const used = {};
      for (const item of session.items) {
        const allowance = p?.products[item.id] || 0;
        const included = Math.min(
          item.quantity,
          Math.max(0, allowance - (used[item.id] || 0)),
        );
        used[item.id] = (used[item.id] || 0) + included;
        lines.push({
          ...item,
          gross: item.unitPrice * item.quantity,
          covered: included * item.unitPrice,
        });
      }
      lines.forEach((line) => {
        line.due = line.gross - line.covered;
      });
      const gross = lines.reduce((sum, l) => sum + l.gross, 0),
        covered = lines.reduce((sum, l) => sum + l.covered, 0),
        due = gross - covered;
      return {
        lines,
        minutes,
        gross,
        covered,
        due,
        packageId: p?.id || null,
        packageName: p?.name || null,
        remainingMinutes: p ? Math.max(0, p.minutes - minutes) : 0,
        unreturnedLoans: session.id
          ? state.loans.filter(
              (l) =>
                l.sessionId === session.id &&
                ['requested', 'borrowed'].includes(l.status),
            )
          : [],
        pointsMax: state.profile.isMember
          ? Math.min(
              Math.floor(state.loyalty.balance / 10) * 10,
              Math.floor(due / 1000) * 10,
            )
          : 0,
        quotedAt: time(state, now),
      };
    }
    function quoteDraft(state, now = Date.now()) {
      const draft = state.journey.draft,
        seat = state.seats.find((s) => s.id === draft.seatId);
      if (!seat)
        return {
          lines: [],
          minutes: 0,
          gross: 0,
          covered: 0,
          due: 0,
          packageId: null,
          packageName: null,
          remainingMinutes: 0,
          unreturnedLoans: [],
          pointsMax: 0,
        };
      const base = draft.baseSessionId
        ? getSession(state, draft.baseSessionId)
        : null;
      const packageId =
        draft.review?.fingerprint === fingerprint(state)
          ? draft.review.packageId
          : null;
      return quote(
        state,
        {
          id: base?.id,
          rate: base?.rate ?? kinds[seat.kind].rate,
          packageSnapshot: base?.packageSnapshot,
          items: [...(base?.items || []), ...linesFor(draft.items)],
        },
        base
          ? Math.max(
              base.plannedMinutes,
              Math.ceil((time(state, now) - base.startedAt) / 60000),
            )
          : draft.minutes,
        packageId,
        now,
      );
    }
    function quoteSession(state, now = Date.now(), id) {
      const session = getSession(state, id);
      if (!session) return null;
      const end = session.endedAt ?? session.checkoutAt ?? time(state, now);
      return quote(
        state,
        session,
        Math.max(0, Math.ceil((end - session.startedAt) / 60000)),
        session.packageId,
        now,
      );
    }
    function selectSeat(state, seatId, method) {
      if (getSession(state)?.status === 'active')
        return fail(state, 'Bạn đang có một phiên sử dụng.');
      const seat = state.seats.find((s) => s.id === seatId);
      if (!seat || seat.status !== 'free' || !kinds[seat.kind])
        return fail(
          state,
          'Bàn này chưa sẵn sàng. Hãy chọn bàn trống hoặc gọi nhân viên.',
          'SEAT_UNAVAILABLE',
        );
      if (!['qr', 'number', 'map'].includes(method))
        return fail(state, 'Cách nhận diện bàn không hợp lệ.');
      return ok(
        update(state, {
          phase: 'services',
          draft: { ...freshDraft(), seatId, method },
          activeSessionId: null,
        }),
      );
    }
    function updateDraft(
      state,
      {
        items = state.journey.draft.items,
        minutes = state.journey.draft.minutes,
      },
    ) {
      if (!['services', 'package'].includes(state.journey.phase))
        return fail(state, 'Hãy chọn bàn trước khi chọn dịch vụ.');
      try {
        linesFor(items);
      } catch (error) {
        return fail(state, error.message);
      }
      if (!Number.isInteger(minutes) || minutes < 30 || minutes > 720)
        return fail(state, 'Thời gian dự kiến từ 30 đến 720 phút.');
      return ok(
        update(state, {
          draft: {
            ...state.journey.draft,
            items: { ...items },
            minutes,
            review: null,
          },
        }),
      );
    }
    function reviewDraft(state) {
      if (
        !state.journey.draft.seatId ||
        !['services', 'package'].includes(state.journey.phase)
      )
        return fail(state, 'Hãy xác nhận bàn trước.');
      return ok(
        update(state, {
          phase: 'package',
          draft: { ...state.journey.draft, review: null },
        }),
      );
    }
    function backToServices(state) {
      if (state.journey.phase !== 'package')
        return fail(state, 'Không thể đổi dịch vụ ở bước này.');
      return ok(
        update(state, {
          phase: 'services',
          draft: { ...state.journey.draft, review: null },
        }),
      );
    }
    function checkPackage(
      state,
      { code = '', packageId = null } = {},
      now = Date.now(),
    ) {
      if (state.journey.phase !== 'package')
        return fail(state, 'Hãy chọn dịch vụ rồi đối chiếu gói.');
      const draft = state.journey.draft,
        seat = state.seats.find((s) => s.id === draft.seatId),
        base = getSession(state, draft.baseSessionId);
      if (!seat) return fail(state, 'Hãy chọn bàn hợp lệ.');
      if (base && !base.packageId && (code.trim() || packageId))
        return fail(
          state,
          'Gói chỉ áp dụng khi bắt đầu phiên. Phiên hiện tại tiếp tục theo giá sử dụng.',
          'PACKAGE_UNAVAILABLE',
        );
      let p = null,
        access = false;
      if (base?.packageId) {
        p = state.prepaidPackages.find((p) => p.id === base.packageId);
        access = true;
      } else if (code.trim()) {
        p = state.prepaidPackages.find(
          (p) => p.code === code.trim().toUpperCase(),
        );
        access = Boolean(p);
      } else if (packageId) {
        p = state.prepaidPackages.find((p) => p.id === packageId);
      }
      if (
        (code.trim() || packageId || base?.packageId) &&
        !allowedPackage(state, p, seat, now, access, base?.id || null)
      )
        return fail(
          state,
          'Gói không hợp lệ, đã dùng, hết hạn hoặc không áp dụng cho bàn này.',
          'PACKAGE_UNAVAILABLE',
        );
      const next = update(state, {
        draft: {
          ...draft,
          review: {
            packageId: p?.id || null,
            accessGranted: access,
            fingerprint: fingerprint(state),
            checkedAt: time(state, now),
          },
        },
      });
      return ok(next, { quote: quoteDraft(next, now) });
    }
    function start(state, { key, now = Date.now() } = {}) {
      if (!key) return fail(state, 'Thiếu mã xác nhận phiên.');
      const previous = state.customerSessions.find((s) =>
        s.submissionKeys.includes(key),
      );
      if (previous) {
        if (
          state.journey.phase !== 'active' ||
          state.journey.activeSessionId !== previous.id ||
          previous.status !== 'active'
        )
          return fail(
            state,
            'Mã xác nhận đã dùng cho lần sử dụng khác.',
            'KEY_CONFLICT',
          );
        return ok(state, { session: previous });
      }
      const draft = state.journey.draft,
        review = draft.review,
        seat = state.seats.find((s) => s.id === draft.seatId),
        base = getSession(state, draft.baseSessionId);
      if (
        state.journey.phase !== 'package' ||
        !review ||
        review.fingerprint !== fingerprint(state)
      )
        return fail(
          state,
          'Đối chiếu quyền lợi và khoản trả thêm trước khi sử dụng.',
          'REVIEW_REQUIRED',
        );
      if (
        !seat ||
        (base
          ? base.status !== 'active' || base.seatId !== seat.id
          : seat.status !== 'free')
      )
        return fail(
          state,
          'Bàn đã thay đổi trạng thái. Hãy chọn lại.',
          'SEAT_UNAVAILABLE',
        );
      const p = state.prepaidPackages.find((p) => p.id === review.packageId);
      if (
        review.packageId &&
        !allowedPackage(
          state,
          p,
          seat,
          now,
          review.accessGranted,
          base?.id || null,
        )
      )
        return fail(
          state,
          'Gói đã thay đổi. Hãy đối chiếu lại.',
          'PACKAGE_UNAVAILABLE',
        );
      let items;
      try {
        items = linesFor(draft.items);
      } catch (error) {
        return fail(state, error.message);
      }
      let next = state;
      const id = base?.id || `visit-${key}`;
      try {
        const retail = items.filter((i) => i.kind === 'sale');
        if (retail.length)
          next = S.sell(next, {
            key: `retail-${key}`,
            lines: retail.map((i) => ({
              serviceId: i.id,
              quantity: i.quantity,
            })),
          });
        for (const item of items.filter((i) => i.kind === 'borrow')) {
          const loanKey = `loan-${key}-${item.id}`;
          next = S.requestLoan(next, {
            key: loanKey,
            serviceId: item.id,
            seatId: seat.id,
            quantity: item.quantity,
          });
          next = {
            ...next,
            loans: next.loans.map((l) =>
              l.id === loanKey ? { ...l, sessionId: id } : l,
            ),
          };
        }
      } catch (error) {
        return fail(state, error.message, error.code);
      }
      const session = base
        ? {
            ...base,
            items: [...base.items, ...items],
            submissionKeys: [...base.submissionKeys, key],
          }
        : {
            id,
            seatId: seat.id,
            venueId: VENUE,
            memberId: state.profile.isMember ? state.profile.id : null,
            guest: state.profile.name,
            status: 'active',
            startedAt: time(state, now),
            checkoutAt: null,
            endedAt: null,
            rate: kinds[seat.kind].rate,
            seatKind: seat.kind,
            plannedMinutes: draft.minutes,
            items,
            packageId: p?.id || null,
            packageSnapshot: p
              ? {
                  ...p,
                  products: { ...p.products },
                  seatKinds: [...p.seatKinds],
                }
              : null,
            submissionKeys: [key],
          };
      const orderItems = items
        .filter((i) => i.kind !== 'borrow')
        .map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.quantity,
          price: i.unitPrice,
        }));
      next = {
        ...next,
        customerSessions: base
          ? next.customerSessions.map((s) => (s.id === id ? session : s))
          : [...next.customerSessions, session],
        seats: next.seats.map((s) =>
          s.id === seat.id
            ? {
                ...s,
                status: 'occupied',
                name: state.profile.name,
                guest: state.profile.name,
                startedAt: session.startedAt,
                start: new Date(session.startedAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                end: new Date(
                  session.startedAt + session.plannedMinutes * 60000,
                ).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }
            : s,
        ),
        prepaidPackages: next.prepaidPackages.map((pack) =>
          pack.id === p?.id
            ? { ...pack, status: 'in_use', claimedBy: id }
            : pack,
        ),
        orders: orderItems.length
          ? [
              ...next.orders,
              {
                id: `order-${key}`,
                sessionId: id,
                seat: seat.id,
                guest: state.profile.name,
                items: orderItems,
                total: orderItems.reduce((s, i) => s + i.qty * i.price, 0),
                status: 'queued',
                paymentStatus: 'on_tab',
                createdAt: time(state, now),
              },
            ]
          : next.orders,
      };
      next = update(next, {
        phase: 'active',
        activeSessionId: id,
        draft: {
          ...freshDraft(),
          seatId: seat.id,
          minutes: session.plannedMinutes,
        },
      });
      return ok(next, { session, quote: quoteSession(next, now) });
    }
    function beginAdd(state) {
      const session = getSession(state);
      if (
        !session ||
        session.status !== 'active' ||
        state.journey.phase !== 'active'
      )
        return fail(state, 'Không có phiên đang sử dụng.');
      return ok(
        update(state, {
          phase: 'services',
          draft: {
            ...freshDraft(),
            seatId: session.seatId,
            minutes: session.plannedMinutes,
            baseSessionId: session.id,
          },
        }),
      );
    }
    function openCheckout(state, now = Date.now()) {
      const session = getSession(state);
      if (
        !session ||
        session.status !== 'active' ||
        state.journey.phase !== 'active'
      )
        return fail(state, 'Quay lại phiên đang dùng để checkout.');
      const next = update(
        {
          ...state,
          customerSessions: state.customerSessions.map((s) =>
            s.id === session.id ? { ...s, checkoutAt: time(state, now) } : s,
          ),
        },
        { phase: 'checkout' },
      );
      return ok(next, { quote: quoteSession(next, now) });
    }
    function resume(state) {
      const session = getSession(state);
      if (!session || session.status !== 'active')
        return fail(state, 'Không có phiên đang sử dụng.');
      const next = update(
        {
          ...state,
          customerSessions: state.customerSessions.map((s) =>
            s.id === session.id ? { ...s, checkoutAt: null } : s,
          ),
        },
        {
          phase: 'active',
          draft: {
            ...freshDraft(),
            seatId: session.seatId,
            minutes: session.plannedMinutes,
          },
        },
      );
      return ok(next, { session: getSession(next) });
    }
    function finish(
      state,
      { key, now = Date.now(), points = 0, success = true } = {},
    ) {
      const existing = state.customerReceipts.find((r) => r.key === key);
      if (existing) {
        if (
          existing.pointsUsed !== points ||
          (state.journey.activeSessionId &&
            state.journey.activeSessionId !== existing.sessionId) ||
          (!state.journey.activeSessionId &&
            state.journey.lastReceiptId !== existing.id)
        )
          return fail(
            state,
            'Mã thanh toán đã dùng cho nội dung khác.',
            'KEY_CONFLICT',
          );
        return ok(state, { receipt: existing });
      }
      const session = getSession(state);
      if (
        !key ||
        state.journey.phase !== 'checkout' ||
        !session ||
        session.status !== 'active'
      )
        return fail(state, 'Phiên chưa sẵn sàng để kết thúc.');
      const q = quoteSession(state, now);
      if (q.unreturnedLoans.length)
        return fail(
          state,
          'Hủy món chưa giao hoặc chờ nhân viên nhận trả đồ trước khi checkout.',
          'LOANS_OUTSTANDING',
        );
      if (
        !Number.isInteger(points) ||
        points < 0 ||
        points % 10 ||
        points > q.pointsMax
      )
        return fail(
          state,
          'Điểm đổi phải theo bội số 10 và trong số dư cho phép.',
          'INVALID_POINTS',
        );
      if (!success)
        return fail(
          state,
          'Thanh toán mô phỏng chưa thành công. Bạn có thể thử lại.',
          'PAYMENT_FAILED',
        );
      const cashDue = q.due - points * 100,
        earned = session.memberId ? Math.floor(cashDue / 10000) : 0;
      const receipt = {
        ...q,
        id: `receipt-${key}`,
        key,
        sessionId: session.id,
        seatId: session.seatId,
        pointsUsed: points,
        pointsEarned: earned,
        pointsDiscount: points * 100,
        cashDue,
        paidAt: time(state, now),
      };
      const ledger = [...state.loyalty.ledger];
      if (points)
        ledger.push({
          id: `redeem-${key}`,
          type: 'redeem',
          points: -points,
          label: `Đổi điểm · ${session.seatId}`,
          createdAt: receipt.paidAt,
        });
      if (earned)
        ledger.push({
          id: `earn-${key}`,
          type: 'earn',
          points: earned,
          label: `Tích điểm · ${session.seatId}`,
          createdAt: receipt.paidAt,
        });
      const next = update(
        {
          ...state,
          customerReceipts: [...state.customerReceipts, receipt],
          customerSessions: state.customerSessions.map((s) =>
            s.id === session.id
              ? {
                  ...s,
                  status: 'ended',
                  endedAt: session.checkoutAt,
                  receiptId: receipt.id,
                }
              : s,
          ),
          loyalty: {
            ...state.loyalty,
            balance: state.loyalty.balance - points + earned,
            ledger,
          },
          seats: state.seats.map((s) => {
            if (s.id !== session.seatId) return s;
            const next = { ...s, status: 'free' };
            delete next.name;
            delete next.guest;
            delete next.start;
            delete next.end;
            delete next.startedAt;
            return next;
          }),
          orders: state.orders.map((o) =>
            o.sessionId === session.id ? { ...o, paymentStatus: 'paid' } : o,
          ),
          prepaidPackages: state.prepaidPackages.map((p) =>
            p.id === session.packageId ? { ...p, status: 'used' } : p,
          ),
        },
        {
          phase: 'receipt',
          activeSessionId: null,
          lastReceiptId: receipt.id,
          draft: freshDraft(),
        },
      );
      return ok(next, { receipt });
    }
    function useDemoMember(state) {
      if (getSession(state)?.status === 'active')
        return fail(state, 'Kết thúc phiên trước khi đổi tài khoản.');
      return ok(
        update(
          {
            ...state,
            profile: {
              ...state.profile,
              id: 'member-demo',
              isMember: true,
              name:
                state.profile.name === 'Khách tại quán'
                  ? 'Minh An'
                  : state.profile.name,
            },
          },
          { draft: { ...state.journey.draft, review: null } },
        ),
      );
    }
    function updateProfile(state, values) {
      const name = String(values.name ?? state.profile.name).trim(),
        phone = String(values.phone ?? state.profile.phone).trim(),
        email = String(values.email ?? state.profile.email).trim();
      if (!name || name.length > 80)
        return fail(state, 'Tên cần từ 1 đến 80 ký tự.');
      if (
        phone &&
        (!/^\+?[0-9 ()-]+$/.test(phone) ||
          !/^\d{9,15}$/.test(phone.replace(/\D/g, '')))
      )
        return fail(state, 'Số điện thoại chưa hợp lệ.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return fail(state, 'Email chưa hợp lệ.');
      return ok({
        ...state,
        profile: {
          ...state.profile,
          name,
          phone,
          email,
          marketingConsent:
            values.marketingConsent === undefined
              ? state.profile.marketingConsent
              : values.marketingConsent === true,
        },
      });
    }
    function requestReturn(state, loanId) {
      const session = getSession(state),
        loan = state.loans.find(
          (l) => l.id === loanId && l.sessionId === session?.id,
        );
      if (!loan || loan.status !== 'borrowed')
        return fail(state, 'Chỉ yêu cầu trả đồ đã nhận.');
      return ok({
        ...state,
        loans: state.loans.map((l) =>
          l.id === loanId ? { ...l, returnRequested: true } : l,
        ),
      });
    }
    function cancelLoan(state, loanId) {
      const session = getSession(state),
        loan = state.loans.find(
          (l) => l.id === loanId && l.sessionId === session?.id,
        );
      if (!loan || loan.status !== 'requested')
        return fail(state, 'Chỉ hủy món chưa được giao.');
      try {
        return ok(S.advanceLoan(state, loanId, 'cancelled'));
      } catch (error) {
        return fail(state, error.message);
      }
    }
    function newVisit(state) {
      if (getSession(state)?.status === 'active')
        return fail(state, 'Kết thúc phiên hiện tại trước.');
      return ok(
        update(state, {
          phase: 'arrival',
          draft: freshDraft(),
          activeSessionId: null,
          lastReceiptId: null,
        }),
      );
    }
    function advanceTime(state, minutes = 30) {
      if (
        !getSession(state) ||
        state.journey.phase !== 'active' ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 720
      )
        return fail(state, 'Chỉ mô phỏng thời gian trong phiên đang dùng.');
      return ok(
        update(state, {
          clockOffsetMs: (state.journey.clockOffsetMs || 0) + minutes * 60000,
        }),
      );
    }
    return {
      selectSeat,
      updateDraft,
      reviewDraft,
      backToServices,
      checkPackage,
      start,
      beginAdd,
      openCheckout,
      resume,
      finish,
      getSession,
      quoteSession,
      quoteDraft,
      useDemoMember,
      updateProfile,
      requestReturn,
      cancelLoan,
      newVisit,
      advanceTime,
    };
  }
  return { ensureState, createModel };
});
