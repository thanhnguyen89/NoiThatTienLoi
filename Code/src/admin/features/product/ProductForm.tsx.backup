'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProductDetail } from '@/lib/types';
import { createSlug } from '@/lib/utils';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import './product-form.css';

// ─── Types ────────────────────────────────────────────────────────────────

interface SizeOption { id: string; sizeLabel: string; widthCm: string | null; lengthCm: string | null; heightCm: string | null; }
interface ColorOption { id: string; colorName: string; colorCode: string | null; }

interface VariantItem {
  id?: string;
  productSizeId: string;
  productColorId: string;
  sku: string;
  barcode: string;
  purchasePrice: string;
  salePrice: string;
  promoPrice: string;
  stockQty: string;
  reservedQty: string;
  weightKg: string;
  isDefault: boolean;
  isActive: boolean;
}

interface ImageItem {
  id?: string;
  url: string;
  name: string;
  alt: string;
  order: number;
  isPrimary: boolean;
  isVisible: boolean;
}

interface Props {
  product?: ProductDetail;
  categories: Array<{ id: string; name: string }>;
  sizes: SizeOption[];
  colors: ColorOption[];
}

// ─── Tab definition ───────────────────────────────────────────────────────

type TabId = 'basic' | 'variants' | 'images' | 'seo-web' | 'seo-fb' | 'seo-tt' | 'seo-yt';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'variants', label: 'Biến thể' },
  { id: 'images', label: 'Hình ảnh' },
  { id: 'seo-web', label: 'SEO Website' },
  { id: 'seo-fb', label: 'Facebook' },
  { id: 'seo-tt', label: 'TikTok' },
  { id: 'seo-yt', label: 'YouTube' },
];

// ─── ImageCardGrid (reused pattern from CategoryForm) ─────────────────────

