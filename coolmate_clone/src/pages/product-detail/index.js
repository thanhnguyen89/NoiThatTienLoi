import '../../assets/js/common.js';

const CART_KEY = 'cartItems';

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function updateHeaderBadge(items) {
  const badge = document.querySelector('.cart-badge');
  if (!badge) return;

  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  badge.textContent = totalQty;
  badge.classList.toggle('has-cart', totalQty > 0);
}

document.addEventListener('DOMContentLoaded', () => {
  const mainImage = document.querySelector('[data-main-image]');
  const thumbnails = document.querySelectorAll('[data-thumb]');
  const qtyInput = document.querySelector('[data-product-qty]');
  const priceNode = document.querySelector('[data-product-price]');
  const nameNode = document.querySelector('[data-product-name]');
  const addCartButton = document.querySelector('[data-add-cart]');
  const buyNowButton = document.querySelector('[data-buy-now]');

  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
      thumbnails.forEach((item) => item.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImage) mainImage.src = thumb.dataset.thumb;

      const count = document.querySelector('.gallery-count');
      if (count) count.textContent = `${index + 1}/${thumbnails.length}`;
    });
  });

  document.querySelectorAll('.variant-btn, .color-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('.variant-options, .color-options');
      group?.querySelectorAll('.active').forEach((activeButton) => activeButton.classList.remove('active'));
      button.classList.add('active');
    });
  });

  document.querySelector('[data-qty-minus]')?.addEventListener('click', () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value || 1) - 1);
  });

  document.querySelector('[data-qty-plus]')?.addEventListener('click', () => {
    qtyInput.value = Number(qtyInput.value || 1) + 1;
  });

  function addToCart() {
    const items = readCart();
    const name = nameNode?.textContent?.trim() || 'San pham Coolmate';
    const price = Number(priceNode?.dataset.productPrice || 0);
    const quantity = Math.max(1, Number(qtyInput?.value || 1));
    const image = mainImage?.currentSrc || mainImage?.getAttribute('src') || '';
    const existing = items.find((item) => item.name === name);

    if (existing) {
      existing.quantity = Number(existing.quantity || 1) + quantity;
    } else {
      items.push({ name, price, quantity, image });
    }

    writeCart(items);
    updateHeaderBadge(items);
    return items;
  }

  addCartButton?.addEventListener('click', () => {
    addToCart();
    addCartButton.textContent = 'Da them vao gio';
    window.setTimeout(() => {
      addCartButton.innerHTML = '<span class="icon"><i class="fas fa-shopping-bag"></i></span> Them vao gio';
    }, 1200);
  });

  buyNowButton?.addEventListener('click', () => {
    addToCart();
    window.location.href = '/checkout/';
  });

  updateHeaderBadge(readCart());
});
