# Script to replace Facebook tab in CategoryForm with content from NewsCategoryForm

$sourceFile = "NoiThatTienLoi/Code/src/admin/features/news-category/NewsCategoryForm.tsx"
$targetFile = "NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx"

# Read source file
$sourceContent = Get-Content $sourceFile -Raw

# Extract Facebook tab content (lines 822-1240)
$lines = Get-Content $sourceFile
$fbTabStart = 821  # 0-indexed
$fbTabEnd = 1239   # 0-indexed
$fbTabContent = $lines[$fbTabStart..$fbTabEnd] -join "`n"

# Read target file
$targetContent = Get-Content $targetFile -Raw

# Find and replace the old Facebook tab
$oldFbTab = @"
          {/* === FACEBOOK === */}
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
          )}
"@

$newTargetContent = $targetContent -replace [regex]::Escape($oldFbTab), $fbTabContent

# Write back to target file
Set-Content -Path $targetFile -Value $newTargetContent -NoNewline

Write-Host "✅ Facebook tab replaced successfully!" -ForegroundColor Green
Write-Host "File: $targetFile" -ForegroundColor Cyan
