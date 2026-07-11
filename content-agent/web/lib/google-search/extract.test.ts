import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTextFromHtml } from './extract';

test('extractTextFromHtml strips noisy tags and collapses whitespace', () => {
  const html = `
    <html>
      <head>
        <style>.x{color:red;}</style>
        <script>console.log('ignore')</script>
      </head>
      <body>
        <header>Header</header>
        <nav>Menu</nav>
        <main>
          <h1>Giường sắt 1m2</h1>
          <p>Khung 1.4mm, tải 180kg.</p>
        </main>
        <footer>Footer</footer>
      </body>
    </html>
  `;

  const text = extractTextFromHtml(html);
  assert.equal(text.includes('Header'), false);
  assert.equal(text.includes('Menu'), false);
  assert.equal(text.includes('Footer'), false);
  assert.equal(text.includes('Giường sắt 1m2'), true);
  assert.equal(text.includes('Khung 1.4mm, tải 180kg.'), true);
});
