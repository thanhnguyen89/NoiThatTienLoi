// Product Detail Page JavaScript

// Image Gallery
document.addEventListener('DOMContentLoaded', function() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.getElementById('mainImage');
  const currentImageSpan = document.getElementById('currentImage');
  const totalImagesSpan = document.getElementById('totalImages');
  const prevBtn = document.getElementById('prevImage');
  const nextBtn = document.getElementById('nextImage');
  const thumbPrevBtn = document.getElementById('thumbPrev');
  const thumbNextBtn = document.getElementById('thumbNext');
  const thumbnailContainer = document.querySelector('.thumbnail-container');
  
  let currentIndex = 0;
  const totalImages = thumbnails.length;
  
  // Update total images count
  if (totalImagesSpan) {
    totalImagesSpan.textContent = totalImages;
  }
  
  // Function to update image
  function updateImage(index) {
    if (index < 0 || index >= totalImages) return;
    
    currentIndex = index;
    
    if (currentImageSpan) {
      currentImageSpan.textContent = index + 1;
    }
    
    // Update active thumbnail
    thumbnails.forEach(t => t.classList.remove('active'));
    thumbnails[index].classList.add('active');
    
    // Update main image
    const imgSrc = thumbnails[index].querySelector('img').src;
    if (mainImage) {
      mainImage.src = imgSrc;
    }
    
    // Update navigation buttons
    if (prevBtn) {
      if (index === 0) {
        prevBtn.classList.add('disabled');
      } else {
        prevBtn.classList.remove('disabled');
      }
    }
    
    if (nextBtn) {
      if (index === totalImages - 1) {
        nextBtn.classList.add('disabled');
      } else {
        nextBtn.classList.remove('disabled');
      }
    }
    
    // Scroll thumbnail into view
    if (thumbnailContainer) {
      thumbnails[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
  
  // Thumbnail click
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Thumbnail clicked:', index);
      updateImage(index);
    });
  });
  
  // Previous image
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Prev clicked, current:', currentIndex);
      if (currentIndex > 0) {
        updateImage(currentIndex - 1);
      }
    });
  }
  
  // Next image
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Next clicked, current:', currentIndex);
      if (currentIndex < totalImages - 1) {
        updateImage(currentIndex + 1);
      }
    });
  }
  
  // Thumbnail navigation
  if (thumbPrevBtn && thumbnailContainer) {
    thumbPrevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Thumb prev clicked');
      thumbnailContainer.scrollBy({ left: -150, behavior: 'smooth' });
    });
  }
  
  if (thumbNextBtn && thumbnailContainer) {
    thumbNextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Thumb next clicked');
      thumbnailContainer.scrollBy({ left: 150, behavior: 'smooth' });
    });
  }

  // Quantity selector
  const minusBtn = document.querySelector('.qty-btn.minus');
  const plusBtn = document.querySelector('.qty-btn.plus');
  const qtyInput = document.querySelector('.qty-input');

  if (minusBtn && qtyInput) {
    minusBtn.addEventListener('click', () => {
      const currentValue = parseInt(qtyInput.value);
      if (currentValue > 1) {
        qtyInput.value = currentValue - 1;
      }
    });
  }

  if (plusBtn && qtyInput) {
    plusBtn.addEventListener('click', () => {
      const currentValue = parseInt(qtyInput.value);
      qtyInput.value = currentValue + 1;
    });
  }

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      const targetTab = document.getElementById(tabId);
      if (targetTab) {
        targetTab.classList.add('active');
      }
    });
  });

  // Variant buttons
  const variantBtns = document.querySelectorAll('.variant-btn');
  
  variantBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const group = this.closest('.variant-options');
      if (group) {
        group.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // Color buttons
  const colorBtns = document.querySelectorAll('.color-btn');
  
  colorBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      colorBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Product Detail Navigation - Smooth Scroll & Active State
  const navTabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.product-detail-section-card');
  const navWrapper = document.querySelector('.product-detail-nav-wrapper');
  
  // Track initial position of nav
  let navInitialTop = 0;
  
  if (navWrapper) {
    navInitialTop = navWrapper.offsetTop;
  }
  
  // Smooth scroll when clicking nav tabs
  navTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('data-section');
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        // Calculate offset for sticky nav
        const navHeight = navWrapper ? navWrapper.offsetHeight : 0;
        const targetPosition = targetSection.offsetTop - navHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Update active state
        navTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });
  
  // Update active tab on scroll and handle sticky nav appearance
  let isScrolling = false;
  
  window.addEventListener('scroll', function() {
    if (isScrolling) return;
    
    isScrolling = true;
    
    setTimeout(() => {
      // Handle sticky nav appearance
      if (navWrapper) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        if (scrollTop > navInitialTop) {
          navWrapper.classList.add('scrolled');
        } else {
          navWrapper.classList.remove('scrolled');
        }
      }
      
      // Update active tab based on scroll position
      const navHeight = navWrapper ? navWrapper.offsetHeight : 0;
      const scrollPosition = window.scrollY + navHeight + 100;
      
      let currentSection = '';
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          currentSection = section.getAttribute('id');
        }
      });
      
      if (currentSection) {
        navTabs.forEach(tab => {
          tab.classList.remove('active');
          if (tab.getAttribute('data-section') === currentSection) {
            tab.classList.add('active');
          }
        });
      }
      
      isScrolling = false;
    }, 100);
  });
  initSuggestionsYouSlider();
});
// Best Sellers Slider
function initSuggestionsYouSlider() {
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