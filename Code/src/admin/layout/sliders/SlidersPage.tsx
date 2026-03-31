export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { sliderService } from '@/server/services/slider.service';
import { SliderTable } from '@/admin/features/slider/SliderTable';
import { SliderFilters } from '@/admin/features/slider/SliderFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý Slider' };

export default async function SlidersPage({ searchParams }: Props) {
  const sp = await searchParams;
  let sliders: Awaited<ReturnType<typeof sliderService.getAllSliders>> = [];
  let dbError = false;

  try {
    sliders = await sliderService.getAllSliders();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      sliders = sliders.filter((s) =>
        (s.title && s.title.toLowerCase().includes(kw)) ||
        (s.link && s.link.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      sliders = sliders.filter((s) => s.isActive);
    } else if (sp.status === 'inactive') {
      sliders = sliders.filter((s) => !s.isActive);
    }
  } catch { dbError = true; }

  return (
    <>
      <div className="card mb-3">
        <div className="card-header-custom">
          THÔNG TIN TÌM KIẾM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <SliderFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH SLIDER
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/sliders/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <SliderTable sliders={sliders} />
        </div>
      </div>
    </>
  );
}
