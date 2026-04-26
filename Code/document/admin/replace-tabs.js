const fs = require('fs');

const source = fs.readFileSync('src/admin/features/news-category/NewsCategoryForm.tsx', 'utf8');
const target = fs.readFileSync('src/admin/features/category/CategoryForm.tsx', 'utf8');

// Extract tabs from source
const lines = source.split('\n');
const fbTab = lines.slice(821, 1240).join('\n');
const ttTab = lines.slice(1248, 1640).join('\n');
const ytTab = lines.slice(1641, 1900).join('\n');

// Replace in target
let result = target;

// Replace Facebook
const oldFb = `          {/* === FACEBOOK === */}
          {activeTab === 'seo-fb' && (
            <PlatformSeoCard
              platform="FACEBOOK"
              platformLabel="Facebook"
              badgeLabel="FACEBOOK"
              seo={fbSeo}
              onSeoChange={setFbSeo}
              images={fbImages}
              platformLabel2="Facebook"
              uploadDesc="Cho phép tải lên nhiều ảnh post Facebook theo từng danh mục."
              onImagesChange={setFbImages}
            />
          )}`;
result = result.replace(oldFb, fbTab);

// Replace TikTok
const oldTt = `          {/* === TIKTOK === */}
          {activeTab === 'seo-tt' && (
            <PlatformSeoCard
              platform="TIKTOK"
              platformLabel="TikTok"
              badgeLabel="TIKTOK"
              seo={ttSeo}
              onSeoChange={setTtSeo}
              images={ttImages}
              platformLabel2="TikTok"
              uploadDesc="Hỗ trợ nhiều ảnh dọc hoặc ảnh carousel cho TikTok."
              onImagesChange={setTtImages}
            />
          )}`;
result = result.replace(oldTt, ttTab);

// Replace YouTube
const oldYt = `          {/* === YOUTUBE === */}
          {activeTab === 'seo-yt' && (
            <PlatformSeoCard
              platform="YOUTUBE"
              platformLabel="YouTube"
              badgeLabel="YOUTUBE"
              seo={ytSeo}
              onSeoChange={setYtSeo}
              images={ytImages}
              platformLabel2="YouTube"
              uploadDesc="Hỗ trợ nhiều ảnh thumbnail và banner cho YouTube."
              onImagesChange={setYtImages}
            />
          )}`;
result = result.replace(oldYt, ytTab);

// Write result
fs.writeFileSync('src/admin/features/category/CategoryForm.tsx', result, 'utf8');

console.log('✅ Done! All 3 tabs replaced.');
