/* Browser-local demo model. No API, actual AI, authentication or payment. */
(() => {
  'use strict';
  const shapes = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    cup: '<path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M11 2v3M15 2v3"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/>',
    users:
      '<path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M17 15a4 4 0 0 1 4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M17 3a4 4 0 0 1 0 8"/>',
    chart: '<path d="M4 3v18h17M8 16v-5M13 16V7M18 16v-8"/>',
    settings:
      '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6"/>',
    expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    leaf: '<path d="M20 3C6 1 2 8 5 15s17 7 15-12zM5 20 16 9"/>',
    wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".7"/>',
    plug: '<path d="M8 3v5M16 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>',
    volume: '<path d="M11 4 6 9H3v6h3l5 5zM16 9l5 6M21 9l-5 6"/>',
    shield: '<path d="m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7zM8 12l3 3 5-6"/>',
    external:
      '<path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
    edit: '<path d="m16 3 5 5L8 21H3v-5zM13 6l5 5"/>',
    bag: '<path d="M4 7h16l1 14H3zM8 8V6a4 4 0 0 1 8 0v2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    sparkle:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    card: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20M6 15h4"/>',
    undo: '<path d="M3 10h11a7 7 0 0 1 0 14M3 10l6-6M3 10l6 6"/>',
    book: '<path d="M12 6C8 3 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-6-1-10 2zM12 6v15M5 8l4 1M5 12l4 1M15 9l4-1M15 13l4-1"/>',
    basket: '<path d="m3 9 2 12h14l2-12zM7 9l5-7 5 7M2 9h20M9 13v4M15 13v4"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" stroke-width="3"/>',
    pen: '<path d="m15 3 6 6L9 21H3v-6zM12 6l6 6M3 15l6 6M17 2l5 5"/>',
    notebook:
      '<rect x="5" y="2" width="16" height="20" rx="2"/><path d="M9 2v20M2 6h5M2 12h5M2 18h5M13 7h4M13 11h4"/>',
    puzzle:
      '<path d="M9 3H3v6c5-3 5 7 0 4v8h7c-3-5 7-5 4 0h7v-7c-5 3-5-7 0-4V3h-7c3 5-7 5-5 0z"/>',
    cable:
      '<path d="M7 2v4M11 2v4M6 6h6v4H6zM9 10v4a6 6 0 0 0 12 0v-3M18 6h6v5h-6z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.info}</svg>`;
  const money = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );
  const statusText = {
    free: 'Trống',
    occupied: 'Đang dùng',
    reserved: 'Đã đặt',
    attention: 'Cần hỗ trợ',
    blocked: 'Tạm khóa',
  };
  const seedSeats = [
    {
      id: 'W01',
      x: 155,
      y: 128,
      kind: 'window',
      status: 'occupied',
      guest: 'Minh Anh',
      end: '15:00',
    },
    {
      id: 'W02',
      x: 290,
      y: 128,
      kind: 'window',
      status: 'occupied',
      guest: 'Gia Huy',
      end: '16:00',
    },
    { id: 'W03', x: 425, y: 128, kind: 'window', status: 'free' },
    {
      id: 'W04',
      x: 560,
      y: 128,
      kind: 'window',
      status: 'reserved',
      guest: 'Thảo Nguyên',
      end: '17:00',
    },
    { id: 'F01', x: 170, y: 335, kind: 'focus', status: 'free' },
    {
      id: 'F02',
      x: 335,
      y: 335,
      kind: 'focus',
      status: 'occupied',
      guest: 'Quốc Bảo',
      end: '16:30',
    },
    {
      id: 'F03',
      x: 500,
      y: 335,
      kind: 'focus',
      status: 'attention',
      guest: 'Hoàng Nam',
      end: '15:30',
    },
    {
      id: 'F04',
      x: 170,
      y: 490,
      kind: 'focus',
      status: 'occupied',
      guest: 'Khánh Linh',
      end: '15:00',
    },
    { id: 'F05', x: 335, y: 490, kind: 'focus', status: 'free' },
    { id: 'F06', x: 500, y: 490, kind: 'focus', status: 'free' },
    {
      id: 'M01',
      x: 802,
      y: 175,
      kind: 'meeting',
      status: 'reserved',
      guest: 'Nhóm thiết kế',
      end: '17:00',
    },
    { id: 'M02', x: 802, y: 355, kind: 'meeting', status: 'free' },
    {
      id: 'B01',
      x: 560,
      y: 660,
      kind: 'bar',
      status: 'occupied',
      guest: 'Đức Anh',
      end: '16:00',
    },
    { id: 'B02', x: 665, y: 660, kind: 'bar', status: 'free' },
    { id: 'B03', x: 770, y: 660, kind: 'bar', status: 'blocked' },
    { id: 'B04', x: 875, y: 660, kind: 'bar', status: 'free' },
  ];
  const kinds = {
    window: {
      label: 'Cạnh cửa sổ',
      rate: 40000,
      description: 'Ánh sáng tự nhiên, nhìn ra khoảng xanh.',
      amenities: ['wifi', 'plug', 'leaf'],
    },
    focus: {
      label: 'Khu tập trung',
      rate: 30000,
      description: 'Bàn cá nhân trong khu vực yên tĩnh.',
      amenities: ['wifi', 'plug', 'volume'],
    },
    meeting: {
      label: 'Bàn nhóm',
      rate: 90000,
      description: 'Bàn riêng cho tối đa 4 người, cùng làm việc.',
      amenities: ['wifi', 'plug', 'users'],
    },
    bar: {
      label: 'Quầy chung',
      rate: 25000,
      description: 'Chỗ ngồi linh hoạt ngay bên quầy cà phê.',
      amenities: ['wifi', 'plug', 'cup'],
    },
  };
  const menu = [
    {
      id: 'latte',
      name: 'Cà phê sữa',
      description: 'Espresso, sữa đặc · đá',
      price: 45000,
      art: 'latte',
      category: 'coffee',
    },
    {
      id: 'coldbrew',
      name: 'Cold brew cam',
      description: 'Ủ lạnh 16 giờ, cam tươi',
      price: 55000,
      art: 'coldbrew',
      category: 'coffee',
    },
    {
      id: 'matcha',
      name: 'Matcha latte',
      description: 'Matcha, sữa tươi · ít ngọt',
      price: 59000,
      art: 'matcha',
      category: 'tea',
    },
    {
      id: 'tea',
      name: 'Trà đào',
      description: 'Trà lài, đào ngâm · đá',
      price: 45000,
      art: 'tea',
      category: 'tea',
    },
  ];
  const initial = () =>
    window.NepServices.ensureState({
      version: 1,
      seats: structuredClone(seedSeats),
      orders: [],
      bookings: [
        {
          id: 'R01',
          name: 'Thảo Nguyên',
          seat: 'W04',
          time: '15:00',
          hours: 2,
          people: 1,
          date: '2026-11-14',
          status: 'reserved',
        },
        {
          id: 'R02',
          name: 'Nhóm thiết kế',
          seat: 'M01',
          time: '15:00',
          hours: 2,
          people: 4,
          date: '2026-11-14',
          status: 'reserved',
        },
      ],
      support: [
        {
          id: 'S01',
          seat: 'F03',
          name: 'Hoàng Nam',
          text: 'Mình cần kết nối màn hình ngoài.',
          category: 'Thiết bị',
          status: 'open',
        },
      ],
      sale: false,
    });
  const key = 'nep-workspace-prototype-v1';
  let state;
  let persistent = true;
  try {
    state = JSON.parse(localStorage.getItem(key));
    if (
      !state ||
      state.version !== 1 ||
      !Array.isArray(state.seats) ||
      !Array.isArray(state.orders) ||
      !Array.isArray(state.bookings) ||
      !Array.isArray(state.support)
    )
      state = initial();
  } catch {
    state = initial();
    persistent = false;
  }
  state = window.NepServices.ensureState(state);
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      persistent = false;
    }
    window.dispatchEvent(new Event('nep-state'));
  };
  const getSeat = (id) => state.seats.find((s) => s.id === id);
  const reset = () => {
    state = initial();
    save();
  };
  const getState = () => state;
  const replaceState = (value) => {
    state = window.NepServices.ensureState(value);
    save();
  };
  const statusFor = (seat, date = '2026-11-14') =>
    date === '2026-11-14'
      ? seat.status
      : seat.status === 'blocked'
        ? 'blocked'
        : state.bookings.some(
              (b) =>
                b.seat === seat.id &&
                b.date === date &&
                b.status === 'reserved',
            )
          ? 'reserved'
          : 'free';
  window.addEventListener('storage', (event) => {
    if (event.key === key && event.newValue) {
      try {
        const value = JSON.parse(event.newValue);
        if (value.version === 1) {
          state = window.NepServices.ensureState(value);
          window.dispatchEvent(new Event('nep-state'));
        }
      } catch {
        /* Ignore malformed demo state. */
      }
    }
  });
  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach((el) => {
      el.innerHTML = icon(el.dataset.icon);
    });
  }
  function plant(x, y, scale = 1) {
    return `<g transform="translate(${x} ${y}) scale(${scale})" class="plant"><circle r="18"/><ellipse rx="8" ry="21" transform="rotate(35)"/><ellipse rx="8" ry="21" transform="rotate(100)"/><ellipse rx="8" ry="21" transform="rotate(165)"/><circle r="4"/></g>`;
  }
  function furniture(s) {
    if (s.kind === 'window')
      return '<rect class="chair" x="-21" y="34" width="42" height="30" rx="10"/><rect class="table-side" x="-47" y="-19" width="94" height="61" rx="5"/><rect class="table-top" x="-47" y="-24" width="94" height="61" rx="5"/><path class="table-seam" d="M-39-16h78"/>';
    if (s.kind === 'meeting')
      return '<rect class="chair" x="-78" y="-33" width="31" height="27" rx="8"/><rect class="chair" x="47" y="-33" width="31" height="27" rx="8"/><rect class="chair" x="-78" y="14" width="31" height="27" rx="8"/><rect class="chair" x="47" y="14" width="31" height="27" rx="8"/><rect class="table-side" x="-53" y="-49" width="106" height="111" rx="16"/><rect class="table-top" x="-53" y="-54" width="106" height="111" rx="16"/><path class="table-seam" d="M-43-43h86"/>';
    if (s.kind === 'bar')
      return '<rect class="chair" x="-27" y="-27" width="54" height="56" rx="18"/><circle class="table-top" r="24" cy="-5"/>';
    return '<rect class="chair" x="-23" y="33" width="46" height="31" rx="12"/><rect class="table-side" x="-50" y="-27" width="100" height="77" rx="10"/><rect class="table-top" x="-50" y="-32" width="100" height="77" rx="10"/><path class="table-seam" d="M-39-22h78"/>';
  }
  function mapMarkup({
    selected = 'W03',
    customer = false,
    zone = 'all',
    filter = 'all',
    date = '2026-11-14',
    angle = false,
  } = {}) {
    const seats = state.seats;
    return `<svg class="floor-plan ${angle ? 'is-angled' : ''}" viewBox="0 0 1000 760" role="group" aria-label="Sơ đồ chỗ ngồi tương tác. Dùng Tab để chọn một chỗ.">
      <defs><pattern id="floor-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" class="floor-grid" fill="none"/></pattern><pattern id="blocked-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" class="blocked-line"/></pattern></defs>
      <rect class="floor-base" x="35" y="42" width="930" height="680" rx="5"/>
      <rect x="35" y="42" width="930" height="680" fill="url(#floor-grid)"/>
      <path class="outer-wall" d="M35 570V42H965V722H365M35 665v57h238"/>
      <path class="window-line" d="M92 47h510M92 57h510"/><path class="window-cross" d="M160 46v12M250 46v12M340 46v12M430 46v12M520 46v12"/>
      <path class="inner-wall" d="M654 42v407h311M654 252h311"/>
      <path class="door" d="M654 182h-58a58 58 0 0 1 58-58M654 392h-58a58 58 0 0 1 58-58M35 665h83a83 83 0 0 0-83-83"/>
      <text x="116" y="88" class="zone-label">CẠNH CỬA SỔ</text>
      <text x="112" y="259" class="zone-label">KHU TẬP TRUNG</text>
      <text x="744" y="83" class="zone-label">BÀN NHÓM</text>
      <path class="quiet-divider" d="M100 279h480"/>
      <rect class="rug" x="97" y="291" width="478" height="277" rx="18"/>
      <path class="counter-side" d="M485 568h446v45H485z"/><rect class="counter" x="485" y="554" width="446" height="47" rx="8"/>
      <rect class="counter-machine" x="812" y="560" width="60" height="29" rx="3"/><path class="counter-detail" d="M823 569h36M823 577h36M888 562v24"/>
      <text x="507" y="584" class="counter-label">NẾP COFFEE BAR</text>
      <text x="102" y="644" class="entry-label">LỐI VÀO</text><path class="entry-arrow" d="M95 662h47m-7-6 7 6-7 6"/>
      ${plant(73, 79, 0.85)}${plant(615, 82, 0.9)}${plant(618, 512, 1)}${plant(923, 487, 1.2)}${plant(85, 524, 0.85)}
      ${seats
        .map((s) => {
          const displayStatus = statusFor(s, date);
          const muted =
            (zone !== 'all' && s.kind !== zone) ||
            (filter !== 'all' && displayStatus !== filter);
          const isDisabled = customer && displayStatus !== 'free';
          const label = `${s.id}, ${kinds[s.kind].label}, ${statusText[displayStatus]}, ${money(kinds[s.kind].rate)} mỗi giờ`;
          const glyph = {
            free: '○',
            occupied: '●',
            reserved: '◷',
            attention: '!',
            blocked: '×',
          }[displayStatus];
          return `<g class="seat seat--${displayStatus} ${selected === s.id ? 'is-selected' : ''} ${muted ? 'is-muted' : ''}" data-seat="${s.id}" transform="translate(${s.x} ${s.y})" role="button" tabindex="${muted || isDisabled ? '-1' : '0'}" aria-label="${escape(label)}" aria-pressed="${selected === s.id}" ${isDisabled ? 'aria-disabled="true"' : ''} ${muted ? 'aria-hidden="true"' : ''}>
          <rect class="seat-hit" x="-70" y="-62" width="140" height="151" rx="16"/>
          ${furniture(s)}
          <circle class="seat-marker" r="25" cy="1"/><text class="seat-id" y="6">${s.id}</text>
          <circle class="state-dot" cx="27" cy="-22" r="10"/><text class="state-glyph" x="27" y="-18">${glyph}</text>
          ${!customer && displayStatus !== 'free' && displayStatus !== 'blocked' ? `<text class="guest-name" y="84">${escape(s.guest || 'Khách tại quán')}</text>` : ''}
          ${displayStatus === 'blocked' ? '<circle class="blocked-cover" r="24" cy="1" fill="url(#blocked-hatch)"/>' : ''}
        </g>`;
        })
        .join('')}
      <g class="compass" transform="translate(920 690)"><path d="m0-22 6 24-6-5-6 5z"/><text y="-29">N</text></g>
    </svg>`;
  }
  function bindMap(container, onSelect) {
    container.querySelectorAll('[data-seat]').forEach((el) => {
      const select = () => {
        if (
          el.getAttribute('aria-disabled') !== 'true' &&
          el.getAttribute('aria-hidden') !== 'true'
        )
          onSelect(el.dataset.seat);
      };
      el.addEventListener('click', select);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });
  }
  function drinkArt(type) {
    return `<svg viewBox="0 0 120 120" class="drink-art drink-art--${type}" aria-hidden="true"><ellipse class="drink-shadow" cx="62" cy="100" rx="33" ry="7"/><path class="drink-glass" d="M33 31h54l-6 65c-5 7-32 7-37 0z"/><path class="drink-liquid" d="M36 45h48l-5 49c-8 5-24 5-33 0z"/><ellipse class="drink-foam" cx="60" cy="45" rx="24" ry="6"/><path class="drink-ice" d="m45 53 12-3 3 13-12 3zm19 15 12-2 2 13-12 2z"/><path class="drink-straw" d="m64 74 7-58 14-4"/>${type === 'coldbrew' || type === 'tea' ? '<circle class="drink-fruit" cx="84" cy="42" r="14"/><path class="drink-fruit-detail" d="M74 42h20M84 32v20m-7-17 14 14m-14 0 14-14"/>' : ''}</svg>`;
  }
  let noticeTimer;
  function toast(message) {
    const el = document.getElementById('notice');
    if (el) {
      clearTimeout(noticeTimer);
      el.textContent = message;
      el.hidden = false;
      noticeTimer = setTimeout(() => {
        el.hidden = true;
      }, 7000);
    }
  }
  window.Nep = {
    icon,
    money,
    escape,
    statusText,
    kinds,
    menu,
    getState,
    getSeat,
    statusFor,
    save,
    replaceState,
    reset,
    hydrateIcons,
    mapMarkup,
    bindMap,
    drinkArt,
    toast,
    isPersistent: () => persistent,
  };
  document.addEventListener('DOMContentLoaded', () => {
    hydrateIcons();
    document.querySelectorAll('[data-reset]').forEach((b) =>
      b.addEventListener('click', () => {
        reset();
        location.reload();
      }),
    );
    document.querySelectorAll('dialog').forEach((d) =>
      d.addEventListener('click', (e) => {
        if (e.target === d) {
          const r = d.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            d.close();
        }
      }),
    );
  });
})();
