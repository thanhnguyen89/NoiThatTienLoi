// Category page entry

document.addEventListener('DOMContentLoaded', () => {
  initCatBannerSlider();
});

function initCatBannerSlider() {
  const track = document.querySelector('.cat-banner-track');
  const prevBtn = document.querySelector('.cat-banner-prev');
  const nextBtn = document.querySelector('.cat-banner-next');
  const dotsContainer = document.querySelector('.cat-banner-dots');

  if (!track || !prevBtn || !nextBtn) return;

  const slides = track.querySelectorAll('.cat-banner-slide');
  const total = slides.length;
  let current = 0;
  let autoTimer;

  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Slide ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(index) {
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 4000);
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Auto play
  resetAuto();
}