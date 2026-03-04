// Contact page entry
import '../../assets/js/common.js';

console.log('Contact page loaded');

// Contact form handler
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.');
      form.reset();
    });
  }
});
