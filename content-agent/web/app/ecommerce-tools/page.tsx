import Link from 'next/link';

const tools = [
  {
    title: 'Tiêu đề sản phẩm',
    description: 'Tạo 5 meta title, meta description và SERP preview cho trang sản phẩm.',
    href: '/tao-tieu-de-san-pham',
    color: 'from-blue-500 to-cyan-600',
    icon: 'tag',
  },
  {
    title: 'Đánh giá sản phẩm',
    description: 'Viết review nhanh có rating, ưu điểm, nhược điểm và kết luận nên mua.',
    href: '/danh-gia-san-pham-nhanh',
    color: 'from-amber-400 to-orange-600',
    icon: 'star',
  },
  {
    title: 'Giới thiệu sản phẩm',
    description: 'Tạo mô tả sản phẩm ecommerce theo độ dài, format và tone tùy chọn.',
    href: '/gioi-thieu-san-pham',
    color: 'from-emerald-400 to-teal-600',
    icon: 'document',
  },
  {
    title: 'Tên sản phẩm',
    description: 'Gợi ý 10 tên sản phẩm kèm style và lý do phù hợp cho listing.',
    href: '/tao-ten-san-pham',
    color: 'from-rose-500 to-pink-700',
    icon: 'name',
  },
  {
    title: 'FAQ sản phẩm',
    description: 'Tạo bộ Q&A và JSON-LD FAQ Schema để gắn vào trang sản phẩm.',
    href: '/faq-san-pham',
    color: 'from-slate-600 to-gray-900',
    icon: 'faq',
  },
];

function ToolIcon({ type }: { type: string }) {
  const baseClass = 'h-14 w-14 text-gray-950 drop-shadow-sm';

  if (type === 'star') {
    return (
      <svg className={baseClass} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="m24 5 5.7 12.1 13.1 1.7-9.6 9.1 2.5 13.1L24 34.6 12.3 41l2.5-13.1-9.6-9.1 13.1-1.7L24 5Z" fill="white" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'document') {
    return (
      <svg className={baseClass} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M13 5h16l8 8v30H13V5Z" fill="white" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M29 5v10h8M18 23h14M18 30h14M18 37h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'name') {
    return (
      <svg className={baseClass} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M7 12h34v24H7V12Z" fill="white" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M14 30 20 18l6 12M16.2 26h7.6M30 19h6M30 25h6M30 31h4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'faq') {
    return (
      <svg className={baseClass} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M9 10h30v22H22l-9 7v-7H9V10Z" fill="white" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M19 20a5 5 0 0 1 10 0c0 4-5 4-5 8M24 35h.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={baseClass} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M7 8h20l14 14-19 19L7 26V8Z" fill="white" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 17h.1" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M25 25 16 34M31 31l-5 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function EcommerceToolsPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">ECOMMERCE Tools</h1>
            <p className="text-sm text-gray-600">Tạo nội dung sản phẩm nhanh bằng AI.</p>
          </div>
          <Link
            href="/tao-tieu-de-san-pham"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Mở tool đầu tiên
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group block">
              <div className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:shadow-lg">
                <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${tool.color} p-4`}>
                  <div className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10" />
                  <ToolIcon type={tool.icon} />
                </div>
                <div className="p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{tool.title}</h3>
                  <p className="text-xs leading-relaxed text-gray-600">{tool.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
