import '../../assets/js/common.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-contact-status]');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (status) {
      status.textContent = 'Cam on ban. Yeu cau da duoc ghi nhan.';
      status.style.marginTop = '12px';
      status.style.color = '#1F7A5C';
    }

    form.reset();
  });
});
