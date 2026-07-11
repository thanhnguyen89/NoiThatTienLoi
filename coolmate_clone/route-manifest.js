const AO_NAM_PAGE = require('./src/data/ao-nam.data.js');
const DORAEMON_PRODUCT_PAGE = require('./src/data/doraemon-product.data.js');
const CART_PAGE = require('./src/data/cart-page.data.js');
const { collections: COLLECTION_PAGES, products: COLLECTION_PRODUCTS } = require('./src/data/catalog-pages.data.js');
const INFO_PAGES = require('./src/data/info-pages.data.js');

const SITE_CONFIG = {
  siteName: 'Coolmate',
  siteUrl: 'https://www.coolmate.me',
  themeColor: '#111111',
  description: 'Coolmate - Thoi trang nam nu toi gian, thoai mai va mua sam tien loi.',
};

const PAGE_SEO = {
  home: {
    title: 'Coolmate - Toan Website',
    description: 'Trang chu Coolmate voi san pham moi, do nam, do nu, do the thao, phu kien va uu dai noi bat.',
    keywords: 'coolmate, thoi trang nam, thoi trang nu, ao thun, quan short, do chay bo, pickleball',
    priority: '1.0',
    changefreq: 'weekly',
  },
  'new-products': {
    title: 'San pham moi',
    description: 'San pham moi nhat tai Coolmate: ao thun, polo, do the thao, phu kien va bo suu tap dac biet.',
    keywords: 'san pham moi coolmate, ao nam moi, do the thao moi, coolmate',
    priority: '0.9',
    changefreq: 'weekly',
  },
  about: {
    title: 'Ve Coolmate',
    description: 'Cau chuyen Coolmate, triet ly san pham, dich vu khach hang va cam ket ben vung.',
    keywords: 've coolmate, coolmate 101, care and share, cam ket ben vung',
    priority: '0.8',
    changefreq: 'monthly',
  },
  contact: {
    title: 'Lien he Coolmate',
    description: 'Lien he Coolmate de duoc ho tro don hang, doi tra, tu van size va he thong cua hang.',
    keywords: 'lien he coolmate, hotline coolmate, cua hang coolmate',
    priority: '0.8',
    changefreq: 'monthly',
  },
  category: {
    title: 'Danh muc san pham',
    description: 'Danh muc san pham Coolmate gom do nam, do nu, do the thao, phu kien va san pham ban chay.',
    keywords: 'danh muc coolmate, do nam, do nu, do the thao, phu kien',
    priority: '0.8',
    changefreq: 'weekly',
  },
  'ao-nam': {
    title: 'Ao Nam',
    description: 'Kham pha trang Ao Nam voi danh muc noi bat, bo loc va grid san pham theo phong cach Coolmate.',
    keywords: 'ao nam, ao thun nam, ao polo nam, ao so mi nam, coolmate',
    priority: '0.8',
    changefreq: 'weekly',
  },
  'product-detail': {
    title: 'Chi tiet san pham',
    description: 'Trang chi tiet san pham Coolmate voi hinh anh, size, mau sac, giao hang va uu dai.',
    keywords: 'chi tiet san pham, coolmate',
    priority: '0.8',
    changefreq: 'weekly',
  },
  'doraemon-product': {
    title: 'Ao thun Doraemon Cotton Compact phoi bo',
    description: 'Ao thun Doraemon Cotton Compact phoi bo mau navy phoi xanh, chat cotton compact va form relaxed.',
    keywords: 'ao thun doraemon, cotton compact, phoi bo, coolmate',
    priority: '0.8',
    changefreq: 'weekly',
  },
  news: {
    title: 'CoolBlog',
    description: 'Tin tuc, cam nang phoi do, chat lieu va cau chuyen thuong hieu Coolmate.',
    keywords: 'coolblog, tin tuc coolmate, cam nang thoi trang',
    priority: '0.7',
    changefreq: 'weekly',
  },
  pages: {
    title: 'Tat ca page da lam',
    description: 'Danh sach cac route da duoc build trong source local.',
    keywords: 'page directory, route local, coolmate clone',
    priority: '0.3',
    changefreq: 'weekly',
  },
  cart: {
    title: 'Gio hang',
    description: 'Quan ly gio hang Coolmate, uu dai CoolClub, thanh toan va goi y san pham.',
    keywords: 'gio hang, thanh toan, coolmate',
    priority: '0.6',
    changefreq: 'weekly',
  },
  checkout: {
    title: 'Thanh toan',
    description: 'Hoan tat don hang Coolmate voi thong tin nhan hang, van chuyen va tong ket thanh toan.',
    keywords: 'thanh toan, don hang, coolmate',
    priority: '0.6',
    changefreq: 'weekly',
  },
};

