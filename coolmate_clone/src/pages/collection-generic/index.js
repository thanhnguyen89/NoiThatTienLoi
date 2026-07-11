document.addEventListener('DOMContentLoaded', () => {
  const count = document.querySelector('.filter-count');
  const cards = document.querySelectorAll('.product-card');
  if (count) count.textContent = `${cards.length} ket qua`;
});
