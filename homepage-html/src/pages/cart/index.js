// Cart page — reads from localStorage key "cart"
// Cart item shape: { id, brand, name, image, price, originalPrice, qty }

document.addEventListener('DOMContentLoaded', () => {
  // Seed mock data nếu localStorage rỗng (để dev/test)
  if (!localStorage.getItem('cart')) {
    localStorage.setItem('cart', JSON.stringify([
      {
        id: 1,
        brand: "L'OREAL",
        name: "Nước Tẩy Trang L'Oreal Tươi Mát Cho Da Dầu, Hỗn Hợp 400ml",
        image: "../../assets/images/sp1.jpg",
        price: 137000,
        originalPrice: 249000,
        qty: 1
      }
    ]));
  }
  renderCart();
  initFooterAccordion();
  initMobileCategoryDrawer();
  initModalLogin();
});

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function formatPrice(n) {
  return n.toLocaleString('vi-VN') + ' đ';
}

function renderCart() {
  const cart = getCart();
  const countEl = document.getElementById('cartCount');
  const emptyEl = document.getElementById('cartEmpty');
  const hasItemsEl = document.getElementById('cartHasItems');
  const itemsEl = document.getElementById('cartItems');

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  if (countEl) countEl.textContent = totalQty;

  if (cart.length === 0) {
    emptyEl.style.display = 'flex';
    hasItemsEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  hasItemsEl.style.display = 'flex';

  itemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item" data-idx="${idx}">
      <div class="cart-item__product">
        <img class="cart-item__img" src="${item.image}" alt="${item.name}">
        <div class="cart-item__info">
          <p class="cart-item__brand">${item.brand}</p>
          <p class="cart-item__name">${item.name}</p>
          <div class="cart-item__actions">
            <a href="#" class="cart-item__wishlist"><i class="far fa-heart"></i> Yêu thích</a>
            <button class="cart-item__remove" data-idx="${idx}"><i class="fas fa-times"></i> Xóa</button>
          </div>
        </div>
      </div>
      <div class="cart-item__price">
        <span class="cart-item__price-current">${formatPrice(item.price)}</span>
        ${item.originalPrice > item.price ? `<span class="cart-item__price-original">${formatPrice(item.originalPrice)}</span>` : ''}
      </div>
      <div class="cart-item__qty">
        <input class="qty-input" type="number" min="1" value="${item.qty}" data-idx="${idx}">
      </div>
      <div class="cart-item__total">${formatPrice(item.price * item.qty)}</div>
    </div>
  `).join('');

  updateTotals(cart);

  // Remove buttons
  itemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const cart = getCart();
      cart.splice(Number(btn.dataset.idx), 1);
      saveCart(cart);
      renderCart();
    });
  });

  // Qty inputs
  itemsEl.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', () => {
      const cart = getCart();
      const idx = Number(input.dataset.idx);
      const val = Math.max(1, parseInt(input.value) || 1);
      cart[idx].qty = val;
      saveCart(cart);
      renderCart();
    });
  });
}

function updateTotals(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = cart.reduce((s, i) => s + Math.max(0, (i.originalPrice - i.price) * i.qty), 0);
  const total = subtotal;

  const fmt = formatPrice;
  document.getElementById('cartSubtotal').textContent = fmt(subtotal);
  document.getElementById('invoiceSubtotal').textContent = fmt(subtotal);
  document.getElementById('invoiceDiscount').textContent = fmt(discount);
  document.getElementById('invoiceTotal').textContent = fmt(total);
}

// ── Reuse from home ──
function initFooterAccordion() {
  if (window.innerWidth > 768) return;
  document.querySelectorAll('.footer__col:not(:first-child)').forEach(col => {
    const title = col.querySelector('.f-listtel__title');
    if (title) title.addEventListener('click', () => col.classList.toggle('is-open'));
  });
}

function initMobileCategoryDrawer() {
  const overlay = document.getElementById('mobileCatOverlay');
  const drawer = document.getElementById('mobileCatDrawer');
  const closeBtn = document.getElementById('mobileCatClose');
  const catNavLink = document.querySelector('.mobile-bottom-nav-item:nth-child(2) .mobile-bottom-nav-link');
  if (!overlay || !drawer) return;

  const open = () => { overlay.classList.add('is-open'); drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('is-open'); drawer.classList.remove('is-open'); document.body.style.overflow = ''; };

  if (catNavLink) catNavLink.addEventListener('click', e => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.querySelectorAll('.mobile-cat-left-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.mobile-cat-left-item').forEach(i => i.classList.remove('is-active'));
      item.classList.add('is-active');
      document.querySelectorAll('.mobile-cat-panel').forEach(p => p.classList.remove('is-active'));
      const panel = document.getElementById(item.dataset.panel);
      if (panel) panel.classList.add('is-active');
    });
  });
}

function initModalLogin() {
  const loginOverlay = document.getElementById('modalLoginOverlay');
  const loginClose = document.getElementById('modalLoginClose');
  const loginBack = document.getElementById('modalLoginBack');
  const registerOverlay = document.getElementById('modalRegisterOverlay');
  const registerClose = document.getElementById('modalRegisterClose');
  const registerBack = document.getElementById('modalRegisterBack');
  const forgotOverlay = document.getElementById('modalForgotOverlay');
  const forgotClose = document.getElementById('modalForgotClose');
  const forgotBack = document.getElementById('modalForgotBack');

  if (!loginOverlay) return;

  const closeAll = () => {
    [loginOverlay, registerOverlay, forgotOverlay].forEach(o => o && o.classList.remove('is-open'));
    document.body.style.overflow = '';
  };
  const openLogin = () => { closeAll(); loginOverlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const openRegister = () => { closeAll(); registerOverlay && registerOverlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const openForgot = () => { closeAll(); forgotOverlay && forgotOverlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };

  document.querySelectorAll('.mobile-bottom-nav-link[href="/account"]').forEach(l => l.addEventListener('click', e => { e.preventDefault(); openLogin(); }));

  if (loginClose) loginClose.addEventListener('click', closeAll);
  if (loginBack) loginBack.addEventListener('click', closeAll);
  if (registerClose) registerClose.addEventListener('click', closeAll);
  if (registerBack) registerBack.addEventListener('click', openLogin);
  if (forgotClose) forgotClose.addEventListener('click', closeAll);
  if (forgotBack) forgotBack.addEventListener('click', openLogin);

  [loginOverlay, registerOverlay, forgotOverlay].forEach(o => {
    if (o) o.addEventListener('click', e => { if (e.target === o) closeAll(); });
  });

  const toRegister = loginOverlay.querySelector('.modal-login__register a');
  if (toRegister) toRegister.addEventListener('click', e => { e.preventDefault(); openRegister(); });
  const toLogin = document.getElementById('switchToLogin');
  if (toLogin) toLogin.addEventListener('click', e => { e.preventDefault(); openLogin(); });
  const forgotLink = loginOverlay.querySelector('.modal-login__forgot');
  if (forgotLink) forgotLink.addEventListener('click', e => { e.preventDefault(); openForgot(); });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
}
