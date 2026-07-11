import Link from 'next/link';

interface RewriteCard {
  title: string;
  description: string;
  color: string;
  href: string;
  icon: string;
}

const rewriteTools: RewriteCard[] = [
  {
    title: 'Viết lại đoạn văn',
    description: 'Viết lại đoạn văn bằng cách thay thế từng đoạn.',
    color: 'from-orange-400 to-orange-600',
    href: '/viet-lai-doan-van',
    icon: '✍️',
  },
  {
    title: 'Viết lại bài viết',
    description: 'Viết lại bài viết mới sử dụng nội dung từ bài viết cũ.',
    color: 'from-blue-400 to-cyan-600',
    href: '/viet-lai-bai-viet',
    icon: '📝',
  },
  {
    title: 'Viết lại nâng cao',
    description: 'Viết lại bài viết nâng cao với nhiều tùy chọn.',
    color: 'from-slate-400 to-slate-600',
    href: '/viet-lai-tin-tuc',
    icon: '⚙️',
  },
  {
    title: 'Viết lại URL',
    description: 'Viết lại nội dung hiện có và thêm nội dung mới.',
    color: 'from-sky-400 to-sky-600',
    href: '/viet-lai-url',
    icon: '🔗',
  },
];

export default function VietLaiHubPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Viết lại bài viết</h1>
            <p className="text-sm text-gray-600">Use AI to rewrite articles with different options</p>
          </div>
          <button className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600">
            <span>📖</span>
            <span>Cách sử dụng</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rewriteTools.map((tool) => (
            <Link key={tool.title} href={tool.href} className="group block">
              <div className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:shadow-lg">
                <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${tool.color} p-4`}>
                  <div className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10" />
                  <div className="text-5xl">{tool.icon}</div>
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
