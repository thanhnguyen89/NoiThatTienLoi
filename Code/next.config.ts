import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  transpilePackages: [
    '@ckeditor/ckeditor5-editor-classic',
    '@ckeditor/ckeditor5-essentials',
    '@ckeditor/ckeditor5-paragraph',
    '@ckeditor/ckeditor5-basic-styles',
    '@ckeditor/ckeditor5-heading',
    '@ckeditor/ckeditor5-font',
    '@ckeditor/ckeditor5-alignment',
    '@ckeditor/ckeditor5-block-quote',
    '@ckeditor/ckeditor5-code-block',
    '@ckeditor/ckeditor5-horizontal-line',
    '@ckeditor/ckeditor5-link',
    '@ckeditor/ckeditor5-image',
    '@ckeditor/ckeditor5-media-embed',
    '@ckeditor/ckeditor5-table',
    '@ckeditor/ckeditor5-list',
    '@ckeditor/ckeditor5-indent',
    '@ckeditor/ckeditor5-highlight',
    '@ckeditor/ckeditor5-remove-format',
    '@ckeditor/ckeditor5-select-all',
    '@ckeditor/ckeditor5-find-and-replace',
    '@ckeditor/ckeditor5-special-characters',
    '@ckeditor/ckeditor5-autoformat',
    '@ckeditor/ckeditor5-word-count',
    '@ckeditor/ckeditor5-show-blocks',
    '@ckeditor/ckeditor5-language',
    '@ckeditor/ckeditor5-clipboard',
    '@ckeditor/ckeditor5-paste-from-office',
    '@ckeditor/ckeditor5-cloud-services',
    '@ckeditor/ckeditor5-fullscreen',
    'ckeditor5',
  ],
};

export default nextConfig;