const STATIC_ENTRY_DEFINITIONS = {
  index: {
    import: 'src/pages/home/index.njk',
    page: 'home',
  },
  'new-products/index': {
    import: 'src/pages/new-products/index.njk',
    page: 'new-products',
  },
  'about/index': {
    import: 'src/pages/about/index.njk',
    page: 'about',
  },
  'contact/index': {
    import: 'src/pages/contact/index.njk',
    page: 'contact',
  },
  'category/index': {
    import: 'src/pages/category/index.njk',
    page: 'category',
  },
  'collection/ao-nam/index': {
    import: 'src/pages/collection-ao-nam/index.njk',
    page: 'ao-nam',
    pageData: AO_NAM_PAGE,
  },
  'product/ao-thun-doraemon-cotton-compact-phoi-bo/index': {
    import: 'src/pages/product-doraemon/index.njk',
    page: 'doraemon-product',
    pageData: DORAEMON_PRODUCT_PAGE,
  },
  'product-detail/index': {
    import: 'src/pages/product-detail/index.njk',
    page: 'product-detail',
  },
  'news/index': {
    import: 'src/pages/news/index.njk',
    page: 'news',
  },
  'pages/index': {
    import: 'src/pages/pages/index.njk',
    page: 'pages',
  },
  'cart/index': {
    import: 'src/pages/cart/index.njk',
    page: 'cart',
    pageData: CART_PAGE,
  },
  'checkout/index': {
    import: 'src/pages/checkout/index.njk',
    page: 'checkout',
  },
};

const USED_DATA_FILES = [
  'src/data/ao-nam.data.js',
  'src/data/cart-page.data.js',
  'src/data/catalog-pages.data.js',
  'src/data/doraemon-product.data.js',
  'src/data/info-pages.data.js',
];

const DIRECTORY_GROUPS = {
  core: 'Trang chinh',
  collection: 'Collection da lam',
  product: 'Product da lam',
  info: 'Info va ho tro',
};

function stripSiteOrigin(route) {
  if (!route) {
    return '';
  }

  return String(route).replace(/^https?:\/\/www\.coolmate\.me/i, '');
}

