'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  matchPrefixes?: string[];
}

interface NavGroup {
  icon: string;
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    icon: '📝',
    title: 'Viết Bài',
    items: [
      { label: 'Viết Bài', href: '/' },
      { label: 'Viết Theo Từ Khóa', href: '/viet-theo-tu-khoa', matchPrefixes: ['/viet-theo-tu-khoa'] },
      {
        label: 'Viết Bài Thông Minh',
        href: '/viet-bai-thong-minh',
        matchPrefixes: ['/viet-bai-thong-minh'],
      },
      { label: 'Viết Hàng Loạt', href: '/viet-hang-loat' },
      {
        label: 'Viết Lại',
        href: '/viet-lai',
        matchPrefixes: ['/viet-lai', '/viet-lai-doan-van', '/viet-lai-bai-viet', '/viet-lai-tin-tuc', '/viet-lai-url'],
      },
    ],
  },
  {
    icon: '🎬',
    title: 'Social',
    items: [
      { label: 'Viết bài TikTok', href: '/viet-bai-tiktok' },
      { label: 'Caption TikTok đã lưu', href: '/quan-ly-bai-tiktok' },
      { label: 'Viết bài Facebook', href: '/viet-bai-facebook' },
      { label: 'Facebook Post nhanh', href: '/facebook-post' },
      { label: 'Bài Facebook đã lưu', href: '/quan-ly-bai-facebook' },
      { label: 'Tạo Facebook Comment', href: '/facebook-comment' },
      { label: 'Viết Comment Facebook', href: '/viet-tu-facebook-comment' },
    ],
  },
  {
    icon: '🛍️',
    title: 'ECOMMERCE Tools',
    items: [
      { label: 'Tiêu đề sản phẩm', href: '/tao-tieu-de-san-pham' },
      { label: 'Đánh giá sản phẩm', href: '/danh-gia-san-pham-nhanh' },
      { label: 'Giới thiệu sản phẩm', href: '/gioi-thieu-san-pham' },
      { label: 'Tên sản phẩm', href: '/tao-ten-san-pham' },
      { label: 'FAQ sản phẩm', href: '/faq-san-pham' },
    ],
  },
  {
    icon: '📰',
    title: 'Quản Lý Bài Viết',
    items: [
      { label: 'Tất Cả Bài Viết', href: '/dashboard/articles' },
      { label: 'Bài Nháp', href: '/dashboard/articles?status=DRAFT' },
      { label: 'Đã Xuất Bản', href: '/dashboard/articles?status=PUBLISHED' },
      { label: 'Bài Facebook', href: '/quan-ly-bai-fb' },
      { label: 'Caption TikTok', href: '/quan-ly-bai-tiktok' },
      { label: 'Comment Facebook', href: '/quan-ly-facebook-comment' },
    ],
  },
  {
    icon: '🔄',
    title: 'Tự Động Viết Blog',
    items: [
      { label: 'Tự Ưu Bài Viết', href: '/tu-uu-bai-viet' },
      { label: 'Tất Cả Bài Viết', href: '/tat-ca-bai-viet' },
    ],
  },
  {
    icon: '🔍',
    title: 'Tự Động Index',
    items: [{ label: 'Cấu Hình', href: '/cau-hinh-index' }],
  },
  {
    icon: '⚙️',
    title: 'Cấu Hình',
    items: [
      { label: 'AI Models', href: '/cau-hinh/ai-models' },
      { label: 'AI Check', href: '/cau-hinh/ai-check' },
      { label: 'Website', href: '/cau-hinh-website' },
      { label: 'Thương Hiệu', href: '/quan-ly-thuong-hieu' },
      { label: 'Kiến Thức', href: '/kien-thuc' },
    ],
  },
  {
    icon: '🔑',
    title: 'Keyword Tools',
    items: [
      { label: 'Phân Tích Từ Khóa', href: '/phan-tich-tu-khoa' },
      { label: 'Lấy Từ Khóa Google Suggest', href: '/google-suggest' },
      { label: 'Keyword Volume', href: '/keyword-volume' },
      { label: 'Nhóm Từ Khóa', href: '/nhom-tu-khoa' },
      { label: 'Từ Khóa Website', href: '/tu-khoa-website' },
      { label: 'Semantic Keywords', href: '/semantic-keywords' },
    ],
  },
  {
    icon: '🤖',
    title: 'Công Cụ AI Khác',
    items: [
      { label: 'AI Chat', href: '/ai-chat' },
      { label: 'Viết Comment Facebook', href: '/viet-tu-facebook-comment' },
      { label: 'Tạo Ảnh AI', href: '/tao-anh-ai' },
      { label: 'Phân Tích Văn Bản', href: '/phan-tich-van-ban' },
    ],
  },
  {
    icon: '📚',
    title: 'Mở Rộng',
    items: [
      { label: 'Context & Data', href: '/context-data' },
      { label: 'Hướng Dẫn', href: '/huong-dan' },
      { label: 'API Documentation', href: '/api-docs' },
    ],
  },
];

export default function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Viết Bài': true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const isItemActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    return Boolean(item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix)));
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col">
        <nav className="flex-1 overflow-y-auto py-4">
          {navGroups.map((group) => (
            <div
              key={group.title}
              className="flex items-center justify-center py-3 hover:bg-gray-50 cursor-pointer"
              title={group.title}
            >
              <span className="text-xl">{group.icon}</span>
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-1">
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{group.icon}</span>
                <span className="font-medium">{group.title}</span>
              </div>
              <span
                className={`transform transition-transform text-gray-400 ${
                  openGroups[group.title] ? 'rotate-90' : ''
                }`}
              >
                ›
              </span>
            </button>
            {openGroups[group.title] && (
              <div className="bg-gray-50">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-2 pl-12 text-sm hover:bg-gray-100 transition-colors ${
                      isItemActive(item)
                        ? 'text-blue-600 bg-blue-50 border-l-2 border-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors">
            <span>📖</span>
            <span>Hướng Dẫn</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors">
            <span>↩️</span>
            <span>Back To V1</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
