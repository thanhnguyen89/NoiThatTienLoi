import '../../assets/js/common.js';

document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.news-pagination .pagination-btn');
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      links.forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
    });
  });
});
