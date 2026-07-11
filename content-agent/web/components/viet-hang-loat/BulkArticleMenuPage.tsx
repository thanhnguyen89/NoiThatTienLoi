'use client';

import Link from 'next/link';

interface MenuCard {
  title: string;
  description: string;
  color: string;
  href?: string;
  icon: string;
  disabled?: boolean;
}

const bulkMenuItems: MenuCard[] = [
  {
    title: 'Viết thông minh',
    description: 'Dễ sử dụng, bước bước, phù hợp cho người mới bắt đầu',
    color: 'from-blue-400 to-blue-600',
    href: '/viet-hang-loat-thong-minh',
    icon: '🚀',
  },
  {
    title: 'Viết theo từ khóa',
    description: 'Nhanh chóng, đơn giản, phù hợp cho các chuyên gia SEO',
    color: 'from-emerald-400 to-emerald-600',
    href: '/viet-hang-loat-tu-khoa',
    icon: '📜',
  },
  {
    title: 'Viết ngắn gọn',
    description: 'Bài viết ngắn khoảng 1.200 từ, tập trung vào từ khóa chính',
    color: 'from-slate-400 to-slate-600',
    href: '/viet-hang-loat-tinh-gon',
    icon: '⚡',
  },
  {
    title: 'Viết từ Google Search',
    description: 'Dễ dàng lên top và lọt vào Google AI Overviews',
    color: 'from-blue-500 to-indigo-600',
    href: '/viet-hang-loat-google-search',
    icon: '🌐',
  },
  {
    title: 'Viết dự đoán trận đấu',
    description: 'Nhanh - Chuẩn - Cuốn hút: Dự đoán trận đấu bằng AI',
    color: 'from-cyan-400 to-cyan-600',
    icon: '⚽',
    disabled: true,
  },
  {
    title: 'Viết theo nguồn',
    description: 'Chuyển link bài viết khác thành bài viết của bạn',
    color: 'from-violet-500 to-indigo-600',
    href: '/viet-hang-loat-theo-nguon',
    icon: '🔗',
  },
  {
    title: 'Viết theo dàn ý',
    description: 'Dựa trên dàn ý của bạn viết bài với độ chính xác cao',
    color: 'from-green-400 to-emerald-600',
    href: '/viet-hang-loat-theo-dan-bai',
    icon: '📋',
  },
];

function Card({ item }: { item: MenuCard }) {
  const content = (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white transition-all ${item.disabled ? 'opacity-60' : 'cursor-pointer hover:shadow-lg'}`}>
      <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${item.color} p-4`}>
        <div className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10" />
        <div className="text-5xl">{item.icon}</div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">{item.title}</h3>
          {item.disabled && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">Sắp có</span>}
        </div>
        <p className="text-xs leading-relaxed text-gray-600">{item.description}</p>
      </div>
    </div>
  );

  if (!item.href || item.disabled) return <div title="Chưa có spec/page để triển khai">{content}</div>;
  return (
    <Link href={item.href} className="group block">
      {content}
    </Link>
  );
}

export default function BulkArticleMenuPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Viết hàng loạt</h1>
            <p className="text-sm text-gray-600">
              Sử dụng AI để viết nhiều bài viết (nhiều bài cùng một lúc) và đăng tự động lên website của bạn
            </p>
          </div>
          <button className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600">
            <span>📖</span>
            <span>Cách sử dụng</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bulkMenuItems.map((item) => (
            <Card key={item.title} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
