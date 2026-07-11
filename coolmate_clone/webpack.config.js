const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {
  SITE_CONFIG,
  buildEntries,
  getSitemapRoutes,
} = require('./route-manifest');

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const routes = getSitemapRoutes();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  routes.forEach(({ route, changefreq, priority }) => {
    xml += `
  <url>
    <loc>${SITE_CONFIG.siteUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
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

module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '/',
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
        test: /\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash:8][ext]',
        },
      },
    ],
  },
  plugins: [
    new HtmlBundlerPlugin({
      entry: buildEntries(),
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
    port: 8080,
    hot: true,
    open: true,
  },
};
