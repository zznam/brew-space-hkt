(() => {
  'use strict';
  const N=window.Nep;
  const $=selector=>document.querySelector(selector);
  const state=()=>N.getState();
  let selected='W03',hours=2,zone='all',view=matchMedia('(max-width: 39.99rem)').matches?'list':'map',category='all',pending=false;
  const cart={};
  const dialog=$('#customer-dialog');
  const amenities={wifi:'Wi-Fi',plug:'Ổ điện',leaf:'Ánh sáng',volume:'Yên tĩnh',users:'4 người',cup:'Gần quầy'};
  const cartLines=()=>N.menu.filter(m=>cart[m.id]>0).map(m=>({...m,qty:cart[m.id]}));
  function totals(){const seat=N.getSeat(selected),seatPrice=seat?N.kinds[seat.kind].rate*hours:0;const drinks=cartLines().reduce((total,m)=>total+m.price*m.qty,0);const discount=state().sale&&seat?.kind==='focus'?Math.round(seatPrice*.1):0;return{seatPrice,drinks,discount,total:seatPrice+drinks-discount};}
  function openDialog(title,html){$('#customer-dialog-title').textContent=title;$('#customer-dialog-body').innerHTML=html;N.hydrateIcons(dialog);if(!dialog.open)dialog.showModal();$('#customer-dialog-body').querySelector('input,textarea,select,button,a[href]')?.focus({preventScroll:true});}
  $('#close-customer-dialog').addEventListener('click',()=>dialog.close());
  function selectSeat(id){selected=id;$('#checkout-error').hidden=true;renderSpace();renderBill();}
  function renderSpace(){
    $('#customer-map').innerHTML=N.mapMarkup({selected,zone,customer:true});N.bindMap($('#customer-map'),selectSeat);
    $('#customer-map').hidden=view!=='map';$('#customer-seat-list').hidden=view!=='list';
    const seats=state().seats.filter(s=>s.status==='free'&&(zone==='all'||s.kind===zone));
    $('#customer-free-count').textContent=`${seats.length} chỗ còn trống`;
    $('#customer-seat-list').innerHTML=seats.length?seats.map(s=>`<button class="available-seat ${selected===s.id?'is-selected':''}" data-available-seat="${s.id}" aria-pressed="${selected===s.id}"><strong>${s.id}</strong><span>${N.kinds[s.kind].label}</span><span>${N.money(N.kinds[s.kind].rate)}/giờ</span></button>`).join(''):'<div class="empty-state"><strong>Khu vực này đã hết chỗ</strong><p>Chọn một khu vực khác để tiếp tục.</p></div>';
    $('#customer-seat-list').querySelectorAll('[data-available-seat]').forEach(b=>b.addEventListener('click',()=>selectSeat(b.dataset.availableSeat)));
  }
  function renderMenu(){
    const items=N.menu.filter(m=>category==='all'||m.category===category);
    $('#customer-menu').innerHTML=items.map(m=>`<article class="drink-card"><div class="drink-image">${N.drinkArt(m.art)}</div><h3>${m.name}</h3><p>${m.description}</p><div class="drink-purchase"><strong>${N.money(m.price)}</strong><button class="add-drink" data-add="${m.id}" aria-label="Thêm ${m.name}">${N.icon('plus')}${cart[m.id]?`<span>${cart[m.id]}</span>`:''}</button></div></article>`).join('');
    $('#customer-menu').querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.add;cart[id]=Math.min(20,(cart[id]||0)+1);renderMenu();renderBill();}));
  }
  function renderBill(){
    const seat=N.getSeat(selected);
    if(seat){const kind=N.kinds[seat.kind];$('#selected-seat-summary').innerHTML=`<div class="selected-seat"><span class="selected-seat-code">${seat.id}</span><div><h3>${kind.label}</h3><p>${N.money(kind.rate)} / giờ · ${seat.kind==='meeting'?'Tối đa 4 người':'1 người'}</p><div class="amenity-list">${kind.amenities.map(a=>`<span class="amenity">${N.icon(a)}${amenities[a]}</span>`).join('')}</div></div></div>`;}else{$('#selected-seat-summary').innerHTML='<p class="dialog-note">Chọn một chỗ trống trên sơ đồ hoặc danh sách để tiếp tục.</p>';}
    $('#cart-drinks').innerHTML=cartLines().map(m=>`<div class="cart-line"><div>${m.name}<br><small>${N.money(m.price)}</small></div><div class="quantity-control"><button type="button" data-quantity="${m.id}" data-delta="-1" aria-label="Bớt ${m.name}">${N.icon('minus')}</button><span>${m.qty}</span><button type="button" data-quantity="${m.id}" data-delta="1" aria-label="Thêm ${m.name}" ${m.qty>=20?'disabled':''}>${N.icon('plus')}</button></div></div>`).join('');
    $('#cart-drinks').querySelectorAll('[data-quantity]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.quantity;cart[id]=Math.min(20,Math.max(0,(cart[id]||0)+Number(b.dataset.delta)));renderBill();renderMenu();}));
    const t=totals();
    $('#mobile-cart-summary').textContent=seat?`${seat.id} · ${hours} giờ`:'Chưa chọn chỗ';
    $('#mobile-cart-total').textContent=N.money(t.total);
    $('#price-summary').innerHTML=`<div class="price-row"><span>Chỗ ngồi · ${hours} giờ</span><span>${N.money(t.seatPrice)}</span></div>${t.drinks?`<div class="price-row"><span>Đồ uống</span><span>${N.money(t.drinks)}</span></div>`:''}${t.discount?`<div class="price-row price-row--discount"><span>Ưu đãi giờ tập trung · 10%</span><span>−${N.money(t.discount)}</span></div>`:''}<div class="price-row"><span>Phụ phí</span><span>0 ₫</span></div><div class="price-row price-row--total"><span>Tổng thanh toán</span><strong>${N.money(t.total)}</strong></div>`;
    $('#checkout').disabled=!seat||seat.status!=='free'||pending;
    if(!seat){$('#checkout-error').hidden=false;$('#checkout-error').textContent='Chưa có chỗ trống được chọn. Chọn lại trên sơ đồ hoặc danh sách.';}
  }
  function render(){const seat=N.getSeat(selected);if(!seat||seat.status!=='free')selected=state().seats.find(s=>s.status==='free'&&(zone==='all'||s.kind===zone))?.id||'';renderSpace();renderMenu();renderBill();}
  document.querySelectorAll('[data-zone]').forEach(b=>b.addEventListener('click',()=>{zone=b.dataset.zone;document.querySelectorAll('[data-zone]').forEach(btn=>{btn.classList.toggle('is-active',btn===b);btn.setAttribute('aria-pressed',String(btn===b));});const seat=N.getSeat(selected);if(zone!=='all'&&seat?.kind!==zone)selected=state().seats.find(s=>s.kind===zone&&s.status==='free')?.id||'';renderSpace();renderBill();}));
  document.querySelectorAll('[data-customer-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.customerView;document.querySelectorAll('[data-customer-view]').forEach(btn=>{btn.classList.toggle('is-active',btn===b);btn.setAttribute('aria-pressed',String(btn===b));});renderSpace();}));
  document.querySelectorAll('[data-hours]').forEach(b=>b.addEventListener('click',()=>{hours=Number(b.dataset.hours);document.querySelectorAll('[data-hours]').forEach(btn=>{btn.classList.toggle('is-active',btn===b);btn.setAttribute('aria-pressed',String(btn===b));});renderBill();}));
  $('#menu-category').addEventListener('change',e=>{category=e.target.value;renderMenu();});
  $('#loyalty-info').addEventListener('click',()=>openDialog('Một chút thân quen',`<p class="dialog-copy">Trong MVP, thành viên xác minh số điện thoại để tích điểm từ các đơn đã hoàn tất. Quán có thể đề xuất ưu đãi dựa trên khung giờ, gói chỗ và món thường mua.</p><p class="dialog-note">Prototype chưa có tài khoản, số dư điểm hoặc lịch sử thật. Phân tích AI và ưu đãi loyalty sẽ được nối sau khi có backend.</p><button class="button button--outline full-width" id="close-loyalty">Quay lại chọn chỗ</button>`));
  dialog.addEventListener('click',e=>{if(e.target.closest('#close-loyalty'))dialog.close();});
  function supportForm(){
    openDialog('Bạn cần hỗ trợ gì?',`<form id="support-form"><p class="dialog-copy">Yêu cầu mẫu sẽ xuất hiện ở màn vận hành. Nhân viên luôn có thể hỗ trợ, không phụ thuộc vào phân loại tự động.</p><div class="field"><label for="support-seat">Chỗ liên quan</label><select id="support-seat">${state().seats.map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${s.id} · ${N.kinds[s.kind].label}</option>`).join('')}</select></div><div class="field"><label for="support-message">Nội dung yêu cầu</label><textarea id="support-message" rows="3" maxlength="240" required placeholder="Mình cần hỗ trợ kết nối Wi-Fi…" aria-describedby="support-error"></textarea><span id="support-error" class="field-helper"></span></div><button class="button button--primary full-width" type="submit">Gửi yêu cầu mẫu</button></form>`);
    $('#support-form').addEventListener('submit',e=>{e.preventDefault();const text=$('#support-message').value.trim();if(!text){$('#support-message').setAttribute('aria-invalid','true');$('#support-error').textContent='Nội dung đang trống. Mô tả điều bạn cần hỗ trợ.';return;}const category=/wifi|wi-fi|mạng|màn hình|ổ cắm|ổ điện|kết nối/i.test(text)?'Thiết bị':/tiền|thanh toán|hoàn|hủy/i.test(text)?'Thanh toán':'Nhân viên hỗ trợ';const seat=$('#support-seat').value;state().support.push({id:`S${Date.now()}`,seat,name:'Khách gửi yêu cầu',text,category,status:'open'});if(N.getSeat(seat)?.status==='occupied')N.getSeat(seat).status='attention';N.save();openDialog('Đã gửi yêu cầu mẫu',`<div class="success-symbol">${N.icon('check')}</div><p class="dialog-copy">Yêu cầu tại ${seat} đã được thêm vào hàng chờ của nhân viên.</p><div class="support-classification">Phân loại bằng quy tắc minh họa: ${category}. Chưa gọi AI.</div><p class="dialog-note">Không có thông báo gửi đến nhân viên thật. Mở màn vận hành để xem và nhận xử lý.</p><a class="button button--outline full-width" href="operations.html">Xem màn vận hành ${N.icon('external')}</a>`);});
  }
  $('#customer-support').addEventListener('click',supportForm);
  $('#checkout').addEventListener('click',()=>{
    if(pending)return;
    const seat=N.getSeat(selected);
    if(!seat||seat.status!=='free'){$('#checkout-error').hidden=false;$('#checkout-error').textContent='Chỗ vừa được chọn bởi lượt khác. Chọn một chỗ còn trống để tiếp tục.';render();return;}
    const t=totals();const seatId=selected;const note=$('#order-note').value.trim();const items=cartLines().map(m=>({id:m.id,name:m.name,qty:m.qty,price:m.price}));const invoiceHours=hours;
    openDialog('Xác nhận đặt chỗ mẫu',`<p class="dialog-copy">Đây là bước thanh toán mô phỏng. Không nhập thông tin thẻ hoặc chuyển tiền thật.</p><div class="dialog-row"><span>Chỗ ngồi</span><strong>${seatId} · ${N.kinds[seat.kind].label}</strong></div><div class="dialog-row"><span>Thời lượng</span><strong>${hours} giờ</strong></div><div class="dialog-row"><span>Đồ uống</span><strong>${items.reduce((n,i)=>n+i.qty,0)} món</strong></div><div class="dialog-row"><span>Tổng tiền mẫu</span><strong>${N.money(t.total)}</strong></div><p class="dialog-note">Giá được chụp tại bước xác nhận. Khi triển khai thật, backend sẽ kiểm tra lịch và trạng thái thanh toán.</p><button id="confirm-checkout" class="button button--primary full-width">Mô phỏng thanh toán ${N.icon('arrow')}</button><button id="simulate-failure" class="quiet-button full-width">Thử tình huống thanh toán lỗi</button><p id="payment-error" role="alert" class="form-error" hidden></p>`);
    $('#simulate-failure').addEventListener('click',()=>{$('#payment-error').hidden=false;$('#payment-error').textContent='Thanh toán mẫu bị từ chối. Chỗ chưa được đặt; bạn có thể thử lại.';});
    $('#confirm-checkout').addEventListener('click',()=>{
      if(pending)return;
      if(N.getSeat(seatId)?.status!=='free'){$('#payment-error').hidden=false;$('#payment-error').textContent='Chỗ không còn trống. Đóng cửa sổ và chọn chỗ khác; chưa thu tiền.';return;}
      pending=true;
      const booking={id:`R${Date.now()}`,seat:seatId,name:'Khách đặt online',time:'14:45',hours:invoiceHours,people:seat.kind==='meeting'?4:1,date:'2026-11-14',status:'reserved'};
      const order={id:`NP-${String(Date.now()).slice(-6)}`,seat:seatId,guest:'Khách đặt online',items:[{id:'seat-hours',name:`Gói chỗ ${seatId} · ${invoiceHours} giờ`,qty:1,price:t.seatPrice},...items],discount:t.discount,total:t.total,note,status:'queued',method:'Online mô phỏng',createdAt:Date.now()};
      state().bookings.push(booking);state().orders.push(order);seat.status='reserved';seat.guest=booking.name;
      if(note){state().support.push({id:`S${Date.now()}`,seat:seatId,name:booking.name,text:note,category:/wifi|màn hình|ổ cắm|kết nối/i.test(note)?'Thiết bị':'Ghi chú cần xem',status:'open'});}
      N.save();pending=false;Object.keys(cart).forEach(id=>delete cart[id]);$('#order-note').value='';
      openDialog('Chỗ của bạn đã sẵn sàng.',`<div class="success-symbol">${N.icon('check')}</div><div class="confirmation-code">${N.escape(order.id)}</div><p class="dialog-copy">Đặt chỗ mẫu ${seatId} thành công. Khi đến quán, nhân viên sẽ hỗ trợ check-in.</p><div class="dialog-row"><span>Gói chỗ</span><strong>${invoiceHours} giờ · ${seatId}</strong></div><div class="dialog-row"><span>Thanh toán mô phỏng</span><strong>${N.money(t.total)}</strong></div>${note?'<div class="support-classification">Ghi chú đã được đưa vào hàng chờ nhân viên theo quy tắc mẫu.</div>':''}<p class="dialog-note">Không có tiền thật được thu. Đơn và đặt chỗ đã có trong màn vận hành trên cùng địa chỉ web.</p><a class="button button--primary full-width" href="operations.html">Xem đơn ở màn vận hành ${N.icon('arrow')}</a><button class="quiet-button full-width" id="choose-another">Chọn thêm chỗ khác</button>`);
      $('#choose-another').addEventListener('click',()=>{dialog.close();render();});render();
    });
  });
  window.addEventListener('nep-state',render);
  document.querySelectorAll('[data-customer-view]').forEach(b=>{b.classList.toggle('is-active',b.dataset.customerView===view);b.setAttribute('aria-pressed',String(b.dataset.customerView===view));});
  render();
})();