function ImageCardGrid({
  images,
  platform,
  platformLabel,
  onImagesChange,
}: {
  images: ImageItem[];
  platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
  platformLabel: string;
  onImagesChange: (imgs: ImageItem[]) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editAlt, setEditAlt] = useState('');

  function addImage(url: string) {
    if (images.find((i) => i.url === url)) return;
    const newImg: ImageItem = {
      id: `new-${Date.now()}`,
      url,
      name: url.split('/').pop() || 'image.jpg',
      alt: '',
      order: images.length,
      isPrimary: images.length === 0,
      isVisible: true,
    };
    onImagesChange([...images, newImg]);
  }

  function addImages(urls: string[]) {
    const existing = new Set(images.map((i) => i.url));
    const newImgs = urls.filter((u) => !existing.has(u)).map((url, i) => ({
      id: `new-${Date.now()}-${i}`,
      url,
      name: url.split('/').pop() || 'image.jpg',
      alt: '',
      order: images.length + i,
      isPrimary: images.length === 0 && i === 0,
      isVisible: true,
    }));
    if (newImgs.length) onImagesChange([...images, ...newImgs]);
  }

  function removeImage(idx: number) {
    const updated = images.filter((_, i) => i !== idx).map((img, i) => ({
      ...img,
      order: i,
      isPrimary: i === 0,
    }));
    onImagesChange(updated);
  }

  function setPrimary(idx: number) {
    onImagesChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  function saveEdit(idx: number) {
    onImagesChange(images.map((img, i) => i === idx ? { ...img, alt: editAlt } : img));
    setEditingIdx(null);
  }

  return (
    <div className="card mt-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span className="fw-semibold">Hình ảnh {platformLabel}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(true)}>
          <i className="bi bi-images me-1"></i>Chọn ảnh
        </button>
      </div>
      <div className="card-body">
        {images.length === 0 ? (
          <p className="text-muted small mb-0">Chưa có ảnh. Nhấn "Chọn ảnh" để thêm.</p>
        ) : (
          <div className="row g-3">
            {images.map((img, idx) => (
              <div key={img.id || idx} className="col-6 col-md-4 col-lg-3">
                <div className="border rounded-2 overflow-hidden">
                  <div className="bg-light border-bottom d-flex align-items-center justify-content-center" style={{ height: 100 }}>
                    <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="p-2">
                    <div className="fw-semibold small mb-1 text-truncate">{img.name}</div>
                    {editingIdx === idx ? (
                      <div className="mb-2">
                        <input value={editAlt} onChange={(e) => setEditAlt(e.target.value)}
                          className="form-control form-control-sm mb-1" placeholder="Alt text..." />
                        <div className="d-flex gap-1">
                          <button type="button" className="btn btn-success btn-sm flex-fill" onClick={() => saveEdit(idx)}>Lưu</button>
                          <button type="button" className="btn btn-secondary btn-sm flex-fill" onClick={() => setEditingIdx(null)}>Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted small mb-2" style={{ fontSize: 11 }}>
                        Alt: {img.alt || <em className="text-secondary">Chưa có</em>}
                      </div>
                    )}
                    <div className="d-flex gap-1 flex-wrap mb-2">
                      {img.isPrimary && <span className="badge" style={{ fontSize: 10, background: '#dcfce7', color: '#166534' }}>Ảnh chính</span>}
                    </div>
                    <div className="d-flex justify-content-end gap-2 small">
                      <button type="button" className="btn btn-sm p-1 text-primary" title="Sửa alt" onClick={() => { setEditingIdx(idx); setEditAlt(img.alt); }}>
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      {!img.isPrimary && (
                        <button type="button" className="btn btn-sm p-1 text-success" title="Đặt ảnh chính" onClick={() => setPrimary(idx)}>
                          <i className="bi bi-star"></i>
                        </button>
                      )}
                      <button type="button" className="btn btn-sm p-1 text-danger" title="Xóa" onClick={() => removeImage(idx)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ImageManagerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        multiSelect
        onSelect={(url) => { addImage(url); setShowModal(false); }}
        onSelectMultiple={(urls) => { addImages(urls); setShowModal(false); }}
      />
    </div>
  );
}

// ─── PlatformSeoCard ──────────────────────────────────────────────────────

function PlatformSeoCard({
  platform,
  platformLabel,
  badgeLabel,
  seo,
  onSeoChange,
}: {
  platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
  platformLabel: string;
  badgeLabel: string;
  seo: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSeoChange: (s: any) => void;
}) {
  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onSeoChange({ ...seo, [e.target.name]: e.target.value });
  }

  return (
    <div className="card mb-3">
      <div className="card-header fw-semibold">SEO {platformLabel}</div>
      <div className="card-body">
        <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{badgeLabel}</span>

        <div className="mb-3">
          <label className="form-label small fw-semibold">Link bài đã đăng</label>
          <input name="linkPosted" value={seo.linkPosted || ''} onChange={handle}
            placeholder="https://..." className="form-control form-control-sm" />
        </div>

        {platform === 'WEBSITE' ? (
          <>
            <div className="mb-3">
              <label className="form-label small fw-semibold">SEO Title</label>
              <input name="title" value={seo.title || ''} onChange={handle}
                placeholder="Tiêu đề SEO cho Google" className="form-control form-control-sm" />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">SEO Description</label>
              <textarea name="description" value={seo.description || ''} onChange={handle} rows={2}
                className="form-control form-control-sm" />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Slug riêng</label>
                <input name="slug" value={seo.slug || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Canonical URL</label>
                <input name="canonicalUrl" value={seo.canonicalUrl || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-4">
                <label className="form-label small fw-semibold">OG Title</label>
                <input name="ogTitle" value={seo.ogTitle || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold">OG Description</label>
                <input name="ogDescription" value={seo.ogDescription || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold">OG Image URL</label>
                <input name="ogImage" value={seo.ogImage || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Robots</label>
                <input name="robots" value={seo.robots || 'index,follow'} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">SEO Keywords</label>
                <input name="keywords" value={seo.keywords || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
            <div className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id={`noindex-${platform}`}
                checked={seo.isNoindex === 'true'}
                onChange={(e) => onSeoChange({ ...seo, isNoindex: String(e.target.checked) })} />
              <label className="form-check-label small" htmlFor={`noindex-${platform}`}>Noindex</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id={`nofollow-${platform}`}
                checked={seo.isNofollow === 'true'}
                onChange={(e) => onSeoChange({ ...seo, isNofollow: String(e.target.checked) })} />
              <label className="form-check-label small" htmlFor={`nofollow-${platform}`}>Nofollow</label>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Title</label>
              <input name="title" value={seo.title || ''} onChange={handle}
                className="form-control form-control-sm" />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Description</label>
              <textarea name="description" value={seo.description || ''} onChange={handle} rows={2}
                className="form-control form-control-sm" />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Hashtags</label>
                <input name="hashtags" value={seo.hashtags || ''} onChange={handle}
                  placeholder="#noithat #giuongngu" className="form-control form-control-sm" />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">OG Image URL</label>
                <input name="ogImage" value={seo.ogImage || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Variant Management ───────────────────────────────────────────────────

function VariantTable({
  variants,
  sizes,
  colors,
  onChange,
}: {
  variants: VariantItem[];
  sizes: SizeOption[];
  colors: ColorOption[];
  onChange: (v: VariantItem[]) => void;
}) {
  function update(idx: number, field: keyof VariantItem, value: string | boolean) {
    const updated = [...variants];
    (updated[idx] as unknown as Record<string, unknown>)[field] = value;
    onChange(updated);
  }

  function remove(idx: number) {
    onChange(variants.filter((_, i) => i !== idx));
  }

  function setDefault(idx: number) {
    onChange(variants.map((v, i) => ({ ...v, isDefault: i === idx })));
  }

  function addVariant() {
    onChange([...variants, {
      productSizeId: '',
      productColorId: '',
      sku: '',
      barcode: '',
      purchasePrice: '0',
      salePrice: '0',
      promoPrice: '',
      stockQty: '0',
      reservedQty: '0',
      weightKg: '',
      isDefault: variants.length === 0,
      isActive: true,
    }]);
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <i className="bi bi-grid-3x3-gap fs-1 d-block mb-2"></i>
        <p className="mb-2">Chưa có biến thể nào.</p>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addVariant}>
          <i className="bi bi-plus-lg me-1"></i>Thêm biến thể đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="table-responsive">
        <table className="table table-sm table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Kích thước</th>
              <th>Màu sắc</th>
              <th>SKU</th>
              <th>Giá nhập</th>
              <th>Giá bán</th>
              <th>KM</th>
              <th>Tồn kho</th>
              <th>Cân nặng</th>
              <th style={{ width: 70 }}>Mặc định</th>
              <th style={{ width: 60 }}>Ẩn</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v, idx) => (
              <tr key={idx}>
                <td className="text-center text-muted">{idx + 1}</td>
                <td style={{ minWidth: 140 }}>
                  <select className="form-select form-select-sm"
                    value={v.productSizeId}
                    onChange={(e) => update(idx, 'productSizeId', e.target.value)}>
                    <option value="">— Chọn —</option>
                    {sizes.map((s) => <option key={s.id} value={s.id}>{s.sizeLabel}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 120 }}>
                  <select className="form-select form-select-sm"
                    value={v.productColorId}
                    onChange={(e) => update(idx, 'productColorId', e.target.value)}>
                    <option value="">— Chọn —</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.colorCode && (
                          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: c.colorCode, marginRight: 4 }}></span>
                        )}
                        {c.colorName}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input type="text" className="form-control form-control-sm" value={v.sku}
                    onChange={(e) => update(idx, 'sku', e.target.value)} placeholder="SKU..." />
                </td>
                <td>
                  <input type="number" className="form-control form-control-sm" value={v.purchasePrice}
                    onChange={(e) => update(idx, 'purchasePrice', e.target.value)} min="0" />
                </td>
                <td>
                  <input type="number" className="form-control form-control-sm" value={v.salePrice}
                    onChange={(e) => update(idx, 'salePrice', e.target.value)} min="0" />
                </td>
                <td>
                  <input type="number" className="form-control form-control-sm" value={v.promoPrice}
                    onChange={(e) => update(idx, 'promoPrice', e.target.value)} min="0"
                    placeholder="..." />
                </td>
                <td>
                  <input type="number" className="form-control form-control-sm" value={v.stockQty}
                    onChange={(e) => update(idx, 'stockQty', e.target.value)} min="0" />
                </td>
                <td>
                  <input type="number" className="form-control form-control-sm" value={v.weightKg}
                    onChange={(e) => update(idx, 'weightKg', e.target.value)} min="0" step="0.1"
                    placeholder="kg" />
                </td>
                <td className="text-center">
                  <input type="radio" className="form-check-input" name="defaultVariant"
                    checked={v.isDefault} onChange={() => setDefault(idx)} />
                </td>
                <td className="text-center">
                  <input type="checkbox" className="form-check-input"
                    checked={v.isActive} onChange={(e) => update(idx, 'isActive', e.target.checked)} />
                </td>
                <td className="text-center">
                  <button type="button" className="btn btn-sm p-1 text-danger" onClick={() => remove(idx)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={addVariant}>
        <i className="bi bi-plus-lg me-1"></i>Thêm biến thể
      </button>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────

export function ProductForm({ product, categories, sizes, colors }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  // ── Form state ──
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    code: product?.code || '',
    sku: product?.sku || '',
    categoryId: product?.category?.id || '',
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    specifications: product?.specifications || '',
    ingredients: product?.ingredients || '',
    usage: product?.usage || '',
    brand: product?.brand || '',
    origin: product?.origin || '',
    unit: product?.unit || '',
    warrantyMonths: String(product?.warrantyMonths ?? ''),
    image: product?.image || '',
    icon: product?.icon || '',
    banner: product?.banner || '',
    sortOrder: String(product?.sortOrder ?? 0),
    isFeatured: product?.isFeatured ?? false,
    isFlashSale: product?.isFlashSale ?? false,
    flashSaleTarget: String(product?.flashSaleTarget ?? ''),
    isActive: product?.isActive ?? true,
    isShowHome: product?.isShowHome ?? false,
    seoTitle: product?.seoTitle || '',
    seoDescription: product?.seoDescription || '',
    canonicalUrl: product?.canonicalUrl || '',
    ogTitle: product?.ogTitle || '',
    ogDescription: product?.ogDescription || '',
    ogImage: product?.ogImage || '',
    robots: product?.robots || 'index,follow',
  });

  // ── Images ──
  const [images, setImages] = useState<ImageItem[]>(() =>
    (product?.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      name: img.url.split('/').pop() || 'image',
      alt: img.alt || '',
      order: img.sortOrder,
      isPrimary: img.isThumbnail,
      isVisible: img.isActive,
    }))
  );

  // ── Variants ──
  const [variants, setVariants] = useState<VariantItem[]>(() =>
    (product?.variants ?? []).map((v) => ({
      id: v.id,
      productSizeId: v.productSizeId,
      productColorId: v.productColorId,
      sku: v.sku || '',
      barcode: v.barcode || '',
      purchasePrice: String(v.purchasePrice),
      salePrice: String(v.salePrice),
      promoPrice: v.promoPrice ? String(v.promoPrice) : '',
      stockQty: String(v.stockQty),
      reservedQty: String(v.reservedQty),
      weightKg: v.weightKg ? String(v.weightKg) : '',
      isDefault: v.isDefault,
      isActive: v.isActive,
    }))
  );

  // ── SEO per platform ──
  const initSeo = (platform: string) => {
    const p = product?.seoPlatforms?.find((x) => x.platform === platform);
    return {
      title: p?.title || '',
      description: p?.description || '',
      contentCate: p?.contentCate || '',
      keywords: p?.keywords || '',
      hashtags: p?.hashtags || '',
      tags: p?.tags || '',
      linkPosted: p?.linkPosted || '',
      slug: p?.slug || '',
      canonicalUrl: p?.canonicalUrl || '',
      robots: p?.robots || 'index,follow',
      isNoindex: String(p?.isNoindex || false),
      isNofollow: String(p?.isNofollow || false),
      ogTitle: p?.ogTitle || '',
      ogDescription: p?.ogDescription || '',
      ogImage: p?.ogImage || '',
    };
  };

  const [webSeo, setWebSeo] = useState(() => initSeo('WEBSITE'));
  const [fbSeo, setFbSeo] = useState(() => initSeo('FACEBOOK'));
  const [ttSeo, setTtSeo] = useState(() => initSeo('TIKTOK'));
  const [ytSeo, setYtSeo] = useState(() => initSeo('YOUTUBE'));

  // ── Platform images ──
  const [webImages, setWebImages] = useState<ImageItem[]>([]);
  const [fbImages, setFbImages] = useState<ImageItem[]>([]);
  const [ttImages, setTtImages] = useState<ImageItem[]>([]);
  const [ytImages, setYtImages] = useState<ImageItem[]>([]);

  // ── Image state per platform from seoPlatforms + platformImages ──
  useEffect(() => {
    if (product?.seoPlatforms) {
      const web = product.seoPlatforms.find((x) => x.platform === 'WEBSITE');
      const fb = product.seoPlatforms.find((x) => x.platform === 'FACEBOOK');
      const tt = product.seoPlatforms.find((x) => x.platform === 'TIKTOK');
      const yt = product.seoPlatforms.find((x) => x.platform === 'YOUTUBE');
      if (web?.seoMedia) setWebImages(web.seoMedia.map((m) => ({
        id: m.id, url: m.mediaUrl, name: m.mediaUrl.split('/').pop() || 'image',
        alt: m.altText || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive ?? true,
      })));
      if (fb?.seoMedia) setFbImages(fb.seoMedia.map((m) => ({
        id: m.id, url: m.mediaUrl, name: m.mediaUrl.split('/').pop() || 'image',
        alt: m.altText || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive ?? true,
      })));
      if (tt?.seoMedia) setTtImages(tt.seoMedia.map((m) => ({
        id: m.id, url: m.mediaUrl, name: m.mediaUrl.split('/').pop() || 'image',
        alt: m.altText || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive ?? true,
      })));
      if (yt?.seoMedia) setYtImages(yt.seoMedia.map((m) => ({
        id: m.id, url: m.mediaUrl, name: m.mediaUrl.split('/').pop() || 'image',
        alt: m.altText || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive ?? true,
      })));
    }
    // Load platformImages (ProductPlatformImage)
    if (product?.platformImages) {
      const web = product.platformImages.filter((x) => x.platform === 'WEBSITE');
      const fb = product.platformImages.filter((x) => x.platform === 'FACEBOOK');
      const tt = product.platformImages.filter((x) => x.platform === 'TIKTOK');
      const yt = product.platformImages.filter((x) => x.platform === 'YOUTUBE');
      if (web.length) setWebImages(web.map((m) => ({
        id: m.id, url: m.imageUrl, name: m.imageUrl.split('/').pop() || 'image',
        alt: m.alt || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive,
      })));
      if (fb.length) setFbImages(fb.map((m) => ({
        id: m.id, url: m.imageUrl, name: m.imageUrl.split('/').pop() || 'image',
        alt: m.alt || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive,
      })));
      if (tt.length) setTtImages(tt.map((m) => ({
        id: m.id, url: m.imageUrl, name: m.imageUrl.split('/').pop() || 'image',
        alt: m.alt || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive,
      })));
      if (yt.length) setYtImages(yt.map((m) => ({
        id: m.id, url: m.imageUrl, name: m.imageUrl.split('/').pop() || 'image',
        alt: m.alt || '', order: m.sortOrder, isPrimary: m.isPrimary, isVisible: m.isActive,
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => {
      const u = { ...p, [name]: v };
      if (name === 'name' && autoSlug) u.slug = createSlug(value);
      return u;
    });
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function buildPayload() {
    // Build platformSeos — đúng field name theo schema
    const seos: Array<Record<string, unknown>> = [];

    const webSeoData = {
      platform: 'WEBSITE' as const,
      title: webSeo.title.trim() || null,
      description: webSeo.description.trim() || null,
      contentCate: null,
      keywords: webSeo.keywords.trim() || null,
      hashtags: null,
      tags: null,
      linkPosted: webSeo.linkPosted.trim() || null,
      slug: webSeo.slug.trim() || null,
      canonicalUrl: webSeo.canonicalUrl.trim() || null,
      robots: webSeo.robots.trim() || null,
      isNoindex: webSeo.isNoindex === 'true',
      isNofollow: webSeo.isNofollow === 'true',
      ogTitle: webSeo.ogTitle.trim() || null,
      ogDescription: webSeo.ogDescription.trim() || null,
      ogImage: webSeo.ogImage.trim() || null,
      schemaJson: null,
      extraMetaJson: null,
      isActive: true,
    };
    seos.push(webSeoData);

    if (fbSeo.title || fbSeo.description || fbSeo.hashtags || fbSeo.ogImage || fbSeo.linkPosted) {
      seos.push({
        platform: 'FACEBOOK' as const,
        title: fbSeo.title.trim() || null,
        description: fbSeo.description.trim() || null,
        contentCate: null,
        keywords: null,
        hashtags: fbSeo.hashtags.trim() || null,
        tags: null,
        linkPosted: fbSeo.linkPosted.trim() || null,
        slug: null, canonicalUrl: null, robots: null,
        isNoindex: false, isNofollow: false,
        ogTitle: null, ogDescription: null,
        ogImage: fbSeo.ogImage.trim() || null,
        schemaJson: null, extraMetaJson: null,
        isActive: true,
      });
    }
    if (ttSeo.title || ttSeo.description || ttSeo.hashtags || ttSeo.ogImage || ttSeo.linkPosted) {
      seos.push({
        platform: 'TIKTOK' as const,
        title: ttSeo.title.trim() || null,
        description: ttSeo.description.trim() || null,
        contentCate: null,
        keywords: null,
        hashtags: ttSeo.hashtags.trim() || null,
        tags: null,
        linkPosted: ttSeo.linkPosted.trim() || null,
        slug: null, canonicalUrl: null, robots: null,
        isNoindex: false, isNofollow: false,
        ogTitle: null, ogDescription: null,
        ogImage: ttSeo.ogImage.trim() || null,
        schemaJson: null, extraMetaJson: null,
        isActive: true,
      });
    }
    if (ytSeo.title || ytSeo.description || ytSeo.hashtags || ytSeo.ogImage || ytSeo.linkPosted) {
      seos.push({
        platform: 'YOUTUBE' as const,
        title: ytSeo.title.trim() || null,
        description: ytSeo.description.trim() || null,
        contentCate: null,
        keywords: null,
        hashtags: ytSeo.hashtags.trim() || null,
        tags: null,
        linkPosted: ytSeo.linkPosted.trim() || null,
        slug: null, canonicalUrl: null, robots: null,
        isNoindex: false, isNofollow: false,
        ogTitle: null, ogDescription: null,
        ogImage: ytSeo.ogImage.trim() || null,
        schemaJson: null, extraMetaJson: null,
        isActive: true,
      });
    }

    // Build platformImages (ProductPlatformImage) — đúng field name theo schema
    const platformImages: Array<{
      platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
      imageUrl: string; alt: string | null; title: string | null; caption: string | null;
      sortOrder: number; isPrimary: boolean; isActive: boolean;
    }> = [];

    webImages.forEach((img, i) => {
      platformImages.push({ platform: 'WEBSITE', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });
    fbImages.forEach((img, i) => {
      platformImages.push({ platform: 'FACEBOOK', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });
    ttImages.forEach((img, i) => {
      platformImages.push({ platform: 'TIKTOK', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });
    ytImages.forEach((img, i) => {
      platformImages.push({ platform: 'YOUTUBE', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });

    // Build product images
    const productImages = images.filter((img) => img.isVisible).map((img, i) => ({
      url: img.url,
      alt: img.alt || null,
      sortOrder: img.order ?? i,
      isThumbnail: img.isPrimary,
      isActive: img.isVisible,
    }));

    // Build variants
    const productVariants = variants
      .filter((v) => v.productSizeId && v.productColorId)
      .map((v) => ({
        productSizeId: v.productSizeId,
        productColorId: v.productColorId,
        sku: v.sku || null,
        barcode: v.barcode || null,
        purchasePrice: Number(v.purchasePrice) || 0,
        salePrice: Number(v.salePrice) || 0,
        promoPrice: v.promoPrice ? Number(v.promoPrice) : null,
        stockQty: Number(v.stockQty) || 0,
        reservedQty: Number(v.reservedQty) || 0,
        weightKg: v.weightKg ? Number(v.weightKg) : null,
        isDefault: v.isDefault,
        isActive: v.isActive,
      }));

    return {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      code: form.code.trim() || null,
      sku: form.sku.trim() || null,
      categoryId: form.categoryId,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      ingredients: form.ingredients.trim() || null,
      usage: form.usage.trim() || null,
      brand: form.brand.trim() || null,
      origin: form.origin.trim() || null,
      unit: form.unit.trim() || null,
      warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : null,
      image: form.image.trim() || null,
      icon: form.icon.trim() || null,
      banner: form.banner.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      canonicalUrl: form.canonicalUrl.trim() || null,
      ogTitle: form.ogTitle.trim() || null,
      ogDescription: form.ogDescription.trim() || null,
      ogImage: form.ogImage.trim() || null,
      robots: form.robots.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      isFeatured: form.isFeatured,
      isFlashSale: form.isFlashSale,
      flashSaleTarget: form.flashSaleTarget ? Number(form.flashSaleTarget) : null,
      isActive: form.isActive,
      isShowHome: form.isShowHome,
      images: productImages,
      variants: productVariants,
      platformSeos: seos,
      platformImages: platformImages,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Bắt buộc';
    if (!form.slug.trim()) e.slug = 'Bắt buộc';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) e.slug = 'Slug không hợp lệ';
    if (!form.categoryId) e.categoryId = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true); setGlobalError('');
    try {
      const payload = buildPayload();
      console.log('[ProductForm submit] form state ingredients:', JSON.stringify(form.ingredients)?.substring(0, 200));
      console.log('[ProductForm submit] payload ingredients:', JSON.stringify(payload.ingredients)?.substring(0, 200));
      const url = isEdit ? `/admin/api/products/${product.id}` : '/admin/api/products';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.errors) {
          const fe: Record<string, string> = {};
          Object.entries(json.errors).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? (v as string[])[0] : String(v); });
          setErrors(fe);
        } else setGlobalError(json.error || 'Lỗi');
        return;
      }
      router.push('/admin/products'); router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/products">Sản phẩm</Link></li>
            <li className="breadcrumb-item active">{isEdit ? product.name : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/products')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo sản phẩm'}
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

          {/* === THÔNG TIN CƠ BẢN === */}
          {activeTab === 'basic' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Thông tin cơ bản</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tên sản phẩm <span className="text-danger">*</span></label>
                    <input name="name" value={form.name} onChange={handle}
                      placeholder="VD: Giường sắt đơn ống tròn"
                      className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`} />
                    {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Slug <span className="text-danger">*</span></label>
                      <div className="input-group input-group-sm">
                        <input name="slug" value={form.slug} onChange={handle}
                          className={`form-control ${errors.slug ? 'is-invalid' : ''}`} />
                        <button type="button" className="btn btn-outline-secondary"
                          onClick={() => setForm((p) => ({ ...p, slug: createSlug(p.name) }))}
                          title="Tạo slug tự động">
                          <i className="bi bi-arrow-repeat"></i>
                        </button>
                      </div>
                      {errors.slug && <div className="invalid-feedback d-block">{errors.slug}</div>}
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Mã SKU</label>
                      <input name="sku" value={form.sku} onChange={handle}
                        className="form-control form-control-sm" placeholder="VD: GTS001" />
                    </div>
                  </div>
                   <div className="row g-3 mt-1">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Thương hiệu</label>
                      <input name="brand" value={form.brand} onChange={handle}
                        className="form-control form-control-sm" placeholder="..." />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Thứ tự</label>
                      <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Danh mục <span className="text-danger">*</span></label>
                    <select name="categoryId" value={form.categoryId} onChange={handle}
                      className={`form-select form-select-sm ${errors.categoryId ? 'is-invalid' : ''}`}>
                      <option value="">— Chọn danh mục —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.categoryId && <div className="invalid-feedback d-block">{errors.categoryId}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mô tả ngắn</label>
                    <textarea name="shortDescription" value={form.shortDescription} onChange={handle}
                      rows={5} className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nội dung chi tiết (HTML)</label>
                    <RichTextEditor
                      value={form.description}
                      onChange={(val) => setForm((p) => ({ ...p, description: val }))}
                      placeholder="Nhập nội dung chi tiết..."
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Thông số kỹ thuật</label>
                      <RichTextEditor
                        value={form.specifications}
                        onChange={(val) => setForm((p) => ({ ...p, specifications: val }))}
                        placeholder="Nhập thông số kỹ thuật..."
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Thành phần / Chất liệu</label>
                      <RichTextEditor
                        value={form.ingredients}
                        onChange={(val) => setForm((p) => ({ ...p, ingredients: val }))}
                        placeholder="Nhập thành phần, chất liệu..."
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Hướng dẫn sử dụng</label>
                      <RichTextEditor
                        value={form.usage}
                        onChange={(val) => setForm((p) => ({ ...p, usage: val }))}
                        placeholder="Nhập hướng dẫn sử dụng..."
                      />
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.image}
                        onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                        label="Hình ảnh"
                        defaultSrc="/admin/assets/images/default-image_100.png"
                      />
                    </div>
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.icon}
                        onChange={(url) => setForm((p) => ({ ...p, icon: url }))}
                        label="Icon"
                        defaultSrc="/admin/assets/images/default-image_100.png"
                      />
                    </div>
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.banner}
                        onChange={(url) => setForm((p) => ({ ...p, banner: url }))}
                        label="Banner"
                        defaultSrc="/admin/assets/images/default-image_100.png"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === BIẾN THỂ === */}
          {activeTab === 'variants' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Quản lý biến thể (Kích thước × Màu sắc)</div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Mỗi biến thể = Kích thước + Màu sắc. Giá nhập, giá bán, tồn kho được quản lý theo từng biến thể.
                  Kích thước và màu sắc được dùng chung cho nhiều sản phẩm.
                </p>
                <div className="mb-3">
                  <div className="row g-3">
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Kích thước đã có ({sizes.length})</label>
                      <div className="border rounded p-2" style={{ maxHeight: 120, overflow: 'auto' }}>
                        {sizes.length === 0 ? <span className="text-muted small">Chưa có kích thước</span> :
                          sizes.map((s) => <div key={s.id} className="small py-1"><code>{s.sizeLabel}</code></div>)}
                      </div>
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Màu sắc đã có ({colors.length})</label>
                      <div className="border rounded p-2" style={{ maxHeight: 120, overflow: 'auto' }}>
                        {colors.length === 0 ? <span className="text-muted small">Chưa có màu sắc</span> :
                          colors.map((c) => (
                            <div key={c.id} className="small py-1 d-flex align-items-center gap-1">
                              {c.colorCode && <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: c.colorCode, flexShrink: 0 }}></span>}
                              <code>{c.colorName}</code>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Tổng biến thể</label>
                      <div className="border rounded p-2 text-center">
                        <div className="fs-4 fw-bold text-primary">{sizes.length * colors.length}</div>
                        <div className="small text-muted">kết hợp có thể</div>
                      </div>
                    </div>
                  </div>
                </div>
                <VariantTable
                  variants={variants}
                  sizes={sizes}
                  colors={colors}
                  onChange={setVariants}
                />
              </div>
            </div>
          )}

          {/* === HÌNH ẢNH === */}
          {activeTab === 'images' && (
            <>
              <ImageCardGrid
                images={images}
                platform="WEBSITE"
                platformLabel="Sản phẩm"
                onImagesChange={setImages}
              />
            </>
          )}

          {/* === SEO WEBSITE === */}
          {activeTab === 'seo-web' && (
            <PlatformSeoCard
              platform="WEBSITE"
              platformLabel="Website"
              badgeLabel="WEBSITE"
              seo={webSeo}
              onSeoChange={setWebSeo}
            />
          )}

          {/* === FACEBOOK === */}
          {activeTab === 'seo-fb' && (
            <>
              <PlatformSeoCard
                platform="FACEBOOK"
                platformLabel="Facebook"
                badgeLabel="FACEBOOK"
                seo={fbSeo}
                onSeoChange={setFbSeo}
              />
              <ImageCardGrid
                images={fbImages}
                platform="FACEBOOK"
                platformLabel="Facebook"
                onImagesChange={setFbImages}
              />
            </>
          )}

          {/* === TIKTOK === */}
          {activeTab === 'seo-tt' && (
            <>
              <PlatformSeoCard
                platform="TIKTOK"
                platformLabel="TikTok"
                badgeLabel="TIKTOK"
                seo={ttSeo}
                onSeoChange={setTtSeo}
              />
              <ImageCardGrid
                images={ttImages}
                platform="TIKTOK"
                platformLabel="TikTok"
                onImagesChange={setTtImages}
              />
            </>
          )}

          {/* === YOUTUBE === */}
          {activeTab === 'seo-yt' && (
            <>
              <PlatformSeoCard
                platform="YOUTUBE"
                platformLabel="YouTube"
                badgeLabel="YOUTUBE"
                seo={ytSeo}
                onSeoChange={setYtSeo}
              />
              <ImageCardGrid
                images={ytImages}
                platform="YOUTUBE"
                platformLabel="YouTube"
                onImagesChange={setYtImages}
              />
            </>
          )}
        </div>

        {/* RIGHT - Trạng thái */}
        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isActive"
                  id="isActive" checked={form.isActive} onChange={handle} />
                <label className="form-check-label" htmlFor="isActive">Hiển thị</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isFeatured"
                  id="isFeatured" checked={form.isFeatured} onChange={handle} />
                <label className="form-check-label" htmlFor="isFeatured">Nổi bật</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isFlashSale"
                  id="isFlashSale" checked={form.isFlashSale} onChange={handle} />
                <label className="form-check-label" htmlFor="isFlashSale">Flash Sale</label>
              </div>
              {form.isFlashSale && (
                <div className="mb-3 ms-4">
                  <label className="form-label small fw-semibold">Mục tiêu Flash Sale</label>
                  <input
                    type="number"
                    name="flashSaleTarget"
                    value={form.flashSaleTarget}
                    onChange={handle}
                    className="form-control form-control-sm"
                    placeholder="VD: 1000"
                    min="0"
                  />
                  <small className="form-text text-muted">Số lượng mục tiêu bán để tính progress bar</small>
                </div>
              )}
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isShowHome"
                  id="isShowHome" checked={form.isShowHome} onChange={handle} />
                <label className="form-check-label" htmlFor="isShowHome">Hiển thị trang chủ</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
