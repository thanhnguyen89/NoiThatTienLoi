import Link from 'next/link';

interface TemplateCard {
  title: string;
  description: string;
  color: string;
  href: string;
  icon: string;
}

export default function Home() {
  const templates: TemplateCard[] = [
    {
      title: 'Viết thông minh',
      description: 'Dễ sử dụng, bước bước, phù hợp cho người mới bắt đầu',
      color: 'from-blue-400 to-blue-600',
      href: '/viet-bai-thong-minh',
      icon: '🧠',
    },
    {
      title: 'Viết theo từ khóa',
      description: 'Nhanh chóng, đơn giản, phù hợp cho các chuyên gia SEO',
      color: 'from-green-400 to-green-600',
      href: '/viet-theo-tu-khoa',
      icon: '🔑',
    },
    {
      title: 'Viết bài ngắn gọn',
      description: 'Bài viết ngắn khoảng 1.200 từ, tập trung vào từ khóa chính',
      color: 'from-slate-400 to-slate-600',
      href: '/viet-tinh-gon',
      icon: '📄',
    },
    {
      title: 'Viết Tin Tức',
      description: 'Nội dung cập nhập theo ngày, phù hợp cho các website tin tức',
      color: 'from-rose-400 to-rose-600',
      href: '/viet-tin-tuc',
      icon: '📰',
    },
    {
      title: 'Viết từ Google Search',
      description: 'Dễ dàng lên top và lọt vào Google AI Overviews',
      color: 'from-gray-400 to-gray-600',
      href: '/viet-tu-google-search',
      icon: '🔍',
    },
    {
      title: 'Viết theo dàn ý',
      description: 'Dựa trên dàn ý của bạn viết bài với độ chính xác cao',
      color: 'from-emerald-400 to-emerald-600',
      href: '/viet-theo-dan-bai',
      icon: '📋',
    },
    {
      title: 'Viết dự đoán trận đấu',
      description: 'Nhanh - Chuẩn - Cuốn hút: Dự đoán trận đấu bằng AI',
      color: 'from-cyan-400 to-cyan-600',
      href: '/du-doan-tran-dau',
      icon: '⚽',
    },
    {
      title: 'Viết theo nguồn',
      description: 'Chuyển link bài viết khác thành bài viết của bạn',
      color: 'from-indigo-400 to-indigo-600',
      href: '/viet-theo-nguon',
      icon: '🔗',
    },
    {
      title: 'Write Product Review',
      description: 'Viết đánh giá, nhận xét chuyên sâu 1 sản phẩm',
      color: 'from-yellow-400 to-yellow-600',
      href: '/viet-danh-gia-san-pham',
      icon: '⭐',
    },
    {
      title: 'Viết Amazon Affiliate',
      description: 'Dành cho bài viết Amazon Affiliate, mỗi bài sẽ đề cập nhiều sản phẩm',
      color: 'from-orange-400 to-orange-600',
      href: '/amazon-affiliate',
      icon: '🛍️',
    },
    {
      title: 'Viết từ Youtube Video',
      description: 'Chuyển nội dung video Youtube thành bài viết, tạo bài viết độc lạ',
      color: 'from-red-400 to-red-600',
      href: '/viet-tu-youtube',
      icon: '▶️',
    },
    {
      title: 'Viết từ Facebook Post',
      description: 'Chuyển nội dung Facebook Post thành bài viết',
      color: 'from-blue-500 to-blue-700',
      href: '/viet-tu-facebook',
      icon: '📘',
    },
    {
      title: 'Viết bài dạng toplist',
      description: 'Viết bài dạng toplist, the best, sản phẩm tốt nhất',
      color: 'from-purple-400 to-purple-600',
      href: '/viet-toplist',
      icon: '🏆',
    },
    {
      title: 'Viết với trình soạn thảo AI',
      description: 'Tự do sử dụng trình soạn thảo AI và viết theo ý thích của bạn',
      color: 'from-sky-400 to-sky-600',
      href: '/ai-editor',
      icon: '🤖',
    },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Viết bài bằng AI</h1>
          <p className="text-sm text-gray-600">Sử dụng AI để viết bài viết với nhiều tùy chọn</p>
        </div>
        <button className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors flex items-center gap-2">
          <span>📖</span>
          <span>Cách sử dụng</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.map((template) => (
          <Link key={template.title} href={template.href}>
            <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
              <div className={`h-24 bg-gradient-to-br ${template.color} p-4 flex items-center justify-center relative`}>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="text-5xl">{template.icon}</div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{template.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{template.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
