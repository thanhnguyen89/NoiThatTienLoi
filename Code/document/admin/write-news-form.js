const fs = require('fs');
const p = 'Code/src/admin/features/news-category/NewsCategoryForm.tsx';
const c = require('fs').readFileSync('Code/write-news-form-content.txt', 'utf8');
fs.writeFileSync(p, c, 'utf8');
console.log('Done, bytes:', c.length);
