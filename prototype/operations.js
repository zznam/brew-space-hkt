(() => {
  'use strict';
  const N = window.Nep;
  const S = window.NepServices;
  const UI = window.NepServiceUI;
  const $ = (selector) => document.querySelector(selector);
  const state = () => N.getState();
  let selected = 'W03',
    zone = 'all',
    filter = 'all',
    activity = 'all',
    mode = 'map',
    angle = false,
    editing = false;
  let currentView = 'space',
    servicePane = 'requested',
    serviceGroup = 'books';
  let draftPositions = null;
  const date = () => $('#operation-date').value || '2026-11-14';
  const status = (s) => N.statusFor(s, date());
  const amenities = {
    wifi: 'Wi-Fi',
    plug: 'Ổ điện',
    leaf: 'Ánh sáng',
    volume: 'Yên tĩnh',
    users: '4 người',
    cup: 'Gần quầy',
  };
  const dialog = $('#work-dialog');
  const seatSheet = $('#seat-sheet');
  function openDialog(title, html) {
    if (seatSheet.open) seatSheet.close();
    const inlineView = {
      'POS & đơn hàng': 'pos',
      'Yêu cầu hỗ trợ': 'support',
      'Đặt chỗ trong ngày': 'bookings',
      'Đề xuất cho quản lý': 'insights',
    }[title];
    if (inlineView && inlineView === currentView) {
      if (dialog.open) dialog.close();
      $('#dialog-body').innerHTML = '';
      $('#operation-screen-content').innerHTML = html;
      N.hydrateIcons($('#operation-screen-content'));
      return;
    }
    $('#dialog-title').textContent = title;
    $('#dialog-body').innerHTML = html;
    N.hydrateIcons(dialog);
    if (!dialog.open) dialog.showModal();
    $('#dialog-body')
      .querySelector('input,textarea,select,button,a[href]')
      ?.focus({ preventScroll: true });
  }
  function showSeat(id) {
    selected = id;
    render();
    if (!seatSheet.open) seatSheet.showModal();
    $('#seat-detail').querySelector('button')?.focus({ preventScroll: true });
  }
  $('#close-seat-sheet').addEventListener('click', () => seatSheet.close());
  $('[data-close-dialog]').addEventListener('click', () => dialog.close());
  function renderMap() {
    const canvas = $('#operation-map');
    canvas.innerHTML = N.mapMarkup({
      selected,
      zone,
      filter,
      date: date(),
      angle,
    });
    N.bindMap(canvas, showSeat);
    canvas.hidden = mode !== 'map';
    const list = $('#seat-list-view');
    list.hidden = mode !== 'list';
    const listSeats = state().seats.filter(
      (s) =>
        (zone === 'all' || s.kind === zone) &&
        (filter === 'all' || status(s) === filter),
    );
    list.innerHTML = listSeats.length
      ? listSeats
          .map(
            (s) =>
              `<button class="seat-list-row" data-list-seat="${s.id}" aria-pressed="${s.id === selected}"><strong>${s.id}</strong><span>${N.kinds[s.kind].label}</span><span class="status-pill status-pill--${status(s)}">${N.statusText[status(s)]}</span></button>`,
          )
          .join('')
      : '<div class="empty-state"><strong>Chưa có chỗ phù hợp</strong><p>Chọn lại khu vực hoặc trạng thái.</p></div>';
    list
      .querySelectorAll('[data-list-seat]')
      .forEach((b) =>
        b.addEventListener('click', () => showSeat(b.dataset.listSeat)),
      );
    const free = state().seats.filter((s) => status(s) === 'free').length;
    $('#capacity-summary').textContent =
      `${state().seats.length} chỗ · ${free} còn trống`;
    $('#edit-help').hidden = !editing;
    $('#edit-label').textContent = editing ? 'Lưu bố trí' : 'Chỉnh bố trí';
    $('#layout-edit').setAttribute('aria-pressed', String(editing));
  }
  function renderActivity() {
    const q = $('#guest-search').value.trim().toLocaleLowerCase('vi');
    const upcoming = state()
      .bookings.filter((b) => b.date === date() && b.status === 'reserved')
      .map((b) => ({ ...b, kind: 'reserved' }));
    const current =
      date() === '2026-11-14'
        ? state()
            .seats.filter((s) => ['occupied', 'attention'].includes(s.status))
            .map((s) => ({
              name: s.guest,
              seat: s.id,
              time: s.end || '16:00',
              kind: s.status,
              people: 1,
            }))
        : [];
    const includes = (row) =>
      (!q || `${row.name} ${row.seat}`.toLocaleLowerCase('vi').includes(q)) &&
      (zone === 'all' || N.getSeat(row.seat)?.kind === zone);
    const sections = [];
    if (activity !== 'occupied')
      sections.push(['Sắp đến', upcoming.filter(includes)]);
    if (activity !== 'reserved')
      sections.push(['Đang sử dụng', current.filter(includes)]);
    const count = sections.reduce((sum, [, rows]) => sum + rows.length, 0);
    $('#activity-count').textContent = count;
    $('#activity-list').innerHTML = count
      ? sections
          .filter(([, rows]) => rows.length)
          .map(
            ([title, rows]) =>
              `<div class="activity-section-label"><span>${title}</span><span>${rows.length}</span></div>${rows
                .map(
                  (row) =>
                    `<button class="activity-row ${selected === row.seat ? 'is-selected' : ''}" data-activity-seat="${row.seat}"><span class="activity-avatar">${N.escape(
                      row.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0])
                        .join(''),
                    )}</span><span class="activity-info"><strong class="activity-name">${N.escape(row.name)}</strong><span class="activity-meta">${N.icon('clock')} ${row.kind === 'reserved' ? row.time : `Đến ${row.time}`} <span>· ${row.people} người</span></span></span><span class="activity-seat activity-seat--${row.kind}">${row.seat}</span></button>`,
                )
                .join('')}`,
          )
          .join('')
      : '<div class="empty-state"><strong>Chưa có hoạt động phù hợp</strong><p>Thử đổi bộ lọc hoặc tạo một đặt chỗ mới.</p></div>';
    $('#activity-list')
      .querySelectorAll('[data-activity-seat]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          filter = 'all';
          syncStatusButtons();
          showSeat(b.dataset.activitySeat);
        }),
      );
    const support = state().support.filter((s) => s.status !== 'resolved');
    $('#support-count').textContent = support.length;
    $('#support-count').hidden = !support.length;
    $('#support-summary').textContent = support.length
      ? `${support.length} yêu cầu cần hỗ trợ`
      : 'Đã xử lý các yêu cầu';
    $('#support-subtitle').textContent = support.length
      ? `${support[0].seat} · ${support[0].category}`
      : 'Không có yêu cầu đang chờ';
  }
  function renderDetail() {
    const s = N.getSeat(selected);
    const k = N.kinds[s.kind];
    const st = status(s);
    const booking = state().bookings.find(
      (b) => b.seat === s.id && b.date === date() && b.status === 'reserved',
    );
    $('#seat-detail').innerHTML =
      `<div class="detail-title"><h2>${s.id}</h2><span>${k.label}</span></div><div class="seat-preview" aria-hidden="true"><div class="seat-preview-visual"><span></span></div></div><h3>${k.label}</h3><p class="detail-description">${k.description}</p><div class="amenity-list">${k.amenities.map((a) => `<span class="amenity">${N.icon(a)}${amenities[a]}</span>`).join('')}</div><div class="detail-facts"><div class="fact-row"><span>Trạng thái</span><span class="status-pill status-pill--${st}">${N.statusText[st]}</span></div><div class="fact-row"><span>Giá theo giờ</span><strong>${N.money(k.rate)}</strong></div><div class="fact-row"><span>Sức chứa</span><strong>${s.kind === 'meeting' ? 'Tối đa 4 người' : '1 người'}</strong></div>${st === 'occupied' || st === 'attention' ? `<div class="fact-row"><span>Khách đang dùng</span><strong>${N.escape(s.guest || 'Khách tại quán')}</strong></div><div class="fact-row"><span>Kết thúc lúc</span><strong>${s.end || '16:00'}</strong></div>` : ''}${st === 'reserved' ? `<div class="fact-row"><span>Khách đặt</span><strong>${N.escape(booking?.name || s.guest || 'Khách đặt trước')}</strong></div><div class="fact-row"><span>Bắt đầu</span><strong>${booking?.time || '15:00'}</strong></div>` : ''}</div><div class="detail-actions">${editing ? `<p class="dialog-note">Di chuyển ${s.id} trong sơ đồ mẫu</p><div class="move-controls"><button class="icon-button" data-move="0,-12" aria-label="Di chuyển lên">↑</button><button class="icon-button" data-move="-12,0" aria-label="Di chuyển trái">←</button><button class="icon-button" data-move="12,0" aria-label="Di chuyển phải">→</button><button class="icon-button" data-move="0,12" aria-label="Di chuyển xuống">↓</button></div><button class="button button--outline" id="cancel-layout">Hủy chỉnh sửa</button>` : st === 'free' ? `<button class="button button--primary" id="book-selected">${N.icon('plus')} Đặt chỗ này</button><button class="button button--outline" id="lock-seat">${N.icon('shield')} Tạm khóa chỗ</button>` : st === 'reserved' ? `<button class="button button--primary" id="check-in">${N.icon('check')} Check-in khách</button><button class="button button--outline" id="cancel-booking">Hủy đặt chỗ mẫu</button>` : st === 'blocked' ? `<button class="button button--outline" id="unlock-seat">Mở lại chỗ ngồi</button>` : `<button class="button button--primary" id="add-pos-order">${N.icon('cup')} Thêm món / dịch vụ</button><button class="button button--outline" id="check-out">${N.icon('clock')} Kết thúc phiên mẫu</button>${st === 'attention' ? '<button class="quiet-button" id="detail-support">Xem yêu cầu hỗ trợ</button>' : ''}`}</div><p class="detail-helper">${editing ? 'Bố trí chỉ lưu cục bộ, chưa có publish backend.' : 'Thao tác trên dữ liệu mô phỏng.'}</p><div class="detail-bottom">${N.icon('info')} Giá được chốt trước khi thanh toán.</div>`;
    $('#book-selected')?.addEventListener('click', () => bookingForm(s.id));
    $('#lock-seat')?.addEventListener('click', () => {
      s.status = 'blocked';
      N.save();
    });
    $('#unlock-seat')?.addEventListener('click', () => {
      s.status = 'free';
      N.save();
    });
    $('#check-in')?.addEventListener('click', () => {
      if (date() !== '2026-11-14') {
        N.toast('Chỉ check-in ngày 14/11 trong bản mẫu.');
        return;
      }
      s.status = 'occupied';
      if (booking) {
        booking.status = 'checked_in';
        s.guest = booking.name;
        const [h, m] = booking.time.split(':').map(Number);
        s.end = `${String((h + booking.hours) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      N.save();
    });
    $('#cancel-booking')?.addEventListener('click', () => {
      if (booking) booking.status = 'cancelled';
      if (date() === '2026-11-14') {
        s.status = 'free';
        s.guest = '';
      }
      N.save();
      N.toast('Đã hủy đặt chỗ mẫu. Bản này không xử lý hoàn tiền.');
    });
    $('#check-out')?.addEventListener('click', () => {
      const loans = state().loans.filter(
        (loan) =>
          loan.seatId === s.id &&
          ['requested', 'borrowed'].includes(loan.status),
      );
      if (loans.length) {
        N.toast(
          `Chỗ ${s.id} còn ${loans.length} phiếu mượn. Giao/nhận trả hoặc hủy yêu cầu trước khi kết thúc.`,
        );
        return;
      }
      s.status = 'free';
      s.guest = '';
      delete s.end;
      state()
        .bookings.filter((b) => b.seat === s.id && b.status === 'checked_in')
        .forEach((b) => (b.status = 'completed'));
      N.save();
      N.toast(
        'Đã kết thúc phiên mẫu. Buffer dọn bàn sẽ do backend xử lý ở pilot.',
      );
    });
    $('#add-pos-order')?.addEventListener('click', () => posForm(s.id));
    $('#detail-support')?.addEventListener('click', supportDialog);
    $('#cancel-layout')?.addEventListener('click', cancelLayout);
    document
      .querySelectorAll('[data-move]')
      .forEach((b) =>
        b.addEventListener('click', () =>
          moveSeat(...b.dataset.move.split(',').map(Number)),
        ),
      );
  }
  function renderStats() {
    const free = state().seats.filter((s) => status(s) === 'free').length;
    const busy = state().seats.filter((s) =>
      ['occupied', 'attention'].includes(status(s)),
    ).length;
    const pending = state().loans.filter(
      (loan) => loan.status === 'requested',
    ).length;
    const support = state().support.filter(
      (row) => row.status !== 'resolved',
    ).length;
    $('#operation-stats').innerHTML =
      `<div class="phone-stat"><strong>${free}</strong><span>Chỗ còn trống</span></div><div class="phone-stat"><strong>${busy}</strong><span>Đang sử dụng</span></div><div class="phone-stat"><strong>${pending + support}</strong><span>Hỗ trợ & giao đồ</span></div>`;
    $('#staff-loan-badge').hidden = !pending;
    $('#staff-loan-badge').textContent = pending;
  }
  function activateView(view) {
    currentView = view;
    const panel =
      view === 'space' ? 'space' : view === 'services' ? 'services' : 'work';
    document.querySelectorAll('[data-operation-panel]').forEach((el) => {
      el.hidden = el.dataset.operationPanel !== panel;
    });
    document.querySelectorAll('[data-view]').forEach((b) => {
      const active =
        b.dataset.view ===
        (['bookings', 'insights'].includes(view) ? 'more' : view);
      b.classList.toggle('is-active', active);
      if (active) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $('#operation-view-title').textContent = {
      space: 'Không gian',
      pos: 'Đơn hàng',
      services: 'Dịch vụ tại quán',
      support: 'Cần hỗ trợ',
      more: 'Quản lý',
      bookings: 'Đặt chỗ',
      insights: 'Đề xuất',
    }[view];
    $('#new-booking').hidden = view !== 'space';
    $('#operation-screen-content').innerHTML = '';
    if (view === 'services') renderOperationsServices();
    else if (view === 'pos') ordersDialog();
    else if (view === 'support') supportDialog();
    else if (view === 'bookings') allBookingsDialog();
    else if (view === 'insights') insightsDialog();
    else if (view === 'more') renderMore();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function renderOperationsServices() {
    const pending = state().loans.filter(
      (loan) => loan.status === 'requested',
    ).length;
    const held = state().loans.filter(
      (loan) => loan.status === 'borrowed',
    ).length;
    $('#operations-services').innerHTML =
      `<p class="staff-loan-help">Sách và đồ chung được giữ số lượng khi khách gửi yêu cầu. Nhân viên giao đồ, rồi xác nhận nhận trả.</p><div class="loan-tabs" role="group" aria-label="Quản lý dịch vụ"><button data-loan-pane="requested" class="${servicePane === 'requested' ? 'is-active' : ''}">Chờ giao · ${pending}</button><button data-loan-pane="borrowed" class="${servicePane === 'borrowed' ? 'is-active' : ''}">Đang mượn · ${held}</button><button data-loan-pane="catalog" class="${servicePane === 'catalog' ? 'is-active' : ''}">Danh mục</button></div>${servicePane === 'catalog' ? `<div class="service-tabs" id="staff-service-tabs">${UI.tabs(serviceGroup)}</div><div class="service-policy">${N.icon(S.groups[serviceGroup].icon)}<span>${S.groups[serviceGroup].policy}</span></div><div class="service-catalog">${UI.cards(serviceGroup, { staff: true })}</div>` : `<div id="staff-loans">${UI.loans({ staff: true, filter: servicePane })}</div>`}<button class="quiet-button full-width" id="loan-history">Lịch sử mượn / trả ${N.icon('arrow')}</button>`;
    $('#operations-services')
      .querySelectorAll('[data-loan-pane]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          servicePane = b.dataset.loanPane;
          renderOperationsServices();
        }),
      );
    $('#operations-services')
      .querySelectorAll('[data-service-group]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          serviceGroup = b.dataset.serviceGroup;
          renderOperationsServices();
        }),
      );
    bindLoanActions($('#operations-services'));
    $('#loan-history').addEventListener('click', () => {
      openDialog(
        'Lịch sử mượn / trả',
        UI.loans({ staff: true, filter: 'all' }),
      );
      bindLoanActions(dialog);
    });
  }
  function bindLoanActions(root) {
    root.querySelectorAll('[data-loan-next]').forEach((b) =>
      b.addEventListener('click', () => {
        try {
          N.replaceState(
            S.advanceLoan(state(), b.dataset.loanId, b.dataset.loanNext),
          );
          if (
            dialog.open &&
            $('#dialog-title').textContent === 'Lịch sử mượn / trả'
          ) {
            openDialog(
              'Lịch sử mượn / trả',
              UI.loans({ staff: true, filter: 'all' }),
            );
            bindLoanActions(dialog);
          }
        } catch (error) {
          N.toast(error.message);
        }
      }),
    );
  }
  function renderMore() {
    $('#operation-screen-content').innerHTML =
      `<div class="more-actions"><button class="more-action" data-more="bookings"><span data-icon="calendar"></span><span>Đặt chỗ trong ngày</span><span data-icon="chevron"></span></button><button class="more-action" data-more="insights"><span data-icon="chart"></span><span>Giá & đề xuất ưu đãi</span><span data-icon="chevron"></span></button><a class="more-action" href="customer.html"><span data-icon="external"></span><span>Mở màn khách</span><span data-icon="chevron"></span></a><button class="more-action" id="more-demo"><span data-icon="settings"></span><span>Cài đặt bản mẫu</span><span data-icon="chevron"></span></button></div>`;
    $('#operation-screen-content')
      .querySelectorAll('[data-more]')
      .forEach((b) =>
        b.addEventListener('click', () => activateView(b.dataset.more)),
      );
    $('#more-demo').addEventListener('click', () =>
      $('#demo-settings').click(),
    );
    N.hydrateIcons($('#operation-screen-content'));
  }
  function render() {
    renderMap();
    renderActivity();
    renderDetail();
    renderStats();
    if (currentView === 'services') renderOperationsServices();
    else if (currentView === 'pos') ordersDialog();
    else if (currentView === 'support') supportDialog();
    else if (currentView === 'bookings') allBookingsDialog();
    else if (currentView === 'insights') insightsDialog();
  }
  function syncStatusButtons() {
    document.querySelectorAll('[data-status]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.status === filter);
      b.setAttribute('aria-pressed', String(b.dataset.status === filter));
    });
  }
  function bookingForm(id) {
    const free = state().seats.filter((s) => status(s) === 'free');
    if (!free.length) {
      N.toast('Chưa còn chỗ trống trong ngày đang xem.');
      return;
    }
    openDialog(
      'Tạo đặt chỗ',
      `<form id="booking-form"><p class="dialog-copy">Giữ một chỗ trong dữ liệu mẫu. Chưa giữ chỗ hoặc thu tiền trên máy chủ.</p><div class="field"><label for="booking-name">Tên khách</label><input id="booking-name" name="name" required maxlength="60" placeholder="Nguyễn Minh Anh" autocomplete="name"></div><div class="field"><label for="booking-seat">Chỗ ngồi</label><select id="booking-seat" name="seat">${free.map((s) => `<option value="${s.id}" ${s.id === id ? 'selected' : ''}>${s.id} · ${N.kinds[s.kind].label} · ${N.money(N.kinds[s.kind].rate)}/giờ</option>`).join('')}</select></div><div class="field"><label for="booking-time">Giờ bắt đầu · ${N.escape(date())}</label><input id="booking-time" name="time" type="time" value="15:00" step="900" required></div><div class="field"><label for="booking-hours">Thời lượng</label><select id="booking-hours" name="hours"><option value="1">1 giờ</option><option value="2" selected>2 giờ</option><option value="4">4 giờ</option></select></div><p class="dialog-note" id="booking-quote"></p><p id="booking-error" class="form-error" role="alert" hidden></p><button type="submit" class="button button--primary full-width">Tạo đặt chỗ mẫu ${N.icon('arrow')}</button></form>`,
    );
    const quote = () => {
      $('#booking-quote').textContent =
        `Tạm tính: ${N.money(N.kinds[N.getSeat($('#booking-seat').value).kind].rate * Number($('#booking-hours').value))}. Giá minh họa, chưa thu tiền.`;
    };
    quote();
    $('#booking-seat').addEventListener('change', quote);
    $('#booking-hours').addEventListener('change', quote);
    $('#booking-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#booking-name').value.trim();
      if (!name) {
        $('#booking-name').setAttribute('aria-invalid', 'true');
        $('#booking-error').hidden = false;
        $('#booking-error').textContent =
          'Tên khách đang trống. Nhập tên trước khi tạo đặt chỗ.';
        $('#booking-name').focus();
        return;
      }
      const s = N.getSeat($('#booking-seat').value);
      if (status(s) !== 'free') {
        $('#booking-error').hidden = false;
        $('#booking-error').textContent =
          'Chỗ vừa thay đổi trạng thái. Đóng cửa sổ và chọn chỗ khác.';
        return;
      }
      const hours = Number($('#booking-hours').value),
        time = $('#booking-time').value;
      state().bookings.push({
        id: `R${Date.now()}`,
        name,
        seat: s.id,
        time,
        hours,
        people: s.kind === 'meeting' ? 4 : 1,
        date: date(),
        status: 'reserved',
      });
      if (date() === '2026-11-14') {
        s.status = 'reserved';
        s.guest = name;
      }
      selected = s.id;
      N.save();
      dialog.close();
    });
  }
  function posForm(id = selected) {
    openDialog(
      'Tạo đơn tại bàn',
      `<form id="pos-form"><p class="dialog-copy">Đơn mẫu cho chỗ ${N.escape(id)}. Mọi khoản thu trong prototype đều được mô phỏng.</p><div class="field"><label for="pos-product">Đồ uống</label><select id="pos-product">${N.menu.map((m) => `<option value="${m.id}">${m.name} · ${N.money(m.price)}</option>`).join('')}</select></div><div class="field"><label for="pos-quantity">Số lượng</label><input id="pos-quantity" type="number" min="1" max="20" value="1" required></div><div class="field"><label for="pos-method">Phương thức mô phỏng</label><select id="pos-method"><option value="Tiền mặt">Tiền mặt</option><option value="Online">Online</option></select></div><p class="dialog-note" id="pos-total"></p><button type="submit" class="button button--primary full-width">Ghi nhận đơn mẫu</button></form>`,
    );
    const update = () =>
      ($('#pos-total').textContent =
        `Tổng tiền: ${N.money(N.menu.find((m) => m.id === $('#pos-product').value).price * Number($('#pos-quantity').value || 0))}`);
    update();
    $('#pos-product').addEventListener('change', update);
    $('#pos-quantity').addEventListener('input', update);
    $('#pos-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const product = N.menu.find((m) => m.id === $('#pos-product').value),
        qty = Number($('#pos-quantity').value);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) return;
      state().orders.push({
        id: `NP-${String(Date.now()).slice(-6)}`,
        seat: id,
        guest: N.getSeat(id)?.guest || 'Khách tại quán',
        total: product.price * qty,
        items: [
          { id: product.id, name: product.name, qty, price: product.price },
        ],
        status: 'queued',
        method: $('#pos-method').value,
        note: '',
        createdAt: Date.now(),
      });
      N.save();
      ordersDialog();
    });
  }
  function ordersDialog() {
    const orders = state().orders;
    openDialog(
      'POS & đơn hàng',
      `<p class="dialog-copy">Chỉ hiển thị đơn mẫu được tạo ở màn vận hành hoặc checkout khách.</p><button class="button button--outline" id="dialog-new-order">${N.icon('plus')} Tạo đơn mẫu</button>${
        orders.length
          ? orders
              .slice()
              .reverse()
              .map(
                (o) =>
                  `<div class="dialog-row"><div><strong>${N.escape(o.id)} · ${N.escape(o.seat)}</strong><small>${N.escape(o.guest)} · ${N.money(o.total)}</small><p>${o.items.map((i) => `${i.qty} × ${N.escape(i.name)}`).join(', ') || 'Gói giờ ngồi'}${o.note ? `<br>Ghi chú: ${N.escape(o.note)}` : ''}</p></div><button class="button button--outline" data-order="${N.escape(o.id)}" ${o.status === 'served' ? 'disabled' : ''}>${o.status === 'served' ? 'Đã phục vụ' : 'Đã phục vụ?'}</button></div>`,
              )
              .join('')
          : '<div class="empty-state"><strong>Chưa có đơn trong bản mẫu</strong><p>Tạo đơn ở đây hoặc checkout từ màn khách.</p></div>'
      }`,
    );
    $('#dialog-new-order').addEventListener('click', () => posForm());
    document.querySelectorAll('[data-order]').forEach((b) =>
      b.addEventListener('click', () => {
        const o = state().orders.find((o) => o.id === b.dataset.order);
        o.status = 'served';
        N.save();
        ordersDialog();
      }),
    );
  }
  function supportDialog() {
    openDialog(
      'Yêu cầu hỗ trợ',
      `<p class="dialog-copy">Phân loại dưới đây minh họa bằng từ khóa, chưa gọi mô hình AI. Khách luôn có thể yêu cầu nhân viên.</p>${
        state().support.length
          ? state()
              .support.map(
                (s) =>
                  `<div class="dialog-row"><div><strong>${N.escape(s.seat)} · ${N.escape(s.category)}</strong><p>${N.escape(s.text)}</p><small>${s.status === 'resolved' ? 'Đã xử lý' : s.status === 'acknowledged' ? 'Đang xử lý' : 'Đang chờ nhân viên'}</small></div><button class="button button--outline" data-support="${s.id}" ${s.status === 'resolved' ? 'disabled' : ''}>${s.status === 'open' ? 'Nhận việc' : s.status === 'acknowledged' ? 'Hoàn tất' : 'Đã xong'}</button></div>`,
              )
              .join('')
          : '<div class="empty-state"><strong>Chưa có yêu cầu</strong><p>Yêu cầu từ màn khách sẽ xuất hiện ở đây.</p></div>'
      }`,
    );
    document.querySelectorAll('[data-support]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = state().support.find((s) => s.id === b.dataset.support);
        s.status = s.status === 'open' ? 'acknowledged' : 'resolved';
        const seat = N.getSeat(s.seat);
        if (seat?.status === 'attention' && s.status === 'resolved')
          seat.status = 'occupied';
        N.save();
        supportDialog();
      }),
    );
  }
  function insightsDialog() {
    const free = state().seats.filter((s) => s.status === 'free').length;
    openDialog(
      'Đề xuất cho quản lý',
      `<p class="dialog-copy">Kịch bản minh họa từ dữ liệu mẫu, chưa phải kết quả phân tích AI hoặc dự báo kinh doanh.</p><div class="insight"><h3>${N.icon('clock')} Ưu đãi giờ thấp điểm</h3><p>Hiện có ${free}/${state().seats.length} chỗ trống. Thử giảm 10% tiền chỗ cho gói mới tại khu tập trung; chỉ áp dụng khi quản lý duyệt.</p><button id="approve-sale" class="button button--outline">${state().sale ? 'Dừng ưu đãi mẫu' : 'Duyệt giảm 10% mẫu'}</button></div><div class="insight"><h3>Loyalty theo thói quen</h3><p>Ví dụ: khách thường mua gói 2 giờ và cà phê sữa có thể nhận đề xuất combo tương ứng. Chưa có lịch sử thật để xác định xu hướng.</p><span class="demo-badge">Chờ dữ liệu pilot</span></div><p class="dialog-note">Duyệt ưu đãi mẫu sẽ cập nhật phần tính tiền của màn khách. Không thay đổi đơn đã đặt.</p>`,
    );
    $('#approve-sale').addEventListener('click', () => {
      state().sale = !state().sale;
      N.save();
      insightsDialog();
    });
  }
  function allBookingsDialog() {
    const bookings = state().bookings.filter((b) => b.date === date());
    openDialog(
      'Đặt chỗ trong ngày',
      `<p class="dialog-copy">Ngày ${N.escape(date())} · danh sách mẫu.</p>${bookings.length ? bookings.map((b) => `<div class="dialog-row"><div><strong>${N.escape(b.name)}</strong><small>${b.seat} · ${b.time} · ${b.hours} giờ</small></div><span class="status-pill">${{ reserved: 'Đã đặt', checked_in: 'Đang dùng', completed: 'Đã kết thúc', cancelled: 'Đã hủy' }[b.status] || b.status}</span></div>`).join('') : '<div class="empty-state"><strong>Chưa có đặt chỗ</strong><p>Tạo một đặt chỗ mẫu cho ngày này.</p></div>'}<button id="dialog-new-booking" class="button button--primary full-width">Tạo đặt chỗ</button>`,
    );
    $('#dialog-new-booking').addEventListener('click', () =>
      bookingForm(selected),
    );
  }
  function moveSeat(dx, dy) {
    if (!editing) return;
    const s = N.getSeat(selected);
    s.x = Math.max(105, Math.min(895, s.x + dx));
    s.y = Math.max(110, Math.min(665, s.y + dy));
    renderMap();
  }
  function cancelLayout() {
    if (draftPositions)
      draftPositions.forEach((p) => {
        const s = N.getSeat(p.id);
        s.x = p.x;
        s.y = p.y;
      });
    editing = false;
    draftPositions = null;
    render();
  }
  $('#layout-edit').addEventListener('click', () => {
    if (editing) {
      editing = false;
      draftPositions = null;
      N.save();
    } else {
      draftPositions = state().seats.map((s) => ({ id: s.id, x: s.x, y: s.y }));
      editing = true;
      render();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (
      editing &&
      e.target.closest('[data-seat]') &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      e.preventDefault();
      const delta = {
        ArrowUp: [0, -12],
        ArrowDown: [0, 12],
        ArrowLeft: [-12, 0],
        ArrowRight: [12, 0],
      }[e.key];
      moveSeat(...delta);
      $('#operation-map')
        .querySelector(`[data-seat="${selected}"]`)
        ?.focus({ preventScroll: true });
    }
  });
  $('#new-booking').addEventListener('click', () => bookingForm(selected));
  $('#show-support').addEventListener('click', supportDialog);
  $('#guest-search').addEventListener('input', renderActivity);
  $('#zone-filter').addEventListener('change', (e) => {
    zone = e.target.value;
    render();
  });
  $('#operation-date').addEventListener('change', () => {
    if (!date()) $('#operation-date').value = '2026-11-14';
    render();
  });
  $('#map-angle').addEventListener('click', (e) => {
    angle = !angle;
    e.currentTarget.setAttribute('aria-pressed', String(angle));
    renderMap();
  });
  document.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((btn) => {
        btn.classList.toggle('is-active', btn === b);
        btn.setAttribute('aria-pressed', String(btn === b));
      });
      renderMap();
    }),
  );
  document.querySelectorAll('[data-activity]').forEach((b) =>
    b.addEventListener('click', () => {
      activity = b.dataset.activity;
      document.querySelectorAll('[data-activity]').forEach((btn) => {
        btn.classList.toggle('is-active', btn === b);
        btn.setAttribute('aria-pressed', String(btn === b));
      });
      renderActivity();
    }),
  );
  document.querySelectorAll('[data-status]').forEach((b) =>
    b.addEventListener('click', () => {
      filter = b.dataset.status;
      syncStatusButtons();
      renderMap();
    }),
  );
  document
    .querySelectorAll('[data-view]')
    .forEach((b) =>
      b.addEventListener('click', () => activateView(b.dataset.view)),
    );
  $('#operation-shortcuts').innerHTML = UI.shortcuts();
  $('#operation-shortcuts')
    .querySelectorAll('[data-service-shortcut]')
    .forEach((b) =>
      b.addEventListener('click', () => {
        servicePane = 'catalog';
        serviceGroup = b.dataset.serviceShortcut;
        activateView('services');
      }),
    );
  $('#open-staff-services').addEventListener('click', () =>
    activateView('services'),
  );
  $('#demo-settings').addEventListener('click', () => {
    openDialog(
      'Thông tin bản mẫu',
      `<p class="dialog-copy">Hai màn HTML dùng chung dữ liệu qua localStorage trên cùng địa chỉ web. Chưa có đăng nhập, API, xử lý thanh toán hoặc AI thật.</p><p class="dialog-note">Ngày và giờ vận hành cố định để trình diễn. Bố trí, đơn, đặt chỗ và yêu cầu hỗ trợ chỉ được lưu trong trình duyệt; không có kiểm soát giao dịch đồng thời như backend pilot.</p><button class="button button--outline full-width" id="reset-demo">Khôi phục dữ liệu mẫu</button>`,
    );
    $('#reset-demo').addEventListener('click', () => {
      N.reset();
      selected = 'W03';
      dialog.close();
      render();
    });
  });
  window.addEventListener('nep-state', render);
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.mode === mode);
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });
  render();
})();
