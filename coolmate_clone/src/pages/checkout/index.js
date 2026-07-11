import '../../assets/js/common.js';

const CART_KEY = 'cartItems';
const FALLBACK_IMAGE = '/images/Cool_MAT_ao-thun.webp';

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}d`;
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function getItemPrice(item) {
  return Number(item.price || item.salePrice || item.finalPrice || 0);
}

function getItemName(item) {
  return item.name || item.title || 'San pham Coolmate';
}

document.addEventListener('DOMContentLoaded', () => {
  const itemsNode = document.querySelector('[data-checkout-items]');
  const subtotalNodes = document.querySelectorAll('[data-checkout-subtotal]');
  const totalNodes = document.querySelectorAll('[data-checkout-total]');
  const countNode = document.querySelector('[data-checkout-count]');
  const placeOrderButtons = document.querySelectorAll('[data-place-order]');

  if (!itemsNode) return;

  const items = readCart();

  if (!items.length) {
    itemsNode.innerHTML = '<p class="co-address__detail">Gio hang dang trong. Hay quay lai mua sam truoc khi thanh toan.</p>';
  } else {
    itemsNode.innerHTML = items.map((item) => {
      const quantity = Number(item.quantity || 1);
      const price = getItemPrice(item);
      const image = item.image || item.img || FALLBACK_IMAGE;

      return `
        <article class="co-item">
          <div class="co-item__img-wrap">
            <img class="co-item__img" src="${image}" alt="${getItemName(item)}">
          </div>
          <div class="co-item__info">
            <h3 class="co-item__brand">COOLMATE</h3>
            <p class="co-item__name">${getItemName(item)}</p>
            <p class="co-item__variant">So luong: ${quantity}</p>
          </div>
          <div class="co-item__right">
            <span class="co-item__qty">x${quantity}</span>
            <span class="co-item__price">${formatCurrency(price * quantity)}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * Number(item.quantity || 1), 0);
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  subtotalNodes.forEach((node) => {
    node.textContent = formatCurrency(subtotal);
  });
  totalNodes.forEach((node) => {
    node.textContent = formatCurrency(subtotal);
  });
  if (countNode) countNode.textContent = `${count} san pham`;

  placeOrderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      alert(items.length ? 'Don hang da duoc ghi nhan.' : 'Gio hang dang trong.');
    });
  });
});
