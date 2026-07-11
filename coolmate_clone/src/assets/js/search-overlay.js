const SEARCH_RECENT_KEY = 'coolmateRecentSearchProductsV2';
const SEARCH_MAX_RECENT = 3;

const SEARCH_DEFAULT_RECENTS = [
  {
    title: 'Túi trống Tập Gym',
    href: 'https://www.coolmate.me/product/tui-trong-gym?color=den',
    image: 'https://n7media.coolmate.me/uploads/October2023/tui_trong_gym-1.jpg',
    keywords: ['tui gym', 'tui trong', 'phu kien'],
  },
  {
    title: 'Áo thun Doraemon Cotton Compact phối bo',
    href: 'https://www.coolmate.me/product/ao-thun-doraemon-cotton-compact-phoi-bo',
    image: 'https://www.coolmate.me/image/2026/05/19/ao-thun-doraemon-su-gia-tuoi-tho-cotton-compact-phoi-bo_4.jpg',
    keywords: ['ao thun', 'doraemon', 'phoi bo'],
  },
  {
    title: 'Áo Polo World Cup Đội Tuyển Anh',
    href: 'https://www.coolmate.me/product/ao-polo-world-cup-doi-tuyen-anh?color=trang',
    image: 'https://n7media.coolmate.me/uploads/2026/03/31/ao-polo-wc-anh-1-trang_74.jpg',
    keywords: ['ao polo', 'world cup', 'doi tuyen anh'],
  },
];

