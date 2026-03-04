const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nunjucks = require('nunjucks');

// ========== CONFIG ==========
const SITE_CONFIG = {
  siteName: 'ViettelData',
  siteUrl: 'https://example.com',
  themeColor: '#1F7A5C',
  description: 'Nội Thất Tiện Lợi - Mua dễ – Dùng bền – Giá hợp lý',
};

const PAGE_SEO = {
  home: {
    title: 'Nội Thất Tiện Lợi - Mua dễ – Dùng bền – Giá hợp lý',
    description: 'Cửa hàng chuyên bỏ sỉ võng xếp, giường xếp ghế bố, giường nệm xếp, thang nhôm xếp máy đưa võng em bé giá rẻ tại TPHCM giao hàng tận nơi.',
    keywords: 'cua hang duc loi, vong xep, giuong xep, may dua vong, thang nhom xep, noi dien, ghe bo',
    priority: '1.0',
    changefreq: 'weekly',
  },
  about: {
    title: 'Giới thiệu',
    description: 'Tìm hiểu về ViettelData',
    keywords: 'giới thiệu vietteldata',
    priority: '0.8',
    changefreq: 'monthly',
  },
  contact: {
    title: 'Liên hệ',
    description: 'Liên hệ với ViettelData',
    keywords: 'liên hệ vietteldata',
    priority: '0.8',
    changefreq: 'monthly',
  },
};

// Nunjucks config
const nunjucksEnv = nunjucks.configure(path.join(__dirname, 'src'), {
  autoescape: true,
  noCache: true,
});

// ========== AUTO GENERATE SITEMAP ==========
const pages = ['home', 'about', 'contact'];

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  pages.forEach(name => {
    const seo = PAGE_SEO[name];
    const url = name === 'home' ? '/' : `/${name}/`;
    xml += `
  <url>
    <loc>${SITE_CONFIG.siteUrl}${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${seo.changefreq}</changefreq>
    <priority>${seo.priority}</priority>
  </url>`;
  });
  xml += '\n</urlset>';
  return xml;
}

function generateRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_CONFIG.siteUrl}/sitemap.xml`;
}

// ========== WEBPACK CONFIG ==========
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['css-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api', 'if-function'],
              },
            },
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash:8][ext]',
        },
      },
    ],
  },
  plugins: [
    new HtmlBundlerPlugin({
      entry: {
        index: {
          import: 'src/pages/home/index.njk',
          data: { ...SITE_CONFIG, PAGE_SEO, page: 'home' },
        },
        'about/index': {
          import: 'src/pages/about/index.njk',
          data: { ...SITE_CONFIG, PAGE_SEO, page: 'about' },
        },
        'contact/index': {
          import: 'src/pages/contact/index.njk',
          data: { ...SITE_CONFIG, PAGE_SEO, page: 'contact' },
        },
      },
      js: {
        filename: 'js/[name].[contenthash:8].js',
      },
      css: {
        filename: 'assets/css/[name].[contenthash:8].css',
      },
      preprocessor: 'nunjucks',
      preprocessorOptions: {
        views: ['src'],
      },
      minify: 'auto',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/assets/images', to: 'images', noErrorOnMissing: true },
        { from: 'public', to: '', noErrorOnMissing: true },
      ],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.emit.tapAsync('GenerateSEOFiles', (compilation, callback) => {
          const sitemap = generateSitemap();
          compilation.assets['sitemap.xml'] = {
            source: () => sitemap,
            size: () => sitemap.length,
          };
          const robots = generateRobots();
          compilation.assets['robots.txt'] = {
            source: () => robots,
            size: () => robots.length,
          };
          callback();
        });
      },
    },
  ],
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 3000,
    hot: true,
    open: true,
  },
};
