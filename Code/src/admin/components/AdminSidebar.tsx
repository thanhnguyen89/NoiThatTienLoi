'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SubItem { label: string; href: string; }
interface MenuItem { label: string; icon: string; href?: string; children?: SubItem[]; }
interface Section { type: 'section'; label: string; }
type NavItem = MenuItem | Section;

const nav: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-speedometer2', href: '/admin' },
  { type: 'section', label: 'QUẢN LÝ' },
  {
    label: 'eCommerce', icon: 'bi-cart3', children: [
      { label: 'Sản phẩm', href: '/admin/products' },
      { label: 'Thêm sản phẩm', href: '/admin/products/new' },
      { label: 'Danh mục', href: '/admin/categories' },
      { label: 'Kích thước', href: '/admin/product-sizes' },
      { label: 'Màu sắc', href: '/admin/product-colors' },
    ]
  },
  { label: 'Yêu cầu tư vấn', icon: 'bi-chat-left-text', href: '/admin/inquiries' },
  { type: 'section', label: 'NỘI DUNG' },
  { label: 'Tin tức', icon: 'bi-newspaper', href: '/admin/posts' },
  { label: 'Danh mục tin tức', icon: 'bi-folder', href: '/admin/news-categories' },
  { label: 'Slider', icon: 'bi-images', href: '/admin/sliders' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isGroupActive(item: MenuItem) {
    return item.children?.some((c) => isActive(c.href)) ?? false;
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__logo">
        <Link href="/admin">
          <span className="admin-sidebar__logo-icon"><i className="bi bi-shop"></i></span>
          ROKSYN
        </Link>
      </div>

      <nav className="admin-sidebar__nav">
        {nav.map((item, i) => {
          if ('type' in item) {
            return <div key={i} className="admin-sidebar__section">{item.label}</div>;
          }
          const mi = item as MenuItem;
          if (mi.children) {
            return <SubMenu key={i} item={mi} pathname={pathname} isGroupActive={isGroupActive(mi)} isActive={isActive} />;
          }
          return (
            <Link key={mi.href} href={mi.href!} className={`admin-sidebar__link ${isActive(mi.href!) ? 'is-active' : ''}`}>
              <span className="admin-sidebar__icon"><i className={`bi ${mi.icon}`}></i></span>
              {mi.label}
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__user-card">
          <div className="admin-sidebar__user-avatar">A</div>
          <div>
            <div className="admin-sidebar__user-name">Admin</div>
            <div className="admin-sidebar__user-role">Quản trị viên</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SubMenu({ item, isGroupActive, isActive }: { item: MenuItem; pathname: string; isGroupActive: boolean; isActive: (h: string) => boolean }) {
  const [open, setOpen] = useState(isGroupActive);

  return (
    <div>
      <div
        className={`admin-sidebar__link ${isGroupActive ? 'is-active' : ''}`}
        onClick={() => setOpen(!open)}
        role="button"
      >
        <span className="admin-sidebar__icon"><i className={`bi ${item.icon}`}></i></span>
        {item.label}
        <span className="admin-sidebar__chevron">
          <i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
        </span>
      </div>
      {open && (
        <div className="admin-sidebar__sub">
          {item.children!.map((child) => (
            <Link key={child.href} href={child.href} className={`admin-sidebar__sub-link ${isActive(child.href) ? 'is-active' : ''}`}>
              <span className="admin-sidebar__sub-dot"></span>
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
