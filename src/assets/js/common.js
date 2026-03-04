// Common JavaScript
document.addEventListener('DOMContentLoaded', () => {
  console.log('Website loaded!');
  
  // Mobile menu toggle (nếu cần)
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('active');
    });
  }

  // Submenu hover - add hovermenu class
  const subItems = document.querySelectorAll('.sub_item_menu');
  subItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.classList.add('hovermenu');
    });
    item.addEventListener('mouseleave', () => {
      item.classList.remove('hovermenu');
    });
  });

  // Flash Sale Slider
  initFlashSaleSlider();
  
  // Flash Sale Timer
  initFlashSaleTimer();
});

// Flash Sale Product Slider
function initFlashSaleSlider() {
  const slider = document.querySelector('.flash-sale-slider');
  if (!slider) return;

  const track = slider.querySelector('.slider-track');
  const cards = track.querySelectorAll('.product-card');
  const prevBtn = slider.querySelector('.slider-prev');
  const nextBtn = slider.querySelector('.slider-next');
  
  if (!track || cards.length === 0) return;

  let currentPosition = 0;
  const cardWidth = 235; // card width (220px) + gap (15px)
  const visibleCards = Math.floor(slider.querySelector('.slider-viewport').offsetWidth / cardWidth);
  const maxPosition = Math.max(0, (cards.length - visibleCards) * cardWidth);

  function updateSlider() {
    track.style.transform = `translateX(-${currentPosition}px)`;
    prevBtn.disabled = currentPosition <= 0;
    nextBtn.disabled = currentPosition >= maxPosition;
  }

  prevBtn.addEventListener('click', () => {
    currentPosition = Math.max(0, currentPosition - cardWidth * 2);
    updateSlider();
  });

  nextBtn.addEventListener('click', () => {
    currentPosition = Math.min(maxPosition, currentPosition + cardWidth * 2);
    updateSlider();
  });

  // Touch/Swipe support
  let startX = 0;
  let isDragging = false;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });

  track.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        currentPosition = Math.min(maxPosition, currentPosition + cardWidth);
      } else {
        currentPosition = Math.max(0, currentPosition - cardWidth);
      }
      updateSlider();
      isDragging = false;
    }
  });

  track.addEventListener('touchend', () => {
    isDragging = false;
  });

  updateSlider();
}

// Flash Sale Countdown Timer
function initFlashSaleTimer() {
  const timerEl = document.querySelector('.flash-sale-timer');
  if (!timerEl) return;

  const hourEl = timerEl.querySelector('.hour');
  const minuteEl = timerEl.querySelector('.minute');
  const secondEl = timerEl.querySelector('.second');
  
  if (!hourEl || !minuteEl || !secondEl) return;

  // Set end time (2 hours from now for demo)
  let totalSeconds = 2 * 60 * 60;

  function updateTimer() {
    if (totalSeconds <= 0) {
      hourEl.textContent = '00';
      minuteEl.textContent = '00';
      secondEl.textContent = '00';
      return;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    hourEl.textContent = String(hours).padStart(2, '0');
    minuteEl.textContent = String(minutes).padStart(2, '0');
    secondEl.textContent = String(seconds).padStart(2, '0');

    totalSeconds--;
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}
