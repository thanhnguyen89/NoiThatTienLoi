document.addEventListener('DOMContentLoaded', () => {
  initFooterAccordion();
  initMobileCategoryDrawer();
  initModalLogin();
});

function initFooterAccordion() {
  if (window.innerWidth > 768) return;
  document.querySelectorAll('.footer__col:not(:first-child)').forEach(col => {
    const title = col.querySelector('.f-listtel__title');
    if (title) title.addEventListener('click', () => col.classList.toggle('is-open'));
  });
}

function initMobileCategoryDrawer() {
  const overlay = document.getElementById('mobileCatOverlay');
  const drawer = document.getElementById('mobileCatDrawer');
  const closeBtn = document.getElementById('mobileCatClose');
  const catNavLink = document.querySelector('.mobile-bottom-nav-item:nth-child(2) .mobile-bottom-nav-link');
  if (!overlay || !drawer) return;
  const open = () => { overlay.classList.add('is-open'); drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('is-open'); drawer.classList.remove('is-open'); document.body.style.overflow = ''; };
  if (catNavLink) catNavLink.addEventListener('click', e => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.querySelectorAll('.mobile-cat-left-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.mobile-cat-left-item').forEach(i => i.classList.remove('is-active'));
      item.classList.add('is-active');
      document.querySelectorAll('.mobile-cat-panel').forEach(p => p.classList.remove('is-active'));
      const panel = document.getElementById(item.dataset.panel);
      if (panel) panel.classList.add('is-active');
    });
  });
}

function initModalLogin() {
  const loginOverlay = document.getElementById('modalLoginOverlay');
  if (!loginOverlay) return;
  const registerOverlay = document.getElementById('modalRegisterOverlay');
  const forgotOverlay = document.getElementById('modalForgotOverlay');
  const closeAll = () => {
    [loginOverlay, registerOverlay, forgotOverlay].forEach(o => o && o.classList.remove('is-open'));
    document.body.style.overflow = '';
  };
  const openLogin = () => { closeAll(); loginOverlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const openRegister = () => { closeAll(); registerOverlay && registerOverlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const openForgot = () => { closeAll(); forgotOverlay && forgotOverlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };

  document.querySelectorAll('.mobile-bottom-nav-link[href="/account"]').forEach(l => l.addEventListener('click', e => { e.preventDefault(); openLogin(); }));
  const checkoutLoginLink = document.getElementById('checkoutLoginLink');
  if (checkoutLoginLink) checkoutLoginLink.addEventListener('click', e => { e.preventDefault(); openLogin(); });
  ['modalLoginClose','modalLoginBack'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', closeAll); });
  ['modalRegisterClose'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', closeAll); });
  const regBack = document.getElementById('modalRegisterBack'); if (regBack) regBack.addEventListener('click', openLogin);
  const forgotClose = document.getElementById('modalForgotClose'); if (forgotClose) forgotClose.addEventListener('click', closeAll);
  const forgotBack = document.getElementById('modalForgotBack'); if (forgotBack) forgotBack.addEventListener('click', openLogin);
  [loginOverlay, registerOverlay, forgotOverlay].forEach(o => { if (o) o.addEventListener('click', e => { if (e.target === o) closeAll(); }); });
  const toReg = loginOverlay.querySelector('.modal-login__register a'); if (toReg) toReg.addEventListener('click', e => { e.preventDefault(); openRegister(); });
  const toLogin = document.getElementById('switchToLogin'); if (toLogin) toLogin.addEventListener('click', e => { e.preventDefault(); openLogin(); });
  const forgotLink = loginOverlay.querySelector('.modal-login__forgot'); if (forgotLink) forgotLink.addEventListener('click', e => { e.preventDefault(); openForgot(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
}
