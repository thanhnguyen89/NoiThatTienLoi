'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MenuLinkDetail {
  id: string;
  title: string | null;
  slug: string | null;
  target: string | null;
  menuId: bigint | number | null;
  icon: string | null;
  parentId: string | null;
  entityId: bigint | number | null;
  entityName: string | null;
  nofollow: boolean | null;
  level: number | null;
  sortOrder: number | null;
}

interface Props {
  menuLink?: MenuLinkDetail;
  defaultMenuId?: string;
}

export function MenuLinkForm({ menuLink, defaultMenuId }: Props) {
  const router = useRouter();
  const isEdit = !!menuLink;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  // Neu co defaultMenuId tu URL (khi tao moi tu trang thiet lap lien ket)
  const initialMenuId = menuLink?.menuId !== null && menuLink?.menuId !== undefined
    ? String(menuLink.menuId)
    : (defaultMenuId ?? '');

  const [form, setForm] = useState({
    title: menuLink?.title || '',
    slug: menuLink?.slug || '',
    target: menuLink?.target || '',
    menuId: initialMenuId,
    icon: menuLink?.icon || '',
    parentId: menuLink?.parentId || '',
    entityId: menuLink?.entityId !== null && menuLink?.entityId !== undefined ? String(menuLink.entityId) : '',
    entityName: menuLink?.entityName || '',
    nofollow: menuLink?.nofollow ?? false,
    level: menuLink?.level !== null && menuLink?.level !== undefined ? String(menuLink.level) : '',
    sortOrder: menuLink?.sortOrder !== null && menuLink?.sortOrder !== undefined ? String(menuLink.sortOrder) : '',
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function buildPayload() {
    return {
      title: form.title.trim() || null,
      slug: form.slug.trim() || null,
      target: form.target.trim() || null,
      menuId: form.menuId ? (Number(form.menuId) > Number.MAX_SAFE_INTEGER ? BigInt(form.menuId) : Number(form.menuId)) : null,
      icon: form.icon.trim() || null,
      parentId: form.parentId.trim() || null,
      entityId: form.entityId ? (Number(form.entityId) > Number.MAX_SAFE_INTEGER ? BigInt(form.entityId) : Number(form.entityId)) : null,
      entityName: form.entityName.trim() || null,
      nofollow: form.nofollow || null,
      level: form.level ? parseInt(form.level, 10) : null,
      sortOrder: form.sortOrder ? parseInt(form.sortOrder, 10) : null,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    setGlobalError('');
    try {
      const payload = buildPayload();
      const url = isEdit ? `/admin/api/menu-links/${menuLink.id}` : '/admin/api/menu-links';
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
        } else setGlobalError(json.error || 'Loi');
        return;
      }
      router.push('/admin/menu-links');
      router.refresh();
    } catch { setGlobalError('Loi ket noi'); }
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
            <li className="breadcrumb-item"><Link href="/admin/menu-links">Menu Link</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sua' : 'Them moi'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/menu-links')} disabled={loading}>Huy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Dang luu...</> : isEdit ? 'Cap nhat' : 'Tao moi'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thong tin</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tieu de</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handle}
                  placeholder="VD: Gioi thieu"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Slug</label>
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={handle}
                    placeholder="VD: gioi-thieu"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Target</label>
                  <select
                    name="target"
                    value={form.target}
                    onChange={handle}
                    className="form-select form-select-sm"
                  >
                    <option value="">— Mac dinh —</option>
                    <option value="_self">_self (cung tab)</option>
                    <option value="_blank">_blank (tab moi)</option>
                    <option value="_parent">_parent</option>
                    <option value="_top">_top</option>
                  </select>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Menu ID</label>
                  <input
                    name="menuId"
                    value={form.menuId}
                    onChange={handle}
                    placeholder="BigInt"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Icon</label>
                  <input
                    name="icon"
                    value={form.icon}
                    onChange={handle}
                    placeholder="VD: bi-house"
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Parent ID</label>
                  <input
                    name="parentId"
                    value={form.parentId}
                    onChange={handle}
                    placeholder="UUID"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Entity Name</label>
                  <input
                    name="entityName"
                    value={form.entityName}
                    onChange={handle}
                    placeholder="VD: Page, Category"
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Entity ID</label>
                  <input
                    name="entityId"
                    value={form.entityId}
                    onChange={handle}
                    placeholder="BigInt"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-3">
                  <label className="form-label small fw-semibold">Level</label>
                  <input
                    name="level"
                    type="number"
                    value={form.level}
                    onChange={handle}
                    placeholder="0"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-3">
                  <label className="form-label small fw-semibold">Thu tu</label>
                  <input
                    name="sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={handle}
                    placeholder="0"
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trang thai</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="nofollow"
                  id="nofollow"
                  checked={form.nofollow}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="nofollow">NoFollow</label>
              </div>
              <span className={`badge ${form.nofollow ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                {form.nofollow ? '● NoFollow' : '● Follow'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
