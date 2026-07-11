import '../../assets/js/common.js';

document.addEventListener('DOMContentLoaded', () => {
  const filters = document.querySelectorAll('input[name="category"]');
  const sortSelect = document.querySelector('.sort-select');
  const grid = document.querySelector('[data-product-grid]');
  const resultCount = document.querySelector('[data-result-count]');

  if (!grid) return;

  const getCards = () => Array.from(grid.querySelectorAll('.product-card'));

  function updateCount() {
    const visible = getCards().filter((card) => card.style.display !== 'none').length;
    if (resultCount) resultCount.textContent = `${visible} ket qua`;
  }

  function applyFilter() {
    const active = document.querySelector('input[name="category"]:checked')?.value || 'all';
    getCards().forEach((card) => {
      card.style.display = active === 'all' || card.dataset.category === active ? '' : 'none';
    });
    updateCount();
  }

  function applySort() {
    const cards = getCards();
    const value = sortSelect?.value;

    if (value === 'price-asc' || value === 'price-desc') {
      cards.sort((a, b) => {
        const diff = Number(a.dataset.price || 0) - Number(b.dataset.price || 0);
        return value === 'price-asc' ? diff : -diff;
      });
      cards.forEach((card) => grid.appendChild(card));
    }
  }

  filters.forEach((input) => input.addEventListener('change', applyFilter));
  sortSelect?.addEventListener('change', applySort);
  updateCount();
});
