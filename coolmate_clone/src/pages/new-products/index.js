document.addEventListener('DOMContentLoaded', () => {
  const filterCount = document.querySelector('.filter-count');
  const productCards = Array.from(document.querySelectorAll('.product-card'));
  const paginationBtns = Array.from(document.querySelectorAll('.pagination-btn:not(.prev):not(.next)'));
  const prevBtn = document.querySelector('.pagination-btn.prev');
  const nextBtn = document.querySelector('.pagination-btn.next');

  if (filterCount) {
    filterCount.textContent = `${productCards.length} ket qua`;
  }

  paginationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      paginationBtns.forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  prevBtn?.addEventListener('click', () => {
    const activePage = document.querySelector('.pagination-btn.active');
    const prevPage = activePage?.previousElementSibling;
    if (prevPage && !prevPage.classList.contains('prev')) {
      activePage.classList.remove('active');
      prevPage.classList.add('active');
    }
  });

  nextBtn?.addEventListener('click', () => {
    const activePage = document.querySelector('.pagination-btn.active');
    const nextPage = activePage?.nextElementSibling;
    if (nextPage && !nextPage.classList.contains('next')) {
      activePage.classList.remove('active');
      nextPage.classList.add('active');
    }
  });
});
