/* Pure service inventory rules, shared by the two HTML prototypes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NepServices = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const groups = {
    books: {
      label: 'Mượn sách',
      short: 'Sách',
      icon: 'book',
      tone: 'blue',
      mode: 'borrow',
      policy: 'Đọc tại quán · trả trước khi rời',
    },
    shared: {
      label: 'Đồ dùng chung',
      short: 'Đồ chung',
      icon: 'basket',
      tone: 'mint',
      mode: 'borrow',
      policy: 'Mượn miễn phí · nhân viên nhận trả',
    },
    games: {
      label: 'Đồ giải trí',
      short: 'Giải trí',
      icon: 'dice',
      tone: 'amber',
      mode: 'sale',
      policy: 'Mua mang về · giá niêm yết mẫu',
    },
    stationery: {
      label: 'Văn phòng phẩm',
      short: 'Văn phòng',
      icon: 'pen',
      tone: 'paper',
      mode: 'sale',
      policy: 'Mua mang về · giá niêm yết mẫu',
    },
  };
  const catalog = [
    {
      id: 'book-deepwork',
      name: 'Deep Work',
      description: 'Sách kỹ năng · kệ B1',
      group: 'books',
      mode: 'borrow',
      stock: 1,
      price: 0,
      icon: 'book',
      mark: 'DEEP\nWORK',
    },
    {
      id: 'book-fiction',
      name: 'Nhà giả kim',
      description: 'Văn học · kệ B2',
      group: 'books',
      mode: 'borrow',
      stock: 2,
      price: 0,
      icon: 'book',
      mark: 'NHÀ\nGIẢ KIM',
    },
    {
      id: 'power-strip',
      name: 'Ổ cắm nối dài',
      description: '3 ổ cắm · dây 2 m',
      group: 'shared',
      mode: 'borrow',
      stock: 4,
      price: 0,
      icon: 'plug',
    },
    {
      id: 'basket',
      name: 'Rổ đựng đồ',
      description: 'Để túi, sách và đồ cá nhân',
      group: 'shared',
      mode: 'borrow',
      stock: 6,
      price: 0,
      icon: 'basket',
    },
    {
      id: 'charger',
      name: 'Cáp sạc USB-C',
      description: 'Mượn tại bàn · dây 1 m',
      group: 'shared',
      mode: 'borrow',
      stock: 2,
      price: 0,
      icon: 'cable',
    },
    {
      id: 'cards',
      name: 'Bộ bài giải trí',
      description: 'Một bộ mới · mang về',
      group: 'games',
      mode: 'sale',
      stock: 4,
      price: 79000,
      icon: 'dice',
    },
    {
      id: 'puzzle',
      name: 'Xếp hình mini',
      description: 'Bộ giấy 3D · tự lắp',
      group: 'games',
      mode: 'sale',
      stock: 3,
      price: 65000,
      icon: 'puzzle',
    },
    {
      id: 'pen',
      name: 'Bút gel đen',
      description: 'Ngòi 0,5 mm · 1 cây',
      group: 'stationery',
      mode: 'sale',
      stock: 20,
      price: 12000,
      icon: 'pen',
    },
    {
      id: 'notebook',
      name: 'Sổ tay A6',
      description: 'Giấy chấm · 80 trang',
      group: 'stationery',
      mode: 'sale',
      stock: 8,
      price: 45000,
      icon: 'notebook',
    },
  ];
  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
  function item(id) {
    const found = catalog.find((product) => product.id === id);
    if (!found) fail('UNKNOWN_ITEM', 'Không tìm thấy dịch vụ này.');
    return found;
  }
  function ensureState(state) {
    const serviceInventory = { ...state.serviceInventory };
    catalog.forEach((product) => {
      if (
        !Number.isInteger(serviceInventory[product.id]) ||
        serviceInventory[product.id] < 0
      )
        serviceInventory[product.id] = product.stock;
    });
    return {
      ...state,
      serviceInventory,
      loans: Array.isArray(state.loans) ? state.loans : [],
      serviceSales: Array.isArray(state.serviceSales) ? state.serviceSales : [],
    };
  }
  function available(state, id) {
    const product = item(id),
      current = ensureState(state);
    const held = current.loans
      .filter(
        (loan) =>
          loan.serviceId === id &&
          ['requested', 'borrowed'].includes(loan.status),
      )
      .reduce((sum, loan) => sum + loan.quantity, 0);
    return Math.max(0, current.serviceInventory[product.id] - held);
  }
  function requestLoan(state, { serviceId, seatId, quantity = 1, key }) {
    const current = ensureState(state),
      product = item(serviceId);
    if (product.mode !== 'borrow')
      fail('NOT_BORROWABLE', 'Sản phẩm này dành để mua, không cho mượn.');
    if (!current.seats?.some((seat) => seat.id === seatId))
      fail('UNKNOWN_SEAT', 'Chọn chỗ nhận đồ hợp lệ.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
      fail('INVALID_QUANTITY', 'Số lượng phải là số nguyên từ 1 đến 20.');
    if (!key) fail('MISSING_KEY', 'Yêu cầu thiếu mã theo dõi. Thử lại.');
    const previous = current.loans.find((loan) => loan.id === key);
    if (previous) {
      if (
        previous.serviceId !== serviceId ||
        previous.seatId !== seatId ||
        previous.quantity !== quantity
      )
        fail('KEY_CONFLICT', 'Mã yêu cầu đã dùng cho nội dung khác.');
      return current;
    }
    if (available(current, serviceId) < quantity)
      fail('OUT_OF_STOCK', 'Đồ này đã được mượn hết. Chọn một món khác.');
    return {
      ...current,
      loans: [
        ...current.loans,
        {
          id: key,
          serviceId,
          seatId,
          quantity,
          name: product.name,
          group: product.group,
          status: 'requested',
          createdAt: Date.now(),
        },
      ],
    };
  }
  function advanceLoan(state, id, status) {
    const current = ensureState(state),
      loan = current.loans.find((record) => record.id === id);
    if (!loan) fail('UNKNOWN_LOAN', 'Không tìm thấy phiếu mượn.');
    if (loan.status === status) return current;
    const transitions = {
      requested: ['borrowed', 'cancelled'],
      borrowed: ['returned'],
      returned: [],
      cancelled: [],
    };
    if (!transitions[loan.status]?.includes(status))
      fail(
        'INVALID_TRANSITION',
        'Trạng thái mượn đã thay đổi. Kiểm tra lại trước khi thao tác.',
      );
    return {
      ...current,
      loans: current.loans.map((record) =>
        record.id === id
          ? { ...record, status, updatedAt: Date.now() }
          : record,
      ),
    };
  }
  function sell(state, { key, lines }) {
    const current = ensureState(state);
    if (!key) fail('MISSING_KEY', 'Giao dịch thiếu mã theo dõi.');
    const combined = new Map();
    for (const line of lines) {
      const product = item(line.serviceId);
      if (product.mode !== 'sale')
        fail('NOT_FOR_SALE', 'Đồ mượn không được tính như sản phẩm bán.');
      if (
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 20
      )
        fail('INVALID_QUANTITY', 'Số lượng mua phải là số nguyên từ 1 đến 20.');
      combined.set(product.id, (combined.get(product.id) || 0) + line.quantity);
    }
    const normalized = [...combined]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([serviceId, quantity]) => ({ serviceId, quantity }));
    const previous = current.serviceSales.find((sale) => sale.id === key);
    if (previous) {
      if (JSON.stringify(previous.lines) !== JSON.stringify(normalized))
        fail('KEY_CONFLICT', 'Mã giao dịch đã dùng cho giỏ hàng khác.');
      return current;
    }
    normalized.forEach((line) => {
      if (available(current, line.serviceId) < line.quantity)
        fail(
          'OUT_OF_STOCK',
          `${item(line.serviceId).name} không còn đủ số lượng. Cập nhật giỏ hàng.`,
        );
    });
    const serviceInventory = { ...current.serviceInventory };
    normalized.forEach((line) => {
      serviceInventory[line.serviceId] -= line.quantity;
    });
    return {
      ...current,
      serviceInventory,
      serviceSales: [
        ...current.serviceSales,
        { id: key, lines: normalized, createdAt: Date.now() },
      ],
    };
  }
  return {
    groups,
    catalog,
    item,
    ensureState,
    available,
    requestLoan,
    advanceLoan,
    sell,
  };
});
