import '../../assets/js/common.js';

const CART_KEY = 'cartItems';
const FALLBACK_IMAGE = '/images/Cool_MAT_ao-thun.webp';

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}d`;
}

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function getItemPrice(item) {
  return Number(item.price || item.salePrice || item.finalPrice || 0);
}

function getItemName(item) {
  return item.name || item.title || 'San pham Coolmate';
}

function updateHeaderBadge(items) {
  const badge = document.querySelector('.cart-badge');
  if (!badge) return;

  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  badge.textContent = String(totalQty);
  badge.hidden = totalQty === 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const list = document.querySelector('[data-cart-list]');
  const empty = document.querySelector('[data-cart-empty]');
  const checkAll = document.querySelector('[data-check-all]');
  const clearAll = document.querySelector('[data-clear-all]');
  const subtotalNode = document.querySelector('[data-cart-subtotal]');
  const totalNode = document.querySelector('[data-cart-total]');
  const paymentOptions = Array.from(document.querySelectorAll('[data-payment-option]'));
  const selectedPayment = document.querySelector('[data-selected-payment]');
  const placeOrder = document.querySelector('[data-place-order]');
  const form = document.querySelector('[data-cart-form]');

  if (!list || !empty || !subtotalNode || !totalNode || !selectedPayment || !placeOrder) return;

  let items = readCart().map((item) => ({
    ...item,
    selected: item.selected !== false,
    quantity: Math.max(1, Number(item.quantity || 1)),
  }));

  function getSummary() {
    return items.reduce((acc, item) => {
      if (!item.selected) return acc;
      acc.quantity += Number(item.quantity || 1);
      acc.subtotal += getItemPrice(item) * Number(item.quantity || 1);
      return acc;
    }, { quantity: 0, subtotal: 0 });
  }

  function syncCheckAll() {
    if (!checkAll) return;
    checkAll.checked = items.length > 0 && items.every((item) => item.selected);
  }

  function renderList() {
    if (!items.length) {
      list.innerHTML = '';
      empty.hidden = false;
      placeOrder.disabled = true;
      return;
    }

    empty.hidden = true;
    placeOrder.disabled = false;

    list.innerHTML = items.map((item, index) => {
      const price = getItemPrice(item);
      const image = item.image || item.img || FALLBACK_IMAGE;
      const quantity = Number(item.quantity || 1);
      const size = item.size || 'M';
      const color = item.color || item.colorName || 'navy-phoi-xanh';

      return `
        <article class="cart-order-item" data-cart-index="${index}">
          <input class="cart-order-item__check" type="checkbox" data-item-check ${item.selected ? 'checked' : ''}>
          <div class="cart-order-item__image">
            <img src="${image}" alt="${getItemName(item)}">
          </div>
          <div class="cart-order-item__body">
            <h3 class="cart-order-item__title">${getItemName(item)}</h3>
            <div class="cart-order-item__meta">
              <span class="cart-order-item__pill">${size}</span>
              <span class="cart-order-item__pill">${String(color).replace(/-/g, ' ')}</span>
            </div>
            <div class="cart-order-item__footer">
              <div class="cart-order-item__qty">
                <button type="button" data-qty-minus>-</button>
                <input type="number" min="1" value="${quantity}" data-qty-input>
                <button type="button" data-qty-plus>+</button>
              </div>
              <button class="cart-order-item__remove" type="button" data-remove-item>Xoa</button>
            </div>
          </div>
          <div class="cart-order-item__price">${formatCurrency(price * quantity)}</div>
        </article>
      `;
    }).join('');
  }

  function renderSummary() {
    const summary = getSummary();
    subtotalNode.textContent = formatCurrency(summary.subtotal);
    totalNode.textContent = formatCurrency(summary.subtotal);
    updateHeaderBadge(items);
    syncCheckAll();
  }

  function persist() {
    writeCart(items);
    renderList();
    renderSummary();
  }

  list.addEventListener('click', (event) => {
    const row = event.target.closest('[data-cart-index]');
    if (!row) return;
    const index = Number(row.dataset.cartIndex);

    if (event.target.closest('[data-remove-item]')) {
      items.splice(index, 1);
      persist();
      return;
    }

    if (event.target.closest('[data-qty-minus]')) {
      items[index].quantity = Math.max(1, Number(items[index].quantity || 1) - 1);
      persist();
      return;
    }

    if (event.target.closest('[data-qty-plus]')) {
      items[index].quantity = Number(items[index].quantity || 1) + 1;
      persist();
    }
  });

  list.addEventListener('input', (event) => {
    const row = event.target.closest('[data-cart-index]');
    if (!row) return;
    const index = Number(row.dataset.cartIndex);

    if (event.target.matches('[data-qty-input]')) {
      items[index].quantity = Math.max(1, Number(event.target.value || 1));
      writeCart(items);
      renderList();
      renderSummary();
      return;
    }

    if (event.target.matches('[data-item-check]')) {
      items[index].selected = event.target.checked;
      writeCart(items);
      renderSummary();
    }
  });

  checkAll?.addEventListener('change', () => {
    items = items.map((item) => ({ ...item, selected: checkAll.checked }));
    persist();
  });

  clearAll?.addEventListener('click', () => {
    const hasSelected = items.some((item) => item.selected);
    items = hasSelected ? items.filter((item) => !item.selected) : [];
    persist();
  });

  paymentOptions.forEach((option) => {
    option.addEventListener('click', () => {
      paymentOptions.forEach((item) => item.classList.remove('is-active'));
      option.classList.add('is-active');
      const input = option.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      const title = option.querySelector('.cart-payment__copy strong')?.textContent?.trim();
      if (title) selectedPayment.textContent = title;
    });
  });

  placeOrder.addEventListener('click', () => {
    if (!items.length) return;
    window.location.href = '/checkout/';
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  renderList();
  renderSummary();
});
