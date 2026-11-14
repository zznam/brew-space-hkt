(() => {
  'use strict';
  const N = window.Nep;
  const S = window.NepServices;
  const UI = window.NepServiceUI;
  const $ = (selector) => document.querySelector(selector);
  const state = () => N.getState();
  let selected = 'W03',
    hours = 2,
    zone = 'all',
    view = 'list',
    category = 'all',
    pending = false;
  let serviceGroup = 'books',
    includeSeat = true,
    deliverySeat = 'W03';
  const cart = {};
  const dialog = $('#customer-dialog');
  const amenities = {
    wifi: 'Wi-Fi',
    plug: 'Ổ điện',
    leaf: 'Ánh sáng',
    volume: 'Yên tĩnh',
    users: '4 người',
    cup: 'Gần quầy',
  };
  const cartLines = () =>
    [...N.menu, ...S.catalog.filter((p) => p.mode === 'sale')]
      .filter((m) => cart[m.id] > 0)
      .map((m) => ({ ...m, qty: cart[m.id] }));
  const cartLimit = (id) =>
    S.catalog.some((product) => product.id === id)
      ? Math.min(20, S.available(state(), id))
      : 20;
  function totals() {
    const seat = N.getSeat(selected),
      seatPrice = includeSeat && seat ? N.kinds[seat.kind].rate * hours : 0;
    const drinks = cartLines().reduce((total, m) => total + m.price * m.qty, 0);
    const discount =
      state().sale && seat?.kind === 'focus' ? Math.round(seatPrice * 0.1) : 0;
    return {
      seatPrice,
      drinks,
      discount,
      total: seatPrice + drinks - discount,
    };
  }
  function openDialog(title, html) {
    $('#customer-dialog-title').textContent = title;
    $('#customer-dialog-body').innerHTML = html;
    N.hydrateIcons(dialog);
    if (!dialog.open) dialog.showModal();
    $('#customer-dialog-body')
      .querySelector('input,textarea,select,button,a[href]')
      ?.focus({ preventScroll: true });
  }
  $('#close-customer-dialog').addEventListener('click', () => dialog.close());
  function selectSeat(id) {
    selected = id;
    deliverySeat = id;
    $('#checkout-error').hidden = true;
    renderSpace();
    renderBill();
  }
  function setCustomerTab(tab) {
    document.body.dataset.view = tab;
    document.querySelectorAll('[data-customer-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.customerPanel !== tab;
    });
    document.querySelectorAll('[data-customer-tab]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.customerTab === tab);
      if (button.dataset.customerTab === tab)
        button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('#customer-view-title').innerHTML = {
      space: 'Một chỗ ngồi,<br>đủ điều bạn cần.',
      menu: 'Đồ uống tại bàn',
      services: 'Tiện ích tại quán',
      cart: 'Giỏ của bạn',
    }[tab];
    $('.mobile-cart').hidden = tab === 'cart';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function renderServices() {
    $('#customer-service-tabs').innerHTML = UI.tabs(serviceGroup);
    $('#customer-service-policy').innerHTML =
      `${N.icon(S.groups[serviceGroup].mode === 'borrow' ? 'undo' : 'bag')}<span>${S.groups[serviceGroup].policy}</span>`;
    $('#customer-service-list').innerHTML = UI.cards(serviceGroup, {
      quantities: cart,
    });
    $('#customer-loans').innerHTML = UI.loans({ filter: 'all' });
    const count = state().loans.filter((loan) =>
      ['requested', 'borrowed'].includes(loan.status),
    ).length;
    $('#customer-loan-count').textContent = count;
    $('#customer-nav-loans').hidden = !count;
    $('#customer-nav-loans').textContent = count;
    $('#customer-service-tabs')
      .querySelectorAll('[data-service-group]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          serviceGroup = b.dataset.serviceGroup;
          renderServices();
        }),
      );
    $('#customer-service-list')
      .querySelectorAll('[data-service-action]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          const product = S.item(b.dataset.serviceAction);
          if (product.mode === 'borrow') {
            loanForm(product);
            return;
          }
          if ((cart[product.id] || 0) >= S.available(state(), product.id)) {
            N.toast('Sản phẩm không còn đủ số lượng.');
            return;
          }
          cart[product.id] = Math.min(20, (cart[product.id] || 0) + 1);
          renderBill();
        }),
      );
  }
  function loanForm(product) {
    openDialog(
      `Mượn ${product.name}`,
      `<form id="loan-form"><div class="borrow-sheet-art tone-${S.groups[product.group].tone}">${N.icon(product.icon)}<div><strong>Miễn phí tại quán</strong><p>${N.escape(S.groups[product.group].policy)}</p></div></div><div class="field"><label for="loan-seat">Chỗ nhận đồ</label><select id="loan-seat">${state()
        .seats.filter((s) => s.status !== 'blocked')
        .map(
          (s) =>
            `<option value="${s.id}" ${s.id === deliverySeat ? 'selected' : ''}>${s.id} · ${N.kinds[s.kind].label}</option>`,
        )
        .join(
          '',
        )}</select></div><p class="dialog-note">Còn ${S.available(state(), product.id)} ${product.group === 'books' ? 'cuốn' : 'món'}. Nhân viên giao tại chỗ; vui lòng trả trước khi rời quán.</p><p class="form-error" id="loan-error" role="alert" hidden></p><button type="submit" class="button button--primary full-width">Gửi yêu cầu mượn ${N.icon('arrow')}</button></form>`,
    );
    const key = `L-${crypto.randomUUID()}`;
    $('#loan-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const seatId = $('#loan-seat').value;
      try {
        N.replaceState(
          S.requestLoan(state(), {
            serviceId: product.id,
            seatId,
            quantity: 1,
            key,
          }),
        );
        openDialog(
          'Đã gửi yêu cầu mượn',
          `<div class="success-symbol">${N.icon('check')}</div><h3>${N.escape(product.name)} · ${N.escape(seatId)}</h3><p class="dialog-copy">Đang chờ nhân viên giao đồ. Bạn có thể xem trạng thái trong Tiện ích.</p><p class="dialog-note">Đây là phiếu mượn mẫu. Không thu phí và không gửi thông báo ra ngoài.</p><button class="button button--outline full-width" id="view-my-loans">Xem phiếu mượn</button>`,
        );
        $('#view-my-loans').addEventListener('click', () => {
          dialog.close();
          setCustomerTab('services');
          renderServices();
          $('#customer-loans').scrollIntoView({ block: 'center' });
        });
      } catch (error) {
        $('#loan-error').hidden = false;
        $('#loan-error').textContent = error.message;
      }
    });
  }
  function renderSpace() {
    $('#customer-map').innerHTML = N.mapMarkup({
      selected,
      zone,
      customer: true,
    });
    N.bindMap($('#customer-map'), selectSeat);
    $('#customer-map').hidden = view !== 'map';
    $('#customer-seat-list').hidden = view !== 'list';
    const seats = state().seats.filter(
      (s) => s.status === 'free' && (zone === 'all' || s.kind === zone),
    );
    $('#customer-free-count').textContent = `${seats.length} chỗ còn trống`;
    $('#customer-seat-list').innerHTML = seats.length
      ? seats
          .map(
            (s) =>
              `<button class="available-seat ${selected === s.id ? 'is-selected' : ''}" data-available-seat="${s.id}" aria-pressed="${selected === s.id}"><strong>${s.id}</strong><span>${N.kinds[s.kind].label}</span><span>${N.money(N.kinds[s.kind].rate)}/giờ</span></button>`,
          )
          .join('')
      : '<div class="empty-state"><strong>Khu vực này đã hết chỗ</strong><p>Chọn một khu vực khác để tiếp tục.</p></div>';
    $('#customer-seat-list')
      .querySelectorAll('[data-available-seat]')
      .forEach((b) =>
        b.addEventListener('click', () => selectSeat(b.dataset.availableSeat)),
      );
  }
  function renderMenu() {
    const items = N.menu.filter(
      (m) => category === 'all' || m.category === category,
    );
    $('#customer-menu').innerHTML = items
      .map(
        (m) =>
          `<article class="drink-card"><div class="drink-image">${N.drinkArt(m.art)}</div><h3>${m.name}</h3><p>${m.description}</p><div class="drink-purchase"><strong>${N.money(m.price)}</strong><button class="add-drink" data-add="${m.id}" aria-label="Thêm ${m.name}">${N.icon('plus')}${cart[m.id] ? `<span>${cart[m.id]}</span>` : ''}</button></div></article>`,
      )
      .join('');
    $('#customer-menu')
      .querySelectorAll('[data-add]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.add;
          cart[id] = Math.min(20, (cart[id] || 0) + 1);
          renderMenu();
          renderBill();
        }),
      );
  }
  function renderBill() {
    const seat = N.getSeat(includeSeat ? selected : deliverySeat);
    if (seat) {
      const kind = N.kinds[seat.kind];
      $('#selected-seat-summary').innerHTML =
        `<div class="selected-seat"><span class="selected-seat-code">${seat.id}</span><div><h3>${kind.label}</h3><p>${includeSeat ? N.money(kind.rate) + ' / giờ' : 'Chỉ nhận món / sản phẩm'} · ${seat.kind === 'meeting' ? 'Tối đa 4 người' : '1 người'}</p><div class="amenity-list">${kind.amenities.map((a) => `<span class="amenity">${N.icon(a)}${amenities[a]}</span>`).join('')}</div></div></div>`;
    } else {
      $('#selected-seat-summary').innerHTML =
        '<p class="dialog-note">Chọn một chỗ trống trên sơ đồ hoặc danh sách để tiếp tục.</p>';
    }
    $('#cart-drinks').innerHTML = cartLines()
      .map(
        (m) =>
          `<div class="cart-line"><div>${m.name}<br><small>${N.money(m.price)}</small></div><div class="quantity-control"><button type="button" data-quantity="${m.id}" data-delta="-1" aria-label="Bớt ${m.name}">${N.icon('minus')}</button><span>${m.qty}</span><button type="button" data-quantity="${m.id}" data-delta="1" aria-label="Thêm ${m.name}" ${m.qty >= cartLimit(m.id) ? 'disabled' : ''}>${N.icon('plus')}</button></div></div>`,
      )
      .join('');
    $('#cart-drinks')
      .querySelectorAll('[data-quantity]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.quantity;
          cart[id] = Math.min(
            cartLimit(id),
            Math.max(0, (cart[id] || 0) + Number(b.dataset.delta)),
          );
          renderBill();
          renderMenu();
        }),
      );
    const t = totals();
    $('#mobile-cart-summary').textContent = seat
      ? `${seat.id}${includeSeat ? ` · ${hours} giờ` : ' · Nhận tại chỗ'}`
      : 'Chưa chọn chỗ';
    $('#mobile-cart-total').textContent = N.money(t.total);
    $('#context-seat-label').textContent = seat ? `Chỗ ${seat.id}` : 'Chọn chỗ';
    $('#customer-cart-count').textContent = cartLines().reduce(
      (sum, line) => sum + line.qty,
      includeSeat ? 1 : 0,
    );
    $('#price-summary').innerHTML =
      `${includeSeat ? `<div class="price-row"><span>Chỗ ngồi · ${hours} giờ</span><span>${N.money(t.seatPrice)}</span></div>` : ''}${t.drinks ? `<div class="price-row"><span>Món & sản phẩm</span><span>${N.money(t.drinks)}</span></div>` : ''}${t.discount ? `<div class="price-row price-row--discount"><span>Ưu đãi giờ tập trung · 10%</span><span>−${N.money(t.discount)}</span></div>` : ''}<div class="price-row"><span>Phụ phí</span><span>0 ₫</span></div><div class="price-row price-row--total"><span>Tổng thanh toán</span><strong>${N.money(t.total)}</strong></div>`;
    $('.duration-fieldset').hidden = !includeSeat;
    $('.booking-time').hidden = !includeSeat;
    $('#purchase-destination').hidden = includeSeat;
    $('#purchase-destination').innerHTML =
      `<div class="field"><label for="purchase-seat">Nhận món / sản phẩm tại chỗ</label><select id="purchase-seat">${state()
        .seats.filter((s) => s.status !== 'blocked')
        .map(
          (s) =>
            `<option value="${s.id}" ${s.id === deliverySeat ? 'selected' : ''}>${s.id} · ${N.kinds[s.kind].label}</option>`,
        )
        .join('')}</select></div>`;
    $('#purchase-seat').addEventListener('change', (e) => {
      deliverySeat = e.target.value;
      renderBill();
    });
    $('#checkout').disabled =
      !seat ||
      (includeSeat ? seat.status !== 'free' : !cartLines().length) ||
      pending;
    $('#checkout').querySelector('span').textContent = includeSeat
      ? 'Đặt chỗ & thanh toán'
      : 'Thanh toán đơn mua';
    $('#checkout-error').hidden =
      !!seat && (includeSeat || cartLines().length > 0);
    if (!seat) {
      $('#checkout-error').textContent =
        'Chưa có chỗ trống được chọn. Chọn lại trên sơ đồ hoặc danh sách.';
    } else if (!includeSeat && !cartLines().length) {
      $('#checkout-error').textContent =
        'Giỏ chưa có món hoặc sản phẩm. Thêm từ Đồ uống hoặc Tiện ích.';
    }
    renderServices();
  }
  function render() {
    const seat = N.getSeat(selected);
    if (!seat || seat.status !== 'free')
      selected =
        state().seats.find(
          (s) => s.status === 'free' && (zone === 'all' || s.kind === zone),
        )?.id || '';
    renderSpace();
    renderMenu();
    renderBill();
  }
  document.querySelectorAll('[data-zone]').forEach((b) =>
    b.addEventListener('click', () => {
      zone = b.dataset.zone;
      document.querySelectorAll('[data-zone]').forEach((btn) => {
        btn.classList.toggle('is-active', btn === b);
        btn.setAttribute('aria-pressed', String(btn === b));
      });
      const seat = N.getSeat(selected);
      if (zone !== 'all' && seat?.kind !== zone)
        selected =
          state().seats.find((s) => s.kind === zone && s.status === 'free')
            ?.id || '';
      renderSpace();
      renderBill();
    }),
  );
  document.querySelectorAll('[data-customer-view]').forEach((b) =>
    b.addEventListener('click', () => {
      view = b.dataset.customerView;
      document.querySelectorAll('[data-customer-view]').forEach((btn) => {
        btn.classList.toggle('is-active', btn === b);
        btn.setAttribute('aria-pressed', String(btn === b));
      });
      renderSpace();
    }),
  );
  document.querySelectorAll('[data-hours]').forEach((b) =>
    b.addEventListener('click', () => {
      hours = Number(b.dataset.hours);
      document.querySelectorAll('[data-hours]').forEach((btn) => {
        btn.classList.toggle('is-active', btn === b);
        btn.setAttribute('aria-pressed', String(btn === b));
      });
      renderBill();
    }),
  );
  $('#menu-category').addEventListener('change', (e) => {
    category = e.target.value;
    renderMenu();
  });
  $('#include-seat').addEventListener('change', (e) => {
    includeSeat = e.target.checked;
    renderBill();
  });
  document
    .querySelectorAll('[data-customer-tab],[data-customer-open]')
    .forEach((b) =>
      b.addEventListener('click', () =>
        setCustomerTab(b.dataset.customerTab || b.dataset.customerOpen),
      ),
    );
  $('#customer-shortcuts').innerHTML = UI.shortcuts();
  $('#customer-shortcuts')
    .querySelectorAll('[data-service-shortcut]')
    .forEach((b) =>
      b.addEventListener('click', () => {
        serviceGroup = b.dataset.serviceShortcut;
        setCustomerTab('services');
        renderServices();
      }),
    );
  $('#loyalty-info').addEventListener('click', () =>
    openDialog(
      'Một chút thân quen',
      `<p class="dialog-copy">Trong MVP, thành viên xác minh số điện thoại để tích điểm từ các đơn đã hoàn tất. Quán có thể đề xuất ưu đãi dựa trên khung giờ, gói chỗ và món thường mua.</p><p class="dialog-note">Prototype chưa có tài khoản, số dư điểm hoặc lịch sử thật. Phân tích AI và ưu đãi loyalty sẽ được nối sau khi có backend.</p><button class="button button--outline full-width" id="close-loyalty">Quay lại chọn chỗ</button>`,
    ),
  );
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('#close-loyalty')) dialog.close();
  });
  function supportForm() {
    openDialog(
      'Bạn cần hỗ trợ gì?',
      `<form id="support-form"><p class="dialog-copy">Yêu cầu mẫu sẽ xuất hiện ở màn vận hành. Nhân viên luôn có thể hỗ trợ, không phụ thuộc vào phân loại tự động.</p><div class="field"><label for="support-seat">Chỗ liên quan</label><select id="support-seat">${state()
        .seats.map(
          (s) =>
            `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${s.id} · ${N.kinds[s.kind].label}</option>`,
        )
        .join(
          '',
        )}</select></div><div class="field"><label for="support-message">Nội dung yêu cầu</label><textarea id="support-message" rows="3" maxlength="240" required placeholder="Mình cần hỗ trợ kết nối Wi-Fi…" aria-describedby="support-error"></textarea><span id="support-error" class="field-helper"></span></div><button class="button button--primary full-width" type="submit">Gửi yêu cầu mẫu</button></form>`,
    );
    $('#support-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('#support-message').value.trim();
      if (!text) {
        $('#support-message').setAttribute('aria-invalid', 'true');
        $('#support-error').textContent =
          'Nội dung đang trống. Mô tả điều bạn cần hỗ trợ.';
        return;
      }
      const category = /wifi|wi-fi|mạng|màn hình|ổ cắm|ổ điện|kết nối/i.test(
        text,
      )
        ? 'Thiết bị'
        : /tiền|thanh toán|hoàn|hủy/i.test(text)
          ? 'Thanh toán'
          : 'Nhân viên hỗ trợ';
      const seat = $('#support-seat').value;
      state().support.push({
        id: `S${Date.now()}`,
        seat,
        name: 'Khách gửi yêu cầu',
        text,
        category,
        status: 'open',
      });
      if (N.getSeat(seat)?.status === 'occupied')
        N.getSeat(seat).status = 'attention';
      N.save();
      openDialog(
        'Đã gửi yêu cầu mẫu',
        `<div class="success-symbol">${N.icon('check')}</div><p class="dialog-copy">Yêu cầu tại ${seat} đã được thêm vào hàng chờ của nhân viên.</p><div class="support-classification">Phân loại bằng quy tắc minh họa: ${category}. Chưa gọi AI.</div><p class="dialog-note">Không có thông báo gửi đến nhân viên thật. Mở màn vận hành để xem và nhận xử lý.</p><a class="button button--outline full-width" href="operations.html">Xem màn vận hành ${N.icon('external')}</a>`,
      );
    });
  }
  $('#customer-support').addEventListener('click', supportForm);
  $('#checkout').addEventListener('click', () => {
    if (pending) return;
    const seat = N.getSeat(includeSeat ? selected : deliverySeat);
    if (!seat || (includeSeat && seat.status !== 'free')) {
      $('#checkout-error').hidden = false;
      $('#checkout-error').textContent =
        'Chỗ vừa thay đổi trạng thái. Chọn lại chỗ nhận để tiếp tục.';
      render();
      return;
    }
    const t = totals();
    const seatId = seat.id;
    const note = $('#order-note').value.trim();
    const items = cartLines().map((m) => ({
      id: m.id,
      name: m.name,
      qty: m.qty,
      price: m.price,
    }));
    const invoiceHours = hours;
    const buysSeat = includeSeat;
    openDialog(
      buysSeat ? 'Xác nhận đặt chỗ' : 'Xác nhận đơn mua',
      `<p class="dialog-copy">Thanh toán mô phỏng. Không nhập thông tin thẻ hoặc chuyển tiền thật.</p><div class="dialog-row"><span>${buysSeat ? 'Chỗ ngồi' : 'Nhận tại chỗ'}</span><strong>${seatId} · ${N.kinds[seat.kind].label}</strong></div>${buysSeat ? `<div class="dialog-row"><span>Thời lượng</span><strong>${invoiceHours} giờ</strong></div>` : ''}<div class="dialog-row"><span>Món & sản phẩm</span><strong>${items.reduce((n, i) => n + i.qty, 0)} món</strong></div><div class="dialog-row"><span>Tổng tiền mẫu</span><strong>${N.money(t.total)}</strong></div><p class="dialog-note">Đồ mượn miễn phí có phiếu riêng. Sản phẩm chỉ trừ tồn khi bước mô phỏng thành công.</p><button id="confirm-checkout" class="button button--primary full-width">Mô phỏng thanh toán ${N.icon('arrow')}</button><button id="simulate-failure" class="quiet-button full-width">Thử thanh toán lỗi</button><p id="payment-error" role="alert" class="form-error" hidden></p>`,
    );
    $('#simulate-failure').addEventListener('click', () => {
      $('#payment-error').hidden = false;
      $('#payment-error').textContent =
        'Thanh toán mẫu bị từ chối. Chỗ chưa được đặt; bạn có thể thử lại.';
    });
    $('#confirm-checkout').addEventListener('click', () => {
      if (pending) return;
      if (buysSeat && N.getSeat(seatId)?.status !== 'free') {
        $('#payment-error').hidden = false;
        $('#payment-error').textContent =
          'Chỗ không còn trống. Đóng cửa sổ và chọn chỗ khác; chưa thu tiền.';
        return;
      }
      pending = true;
      const booking = {
        id: `R${Date.now()}`,
        seat: seatId,
        name: 'Khách đặt online',
        time: '14:45',
        hours: invoiceHours,
        people: seat.kind === 'meeting' ? 4 : 1,
        date: '2026-11-14',
        status: 'reserved',
      };
      const order = {
        id: `NP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        seat: seatId,
        guest: 'Khách đặt online',
        items: [
          ...(buysSeat
            ? [
                {
                  id: 'seat-hours',
                  name: `Gói chỗ ${seatId} · ${invoiceHours} giờ`,
                  qty: 1,
                  price: t.seatPrice,
                },
              ]
            : []),
          ...items,
        ],
        discount: t.discount,
        total: t.total,
        note,
        status: 'queued',
        method: 'Online mô phỏng',
        createdAt: Date.now(),
      };
      let next;
      try {
        next = S.sell(state(), {
          key: order.id,
          lines: items
            .filter((line) => S.catalog.some((p) => p.id === line.id))
            .map((line) => ({ serviceId: line.id, quantity: line.qty })),
        });
      } catch (error) {
        pending = false;
        $('#payment-error').hidden = false;
        $('#payment-error').textContent = error.message;
        return;
      }
      next = {
        ...next,
        orders: [...next.orders, order],
        bookings: buysSeat ? [...next.bookings, booking] : next.bookings,
        seats: buysSeat
          ? next.seats.map((s) =>
              s.id === seatId
                ? { ...s, status: 'reserved', guest: booking.name }
                : s,
            )
          : next.seats,
      };
      if (note) {
        next = {
          ...next,
          support: [
            ...next.support,
            {
              id: `S${Date.now()}`,
              seat: seatId,
              name: booking.name,
              text: note,
              category: /wifi|màn hình|ổ cắm|kết nối/i.test(note)
                ? 'Thiết bị'
                : 'Ghi chú cần xem',
              status: 'open',
            },
          ],
        };
      }
      pending = false;
      Object.keys(cart).forEach((id) => delete cart[id]);
      $('#order-note').value = '';
      N.replaceState(next);
      openDialog(
        buysSeat ? 'Chỗ của bạn đã sẵn sàng.' : 'Đã nhận đơn mua của bạn.',
        `<div class="success-symbol">${N.icon('check')}</div><div class="confirmation-code">${N.escape(order.id)}</div><p class="dialog-copy">${buysSeat ? `Đặt chỗ mẫu ${seatId} thành công. Nhân viên sẽ hỗ trợ check-in.` : `Đơn mẫu sẽ được giao tại ${seatId}. Phiên sử dụng chỗ hiện tại được giữ nguyên.`}</p><div class="dialog-row"><span>${buysSeat ? 'Gói chỗ' : 'Chỗ nhận hàng'}</span><strong>${buysSeat ? `${invoiceHours} giờ · ` : ''}${seatId}</strong></div><div class="dialog-row"><span>Thanh toán mô phỏng</span><strong>${N.money(t.total)}</strong></div>${note ? '<div class="support-classification">Ghi chú đã chuyển vào hàng chờ nhân viên.</div>' : ''}<p class="dialog-note">Không có tiền thật được thu. Đơn đã xuất hiện ở màn nhân viên.</p><a class="button button--primary full-width" href="operations.html">Xem màn nhân viên ${N.icon('arrow')}</a><button class="quiet-button full-width" id="choose-another">Quay lại chọn dịch vụ</button>`,
      );
      $('#choose-another').addEventListener('click', () => {
        dialog.close();
        setCustomerTab('space');
        render();
      });
      render();
    });
  });
  window.addEventListener('nep-state', render);
  document.querySelectorAll('[data-customer-view]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.customerView === view);
    b.setAttribute('aria-pressed', String(b.dataset.customerView === view));
  });
  render();
})();