const SEARCH_CATALOG = [
  ...SEARCH_DEFAULT_RECENTS,
  {
    title: 'Ao thun nam Pickleball Dinkshot Essentials',
    href: '/product/ao-thun-nam-pickleball-dinkshot-essentials?color=xam',
    image: '/images/ao-thun-nam-pickleball-dinkshot-4-xam_49.webp',
    keywords: ['ao thun', 'pickleball', 'nam'],
  },
  {
    title: 'Quan shorts nu CBO Pace Short 3',
    href: '/collection/quan-short-nu',
    image: '/images/quan-short-nu-cbo-pace-short-3.webp',
    keywords: ['quan shorts', 'nu', 'the thao'],
  },
  {
    title: 'T-shirt chay bo nu Graphic Sky',
    href: '/collection/do-chay-bo-coolmate?gender_type=female',
    image: '/images/t-shirt-chay-bo-nu-graphic-sky-4-cam-dao_99.webp',
    keywords: ['ao thun', 'chay bo', 'nu'],
  },
  {
    title: 'Ao thun chay bo Airflow Gradient',
    href: '/collection/do-chay-bo-coolmate',
    image: '/images/danhmuc/ao-thun-chay-bo-airflow-gradient-286-cam.webp',
    keywords: ['ao thun', 'chay bo', 'running'],
  },
  {
    title: 'Quan dai nam Coolmate',
    href: '/collection/quan-dai-nam',
    image: '/images/Cool_MAT_quan-dai.webp',
    keywords: ['quan dai', 'nam', 'everyday'],
  },
  {
    title: 'Ao polo Coolmate',
    href: '/collection/ao-polo-nam',
    image: '/images/Cool_MAT_polo.webp',
    keywords: ['ao polo', 'nam', 'coolmate'],
  },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readRecentItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeRecentItems(items) {
  try {
    localStorage.setItem(SEARCH_RECENT_KEY, JSON.stringify(items.slice(0, SEARCH_MAX_RECENT)));
  } catch (error) {
    // Ignore storage failures to keep the overlay functional.
  }
}

function buildCatalogFromDom() {
  const productLinks = Array.from(document.querySelectorAll('a[href*="/product/"]'));
  const domItems = productLinks.map((link) => {
    const image = link.querySelector('img');
    const titleNode = link.querySelector('h3, strong');
    const title = titleNode?.textContent?.trim() || image?.getAttribute('alt') || link.getAttribute('aria-label') || '';
    const href = link.getAttribute('href') || '';
    const imageSrc = image?.getAttribute('src') || image?.currentSrc || '';

    if (!title || !href || !imageSrc) {
      return null;
    }

    return {
      title,
      href,
      image: imageSrc,
      keywords: [],
    };
  }).filter(Boolean);

  const itemsByHref = new Map();

  [...SEARCH_CATALOG, ...domItems].forEach((item) => {
    const href = item.href || '';
    if (!href || itemsByHref.has(href)) {
      return;
    }

    itemsByHref.set(href, {
      ...item,
      searchIndex: normalizeText([item.title, ...(item.keywords || [])].join(' ')),
    });
  });

  return Array.from(itemsByHref.values());
}

function createCardMarkup(item, className) {
  return `
    <a class="${className}" href="${escapeHtml(item.href)}" data-search-product>
      <span class="${className}__media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">
      </span>
      <span class="${className}__title">${escapeHtml(item.title)}</span>
    </a>
  `;
}

function extractLinkPayload(link, catalog) {
  const href = link.getAttribute('href') || '';
  if (!href.includes('/product/')) {
    return null;
  }

  const image = link.querySelector('img');
  const titleNode = link.querySelector('h3, strong');
  const title = titleNode?.textContent?.trim() || image?.getAttribute('alt') || link.getAttribute('aria-label') || '';
  const imageSrc = image?.getAttribute('src') || image?.currentSrc || '';
  const fallback = catalog.find((item) => item.href === href);

  if (!title && !fallback) {
    return null;
  }

  return {
    title: title || fallback.title,
    href,
    image: imageSrc || fallback.image,
  };
}

export function initSearchOverlay() {
  const overlay = document.querySelector('.search-overlay');
  const openButton = document.querySelector('.search-btn');
  const closeButton = overlay?.querySelector('.search-close');
  const searchForm = overlay?.querySelector('.search-bar');
  const searchInput = overlay?.querySelector('.search-input');
  const defaultState = overlay?.querySelector('[data-search-default]');
  const resultsState = overlay?.querySelector('[data-search-results]');
  const recentGrid = overlay?.querySelector('[data-search-recent]');
  const resultsGrid = overlay?.querySelector('[data-search-grid]');
  const resultsCount = overlay?.querySelector('[data-search-count]');
  const emptyState = overlay?.querySelector('[data-search-empty]');
  const keywordButtons = Array.from(overlay?.querySelectorAll('[data-search-keyword]') || []);

  if (!overlay || !openButton || !closeButton || !searchInput || !defaultState || !resultsState || !recentGrid || !resultsGrid || !resultsCount || !emptyState) {
    return;
  }

  if (overlay.dataset.ready === 'true') {
    return;
  }

  overlay.dataset.ready = 'true';

  const catalog = buildCatalogFromDom();

  function renderRecentItems() {
    const recentItems = readRecentItems();
    const items = (recentItems.length ? recentItems : SEARCH_DEFAULT_RECENTS).slice(0, SEARCH_MAX_RECENT);
    recentGrid.innerHTML = items.map((item) => createCardMarkup(item, 'search-recent-card')).join('');
  }

  function setOverlayState(query) {
    const normalizedQuery = normalizeText(query);
    const hasQuery = normalizedQuery.length > 0;

    defaultState.hidden = hasQuery;
    resultsState.hidden = !hasQuery;

    if (!hasQuery) {
      resultsGrid.innerHTML = '';
      emptyState.hidden = true;
      resultsCount.textContent = '';
      return;
    }

    const matches = catalog
      .filter((item) => item.searchIndex.includes(normalizedQuery))
      .slice(0, 6);

    resultsGrid.innerHTML = matches.map((item) => createCardMarkup(item, 'search-result-card')).join('');
    emptyState.hidden = matches.length > 0;
    resultsCount.textContent = `${matches.length} san pham`;
  }

  function openOverlay() {
    renderRecentItems();
    searchInput.value = '';
    setOverlayState('');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('search-is-open');
    window.requestAnimationFrame(() => searchInput.focus());
  }

  function closeOverlay() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-is-open');
  }

  function saveRecentItem(item) {
    if (!item?.href || !item?.title || !item?.image) {
      return;
    }

    const nextItems = [
      item,
      ...readRecentItems().filter((entry) => entry.href !== item.href),
    ];

    writeRecentItems(nextItems);
  }

  openButton.addEventListener('click', openOverlay);
  closeButton.addEventListener('click', closeOverlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstResult = resultsGrid.querySelector('a[href]');
    if (firstResult) {
      window.location.assign(firstResult.getAttribute('href'));
    }
  });

  searchInput.addEventListener('input', () => {
    setOverlayState(searchInput.value);
  });

  keywordButtons.forEach((button) => {
    button.addEventListener('click', () => {
      searchInput.value = button.dataset.searchKeyword || '';
      setOverlayState(searchInput.value);
      searchInput.focus();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeOverlay();
    }
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) {
      return;
    }

    const payload = extractLinkPayload(link, catalog);
    if (payload) {
      saveRecentItem(payload);
    }
  });

  renderRecentItems();
}
