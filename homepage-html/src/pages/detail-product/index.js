// Home page entry

// Search filter functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchPackage');
  const table = document.getElementById('packageTable');
  
  if (searchInput && table) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  // Init Simple Slider (vanilla JS)
  initSlider();
  
  // Init Category Slider
  initCategorySlider();
  
  // Init Best Sellers Slider
  initBestSellersSlider();
});

function initSlider() {
  const slider = document.querySelector('.flexslider');
  if (!slider) return;

  const slides = slider.querySelectorAll('.slides > li');
  const dotsContainer = document.createElement('ol');
  dotsContainer.className = 'flex-control-nav';
  
  let currentIndex = 0;
  const totalSlides = slides.length;

  // Create dots
  slides.forEach((_, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('a');
    dot.href = '#';
    dot.textContent = i + 1;
    if (i === 0) dot.classList.add('flex-active');
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      goToSlide(i);
    });
    li.appendChild(dot);
    dotsContainer.appendChild(li);
  });
  slider.appendChild(dotsContainer);

  // Create arrows
  const navContainer = document.createElement('ul');
  navContainer.className = 'flex-direction-nav';
  navContainer.innerHTML = `
    <li class="flex-nav-prev"><a class="flex-prev" href="#">Previous</a></li>
    <li class="flex-nav-next"><a class="flex-next" href="#">Next</a></li>
  `;
  slider.appendChild(navContainer);

  navContainer.querySelector('.flex-prev').addEventListener('click', (e) => {
    e.preventDefault();
    goToSlide(currentIndex - 1);
  });
  navContainer.querySelector('.flex-next').addEventListener('click', (e) => {
    e.preventDefault();
    goToSlide(currentIndex + 1);
  });

  // Show/hide slides
  function goToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    
    slides.forEach((slide, i) => {
      slide.style.display = i === index ? 'block' : 'none';
    });
    
    dotsContainer.querySelectorAll('a').forEach((dot, i) => {
      dot.classList.toggle('flex-active', i === index);
    });
    
    currentIndex = index;
  }

  // Init first slide
  goToSlide(0);

  // Auto slideshow
  setInterval(() => {
    goToSlide(currentIndex + 1);
  }, 4000);
}

// Category Slider
function initCategorySlider() {
  const track = document.querySelector('.category-track');
  const prevBtn = document.querySelector('.cat-prev');
  const nextBtn = document.querySelector('.cat-next');
  
  if (!track || !prevBtn || !nextBtn) return;
  
  const items = track.querySelectorAll('.category-item');
  const itemWidth = 115; // item width + gap
  const visibleItems = Math.floor(track.parentElement.offsetWidth / itemWidth);
  const maxScroll = (items.length - visibleItems) * itemWidth;
  
  let currentScroll = 0;
  
  function updateSlider() {
    track.style.transform = `translateX(-${currentScroll}px)`;
  }
  
  prevBtn.addEventListener('click', () => {
    currentScroll = Math.max(0, currentScroll - itemWidth * 2);
    updateSlider();
  });
  
  nextBtn.addEventListener('click', () => {
    currentScroll = Math.min(maxScroll, currentScroll + itemWidth * 2);
    updateSlider();
  });
}

// Best Sellers Slider
function initBestSellersSlider() {
  const track = document.querySelector('.bs-slider-track');
  const prevBtn = document.querySelector('.bs-slider-prev');
  const nextBtn = document.querySelector('.bs-slider-next');
  
  if (!track || !prevBtn || !nextBtn) return;
  
  const items = track.querySelectorAll('.bs-product-card');
  const itemWidth = 212; // item width + gap
  const viewport = track.parentElement;
  const visibleItems = Math.floor(viewport.offsetWidth / itemWidth);
  const maxScroll = Math.max(0, (items.length - visibleItems) * itemWidth);
  
  let currentScroll = 0;
  
  function updateSlider() {
    track.style.transform = `translateX(-${currentScroll}px)`;
  }
  
  prevBtn.addEventListener('click', () => {
    currentScroll = Math.max(0, currentScroll - itemWidth * 2);
    updateSlider();
  });
  
  nextBtn.addEventListener('click', () => {
    currentScroll = Math.min(maxScroll, currentScroll + itemWidth * 2);
    updateSlider();
  });
}
