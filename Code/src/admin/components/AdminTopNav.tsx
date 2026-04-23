'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface SubItem { label: string; href: string; }
interface MenuItem { label: string; icon?: string; href?: string; children?: SubItem[]; }

const nav: MenuItem[] = [
  {
    label: 'Hệ thống', icon: 'bi-gear-fill',
    children: [
      { label: 'Cấu hình hệ thống', href: '/admin/system-config' },
      { label: 'Menu', href: '/admin/menus' }
    ]
  },
  {
    label: 'Quản lý cấp quyền', icon: 'bi-shield-lock-fill',
    children: [
      { label: 'Người dùng', href: '/admin/admin-users' },
      { label: 'Vai trò', href: '/admin/admin-roles' },
      { label: 'Nhật ký hoạt động', href: '/admin/activity-logs' },
    ]
  },
  {
    label: 'Quản lý nội dung', icon: 'bi-file-earmark-text-fill',
    children: [
      { label: 'Cấu hình seo', href: '/admin/seo-configs' },
      { label: 'Cấu hình Redirect', href: '/admin/catalog-redirects' },
      { label: 'Danh mục tin tức', href: '/admin/news-categories' },
      { label: 'Tin tức', href: '/admin/news' },
    ]
  },
  {
    label: 'Quản lý sản phẩm', icon: 'bi-box-seam-fill',
    children: [
      { label: 'Màu sắc', href: '/admin/product-colors' },
      { label: 'Kích thước', href: '/admin/product-sizes' },
      { label: 'Danh mục sản phẩm', href: '/admin/categories' },
      { label: 'Sản phẩm', href: '/admin/products' },
    ]
  },
  {
    label: 'eCommerce', icon: 'bi-cart-fill',
    children: [
      { label: 'Kho', href: '/admin/warehouses' },
      { label: 'Đơn vị vận chuyển', href: '/admin/shipping-providers' },
      { label: 'Thành viên', href: '/admin/members' },
      { label: 'Đơn hàng', href: '/admin/orders' },    
    ]
  },
  { label: 'Quản lý trang', icon: 'bi-file-earmark-richtext-fill', href: '/admin/pages' },
  { label: 'Quản lý Slider', icon: 'bi-images', href: '/admin/sliders' },
  { label: 'Quản lý Mã nhúng', icon: 'bi-code-square', href: '/admin/catalog-embed-codes' },
  { label: 'Quản lý url', icon: 'bi-link-45deg', href: '/admin/url-records' },
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
