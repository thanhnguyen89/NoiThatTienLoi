import '../../assets/js/common.js';
const product = require('../../data/doraemon-product.data.js');

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
  badge.textContent = String(totalQty);
  badge.hidden = totalQty === 0;
}

function formatQueryValue(value) {
  return String(value || '').trim().toLowerCase();
}

document.addEventListener('DOMContentLoaded', () => {
  const mainImage = document.querySelector('[data-gallery-main]');
  const count = document.querySelector('[data-gallery-count]');
  const thumbs = Array.from(document.querySelectorAll('[data-thumb]'));
  const thumbTrack = document.querySelector('.doraemon-thumb-track');
  const prevThumb = document.querySelector('[data-gallery-prev]');
  const nextThumb = document.querySelector('[data-gallery-next]');
  const qtyInput = document.querySelector('[data-product-qty]');
  const addCartButton = document.querySelector('[data-add-cart]');
  const buyNowButton = document.querySelector('[data-buy-now]');
  const priceNode = document.querySelector('[data-product-price]');
  const sizeButtons = Array.from(document.querySelectorAll('[data-size-btn]'));
  const colorButton = document.querySelector('[data-color-btn]');
  const colorLabel = document.querySelector('.doraemon-color__label');

  let currentImageIndex = 0;
  let selectedSize = sizeButtons.find((btn) => btn.classList.contains('is-active'))?.textContent?.trim() || 'M';
  let selectedColor = colorButton?.dataset.color || product.colorSlug;

  function setMainImage(index) {
    if (!mainImage || !thumbs[index]) return;
    currentImageIndex = index;
    mainImage.src = thumbs[index].dataset.thumb || product.gallery[index];
    thumbs.forEach((thumb, thumbIndex) => {
      thumb.classList.toggle('is-active', thumbIndex === index);
    });
    if (count) count.textContent = `${index + 1}/${thumbs.length}`;
  }

  function selectSize(button) {
    sizeButtons.forEach((item) => {
      item.classList.toggle('is-active', item === button);
    });
    selectedSize = button.textContent?.trim() || selectedSize;
  }

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => setMainImage(index));
  });

  prevThumb?.addEventListener('click', () => {
    thumbTrack?.scrollBy({ left: -120, behavior: 'smooth' });
  });

  nextThumb?.addEventListener('click', () => {
    thumbTrack?.scrollBy({ left: 120, behavior: 'smooth' });
  });

  sizeButtons.forEach((button) => {
    if (button.disabled) return;
    button.addEventListener('click', () => selectSize(button));
  });

  colorButton?.addEventListener('click', () => {
    colorButton.classList.add('is-active');
    selectedColor = colorButton.dataset.color || selectedColor;
    if (colorLabel) colorLabel.textContent = product.colorName;
  });

  document.querySelector('[data-qty-minus]')?.addEventListener('click', () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value || 1) - 1);
  });

  document.querySelector('[data-qty-plus]')?.addEventListener('click', () => {
    qtyInput.value = Number(qtyInput.value || 1) + 1;
  });

  function addToCart() {
    const items = readCart();
    const title = product.name;
    const price = Number(priceNode?.dataset.productPrice || product.price || 0);
    const quantity = Math.max(1, Number(qtyInput?.value || 1));
    const image = thumbs[currentImageIndex]?.dataset.thumb || product.gallery[0];
    const key = `${title}::${selectedSize}::${selectedColor}`;
    const existing = items.find((item) => item.key === key);

    if (existing) {
      existing.quantity = Number(existing.quantity || 1) + quantity;
    } else {
      items.push({
        key,
        name: title,
        price,
        quantity,
        image,
        size: selectedSize,
        color: selectedColor,
      });
    }

    writeCart(items);
    updateHeaderBadge(items);
    return items;
  }

  addCartButton?.addEventListener('click', () => {
    addToCart();
    addCartButton.classList.add('is-added');
    addCartButton.querySelector('span').textContent = 'Đã thêm';
    window.setTimeout(() => {
      addCartButton.classList.remove('is-added');
      addCartButton.innerHTML = '<i class="fas fa-shopping-bag"></i><span>Thêm vào giỏ</span>';
    }, 1200);
  });

  buyNowButton?.addEventListener('click', () => {
    addToCart();
    window.location.href = '/checkout/';
  });

  const colorQuery = formatQueryValue(new URLSearchParams(window.location.search).get('color'));
  if (colorQuery && formatQueryValue(product.colorSlug) === colorQuery && colorButton) {
    colorButton.classList.add('is-active');
  }

  setMainImage(0);
  updateHeaderBadge(readCart());
});
