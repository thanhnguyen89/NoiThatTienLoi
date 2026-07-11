import Link from 'next/link';

const tools = [
  {
    title: 'Tạo Facebook Post',
    description: 'Tạo bài đăng Facebook bằng AI với nhiều phong cách nội dung.',
    href: '/viet-bai-facebook',
    color: 'from-blue-500 to-blue-700',
    icon: '📘',
  },
  {
    title: 'Viết bài post TikTok',
    description: 'Tạo caption TikTok theo brand, hook mạnh, có preview dark card và lưu lịch sử.',
    href: '/viet-bai-tiktok',
    color: 'from-slate-950 via-rose-600 to-cyan-500',
    icon: '🎬',
  },
  {
    title: 'Tạo Facebook comment',
    description: 'Tạo comment Facebook tự nhiên theo nội dung post và ngữ cảnh.',
    href: '/facebook-comment',
    color: 'from-teal-400 to-cyan-600',
    icon: '💬',
  },
];

export default function SocialToolsPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">SOCIAL Tools</h1>
            <p className="text-sm text-gray-600">Tạo nội dung Social nhanh bằng AI.</p>
          </div>
          <button className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600">
            <span>📖</span>
            <span>Cách sử dụng</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group block">
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
