'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface SubItem { label: string; href: string; }
interface MenuItem { label: string; icon?: string; href?: string; children?: SubItem[]; }

const nav: MenuItem[] = [
  {
    label: 'Quản lý cấp quyền', icon: 'bi-people',
    children: [
      { label: 'Người dùng', href: '/admin/admin-users' },
      { label: 'Vai trò', href: '/admin/admin-roles' },
      { label: 'Nhật ký hoạt động', href: '/admin/activity-logs' },
    ]
  },
  {
    label: 'eCommerce', icon: 'bi-cart3',
    children: [
      { label: 'Sản phẩm', href: '/admin/products' },
      { label: 'Danh mục', href: '/admin/categories' },
      { label: 'Kích thước', href: '/admin/product-sizes' },
      { label: 'Màu sắc', href: '/admin/product-colors' },
    ]
  },
  { label: 'Yêu cầu tư vấn', icon: 'bi-chat-left-text', href: '/admin/inquiries' },
  { label: 'Slider', icon: 'bi-images', href: '/admin/sliders' },
  {
    label: 'Menu', icon: 'bi-menu-button-wide',
    children: [
      { label: 'Menu', href: '/admin/menus' },
      { label: 'Menu Link', href: '/admin/menu-links' },
    ]
  },
  { label: 'Danh mục tin tức', icon: 'bi-folder', href: '/admin/news-categories' },
  { label: 'SEO', icon: 'bi-search', href: '/admin/seo-configs' },
  {
    label: 'Cấu hình', icon: 'bi-gear',
    children: [
      { label: 'Redirect URL', href: '/admin/catalog-redirects' },
      { label: 'Text To Link', href: '/admin/catalog-text-to-links' },
    ]
  },
];

export function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href?: string) {
    if (!href) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isGroupActive(item: MenuItem) {
    return item.children?.some((c) => isActive(c.href)) ?? false;
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh');
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light navbar-shadow menu-fixed admin-topnav">
      {/* Logo */}
      <Link className="navbar-brand admin-topnav__logo" href="/admin">
        <i className="bi bi-grid-3x3-gap-fill me-1"></i>
        Admin
      </Link>

      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          {nav.map((item, i) => {
            const active = isGroupActive(item);
            if (item.children) {
              return (
                <li key={i} className={`nav-item dropdown${active ? ' active' : ''}`}>
                  <a
                    className={`nav-link dropdown-toggle text-nowrap${active ? ' text-website' : ''}`}
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    onClick={(e) => e.preventDefault()}
                  >
                    {item.icon && <i className={`bi ${item.icon} me-1`}></i>}
                    <span>{item.label}</span>
                  </a>
                  <div className="dropdown-menu">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`dropdown-item${isActive(child.href) ? ' active' : ''}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </li>
              );
            }
            return (
              <li key={i} className={`nav-item${active ? ' active' : ''}`}>
                <Link href={item.href!} className={`nav-link text-nowrap${active ? ' text-website' : ''}`}>
                  {item.icon && <i className={`bi ${item.icon} me-1`}></i>}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right actions */}
      <div className="admin-topnav__right">
        <Link href="/" target="_blank" className="admin-topnav__action-btn">
          <i className="bi bi-box-arrow-up-right me-1"></i>Website
        </Link>
        <button
          className="admin-topnav__action-btn admin-topnav__action-btn--logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <><span className="spinner-border spinner-border-sm me-1"></span>Đang thoát...</>
          ) : (
            <><i className="bi bi-box-arrow-right me-1"></i>Thoát</>
          )}
        </button>
      </div>
    </nav>
  );
}
