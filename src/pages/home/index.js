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

  // Init Footer Accordion (mobile)
  initFooterAccordion();

  // Init Mobile Category Drawer
  initMobileCategoryDrawer();

  // Init Modal Login
  initModalLogin();
});

// Footer accordion on mobile
function initFooterAccordion() {
  if (window.innerWidth > 768) return;

  const cols = document.querySelectorAll('.footer__col:not(:first-child)');
  cols.forEach(col => {
    const title = col.querySelector('.f-listtel__title');
    if (!title) return;
    title.addEventListener('click', () => {
      col.classList.toggle('is-open');
    });
  });
}

// Mobile Category Drawer
function initMobileCategoryDrawer() {
  const overlay = document.getElementById('mobileCatOverlay');
  const drawer = document.getElementById('mobileCatDrawer');
  const closeBtn = document.getElementById('mobileCatClose');
  const catNavLink = document.querySelector('.mobile-bottom-nav-item:nth-child(2) .mobile-bottom-nav-link');

  if (!overlay || !drawer) return;

  function openDrawer() {
    overlay.classList.add('is-open');
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (catNavLink) {
    catNavLink.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Left panel switching
  const leftItems = document.querySelectorAll('.mobile-cat-left-item');
  leftItems.forEach(item => {
    item.addEventListener('click', () => {
      const panelId = item.dataset.panel;

      leftItems.forEach(i => i.classList.remove('is-active'));
      item.classList.add('is-active');

      document.querySelectorAll('.mobile-cat-panel').forEach(p => p.classList.remove('is-active'));
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('is-active');
    });
  });
}

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

// Modal Login
function initModalLogin() {
  const loginModalEl = document.getElementById('modalLogin');
  const registerModalEl = document.getElementById('modalRegister');
  const forgotModalEl = document.getElementById('modalForgot');
  const loginLinks = document.querySelectorAll('a[href="/lich-su-mua-hang"].name-order, .mobile-bottom-nav-link[href="/account"]');

  if (!loginModalEl) return;

  const loginModal = bootstrap.Modal.getOrCreateInstance(loginModalEl);
  const registerModal = bootstrap.Modal.getOrCreateInstance(registerModalEl);
  const forgotModal = bootstrap.Modal.getOrCreateInstance(forgotModalEl);

  // Trigger mở login
  loginLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal && loginModal.show();
    });
  });

  // Switch: login → register (Bootstrap event-driven)
  loginModalEl.addEventListener('click', (e) => {
    const toRegister = e.target.closest('[data-bs-target="#modalRegister"]');
    if (toRegister && registerModal) {
      e.preventDefault();
      loginModal.hide();
      setTimeout(() => registerModal.show(), 150);
    }
  });

  // Switch: register → login
  if (registerModalEl) {
    registerModalEl.addEventListener('click', (e) => {
      const toLogin = e.target.closest('#switchToLogin, [data-bs-target="#modalLogin"]');
      if (toLogin && loginModal) {
        e.preventDefault();
        registerModal.hide();
        setTimeout(() => loginModal.show(), 150);
      }
    });
  }

  // Switch: login → forgot
  loginModalEl.addEventListener('click', (e) => {
    const forgotLink = e.target.closest('[data-bs-target="#modalForgot"]');
    if (forgotLink && forgotModal) {
      e.preventDefault();
      loginModal.hide();
      setTimeout(() => forgotModal.show(), 150);
    }
  });

  // Forgot → login
  if (forgotModalEl) {
    forgotModalEl.addEventListener('click', (e) => {
      const backLink = e.target.closest('[data-bs-target="#modalLogin"]');
      if (backLink && loginModal) {
        e.preventDefault();
        forgotModal.hide();
        setTimeout(() => loginModal.show(), 150);
      }
    });
  }
}