function normalizeRoute(route) {
  const rawRoute = stripSiteOrigin(route).trim();

  if (!rawRoute) {
    return '';
  }

  const withLeadingSlash = rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`;
  const pathname = withLeadingSlash.split('#')[0].split('?')[0];

  if (pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '');
}

function entryNameToRoute(entryName) {
  if (entryName === 'index') {
    return '/';
  }

  return `/${entryName.replace(/\/index$/, '')}/`;
}

function getStaticDirectoryItems() {
  return [
    {
      group: DIRECTORY_GROUPS.core,
      title: 'Trang chu',
      href: '/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO['new-products'].title,
      href: '/new-products/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO.about.title,
      href: '/about/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO.contact.title,
      href: '/contact/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO.category.title,
      href: '/category/',
    },
    {
      group: DIRECTORY_GROUPS.collection,
      title: AO_NAM_PAGE.title,
      href: '/collection/ao-nam/',
    },
    {
      group: DIRECTORY_GROUPS.product,
      title: DORAEMON_PRODUCT_PAGE.name,
      href: '/product/ao-thun-doraemon-cotton-compact-phoi-bo/',
    },
    {
      group: DIRECTORY_GROUPS.product,
      title: PAGE_SEO['product-detail'].title,
      href: '/product-detail/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO.news.title,
      href: '/news/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO.cart.title,
      href: '/cart/',
    },
    {
      group: DIRECTORY_GROUPS.core,
      title: PAGE_SEO.checkout.title,
      href: '/checkout/',
    },
  ];
}

function getCollectionDirectoryItems() {
  return COLLECTION_PAGES
    .filter((collection) => collection.slug !== 'ao-nam')
    .map((collection) => ({
      group: DIRECTORY_GROUPS.collection,
      title: collection.title,
      href: `/collection/${collection.slug}/`,
    }));
}

function getInfoDirectoryItems() {
  return Object.entries(INFO_PAGES).map(([slug, pageData]) => ({
    group: DIRECTORY_GROUPS.info,
    title: pageData.title,
    href: `/${slug}/`,
  }));
}

function getPageDirectory() {
  const groupedItems = {};

  [
    ...getStaticDirectoryItems(),
    ...getCollectionDirectoryItems(),
    ...getInfoDirectoryItems(),
  ].forEach((item) => {
    if (!groupedItems[item.group]) {
      groupedItems[item.group] = [];
    }

    groupedItems[item.group].push(item);
  });

  return Object.values(DIRECTORY_GROUPS).map((groupTitle) => ({
    title: groupTitle,
    items: (groupedItems[groupTitle] || []).sort((left, right) => left.title.localeCompare(right.title, 'vi')),
  }));
}

const PAGE_DIRECTORY = getPageDirectory();
const PAGE_DIRECTORY_TOTAL = PAGE_DIRECTORY.reduce((count, group) => count + group.items.length, 0);

function buildStaticEntries() {
  return Object.fromEntries(
    Object.entries(STATIC_ENTRY_DEFINITIONS).map(([entryName, definition]) => {
      const data = {
        ...SITE_CONFIG,
        PAGE_SEO,
        pageDirectory: PAGE_DIRECTORY,
        pageDirectoryTotal: PAGE_DIRECTORY_TOTAL,
        page: definition.page,
      };

      if (definition.pageData) {
        data.pageData = definition.pageData;
      }

      return [
        entryName,
        {
          import: definition.import,
          data,
        },
      ];
    }),
  );
}

function buildCollectionEntries() {
  const entries = {};
  const staticEntryNames = new Set(Object.keys(STATIC_ENTRY_DEFINITIONS));

  COLLECTION_PAGES.forEach((collection) => {
    if (!collection || !collection.slug) {
      return;
    }

    const entryName = `collection/${collection.slug}/index`;
    if (staticEntryNames.has(entryName)) {
      return;
    }

    entries[entryName] = {
      import: 'src/pages/collection-generic/index.njk',
      data: {
        ...SITE_CONFIG,
        PAGE_SEO,
        page: `collection:${collection.slug}`,
        pageData: collection,
        products: COLLECTION_PRODUCTS,
      },
    };
  });

  return entries;
}

function buildInfoEntries() {
  const entries = {};
  const staticEntryNames = new Set(Object.keys(STATIC_ENTRY_DEFINITIONS));

  Object.entries(INFO_PAGES).forEach(([slug, pageData]) => {
    const entryName = `${slug}/index`;
    if (staticEntryNames.has(entryName)) {
      return;
    }

    entries[entryName] = {
      import: 'src/pages/info/index.njk',
      data: {
        ...SITE_CONFIG,
        PAGE_SEO,
        page: `info:${slug}`,
        pageData,
      },
    };
  });

  return entries;
}

function buildEntries() {
  return {
    ...buildStaticEntries(),
    ...buildCollectionEntries(),
    ...buildInfoEntries(),
  };
}

function getGeneratedRoutes() {
  return Object.keys(buildEntries()).map(entryNameToRoute);
}

function getSitemapRoutes() {
  const routes = [];

  Object.entries(STATIC_ENTRY_DEFINITIONS).forEach(([entryName, definition]) => {
    const seo = PAGE_SEO[definition.page];
    routes.push({
      route: entryNameToRoute(entryName),
      changefreq: seo.changefreq,
      priority: seo.priority,
    });
  });

  COLLECTION_PAGES.forEach((collection) => {
    const entryName = `collection/${collection.slug}/index`;
    if (STATIC_ENTRY_DEFINITIONS[entryName]) {
      return;
    }

    routes.push({
      route: entryNameToRoute(entryName),
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  Object.keys(INFO_PAGES).forEach((slug) => {
    const entryName = `${slug}/index`;
    if (STATIC_ENTRY_DEFINITIONS[entryName]) {
      return;
    }

    routes.push({
      route: entryNameToRoute(entryName),
      changefreq: 'monthly',
      priority: '0.7',
    });
  });

  return routes;
}

module.exports = {
  COLLECTION_PAGES,
  COLLECTION_PRODUCTS,
  INFO_PAGES,
  PAGE_DIRECTORY,
  PAGE_DIRECTORY_TOTAL,
  PAGE_SEO,
  SITE_CONFIG,
  USED_DATA_FILES,
  buildEntries,
  getPageDirectory,
  getGeneratedRoutes,
  getSitemapRoutes,
  normalizeRoute,
};
