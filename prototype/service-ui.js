/* Shared visual vocabulary for borrowable amenities and retail products. */
(() => {
  const N = window.Nep;
  const S = window.NepServices;
  function shortcuts() {
    return Object.entries(S.groups)
      .map(
        ([id, group]) =>
          `<button class="service-shortcut tone-${group.tone}" data-service-shortcut="${id}"><span class="service-shortcut-icon">${N.icon(group.icon)}</span><strong>${group.short}</strong><small>${group.mode === 'borrow' ? 'Miễn phí' : 'Mua đồ'}</small></button>`,
      )
      .join('');
  }
  function tabs(selected) {
    return Object.entries(S.groups)
      .map(
        ([id, group]) =>
          `<button class="service-tab ${selected === id ? 'is-active' : ''}" data-service-group="${id}" aria-pressed="${selected === id}">${N.icon(group.icon)}<span>${group.short}</span></button>`,
      )
      .join('');
  }
  function art(product) {
    if (product.group === 'books')
      return `<div class="book-art" aria-hidden="true"><span class="book-spine"></span><span class="book-title">${N.escape(product.mark).replace('\n', '<br>')}</span><span class="book-line"></span><span class="book-symbol">${N.icon('book')}</span></div>`;
    if (product.id === 'power-strip')
      return '<svg viewBox="0 0 120 90" class="utility-art" aria-hidden="true"><path class="utility-cable" d="M91 46h12c13 0 13-23 0-23H88"/><rect class="utility-body" x="12" y="28" width="80" height="38" rx="11"/><circle class="utility-socket" cx="32" cy="47" r="10"/><circle class="utility-socket" cx="68" cy="47" r="10"/><path class="utility-holes" d="M28 44v5m8-5v5m28-5v5m8-5v5"/></svg>';
    if (product.id === 'basket')
      return '<svg viewBox="0 0 120 90" class="utility-art" aria-hidden="true"><path class="utility-cable" d="m31 35 16-23h26l16 23"/><path class="utility-body" d="m20 34 10 42h60l10-42z"/><path class="utility-holes" d="M43 44v22m17-22v22m17-22v22M18 34h84"/></svg>';
    return `<div class="product-art" aria-hidden="true">${N.icon(product.icon)}<span>${N.escape(S.groups[product.group].short)}</span></div>`;
  }
  function cards(group, { staff = false, quantities = {} } = {}) {
    return S.catalog
      .filter((product) => product.group === group)
      .map((product) => {
        const count = S.available(N.getState(), product.id);
        const added = quantities[product.id] || 0;
        return `<article class="service-card tone-${S.groups[group].tone}"><div class="service-art"><span class="service-mode">${product.mode === 'borrow' ? N.icon('undo') + ' Cần trả lại' : N.icon('bag') + ' Mua mang về'}</span>${art(product)}</div><div class="service-card-body"><h3>${N.escape(product.name)}</h3><p>${N.escape(product.description)}</p><div class="service-stock ${count ? '' : 'is-empty'}">${N.icon(count ? 'check' : 'clock')} ${count ? `Còn ${count} ${product.group === 'books' ? 'cuốn' : 'món'}` : 'Tạm hết'}</div><div class="service-card-action"><strong>${product.mode === 'borrow' ? 'Miễn phí' : N.money(product.price)}</strong>${staff ? `<span class="stock-total">Tổng ${N.getState().serviceInventory[product.id]}</span>` : `<button class="service-action" data-service-action="${product.id}" ${count <= added ? 'disabled' : ''} aria-label="${product.mode === 'borrow' ? 'Mượn' : 'Thêm'} ${N.escape(product.name)}">${N.icon(product.mode === 'borrow' ? 'arrow' : 'plus')}${product.mode === 'borrow' ? 'Mượn' : added ? added : 'Thêm'}</button>`}</div></div></article>`;
      })
      .join('');
  }
  function loans({ staff = false, filter = 'active' } = {}) {
    const records = N.getState().loans.filter(
      (loan) =>
        filter === 'all' ||
        (filter === 'active'
          ? ['requested', 'borrowed'].includes(loan.status)
          : loan.status === filter),
    );
    if (!records.length)
      return `<div class="empty-state">${N.icon('basket')}<strong>${filter === 'borrowed' ? 'Chưa có đồ đang mượn' : 'Chưa có phiếu mượn'}</strong><p>${staff ? 'Yêu cầu sách và đồ dùng từ màn khách sẽ hiện ở đây.' : 'Chọn sách hoặc đồ dùng chung để gửi yêu cầu.'}</p></div>`;
    const labels = {
      requested: 'Chờ giao',
      borrowed: 'Đang mượn',
      returned: 'Đã trả',
      cancelled: 'Đã hủy',
    };
    return records
      .slice()
      .reverse()
      .map(
        (loan) =>
          `<article class="loan-row"><span class="loan-icon tone-${S.groups[loan.group].tone}">${N.icon(S.item(loan.serviceId).icon)}</span><div><h3>${N.escape(loan.name)}</h3><p>${N.escape(loan.seatId)} · ${loan.quantity} ${loan.group === 'books' ? 'cuốn' : 'món'} · ${loan.returnRequested && loan.status === 'borrowed' ? 'Khách yêu cầu trả' : labels[loan.status]}</p></div>${staff && ['requested', 'borrowed'].includes(loan.status) ? `<button class="button button--outline" data-loan-id="${N.escape(loan.id)}" data-loan-next="${loan.status === 'requested' ? 'borrowed' : 'returned'}">${loan.status === 'requested' ? 'Giao đồ' : 'Nhận trả'}</button>` : `<span class="loan-status loan-status--${loan.status}">${labels[loan.status]}</span>`}${staff && loan.status === 'requested' ? `<button class="loan-cancel" data-loan-id="${N.escape(loan.id)}" data-loan-next="cancelled" aria-label="Hủy yêu cầu ${N.escape(loan.name)}">${N.icon('close')}</button>` : ''}</article>`,
      )
      .join('');
  }
  window.NepServiceUI = { shortcuts, tabs, cards, loans, art };
})();
