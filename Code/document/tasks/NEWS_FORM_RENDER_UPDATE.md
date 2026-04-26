# 📝 Hướng Dẫn Update NewsForm Render với Tabs

## Phần Cần Thay Thế

Thay thế toàn bộ phần `return (...)` trong NewsForm.tsx

## Code Mới

```tsx
  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/news">Tin tức</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (form.title || 'Chỉnh sửa') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/news')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo tin tức'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button type="button" className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        <div className="col-12 col-lg-9">

          {/* === TAB 1: THÔNG TIN CƠ BẢN === */}
          {activeTab === 'basic' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Thông tin bài viết</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                    <input name="title" value={form.title} onChange={handle}
                      placeholder="VD: Xu hướng nội thất 2025"
                      className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                    {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-8">
                      <label className="form-label small fw-semibold">Slug (seName) <span className="text-danger">*</span></label>
                      <div className="input-group input-group-sm">
                        <input name="seName" value={form.seName} onChange={handle}
                          placeholder="xu-huong-noi-that-2025"
                          className={`form-control ${errors.seName ? 'is-invalid' : ''}`} />
                        <div className="form-check form-switch ms-3 d-flex align-items-center mb-0">
                          <input className="form-check-input" type="checkbox" id="autoSlug" checked={autoSlug}
                            onChange={(e) => { setAutoSlug(e.target.checked); if (e.target.checked) setForm((p) => ({ ...p, seName: createSlug(p.title) })); }}
                            style={{ width: 36, height: 18 }} />
                          <label className="form-check-label ms-1 small text-muted" htmlFor="autoSlug">Auto</label>
                        </div>
                      </div>
                      {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                      {form.title && autoSlug && (
                        <small className="text-muted">Preview: <code>{createSlug(form.title)}</code></small>
                      )}
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Thứ tự sắp xếp</label>
                      <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tóm tắt</label>
                    <textarea name="summary" value={form.summary} onChange={handle}
                      rows={3} placeholder="Tóm tắt ngắn gọn bài viết"
                      className="form-control form-control-sm" />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nội dung</label>
                    <RichTextEditor
                      value={form.content || ''}
                      onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                      placeholder="Nhập nội dung bài viết..."
                    />
                  </div>

                  <div className="mb-3">
                    <SingleImageUploader
                      value={form.image}
                      onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                      label="Hình ảnh chính"
                      defaultSrc="/admin/assets/images/default-image_100.png"
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Tác giả</label>
                      <input name="authorName" value={form.authorName} onChange={handle}
                        placeholder="Tên tác giả" className="form-control form-control-sm" />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Ngày xuất bản</label>
                      <input name="publishedAt" type="datetime-local" value={form.publishedAt} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-3">
                      <label className="form-label small fw-semibold">Lượt xem</label>
                      <input name="viewCount" type="number" min="0" value={form.viewCount} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-semibold">Bình luận</label>
                      <input name="commentCount" type="number" min="0" value={form.commentCount} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-semibold">Lượt thích</label>
                      <input name="likeCount" type="number" min="0" value={form.likeCount} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-semibold">Tag mới</label>
                      <input name="newTag" value={form.newTag} onChange={handle}
                        placeholder="Hot, New" className="form-control form-control-sm" />
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-3">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" name="isPublished"
                          id="isPublished" checked={form.isPublished} onChange={handle} />
                        <label className="form-check-label" htmlFor="isPublished">Xuất bản</label>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" name="isShowHome"
                          id="isShowHome" checked={form.isShowHome} onChange={handle} />
                        <label className="form-check-label" htmlFor="isShowHome">Hiển thị trang chủ</label>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" name="isNew"
                          id="isNew" checked={form.isNew} onChange={handle} />
                        <label className="form-check-label" htmlFor="isNew">Đánh dấu mới</label>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" name="isActive"
                          id="isActive" checked={form.isActive} onChange={handle} />
                        <label className="form-check-label" htmlFor="isActive">Kích hoạt</label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3 mt-2">
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" name="allowComments"
                          id="allowComments" checked={form.allowComments} onChange={handle} />
                        <label className="form-check-label" htmlFor="allowComments">Cho phép bình luận</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === TAB 2: SEO WEBSITE === */}
          {activeTab === 'seo-web' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO Website</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Tối ưu cho Google Search</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Title</label>
                  <input value={webSeo.metaTitle} onChange={(e) => setWebSeo(p => ({ ...p, metaTitle: e.target.value }))}
                    placeholder="Tiêu đề SEO" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Description</label>
                  <textarea value={webSeo.metaDescription} onChange={(e) => setWebSeo(p => ({ ...p, metaDescription: e.target.value }))}
                    rows={3} className="form-control form-control-sm" placeholder="Mô tả SEO" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Keywords</label>
                  <input value={webSeo.metaKeywords} onChange={(e) => setWebSeo(p => ({ ...p, metaKeywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm" />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">OG Title</label>
                    <input value={webSeo.ogTitle} onChange={(e) => setWebSeo(p => ({ ...p, ogTitle: e.target.value }))}
                      className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">OG Description</label>
                    <input value={webSeo.ogDescription} onChange={(e) => setWebSeo(p => ({ ...p, ogDescription: e.target.value }))}
                      className="form-control form-control-sm" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Image</label>
                  <input value={webSeo.ogImage} onChange={(e) => setWebSeo(p => ({ ...p, ogImage: e.target.value }))}
                    placeholder="URL hình ảnh" className="form-control form-control-sm" />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Robots</label>
                    <input value={webSeo.robots} onChange={(e) => setWebSeo(p => ({ ...p, robots: e.target.value }))}
                      placeholder="index,follow" className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Canonical URL</label>
                    <input value={webSeo.seoCanonical} onChange={(e) => setWebSeo(p => ({ ...p, seoCanonical: e.target.value }))}
                      placeholder="https://..." className="form-control form-control-sm" />
                  </div>
                </div>

                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="seoNoindex"
                    checked={webSeo.seoNoindex} onChange={(e) => setWebSeo(p => ({ ...p, seoNoindex: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="seoNoindex">SEO NoIndex</label>
                </div>

                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="isRedirect"
                    checked={webSeo.isRedirect} onChange={(e) => setWebSeo(p => ({ ...p, isRedirect: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="isRedirect">Chuyển hướng</label>
                </div>

                {webSeo.isRedirect && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">URL chuyển hướng</label>
                    <input value={webSeo.slugRedirect} onChange={(e) => setWebSeo(p => ({ ...p, slugRedirect: e.target.value }))}
                      placeholder="/url-cu" className={`form-control form-control-sm ${errors.slugRedirect ? 'is-invalid' : ''}`} />
                    {errors.slugRedirect && <div className="invalid-feedback d-block">{errors.slugRedirect}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === TAB 3: SEO FACEBOOK === */}
          {activeTab === 'seo-fb' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO Facebook</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Tối ưu cho Facebook</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input value={fbSeo.linkPosted} onChange={(e) => setFbSeo(p => ({ ...p, linkPosted: e.target.value }))}
                    placeholder="https://facebook.com/post/123" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title Facebook</label>
                  <input value={fbSeo.title} onChange={(e) => setFbSeo(p => ({ ...p, title: e.target.value }))}
                    className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description Facebook</label>
                  <textarea value={fbSeo.description} onChange={(e) => setFbSeo(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="form-control form-control-sm" />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <input value={fbSeo.keywords} onChange={(e) => setFbSeo(p => ({ ...p, keywords: e.target.value }))}
                      className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <input value={fbSeo.hashtags} onChange={(e) => setFbSeo(p => ({ ...p, hashtags: e.target.value }))}
                      className="form-control form-control-sm" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Image</label>
                  <input value={fbSeo.image} onChange={(e) => setFbSeo(p => ({ ...p, image: e.target.value }))}
                    placeholder="URL hình ảnh" className="form-control form-control-sm" />
                </div>
              </div>
            </div>
          )}

          {/* === TAB 4: SEO TIKTOK === */}
          {activeTab === 'seo-tt' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO TikTok</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Tối ưu cho TikTok</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input value={ttSeo.linkPosted} onChange={(e) => setTtSeo(p => ({ ...p, linkPosted: e.target.value }))}
                    placeholder="https://tiktok.com/@user/video/123" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title TikTok</label>
                  <input value={ttSeo.title} onChange={(e) => setTtSeo(p => ({ ...p, title: e.target.value }))}
                    className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description TikTok</label>
                  <textarea value={ttSeo.description} onChange={(e) => setTtSeo(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="form-control form-control-sm" />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <input value={ttSeo.keywords} onChange={(e) => setTtSeo(p => ({ ...p, keywords: e.target.value }))}
                      className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <input value={ttSeo.hashtags} onChange={(e) => setTtSeo(p => ({ ...p, hashtags: e.target.value }))}
                      className="form-control form-control-sm" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Image</label>
                  <input value={ttSeo.image} onChange={(e) => setTtSeo(p => ({ ...p, image: e.target.value }))}
                    placeholder="URL hình ảnh" className="form-control form-control-sm" />
                </div>
              </div>
            </div>
          )}

          {/* === TAB 5: SEO YOUTUBE === */}
          {activeTab === 'seo-yt' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO YouTube</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Tối ưu cho YouTube</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input value={ytSeo.linkPosted} onChange={(e) => setYtSeo(p => ({ ...p, linkPosted: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=xxx" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title YouTube</label>
                  <input value={ytSeo.title} onChange={(e) => setYtSeo(p => ({ ...p, title: e.target.value }))}
                    className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description YouTube</label>
                  <textarea value={ytSeo.description} onChange={(e) => setYtSeo(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tags</label>
                  <input value={ytSeo.tags} onChange={(e) => setYtSeo(p => ({ ...p, tags: e.target.value }))}
                    placeholder="tag1, tag2, tag3" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Hashtags</label>
                  <input value={ytSeo.hashtags} onChange={(e) => setYtSeo(p => ({ ...p, hashtags: e.target.value }))}
                    className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Image</label>
                  <input value={ytSeo.image} onChange={(e) => setYtSeo(p => ({ ...p, image: e.target.value }))}
                    placeholder="URL hình ảnh" className="form-control form-control-sm" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* === COL-LG-3: SIDEBAR === */}
        <div className="col-12 col-lg-3">
          {/* Audit info */}
          {(auditInfo.createdAt || auditInfo.updatedAt) && (
            <div className="card mb-3">
              <div className="card-body py-2">
                <div className="small text-muted">
                  {auditInfo.createdAt && (
                    <div>Ngày tạo: {new Date(auditInfo.createdAt).toLocaleString('vi-VN')}</div>
                  )}
                  {auditInfo.updatedAt && (
                    <div>Ngày cập nhật: {new Date(auditInfo.updatedAt).toLocaleString('vi-VN')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
```

## Cách Thực Hiện

1. Mở file `src/admin/features/news/NewsForm.tsx`
2. Tìm dòng `return (`
3. Xóa toàn bộ từ `return (` đến hết dấu `}` cuối cùng của component
4. Copy code mới ở trên và paste vào
5. Save file

## Kết Quả

- ✅ Form có 5 tabs
- ✅ Tab 1: Thông tin cơ bản
- ✅ Tab 2: SEO Website
- ✅ Tab 3: SEO Facebook
- ✅ Tab 4: SEO TikTok
- ✅ Tab 5: SEO YouTube
- ✅ Sidebar với audit info

---

**File đã sẵn sàng!** 🎉
