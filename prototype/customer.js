/* Customer phone experience: one visit, from table identification to receipt. */
(() => {
  'use strict';
  const N = window.Nep,
    S = window.NepServices,
    UI = window.NepServiceUI;
  const model = N.journey;
  const $ = (selector) => document.querySelector(selector);
  const state = () => N.getState();
  const esc = N.escape,
    money = N.money,
    icon = N.icon;
  const dialog = $('#customer-dialog');
  let tab = 'visit',
    category = 'drinks',
    mapView = 'map',
    candidate = null,
    candidateMethod = null,
    points = 0;
  let paymentKey = crypto.randomUUID();
  const products = [...N.menu, ...S.catalog];
  const product = (id) => products.find((item) => item.id === id);
  const heading = (title, text) =>
    `<div class="journey-heading"><h1 id="customer-view-title">${title}</h1><p>${text}</p></div>`;
  function showError(message) {
    const el = $('#journey-error');
    el.textContent = message;
    el.hidden = !message;
    if (message) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function commit(result, { scroll = false, message = '' } = {}) {
    if (!result?.ok) {
      showError(result?.error || 'Chưa thể thực hiện. Vui lòng thử lại.');
      return false;
    }
    showError('');
    N.replaceState(result.state);
    if (message) N.toast(message);
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  }
  function openDialog(title, html) {
    $('#customer-dialog-title').textContent = title;
    $('#customer-dialog-body').innerHTML = html;
    N.hydrateIcons(dialog);
    if (!dialog.open) dialog.showModal();
    $('#customer-dialog-body')
      .querySelector('input,textarea,button,a[href]')
      ?.focus({ preventScroll: true });
  }
  function setTab(next) {
    tab = next;
    showError('');
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function tableSummary(change = false) {
    const session = model.getSession(state());
    const seat = N.getSeat(state().journey.draft.seatId || session?.seatId);
    if (!seat) return '';
    return `<div class="selected-table">${icon('pin')}<div><strong>Bàn ${seat.number} · ${esc(seat.id)}</strong><small>${esc(N.kinds[seat.kind].label)} · ${money(N.kinds[seat.kind].rate)}/giờ</small></div>${change ? '<button class="quiet-button" id="change-table">Đổi bàn</button>' : ''}</div>`;
  }
  function arrival() {
    const free = state().seats.filter((seat) => seat.status === 'free');
    return (
      heading(
        'Bạn đang ngồi bàn nào?',
        'Xác nhận bàn trước, rồi chọn những gì bạn cần cho buổi ghé.',
      ) +
      `<section class="journey-card arrival-method">${icon('grid')}<div><h2>Quét QR tại bàn</h2><p>Dùng camera điện thoại quét mã trên bàn để mở đúng chỗ ngồi. Bạn vẫn xác nhận trước khi bắt đầu.</p><a class="text-link" id="try-qr" href="customer.html?venue=nep-q3&amp;table=W03">Thử QR bàn W03 ${icon('arrow')}</a></div></section>
      <section class="journey-card"><h2>Hoặc nhập số bàn</h2><form id="table-form"><div class="field"><label for="table-number">Số hoặc mã trên bàn</label><div class="table-entry"><input id="table-number" name="table" required maxlength="12" placeholder="Ví dụ: 3 hoặc W03" autocomplete="off" /><button class="button button--outline" type="submit">Tìm bàn</button></div></div></form></section>
      <section class="choose-space"><div class="section-heading"><h2>Chọn trên sơ đồ</h2><span class="muted">${free.length} bàn trống</span></div><div class="customer-map-wrap"><div class="customer-map-label"><span>Tầng trệt · Nếp Quận 3</span><div class="segmented" role="group" aria-label="Kiểu chọn bàn"><button data-map-view="map" class="${mapView === 'map' ? 'is-active' : ''}" aria-pressed="${mapView === 'map'}">Sơ đồ</button><button data-map-view="list" class="${mapView === 'list' ? 'is-active' : ''}" aria-pressed="${mapView === 'list'}">Danh sách</button></div></div>${
        mapView === 'map'
          ? `<div class="map-canvas journey-map" id="customer-map">${N.mapMarkup({ selected: '', customer: true })}</div>`
          : `<div class="customer-seat-list">${state()
              .seats.map(
                (seat) =>
                  `<button class="journey-seat" data-table="${seat.id}" ${seat.status !== 'free' ? 'disabled' : ''}><strong>Bàn ${seat.number} · ${seat.id}</strong><span>${esc(N.kinds[seat.kind].label)}</span><span class="${seat.status === 'free' ? 'seat-free' : ''}">${seat.status === 'free' ? money(N.kinds[seat.kind].rate) + '/giờ · Trống' : N.statusText[seat.status]}</span></button>`,
              )
              .join('')}</div>`
      }<div class="customer-map-footer"><span><i class="status-dot status-dot--free"></i> Chỉ chọn bàn trống</span><span>Chạm bàn để xác nhận</span></div></div></section>`
    );
  }
  function confirmTable(id, method) {
    const seat = state().seats.find((item) => item.id === id);
    if (!seat) {
      showError(
        'Không tìm thấy bàn này tại Nếp Quận 3. Kiểm tra số hoặc mã trên bàn.',
      );
      return;
    }
    if (seat.status !== 'free') {
      showError(
        `Bàn ${seat.id} hiện ${N.statusText[seat.status].toLowerCase()}. Hãy chọn bàn trống hoặc gọi nhân viên.`,
      );
      return;
    }
    candidate = id;
    candidateMethod = method;
    openDialog(
      'Xác nhận bàn của bạn',
      `<div class="selected-table">${icon('pin')}<div><strong>Bàn ${seat.number} · ${seat.id}</strong><small>${esc(N.kinds[seat.kind].label)}</small></div></div><div class="dialog-row"><span>Giá giờ ngồi</span><strong>${money(N.kinds[seat.kind].rate)}/giờ</strong></div><p class="dialog-note">Hãy đối chiếu mã với bàn bạn đang ngồi. Thời gian chỉ bắt đầu sau bước chọn dịch vụ và kiểm tra gói.</p><button id="confirm-table" class="button button--primary full-width">Đúng bàn này ${icon('arrow')}</button>`,
    );
  }
  function selectionLines() {
    return Object.entries(state().journey.draft.items)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = product(id);
        if (!item) return '';
        return `<div class="selection-line"><div><strong>${esc(item.name)}</strong><small>${item.mode === 'borrow' ? 'Mượn miễn phí · cần trả lại' : money(item.price) + '/món'}</small></div><div class="quantity-control"><button data-quantity="${id}" data-delta="-1" aria-label="Bớt ${esc(item.name)}">−</button><span>${qty}</span><button data-quantity="${id}" data-delta="1" aria-label="Thêm ${esc(item.name)}">+</button></div></div>`;
      })
      .join('');
  }
  function services() {
    const draft = state().journey.draft,
      adding = !!draft.baseSessionId;
    const items = draft.items,
      selected = Object.values(items).reduce((sum, qty) => sum + qty, 0);
    const categories = [
      ['drinks', 'cup', 'Đồ uống'],
      ...Object.entries(S.groups).map(([id, g]) => [id, g.icon, g.short]),
    ];
    return (
      heading(
        adding ? 'Bạn cần thêm gì?' : 'Chọn dịch vụ cho buổi ghé',
        adding
          ? 'Món thêm được ghi vào cùng phiên. Quyền lợi gói còn lại sẽ được kiểm tra lại.'
          : 'Gọi nước, mượn sách hoặc thêm vài món cần dùng. Thanh toán khi checkout.',
      ) +
      tableSummary(!adding) +
      (!adding
        ? `<section><h2>Dự kiến ở lại</h2><div class="journey-duration" role="group" aria-label="Thời gian dự kiến">${[60, 120, 240].map((minutes) => `<button data-minutes="${minutes}" class="${draft.minutes === minutes ? 'is-active' : ''}" aria-pressed="${draft.minutes === minutes}">${minutes / 60} giờ</button>`).join('')}</div><p class="journey-note">Để dự tính chi phí. Khi checkout, giờ ngồi tính theo phút sử dụng thực tế.</p></section>`
        : '') +
      `<div class="journey-categories" role="group" aria-label="Nhóm dịch vụ">${categories.map(([id, i, label]) => `<button data-category="${id}" class="${category === id ? 'is-active' : ''}" aria-pressed="${category === id}">${icon(i)}${label}</button>`).join('')}</div>` +
      (category === 'drinks'
        ? `<div class="drink-menu">${N.menu.map((item) => `<article class="journey-drink">${N.drinkArt(item.art)}<div class="journey-drink-body"><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><div class="service-card-action"><strong>${money(item.price)}</strong><button class="service-action" data-add="${item.id}" aria-label="Thêm ${esc(item.name)}">${icon('plus')}${items[item.id] || 'Thêm'}</button></div></div></article>`).join('')}</div>`
        : `<p class="journey-note">${esc(S.groups[category].policy)} Chọn ở đây; yêu cầu chỉ gửi sau khi xác nhận sử dụng.</p><div class="service-catalog">${UI.cards(category, { quantities: items })}</div>`) +
      `<section class="selection-lines"><div class="section-heading"><h2>Đã chọn</h2><span class="muted">${selected} món</span></div>${selected ? selectionLines() : '<p class="journey-note">Bạn có thể chỉ sử dụng chỗ ngồi.</p>'}</section><div class="journey-action"><button class="button button--primary full-width" id="review-services">Đối chiếu gói trả trước ${icon('arrow')}</button>${adding ? '<button class="quiet-button" id="resume-visit">Quay lại phiên sử dụng</button>' : ''}</div>`
    );
  }
  function quoteRows(quote, totalLabel = 'Phần trả thêm dự kiến') {
    if (!quote) return '';
    return `<div class="quote-lines">${quote.lines.map((line) => `<div class="quote-line"><div><strong>${esc(line.name)}${line.kind === 'time' ? ' · ' + line.quantity + ' phút' : line.quantity > 1 ? ' × ' + line.quantity : ''}</strong><small>${line.covered ? `Gói bao gồm ${money(line.covered)}` : line.kind === 'borrow' ? 'Mượn miễn phí · cần trả lại' : line.kind === 'time' ? 'Tính theo phút sử dụng' : 'Ngoài quyền lợi gói'}</small></div><span class="${line.due === 0 ? 'included' : ''}">${line.due === 0 ? (line.covered ? 'Trong gói' : 'Miễn phí') : money(line.due)}</span></div>`).join('')}</div><div class="quote-total"><span>${totalLabel}</span><strong>${money(quote.due)}</strong></div>`;
  }
  function packageStep() {
    const draft = state().journey.draft,
      reviewed = !!draft.review,
      quote = model.quoteDraft(state(), Date.now());
    const session = model.getSession(state());
    const packages = state().prepaidPackages.filter(
      (pack) =>
        pack.memberId === state().profile.id && pack.status === 'available',
    );
    return (
      heading(
        'Bạn đã có gói trả trước?',
        'Đối chiếu trước khi sử dụng để thấy rõ phần đã bao gồm và phần cần trả thêm.',
      ) +
      tableSummary() +
      (draft.baseSessionId
        ? `<section class="journey-card"><h2>Đối chiếu với phiên hiện tại</h2><p>${session?.packageId ? 'Áp dụng quyền lợi còn lại của gói đang dùng. Món vượt quyền lợi được ghi thêm vào phiên.' : 'Phiên này không có gói trả trước. Dịch vụ thêm được tính vào checkout.'}</p><button class="button button--outline full-width" id="check-current-package">Kiểm tra quyền lợi còn lại</button></section>`
        : `<section class="journey-card package-card"><span class="package-mark">GIỜ NGỒI + DỊCH VỤ</span><h2>Gói 2 giờ & cà phê</h2><ul class="package-benefits"><li>${icon('clock')}120 phút tại bàn cá nhân</li><li>${icon('cup')}1 cà phê sữa</li><li>${icon('check')}Sách & đồ dùng miễn phí cho mọi khách</li></ul><p>Gói mẫu áp dụng cửa sổ, tập trung và quầy chung. Dùng trong một lần ghé; quyền lợi thừa không quy đổi tiền.</p><form id="package-form"><div class="field"><label for="package-code">Mã gói / mã đặt chỗ</label><input id="package-code" autocomplete="off" placeholder="Thử mã mẫu NEP2H" maxlength="32" /></div><button class="button button--outline full-width" type="submit">Đối chiếu mã gói</button></form></section>
      <section class="journey-card"><h2>Tìm gói theo tài khoản</h2>${state().profile.isMember ? `<p>${packages.length ? 'Có gói mẫu trong tài khoản của bạn.' : 'Tài khoản chưa có gói khả dụng.'}</p>${packages.map((pack) => `<button class="button button--outline full-width" data-use-package="${pack.id}">Dùng ${esc(pack.name)}</button>`).join('')}` : '<p>Dùng tài khoản mẫu để xem gói, điểm và lịch sử. Bạn vẫn có thể tiếp tục dưới dạng khách.</p><button class="button button--outline full-width" id="demo-member">Dùng tài khoản mẫu</button>'}</section><button class="quiet-button full-width" id="no-package">Tôi không có gói trả trước</button>`) +
      (reviewed
        ? `<section class="journey-card"><h2>Kết quả đối chiếu</h2><div class="package-result">${quote.packageId ? `Đã áp dụng: <strong>${esc(quote.packageName)}</strong>. Giờ và món vượt gói sẽ tính thêm.` : 'Đã xác nhận không dùng gói. Giờ ngồi và dịch vụ được tính khi checkout.'}</div>${quoteRows(quote)}<p class="journey-note">Đây là dự tính theo ${quote.minutes / 60} giờ. Chưa thu tiền; checkout dựa trên thời gian sử dụng thực tế.</p></section>`
        : '<p class="journey-note">Hãy đối chiếu mã, chọn gói tài khoản hoặc xác nhận không có gói để tiếp tục.</p>') +
      `<div class="journey-action"><button class="button button--primary full-width" id="start-visit" ${reviewed ? '' : 'disabled'}>${draft.baseSessionId ? 'Xác nhận dùng dịch vụ thêm' : 'Bắt đầu sử dụng'} ${icon('arrow')}</button><button class="quiet-button" id="back-services">Sửa dịch vụ đã chọn</button></div>`
    );
  }
  const loanLabels = {
    requested: 'Chờ nhân viên giao',
    borrowed: 'Đang mượn',
    returned: 'Đã trả',
    cancelled: 'Đã hủy',
  };
  function loans(session) {
    const records = state().loans.filter(
      (loan) => loan.sessionId === session.id,
    );
    return records.length
      ? `<section><div class="section-heading"><h2>Sách & đồ dùng đang mượn</h2></div>${records.map((loan) => `<article class="visit-loan"><div class="visit-loan-top">${icon(S.item(loan.serviceId)?.icon || 'book')}<div><strong>${esc(loan.name)} × ${loan.quantity}</strong><small>${loan.returnRequested && loan.status === 'borrowed' ? 'Đã yêu cầu trả · chờ nhân viên nhận' : loanLabels[loan.status]}</small></div></div>${loan.status === 'requested' ? `<button class="quiet-button" data-cancel-loan="${loan.id}">Hủy yêu cầu chưa giao</button>` : loan.status === 'borrowed' && !loan.returnRequested ? `<button class="quiet-button" data-return-loan="${loan.id}">Yêu cầu trả cho nhân viên</button>` : ''}</article>`).join('')}<p class="journey-note">Nhân viên xác nhận đã nhận lại đồ trước khi hoàn tất checkout.</p></section>`
      : '';
  }
  function active() {
    const session = model.getSession(state()),
      quote = model.quoteSession(state(), Date.now());
    if (!session)
      return heading(
        'Không tìm thấy phiên',
        'Tải lại hoặc liên hệ nhân viên để kiểm tra.',
      );
    const seat = N.getSeat(session.seatId);
    const orders = state().orders.filter(
      (order) => order.sessionId === session.id,
    );
    return (
      heading(
        'Cứ ngồi lại, việc còn lại có Nếp.',
        `Bàn ${seat.number} · ${seat.id} — dịch vụ đã được ghi vào phiên của bạn.`,
      ) +
      `<section class="session-timer"><div class="timer-label"><span class="live-dot"></span> ĐANG SỬ DỤNG</div><strong class="timer"><b id="session-minutes">${quote.minutes}</b> <span>phút</span></strong><div class="session-subline"><small>Từ ${new Date(session.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${money(session.rate)}/giờ</small><button class="quiet-button" id="advance-time">+30 phút mẫu</button></div></section>` +
      (quote.packageId
        ? `<div class="package-result"><strong>${esc(quote.packageName)}</strong><br>Còn khoảng <span id="remaining-minutes">${Math.max(0, quote.remainingMinutes)}</span> phút trong gói. Quyền lợi món chỉ được dùng một lần.</div>`
        : '<p class="journey-note">Phiên không có gói trả trước. Thanh toán phần sử dụng khi kết thúc.</p>') +
      `<section class="journey-card"><h2>Dịch vụ của buổi ghé</h2>${
        orders.length
          ? orders
              .flatMap((order) =>
                order.items.map(
                  (item) =>
                    `<div class="session-order">${icon(N.menu.some((drink) => drink.id === item.id) ? 'cup' : 'bag')}<div><strong>${esc(item.name)} × ${item.qty}</strong><small>${N.menu.some((drink) => drink.id === item.id) ? 'Phục vụ tại bàn' : 'Mua mang về'}</small></div><span>${order.status === 'served' ? 'Đã phục vụ' : 'Đã gửi quán'}</span></div>`,
                ),
              )
              .join('')
          : '<p>Hiện chỉ sử dụng chỗ ngồi.</p>'
      }<button class="quiet-button full-width" id="add-services">${icon('plus')} Gọi thêm dịch vụ</button></section>` +
      loans(session) +
      `<section class="journey-card"><h2>Tạm tính đến hiện tại</h2><div class="quote-total"><span>Sau quyền lợi gói</span><strong id="active-due">${money(quote.due)}</strong></div><p class="journey-note">Chưa áp dụng điểm. Giờ ngồi tiếp tục tính đến khi bạn mở checkout.</p></section><div class="journey-action"><button class="button button--primary full-width" id="open-checkout">Kết thúc & xem checkout ${icon('arrow')}</button></div>`
    );
  }
  function checkout() {
    const session = model.getSession(state()),
      quote = model.quoteSession(state(), Date.now());
    const max = state().profile.isMember ? quote.pointsMax : 0;
    points = Math.min(points, max || 0);
    const cash = Math.max(0, quote.due - points * 100);
    return (
      heading(
        'Đối chiếu lần cuối.',
        `Thời gian đã chốt ở ${quote.minutes} phút. Bàn được giải phóng sau khi checkout hoàn tất.`,
      ) +
      tableSummary() +
      `<section class="journey-card"><h2>Chi tiết sử dụng</h2>${quote.packageId ? `<p>Gói đã trả trước: ${esc(quote.packageName)}. Phần được bao gồm không thu lại.</p>` : ''}${quoteRows(quote, 'Còn phải thanh toán')}</section>` +
      loans(session) +
      (quote.unreturnedLoans.length
        ? '<div class="package-result">Còn đồ chưa hoàn trả. Hủy yêu cầu chưa giao hoặc nhờ nhân viên nhận trả để tiếp tục.</div>'
        : '') +
      `<section class="journey-card"><h2>Dùng điểm loyalty</h2>${state().profile.isMember ? `<p>Bạn có ${state().loyalty.balance} điểm. 10 điểm đổi 1.000 ₫, tối đa ${max} điểm cho lần này.</p><div class="field"><label for="checkout-points">Số điểm muốn dùng</label><input id="checkout-points" type="number" min="0" max="${max}" step="10" value="${points}" inputmode="numeric" /></div>` : '<p>Bạn đang sử dụng dưới dạng khách. Điểm dành cho tài khoản thành viên; lần sau hãy dùng tài khoản trước khi bắt đầu phiên.</p>'}</section>
      <section class="journey-card"><div class="quote-line"><span>Đổi điểm</span><span id="points-discount">−${money(points * 100)}</span></div><div class="quote-total"><span>Thanh toán mô phỏng</span><strong id="checkout-total">${money(cash)}</strong></div><p class="journey-note">${state().profile.isMember ? `Dự kiến nhận ${Math.floor(cash / 10000)} điểm từ phần trả thêm.` : 'Không có tiền thật được thu.'}</p></section>
      <div class="journey-action"><button class="button button--primary full-width" id="pay-checkout" ${quote.unreturnedLoans.length ? 'disabled' : ''}>${cash ? 'Thanh toán & kết thúc' : 'Kết thúc phiên'} ${icon('check')}</button><button class="quiet-button" id="simulate-failure" ${quote.unreturnedLoans.length ? 'disabled' : ''}>Thử thanh toán thất bại</button><button class="quiet-button" id="resume-visit">Tiếp tục sử dụng bàn</button></div>`
    );
  }
  function receipt() {
    const receipt = state().customerReceipts.find(
      (item) => item.id === state().journey.lastReceiptId,
    );
    if (!receipt)
      return heading('Phiên đã kết thúc', 'Xem lịch sử tại Điểm & gói.');
    return (
      `<div class="receipt-mark">${icon('check')} CHECKOUT HOÀN TẤT · MÔ PHỎNG</div>` +
      heading(
        'Hẹn bạn lần ghé tới.',
        `Bàn ${esc(receipt.seatId)} đã được giải phóng. Cảm ơn bạn đã ở lại cùng Nếp.`,
      ) +
      `<div class="receipt-code">${esc(receipt.id)}</div><section class="journey-card"><h2>Biên nhận của bạn</h2>${quoteRows(receipt, 'Phần ngoài gói')}<div class="quote-line"><span>Đổi ${receipt.pointsUsed || 0} điểm</span><span>−${money(receipt.pointsDiscount || 0)}</span></div><div class="quote-total"><span>Đã thanh toán mô phỏng</span><strong>${money(receipt.cashDue)}</strong></div><p class="receipt-points">+${receipt.pointsEarned || 0} điểm cho buổi ghé này</p></section><div class="journey-action"><button class="button button--primary full-width" id="new-visit">Bắt đầu buổi ghé mới ${icon('arrow')}</button><button class="quiet-button" data-nav="loyalty">Xem điểm & lịch sử</button></div>`
    );
  }
  function loyalty() {
    const profile = state().profile;
    return (
      heading(
        'Một chút thân quen.',
        'Điểm, gói trả trước và những lần bạn ghé Nếp.',
      ) +
      (!profile.isMember
        ? `<section class="journey-card"><h2>Bạn đang là khách</h2><p>Dùng tài khoản mẫu để trải nghiệm số dư 250 điểm và gói 2 giờ & cà phê. Đây là dữ liệu minh họa, không phải đăng nhập thật.</p><button class="button button--primary full-width" id="demo-member" ${model.getSession(state()) ? 'disabled' : ''}>Dùng tài khoản mẫu</button>${model.getSession(state()) ? '<p class="journey-note">Hoàn tất phiên hiện tại trước khi đổi tài khoản.</p>' : ''}</section>`
        : `<div class="loyalty-balance"><strong>${state().loyalty.balance}</strong> <span>điểm đang có</span></div><p class="journey-note">Quy tắc mẫu: trả thêm mỗi 10.000 ₫ nhận 1 điểm. 10 điểm đổi 1.000 ₫ tại checkout; phần trong gói không tích thêm điểm.</p><section class="journey-card"><h2>Gói trả trước của bạn</h2>${
            state()
              .prepaidPackages.filter((pack) => pack.memberId === profile.id)
              .map(
                (pack) =>
                  `<div class="quote-line"><div><strong>${esc(pack.name)}</strong><small>120 phút + 1 cà phê sữa · một lần ghé</small></div><span>${{ available: 'Chưa dùng', in_use: 'Đang sử dụng', used: 'Đã sử dụng' }[pack.status] || esc(pack.status)}</span></div>`,
              )
              .join('') || '<p>Chưa có gói trong tài khoản.</p>'
          }</section><section><h2>Lịch sử điểm</h2><ul class="loyalty-ledger">${state()
            .loyalty.ledger.slice()
            .reverse()
            .map(
              (entry) =>
                `<li><div>${esc(entry.description || entry.label || entry.reason || 'Điều chỉnh điểm mẫu')}<small>${entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('vi-VN') : 'Dữ liệu mẫu'}</small></div><strong>${Number(entry.amount ?? entry.points ?? entry.delta ?? 0) > 0 ? '+' : ''}${entry.amount ?? entry.points ?? entry.delta ?? 0} điểm</strong></li>`,
            )
            .join('')}</ul></section>`) +
      `<section class="journey-card"><h2>Lịch sử buổi ghé</h2>${
        state().customerReceipts.length
          ? state()
              .customerReceipts.slice()
              .reverse()
              .map(
                (item) =>
                  `<div class="quote-line"><div><strong>${esc(item.seatId)} · ${item.minutes} phút</strong><small>${new Date(item.paidAt).toLocaleString('vi-VN')}</small></div><span>${money(item.cashDue)}</span></div>`,
              )
              .join('')
          : '<p>Biên nhận sẽ xuất hiện sau lần checkout đầu tiên.</p>'
      }</section>`
    );
  }
  function profile() {
    const p = state().profile;
    return (
      heading(
        'Thông tin cá nhân',
        'Thông tin dùng để phục vụ bạn trong bản mẫu này.',
      ) +
      `<div class="profile-avatar">${esc((p.name || 'K').slice(0, 1).toUpperCase())}</div><p class="journey-note">${p.isMember ? 'Tài khoản thành viên mẫu' : 'Khách tại quán'} · lưu trên thiết bị này</p><form id="profile-form"><div class="field"><label for="profile-name">Tên hiển thị</label><input id="profile-name" name="name" value="${esc(p.name)}" maxlength="60" required autocomplete="name" /></div><div class="field"><label for="profile-phone">Số điện thoại</label><input id="profile-phone" name="phone" type="tel" value="${esc(p.phone)}" maxlength="20" autocomplete="tel" placeholder="Chưa cung cấp" /></div><div class="field"><label for="profile-email">Email</label><input id="profile-email" name="email" type="email" value="${esc(p.email)}" maxlength="120" autocomplete="email" placeholder="Chưa cung cấp" /></div><label class="journey-check"><input type="checkbox" id="profile-marketing" ${p.marketingConsent ? 'checked' : ''} /><span>Tôi muốn nhận ưu đãi phù hợp với mình. Tùy chọn này chỉ được lưu trong bản mẫu.</span></label><button class="button button--primary full-width" type="submit" id="save-profile">Lưu thông tin</button></form><p class="journey-note">Chưa có xác thực OTP hoặc đồng bộ tài khoản thật. Không nhập thông tin nhạy cảm vào bản mẫu.</p>${!p.isMember ? `<button class="quiet-button full-width" id="demo-member" ${model.getSession(state()) ? 'disabled' : ''}>Dùng tài khoản thành viên mẫu</button>` : ''}`
    );
  }
  function render() {
    const phase = state().journey.phase;
    const phaseIndex =
      {
        arrival: 0,
        services: 1,
        package: 2,
        active: 3,
        checkout: 4,
        receipt: 5,
      }[phase] ?? 0;
    const session = model.getSession(state());
    const seat = N.getSeat(session?.seatId || state().journey.draft.seatId);
    $('#visit-context').textContent = seat
      ? `Bàn ${seat.number} · ${seat.id}`
      : 'Chưa xác nhận bàn';
    $('#journey-progress').hidden = tab !== 'visit';
    $('#journey-progress').innerHTML =
      `<ol class="visit-steps">${['Chọn bàn', 'Dịch vụ', 'Gói trả trước', 'Sử dụng', 'Checkout'].map((label, i) => `<li class="${i === phaseIndex ? 'is-current' : i < phaseIndex ? 'is-complete' : ''}" ${i === phaseIndex ? 'aria-current="step"' : ''}><span class="step-number">${i < phaseIndex ? '✓' : String(i + 1).padStart(2, '0')}</span><span>${label}</span></li>`).join('')}</ol>`;
    $('#customer-content').innerHTML =
      tab === 'profile'
        ? profile()
        : tab === 'loyalty'
          ? loyalty()
          : (
              {
                arrival,
                services,
                package: packageStep,
                active,
                checkout,
                receipt,
              }[phase] || arrival
            )();
    document.querySelectorAll('[data-customer-tab]').forEach((button) => {
      const current = button.dataset.customerTab === tab;
      button.classList.toggle('is-active', current);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if ($('#customer-map'))
      N.bindMap($('#customer-map'), (id) => confirmTable(id, 'map'));
    N.hydrateIcons();
  }
  function changeQuantity(id, delta) {
    const draft = state().journey.draft;
    const qty = Math.max(0, (draft.items[id] || 0) + delta);
    if (qty > 20) {
      showError('Tối đa 20 món mỗi loại trong bản mẫu.');
      return;
    }
    if (
      S.catalog.some((item) => item.id === id) &&
      qty > S.available(state(), id)
    ) {
      showError('Số lượng còn lại không đủ. Vui lòng giảm số món.');
      return;
    }
    commit(
      model.updateDraft(state(), {
        items: Object.fromEntries(
          Object.entries({ ...draft.items, [id]: qty }).filter(
            ([, count]) => count > 0,
          ),
        ),
        minutes: draft.minutes,
      }),
    );
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button,a[data-nav]');
    if (!button) return;
    const id = button.id,
      d = button.dataset;
    if (d.customerTab || d.nav) {
      setTab(d.customerTab || d.nav);
      return;
    }
    if (d.mapView) {
      mapView = d.mapView;
      render();
      return;
    }
    if (d.table) {
      confirmTable(d.table, 'map');
      return;
    }
    if (d.category) {
      category = d.category;
      render();
      return;
    }
    if (d.add || d.serviceAction) {
      changeQuantity(d.add || d.serviceAction, 1);
      return;
    }
    if (d.quantity) {
      changeQuantity(d.quantity, Number(d.delta));
      return;
    }
    if (d.minutes) {
      commit(
        model.updateDraft(state(), {
          items: state().journey.draft.items,
          minutes: Number(d.minutes),
        }),
      );
      return;
    }
    if (d.usePackage) {
      commit(
        model.checkPackage(state(), { packageId: d.usePackage }, Date.now()),
      );
      return;
    }
    if (d.cancelLoan) {
      commit(model.cancelLoan(state(), d.cancelLoan));
      return;
    }
    if (d.returnLoan) {
      commit(model.requestReturn(state(), d.returnLoan));
      return;
    }
    if (id === 'close-customer-dialog') {
      dialog.close();
      return;
    }
    if (id === 'confirm-table') {
      if (
        commit(model.selectSeat(state(), candidate, candidateMethod), {
          scroll: true,
        })
      )
        dialog.close();
      return;
    }
    if (id === 'change-table') {
      commit(model.newVisit(state()), { scroll: true });
      return;
    }
    if (id === 'review-services') {
      commit(model.reviewDraft(state()), { scroll: true });
      return;
    }
    if (id === 'back-services') {
      commit(model.backToServices(state()), { scroll: true });
      return;
    }
    if (id === 'no-package' || id === 'check-current-package') {
      commit(model.checkPackage(state(), {}, Date.now()));
      return;
    }
    if (id === 'demo-member') {
      commit(model.useDemoMember(state()), {
        message: 'Đang dùng tài khoản mẫu. Gói và điểm đã sẵn sàng.',
      });
      return;
    }
    if (id === 'start-visit') {
      commit(
        model.start(state(), { key: crypto.randomUUID(), now: Date.now() }),
        { scroll: true },
      );
      return;
    }
    if (id === 'add-services') {
      category = 'drinks';
      commit(model.beginAdd(state()), { scroll: true });
      return;
    }
    if (id === 'advance-time') {
      commit(model.advanceTime(state(), 30));
      return;
    }
    if (id === 'open-checkout') {
      points = 0;
      paymentKey = crypto.randomUUID();
      commit(model.openCheckout(state(), Date.now()), { scroll: true });
      return;
    }
    if (id === 'resume-visit') {
      commit(model.resume(state()), { scroll: true });
      return;
    }
    if (id === 'pay-checkout' || id === 'simulate-failure') {
      const raw = $('#checkout-points')?.value ?? '0';
      const selected = Number(raw);
      if (!Number.isInteger(selected) || selected < 0 || selected % 10 !== 0) {
        showError('Nhập số điểm không âm, theo bội số 10.');
        return;
      }
      const result = model.finish(state(), {
        key: paymentKey,
        now: Date.now(),
        points: selected,
        success: id !== 'simulate-failure',
      });
      commit(result, { scroll: result.ok });
      return;
    }
    if (id === 'new-visit') {
      points = 0;
      commit(model.newVisit(state()), { scroll: true });
      return;
    }
    if (id === 'customer-support') supportForm();
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.id === 'table-form') {
      event.preventDefault();
      const input = $('#table-number').value.trim().toUpperCase();
      const seat = state().seats.find(
        (item) => item.id === input || String(item.number) === input,
      );
      confirmTable(seat?.id || input, 'number');
    }
    if (form.id === 'package-form') {
      event.preventDefault();
      const code = $('#package-code').value.trim();
      if (!code) {
        showError('Nhập mã gói hoặc chọn tiếp tục không có gói.');
        return;
      }
      commit(model.checkPackage(state(), { code }, Date.now()));
    }
    if (form.id === 'profile-form') {
      event.preventDefault();
      commit(
        model.updateProfile(state(), {
          name: $('#profile-name').value.trim(),
          phone: $('#profile-phone').value.trim(),
          email: $('#profile-email').value.trim(),
          marketingConsent: $('#profile-marketing').checked,
        }),
        { message: 'Đã lưu thông tin trên thiết bị này.' },
      );
    }
    if (form.id === 'support-form') {
      event.preventDefault();
      const text = $('#support-message').value.trim();
      if (!text) return;
      const session = model.getSession(state()),
        seatId = session?.seatId || state().journey.draft.seatId;
      const next = {
        ...state(),
        support: [
          ...state().support,
          {
            id: `S${Date.now()}`,
            seat: seatId || 'Quầy',
            name: state().profile.name,
            text,
            category: /wifi|mạng|ổ điện|kết nối/i.test(text)
              ? 'Thiết bị'
              : 'Nhân viên hỗ trợ',
            status: 'open',
          },
        ],
      };
      N.replaceState(next);
      dialog.close();
      N.toast('Đã chuyển yêu cầu vào hàng chờ nhân viên mẫu.');
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'checkout-points') {
      const value = Number(event.target.value),
        quote = model.quoteSession(state(), Date.now());
      if (
        !Number.isInteger(value) ||
        value < 0 ||
        value % 10 !== 0 ||
        value > quote.pointsMax
      ) {
        showError(`Dùng tối đa ${quote.pointsMax} điểm, theo bội số 10.`);
        return;
      }
      points = value;
      showError('');
      render();
    }
  });
  function supportForm() {
    const session = model.getSession(state()),
      seat = session?.seatId || state().journey.draft.seatId;
    openDialog(
      'Bạn cần hỗ trợ gì?',
      `<p class="dialog-copy">${seat ? `Yêu cầu cho bàn ${esc(seat)}.` : 'Chưa chọn bàn? Nhân viên có thể hỗ trợ tại quầy.'} Phân loại bằng quy tắc minh họa, chưa gọi AI.</p><form id="support-form"><div class="field"><label for="support-message">Nội dung yêu cầu</label><textarea id="support-message" rows="3" required maxlength="240" placeholder="Mình cần hỗ trợ…"></textarea></div><button class="button button--primary full-width" type="submit">Gửi yêu cầu mẫu</button></form>`,
    );
  }
  window.addEventListener('nep-state', render);
  render();
  const params = new URLSearchParams(location.search);
  if (params.has('table')) {
    if (params.get('venue') !== 'nep-q3')
      showError(
        'QR không thuộc chi nhánh Nếp Quận 3. Vui lòng quét lại mã tại bàn.',
      );
    else if (state().journey.phase === 'arrival')
      confirmTable(params.get('table').toUpperCase(), 'qr');
    else
      N.toast(
        'Bạn đã có buổi ghé đang mở. Hoàn tất phiên trước khi xác nhận bàn khác.',
      );
  }
  setInterval(() => {
    if (tab === 'visit' && state().journey.phase === 'active') {
      const quote = model.quoteSession(state(), Date.now());
      if ($('#session-minutes'))
        $('#session-minutes').textContent = quote.minutes;
      if ($('#active-due')) $('#active-due').textContent = money(quote.due);
      if ($('#remaining-minutes'))
        $('#remaining-minutes').textContent = Math.max(
          0,
          quote.remainingMinutes,
        );
    }
  }, 15000);
})();
