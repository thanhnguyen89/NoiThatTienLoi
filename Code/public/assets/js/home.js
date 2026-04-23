// Home page JavaScript
// Chạy sau khi DOM loaded

document.addEventListener('DOMContentLoaded', () => {
  // Init Footer Accordion (mobile)
  initFooterAccordion();

  // Init Mobile Category Drawer
  initMobileCategoryDrawer();
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
  if (overlay) overlay.addEventListener('click', closeDrawer);

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