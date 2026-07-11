'use client';

import { useEffect, useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Viết Bài',
    question: 'Làm sao để viết bài với AI?',
    answer: 'Vào trang "Viết Bài Thông Minh", nhập từ khóa, chọn AI model, và hệ thống sẽ tự động phân tích, tạo dàn ý và viết bài cho bạn.',
  },
  {
    category: 'Viết Bài',
    question: 'Tôi có thể chọn AI model nào?',
    answer: 'Bạn có thể chọn từ các model: Gemini (Google), ChatGPT (OpenAI), Grok (xAI), Claude (Anthropic). Mỗi model có ưu điểm riêng.',
  },
  {
    category: 'Viết Bài',
    question: 'Làm sao để bài viết không bị phát hiện là AI?',
    answer: 'Sử dụng tính năng "AI Check" ở bước 4 để phân tích và sửa các câu có giọng AI. Hệ thống sẽ gợi ý cách viết lại tự nhiên hơn.',
  },
  {
    category: 'SEO',
    question: 'SEO Score là gì?',
    answer: 'SEO Score đánh giá bài viết của bạn theo 14 tiêu chí SEO (từ khóa, meta, độ dài, link...). Điểm càng cao, bài viết càng dễ lên top Google.',
  },
  {
    category: 'SEO',
    question: 'Làm sao để tăng SEO Score?',
    answer: 'Ở bước 4, click vào các mục SEO chưa đạt và làm theo hướng dẫn. Hệ thống có nút "Fix" tự động cho một số tiêu chí.',
  },
  {
    category: 'Quản Lý',
    question: 'Bài viết được lưu ở đâu?',
    answer: 'Tất cả bài viết được lưu trong database và có thể xem lại tại "Quản Lý Bài Viết". Mỗi lần Save sẽ tạo version mới.',
  },
  {
    category: 'Quản Lý',
    question: 'Tôi có thể xuất bài viết ra file không?',
    answer: 'Có! Ở bước 4, bạn có thể Export HTML hoặc Export Word (.doc) để sử dụng ở nơi khác.',
  },
  {
    category: 'AI Models',
    question: 'Làm sao để thêm AI model mới?',
    answer: 'Vào "Cấu Hình > AI Models", click "Thêm Model", điền thông tin (tên, provider, model ID, API key, base URL) và lưu.',
  },
  {
    category: 'AI Models',
    question: 'Model mặc định là gì?',
    answer: 'Model mặc định sẽ được tự động chọn khi bạn vào trang viết bài. Bạn có thể đổi model mặc định trong "Quản Lý AI Models".',
  },
  {
    category: 'Tài Khoản',
    question: 'Làm sao để đổi mật khẩu?',
    answer: 'Vào "Hồ Sơ", click "Chỉnh Sửa", nhập mật khẩu hiện tại và mật khẩu mới, rồi lưu.',
  },
];

export default function SupportCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Trung Tâm Hỗ Trợ - Content Agent';
  }, []);

  const categories = ['all', ...Array.from(new Set(FAQ_DATA.map((item) => item.category)))];

  const filteredFAQ = FAQ_DATA.filter((item) => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">💬 Trung Tâm Hỗ Trợ</h1>
          <p className="text-blue-100 mb-6">Tìm câu trả lời cho câu hỏi của bạn</p>
          
          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm câu hỏi..."
              className="w-full px-6 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-xl"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Categories */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤔</div>
              <p className="text-gray-400">Không tìm thấy câu hỏi nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQ.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">{item.question}</h3>
                    </div>
                    <span
                      className={`text-gray-400 text-xl transition-transform ${
                        expandedIndex === index ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {expandedIndex === index && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                      <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contact Support */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center border border-blue-100">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy câu trả lời?</h3>
            <p className="text-gray-600 mb-4">Liên hệ với chúng tôi để được hỗ trợ trực tiếp</p>
            <div className="flex gap-3 justify-center">
              <a
                href="mailto:support@contentagent.com"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Gửi Email
              </a>
              <a
                href="https://t.me/contentagent"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
