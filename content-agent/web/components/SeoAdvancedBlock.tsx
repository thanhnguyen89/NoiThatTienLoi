'use client';

import { AUTO_BOLD_OPTIONS, type AutoBoldOption } from '@/lib/shared/options';

interface SeoAdvancedBlockProps {
  show: boolean;
  onToggle: () => void;
  mainLink: string;
  onMainLinkChange: (value: string) => void;
  keywordLinks: string;
  onKeywordLinksChange: (value: string) => void;
  autoBold: AutoBoldOption;
  onAutoBoldChange: (value: AutoBoldOption) => void;
  footerContent: string;
  onFooterContentChange: (value: string) => void;
}

export function SeoAdvancedBlock({
  show,
  onToggle,
  mainLink,
  onMainLinkChange,
  keywordLinks,
  onKeywordLinksChange,
  autoBold,
  onAutoBoldChange,
  footerContent,
  onFooterContentChange,
}: SeoAdvancedBlockProps) {
  const configured = Boolean(mainLink.trim() || keywordLinks.trim() || footerContent.trim() || autoBold !== 'none');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          Tuy chon SEO nang cao
          {configured && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Da cau hinh</span>
          )}
        </span>
        <span className={`text-gray-400 transition-transform ${show ? 'rotate-180' : ''}`}>v</span>
      </button>

      {show && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Gan link vao tu khoa chinh
              <span className="ml-1 text-gray-400 font-normal">(chi lan dau xuat hien)</span>
            </label>
            <input
              type="url"
              value={mainLink}
              onChange={(event) => onMainLinkChange(event.target.value)}
              placeholder="https://noithatminhquan.vn/giuong-sat"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Them link neu noi dung co tu khoa
              <span className="ml-1 text-gray-400 font-normal">(moi dong: tu khoa | URL)</span>
            </label>
            <textarea
              value={keywordLinks}
              onChange={(event) => onKeywordLinksChange(event.target.value)}
              rows={3}
              placeholder={'tu quan ao | https://noithatminhquan.vn/tu\ngiuong sat | https://noithatminhquan.vn/giuong-sat'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tu dong in dam</label>
            <div className="flex flex-wrap gap-2">
              {AUTO_BOLD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onAutoBoldChange(option.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    autoBold === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Them noi dung vao cuoi bai
              <span className="ml-1 text-gray-400 font-normal">(HTML hoac plain text)</span>
            </label>
            <textarea
              value={footerContent}
              onChange={(event) => onFooterContentChange(event.target.value)}
              rows={3}
              placeholder="Vi du: CTA, note thuong hieu, block lien he..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
