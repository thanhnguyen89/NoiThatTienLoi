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
